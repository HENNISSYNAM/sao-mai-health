-- Create RPC functions for all 14 modules

-- Helper function to get user role from auth.users metadata
CREATE OR REPLACE FUNCTION health.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
    'health_worker_ward'
  );
$$;

-- Helper function to get user's facility access
CREATE OR REPLACE FUNCTION health.get_user_facilities(user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    array(SELECT facility_id::text FROM health.user_facilities WHERE user_id = $1),
    ARRAY[]::TEXT[]
  );
$$;

-- Module A: Dashboard RPC Functions
CREATE OR REPLACE FUNCTION health.fn_get_dashboard_metrics()
RETURNS TABLE(
  metric_name TEXT,
  value NUMERIC,
  trend NUMERIC,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'new_cases_today'::TEXT as metric_name,
    COALESCE(SUM(case_count), 0)::NUMERIC as value,
    0::NUMERIC as trend,
    NOW() as last_updated
  FROM health.metrics_cases_daily 
  WHERE date = CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    'rt_7d'::TEXT,
    COALESCE(AVG(rt_7d), 0)::NUMERIC,
    0::NUMERIC,
    NOW()
  FROM health.metrics_cases_daily 
  WHERE date >= CURRENT_DATE - INTERVAL '7 days'
  
  UNION ALL
  
  SELECT 
    'bed_occupancy'::TEXT,
    COALESCE(
      (COUNT(*) FILTER (WHERE status = 'occupied')::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100), 0
    ),
    0::NUMERIC,
    NOW()
  FROM health.beds;
END;
$$;

-- Module B: Case Intake RPC (Fast 30s entry)
CREATE OR REPLACE FUNCTION health.fn_cases_intake_fast(p_data JSONB)
RETURNS TABLE(
  case_id UUID,
  patient_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_case_id UUID;
  v_patient_id UUID;
  v_case_number TEXT;
BEGIN
  -- Generate case number
  v_case_number := 'CASE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Create or find patient (MPI logic would go here)
  INSERT INTO health.patients (
    patient_code,
    name_hash,
    dob,
    gender,
    address_hash,
    phone_hash
  ) VALUES (
    'PAT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    p_data->>'name_hash',
    (p_data->>'dob')::DATE,
    p_data->>'gender',
    p_data->>'address_hash',
    p_data->>'phone_hash'
  ) RETURNING id INTO v_patient_id;
  
  -- Create case
  INSERT INTO health.cases (
    patient_id,
    case_number,
    disease_code,
    status,
    onset_date,
    report_date,
    district_id,
    ward_id,
    facility_id,
    lat,
    lng,
    created_by
  ) VALUES (
    v_patient_id,
    v_case_number,
    (p_data->>'disease_code')::health.disease_code,
    COALESCE((p_data->>'status')::health.case_status, 'suspected'),
    (p_data->>'onset_date')::DATE,
    COALESCE((p_data->>'report_date')::DATE, CURRENT_DATE),
    p_data->>'district_id',
    p_data->>'ward_id',
    (p_data->>'facility_id')::UUID,
    (p_data->>'lat')::DECIMAL,
    (p_data->>'lng')::DECIMAL,
    auth.uid()
  ) RETURNING id INTO v_case_id;
  
  -- Enqueue for ETL to FHIR
  INSERT INTO health.etl_queue (
    source_type,
    target_table,
    status,
    processed_rows,
    total_rows
  ) VALUES (
    'case_intake',
    'cases',
    'pending',
    0,
    1
  );
  
  RETURN QUERY SELECT v_case_id, v_patient_id, true, 'Case created successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, NULL::UUID, false, SQLERRM;
END;
$$;

-- Module C: Lab Bulk Ingest
CREATE OR REPLACE FUNCTION health.fn_lab_bulk_ingest(p_rows JSONB)
RETURNS TABLE(
  processed_count INTEGER,
  error_count INTEGER,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row JSONB;
  v_processed INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    BEGIN
      INSERT INTO health.observations (
        case_id,
        loinc_code,
        value,
        unit,
        observed_date
      ) VALUES (
        (v_row->>'case_id')::UUID,
        v_row->>'loinc_code',
        v_row->>'value',
        v_row->>'unit',
        COALESCE((v_row->>'observed_date')::TIMESTAMPTZ, NOW())
      );
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_errors, v_errors = 0, 
    FORMAT('Processed %s rows, %s errors', v_processed, v_errors);
END;
$$;

-- Module D: Alert Management
CREATE OR REPLACE FUNCTION health.fn_alert_acknowledge(p_alert_id UUID, p_assignee UUID DEFAULT NULL)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE health.alerts 
  SET 
    status = 'acknowledged',
    assigned_to = COALESCE(p_assignee, auth.uid()),
    acknowledged_at = NOW(),
    updated_at = NOW()
  WHERE id = p_alert_id;
  
  IF FOUND THEN
    RETURN QUERY SELECT true, 'Alert acknowledged successfully';
  ELSE
    RETURN QUERY SELECT false, 'Alert not found';
  END IF;
END;
$$;

-- Module E: Bed Bulk Update
CREATE OR REPLACE FUNCTION health.fn_bed_bulk_update(p_beds JSONB)
RETURNS TABLE(
  updated_count INTEGER,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bed JSONB;
  v_updated INTEGER := 0;
BEGIN
  FOR v_bed IN SELECT * FROM jsonb_array_elements(p_beds)
  LOOP
    UPDATE health.beds 
    SET 
      status = (v_bed->>'status')::health.bed_status,
      patient_id = (v_bed->>'patient_id')::UUID,
      last_updated = NOW()
    WHERE id = (v_bed->>'id')::UUID;
    
    IF FOUND THEN
      v_updated := v_updated + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_updated, true, FORMAT('Updated %s beds', v_updated);
END;
$$;

-- Module F: Inventory Reserve
CREATE OR REPLACE FUNCTION health.fn_inventory_reserve(
  p_item_id UUID,
  p_quantity INTEGER,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  reserved_quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available INTEGER;
  v_facility_id UUID;
BEGIN
  -- Get user's default facility (simplified)
  SELECT unnest(health.get_user_facilities(auth.uid()))::UUID INTO v_facility_id LIMIT 1;
  
  -- Check available stock
  SELECT COALESCE(SUM(quantity), 0) 
  INTO v_available
  FROM health.stocks 
  WHERE item_id = p_item_id 
    AND facility_id = v_facility_id
    AND status = 'in_stock';
  
  IF v_available >= p_quantity THEN
    -- Reserve stock (simplified - just reduce quantity)
    UPDATE health.stocks 
    SET quantity = quantity - p_quantity
    WHERE item_id = p_item_id 
      AND facility_id = v_facility_id
      AND status = 'in_stock'
      AND quantity > 0;
    
    -- Log movement
    INSERT INTO health.stock_movements (
      facility_id,
      item_id,
      movement_type,
      quantity,
      reference_id,
      reason,
      performed_by
    ) VALUES (
      v_facility_id,
      p_item_id,
      'out',
      p_quantity,
      p_campaign_id,
      'Reserved for campaign',
      auth.uid()
    );
    
    RETURN QUERY SELECT true, 'Stock reserved successfully', p_quantity;
  ELSE
    RETURN QUERY SELECT false, 'Insufficient stock', 0;
  END IF;
END;
$$;

-- Module G: Campaign Scheduling
CREATE OR REPLACE FUNCTION health.fn_schedule_campaign(p_campaign JSONB)
RETURNS TABLE(
  campaign_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  INSERT INTO health.campaigns (
    name,
    type,
    start_date,
    end_date,
    target_population,
    status,
    created_by
  ) VALUES (
    p_campaign->>'name',
    p_campaign->>'type',
    (p_campaign->>'start_date')::DATE,
    (p_campaign->>'end_date')::DATE,
    (p_campaign->>'target_population')::INTEGER,
    'planning',
    auth.uid()
  ) RETURNING id INTO v_campaign_id;
  
  RETURN QUERY SELECT v_campaign_id, true, 'Campaign scheduled successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, false, SQLERRM;
END;
$$;