-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_participants INTEGER NOT NULL DEFAULT 0,
  priority_groups JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create campaign slots table (ward-based allocation)
CREATE TABLE public.campaign_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ward TEXT NOT NULL,
  total_slots INTEGER NOT NULL DEFAULT 0,
  allocated_slots INTEGER NOT NULL DEFAULT 0,
  capacity_constraint INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign check-ins table
CREATE TABLE public.campaign_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  ward TEXT NOT NULL,
  phone TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  qr_code TEXT,
  offline_sync BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stocks table for inventory management
CREATE TABLE public.stocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can manage campaigns" ON public.campaigns FOR ALL USING (true);
CREATE POLICY "Public can manage campaign slots" ON public.campaign_slots FOR ALL USING (true);
CREATE POLICY "Public can manage campaign checkins" ON public.campaign_checkins FOR ALL USING (true);
CREATE POLICY "Public can view stocks" ON public.stocks FOR SELECT USING (true);
CREATE POLICY "Public can update stocks" ON public.stocks FOR UPDATE USING (true);

-- Enable realtime
ALTER TABLE public.campaigns REPLICA IDENTITY FULL;
ALTER TABLE public.campaign_slots REPLICA IDENTITY FULL;
ALTER TABLE public.campaign_checkins REPLICA IDENTITY FULL;
ALTER TABLE public.stocks REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stocks;

-- Create function to schedule campaign with fair allocation
CREATE OR REPLACE FUNCTION public.fn_schedule_campaign(campaign_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_campaign_id UUID;
  ward_data jsonb;
  ward_name TEXT;
  ward_capacity INTEGER;
  total_target INTEGER;
  allocated_per_ward INTEGER;
  remainder INTEGER;
  current_allocation INTEGER;
BEGIN
  -- Extract campaign data
  total_target := (campaign_data->>'target_participants')::INTEGER;
  
  -- Create the campaign
  INSERT INTO public.campaigns (name, description, start_date, end_date, target_participants, priority_groups, status)
  VALUES (
    campaign_data->>'name',
    campaign_data->>'description',
    (campaign_data->>'start_date')::DATE,
    (campaign_data->>'end_date')::DATE,
    total_target,
    campaign_data->'priority_groups',
    'scheduled'
  )
  RETURNING id INTO new_campaign_id;
  
  -- Fair allocation algorithm (minimax fairness)
  allocated_per_ward := total_target / jsonb_array_length(campaign_data->'wards');
  remainder := total_target % jsonb_array_length(campaign_data->'wards');
  
  -- Allocate slots to each ward
  FOR ward_data IN SELECT * FROM jsonb_array_elements(campaign_data->'wards')
  LOOP
    ward_name := ward_data->>'name';
    ward_capacity := COALESCE((ward_data->>'capacity')::INTEGER, allocated_per_ward + 10);
    
    current_allocation := allocated_per_ward;
    IF remainder > 0 THEN
      current_allocation := current_allocation + 1;
      remainder := remainder - 1;
    END IF;
    
    -- Respect capacity constraints
    current_allocation := LEAST(current_allocation, ward_capacity);
    
    INSERT INTO public.campaign_slots (campaign_id, ward, total_slots, capacity_constraint)
    VALUES (new_campaign_id, ward_name, current_allocation, ward_capacity);
  END LOOP;
  
  RETURN jsonb_build_object('campaign_id', new_campaign_id, 'status', 'success');
END;
$$;

-- Create function to reserve inventory
CREATE OR REPLACE FUNCTION public.fn_inventory_reserve(item_id UUID, qty INTEGER, campaign_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_qty INTEGER;
  current_reserved INTEGER;
  available_qty INTEGER;
BEGIN
  -- Get current stock levels
  SELECT quantity, reserved_quantity INTO current_qty, current_reserved
  FROM public.stocks
  WHERE id = item_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;
  
  available_qty := current_qty - current_reserved;
  
  IF available_qty < qty THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient stock',
      'available', available_qty,
      'requested', qty
    );
  END IF;
  
  -- Reserve the quantity
  UPDATE public.stocks
  SET reserved_quantity = reserved_quantity + qty,
      updated_at = now()
  WHERE id = item_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reserved_quantity', qty,
    'remaining_available', available_qty - qty
  );
END;
$$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_campaigns_updated_at();

CREATE TRIGGER update_stocks_updated_at
BEFORE UPDATE ON public.stocks
FOR EACH ROW
EXECUTE FUNCTION public.update_campaigns_updated_at();

-- Insert sample data
INSERT INTO public.stocks (item_name, quantity, unit, location) VALUES
('Khẩu trang y tế', 10000, 'cái', 'Kho TT'),
('Nước rửa tay', 500, 'chai', 'Kho TT'),
('Nhiệt kế điện tử', 100, 'cái', 'Kho Y tế'),
('Vitamin C', 2000, 'viên', 'Kho Dược'),
('Test nhanh Covid', 1000, 'bộ', 'Kho Y tế');

INSERT INTO public.campaigns (name, description, start_date, end_date, target_participants, priority_groups, status) VALUES
('Tiêm chủng COVID-19 Q1', 'Chiến dịch tiêm chủng COVID-19 quý 1 năm 2025', '2025-02-01', '2025-03-31', 5000, '["Người cao tuổi", "Người có bệnh nền"]', 'scheduled'),
('Khám sức khỏe định kỳ', 'Chương trình khám sức khỏe định kỳ cho người dân', '2025-01-15', '2025-02-15', 3000, '["Trẻ em dưới 5 tuổi", "Phụ nữ mang thai"]', 'ongoing');