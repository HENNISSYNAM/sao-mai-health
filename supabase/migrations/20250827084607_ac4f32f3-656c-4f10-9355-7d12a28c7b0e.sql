-- Create inventory and stock management tables
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'medical_supply', 'vaccine', 'medication'
  unit TEXT NOT NULL DEFAULT 'pcs',
  storage_type TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'cold_chain', 'frozen'
  min_temp NUMERIC,
  max_temp NUMERIC,
  expiry_alert_days INTEGER DEFAULT 30,
  reorder_point NUMERIC NOT NULL DEFAULT 0, -- s value
  max_stock NUMERIC NOT NULL DEFAULT 1000, -- S value
  lead_time_days INTEGER DEFAULT 7,
  cost_per_unit NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  movement_type TEXT NOT NULL, -- 'in', 'out', 'adjustment', 'expired'
  quantity NUMERIC NOT NULL,
  reference_no TEXT,
  batch_no TEXT,
  expiry_date DATE,
  unit_cost NUMERIC,
  notes TEXT,
  facility_id TEXT NOT NULL,
  ward_id TEXT,
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  facility_id TEXT NOT NULL,
  ward_id TEXT,
  batch_no TEXT,
  expiry_date DATE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC NOT NULL DEFAULT 0,
  available_quantity NUMERIC GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  unit_cost NUMERIC,
  temperature_log JSONB DEFAULT '[]'::jsonb,
  last_temp_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, facility_id, ward_id, batch_no, expiry_date)
);

CREATE TABLE public.temperature_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT NOT NULL,
  ward_id TEXT,
  current_temp NUMERIC NOT NULL,
  alert_type TEXT NOT NULL, -- 'high', 'low', 'sensor_failure'
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ETL and data quality tables
CREATE TABLE public.etl_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL, -- 'lab_import', 'case_import', 'vaccine_import'
  file_path TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress NUMERIC DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.dq_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  column_name TEXT,
  rule_type TEXT NOT NULL, -- 'missing_value', 'out_of_range', 'invalid_code', 'late_report'
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.dq_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.dq_rules(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  field_name TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  original_value TEXT,
  suggested_value TEXT,
  severity TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'fixed', 'ignored'
  fixed_by UUID,
  fixed_at TIMESTAMPTZ,
  facility_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.data_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  score_date DATE NOT NULL,
  total_records INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  quality_score NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN total_records = 0 THEN 0
      ELSE GREATEST(0, 100 - (error_count::NUMERIC / total_records * 100))
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(facility_id, table_name, score_date)
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etl_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dq_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dq_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can manage inventory items" ON public.inventory_items FOR ALL USING (true);
CREATE POLICY "Public can manage stock movements" ON public.stock_movements FOR ALL USING (true);
CREATE POLICY "Public can manage inventory stock" ON public.inventory_stock FOR ALL USING (true);
CREATE POLICY "Public can manage temperature alerts" ON public.temperature_alerts FOR ALL USING (true);
CREATE POLICY "Public can manage ETL queue" ON public.etl_queue FOR ALL USING (true);
CREATE POLICY "Public can manage DQ rules" ON public.dq_rules FOR ALL USING (true);
CREATE POLICY "Public can manage DQ errors" ON public.dq_errors FOR ALL USING (true);
CREATE POLICY "Public can view DQ scores" ON public.data_quality_scores FOR SELECT USING (true);

-- Create inventory management functions
CREATE OR REPLACE FUNCTION public.fn_inventory_reserve(
  p_item_id UUID,
  p_facility_id TEXT,
  p_ward_id TEXT,
  p_quantity NUMERIC
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  available_qty NUMERIC := 0;
  reserved_qty NUMERIC := 0;
BEGIN
  -- Lock the row for update
  SELECT available_quantity INTO available_qty
  FROM public.inventory_stock
  WHERE item_id = p_item_id 
    AND facility_id = p_facility_id 
    AND COALESCE(ward_id, '') = COALESCE(p_ward_id, '')
    AND expiry_date > CURRENT_DATE
  ORDER BY expiry_date ASC
  LIMIT 1
  FOR UPDATE;

  IF available_qty IS NULL OR available_qty < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock');
  END IF;

  -- Reserve the quantity
  UPDATE public.inventory_stock
  SET reserved_quantity = reserved_quantity + p_quantity,
      updated_at = now()
  WHERE item_id = p_item_id 
    AND facility_id = p_facility_id 
    AND COALESCE(ward_id, '') = COALESCE(p_ward_id, '')
    AND expiry_date > CURRENT_DATE
  ORDER BY expiry_date ASC
  LIMIT 1;

  RETURN jsonb_build_object('success', true, 'reserved_quantity', p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_inventory_out(
  p_item_id UUID,
  p_facility_id TEXT,
  p_ward_id TEXT,
  p_quantity NUMERIC,
  p_reference_no TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stock_record RECORD;
  remaining_qty NUMERIC := p_quantity;
BEGIN
  -- FEFO (First Expiry, First Out)
  FOR stock_record IN
    SELECT * FROM public.inventory_stock
    WHERE item_id = p_item_id 
      AND facility_id = p_facility_id 
      AND COALESCE(ward_id, '') = COALESCE(p_ward_id, '')
      AND available_quantity > 0
    ORDER BY expiry_date ASC
    FOR UPDATE
  LOOP
    DECLARE
      qty_to_deduct NUMERIC := LEAST(remaining_qty, stock_record.available_quantity);
    BEGIN
      -- Update stock
      UPDATE public.inventory_stock
      SET quantity = quantity - qty_to_deduct,
          updated_at = now()
      WHERE id = stock_record.id;

      -- Record movement
      INSERT INTO public.stock_movements (
        item_id, movement_type, quantity, reference_no, 
        batch_no, expiry_date, facility_id, ward_id, notes
      ) VALUES (
        p_item_id, 'out', -qty_to_deduct, p_reference_no,
        stock_record.batch_no, stock_record.expiry_date, 
        p_facility_id, p_ward_id, p_notes
      );

      remaining_qty := remaining_qty - qty_to_deduct;
      
      IF remaining_qty <= 0 THEN
        EXIT;
      END IF;
    END;
  END LOOP;

  IF remaining_qty > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock');
  END IF;

  RETURN jsonb_build_object('success', true, 'dispensed_quantity', p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_inventory_in(
  p_item_id UUID,
  p_facility_id TEXT,
  p_ward_id TEXT,
  p_quantity NUMERIC,
  p_batch_no TEXT,
  p_expiry_date DATE,
  p_unit_cost NUMERIC DEFAULT NULL,
  p_reference_no TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update stock
  INSERT INTO public.inventory_stock (
    item_id, facility_id, ward_id, batch_no, expiry_date, 
    quantity, unit_cost
  ) VALUES (
    p_item_id, p_facility_id, p_ward_id, p_batch_no, 
    p_expiry_date, p_quantity, p_unit_cost
  )
  ON CONFLICT (item_id, facility_id, ward_id, batch_no, expiry_date)
  DO UPDATE SET
    quantity = inventory_stock.quantity + p_quantity,
    updated_at = now();

  -- Record movement
  INSERT INTO public.stock_movements (
    item_id, movement_type, quantity, reference_no, 
    batch_no, expiry_date, unit_cost, facility_id, ward_id, notes
  ) VALUES (
    p_item_id, 'in', p_quantity, p_reference_no,
    p_batch_no, p_expiry_date, p_unit_cost, 
    p_facility_id, p_ward_id, p_notes
  );

  RETURN jsonb_build_object('success', true, 'received_quantity', p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_dq_fix_error(
  p_error_id UUID,
  p_patch JSONB
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  error_record RECORD;
BEGIN
  -- Get error details
  SELECT * INTO error_record FROM public.dq_errors WHERE id = p_error_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Error not found');
  END IF;

  -- Mark error as fixed
  UPDATE public.dq_errors
  SET status = 'fixed',
      fixed_by = auth.uid(),
      fixed_at = now()
  WHERE id = p_error_id;

  -- TODO: Apply patch to original table
  -- This would depend on the specific table and error type

  RETURN jsonb_build_object('success', true, 'fixed_error_id', p_error_id);
END;
$$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_stock_updated_at BEFORE UPDATE ON public.inventory_stock FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.stock_movements REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_stock REPLICA IDENTITY FULL;
ALTER TABLE public.temperature_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.etl_queue REPLICA IDENTITY FULL;
ALTER TABLE public.dq_errors REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.temperature_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.etl_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dq_errors;