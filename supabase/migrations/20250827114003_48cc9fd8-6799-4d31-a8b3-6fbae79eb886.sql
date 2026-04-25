-- Create map_overlays table
CREATE TABLE public.map_overlays (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  sw_lat DOUBLE PRECISION NOT NULL,
  sw_lng DOUBLE PRECISION NOT NULL,
  ne_lat DOUBLE PRECISION NOT NULL,
  ne_lng DOUBLE PRECISION NOT NULL,
  opacity REAL NOT NULL DEFAULT 0.55,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.map_overlays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "mo_select" ON public.map_overlays
  FOR SELECT USING (true);

CREATE POLICY "mo_insert" ON public.map_overlays
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin_doh');

CREATE POLICY "mo_update" ON public.map_overlays
  FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin_doh')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_doh');

-- Add to realtime publication
DO $$
BEGIN
  -- Add table to supabase_realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.map_overlays;
  
  -- Enable replica identity full for real-time updates
  ALTER TABLE public.map_overlays REPLICA IDENTITY FULL;
END $$;

-- Seed default HCMC admin overlay
INSERT INTO public.map_overlays (
  id, 
  image_url, 
  sw_lat, 
  sw_lng, 
  ne_lat, 
  ne_lng, 
  opacity
) VALUES (
  'hcmc_admin',
  '/maps/hcmc-admin.jpg',
  10.30,
  106.35,
  11.25,
  107.10,
  0.55
);