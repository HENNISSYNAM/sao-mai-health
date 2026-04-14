-- Enable RLS on tables that don't have it enabled yet
-- (Excluding spatial_ref_sys which is a PostGIS system table)

-- 1. idempotency_keys - Used for deduplication, tied to sender_id
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own idempotency keys
CREATE POLICY "Users can manage their own idempotency keys"
ON public.idempotency_keys
FOR ALL
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- 2. lot_photos - Photos associated with lots
ALTER TABLE public.lot_photos ENABLE ROW LEVEL SECURITY;

-- Allow public read access to lot photos (for traceability display)
CREATE POLICY "Public can view lot photos"
ON public.lot_photos
FOR SELECT
USING (true);

-- Allow authenticated users to insert lot photos
CREATE POLICY "Authenticated users can insert lot photos"
ON public.lot_photos
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. lots - Traceability lots
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

-- Allow public read access to lots (for traceability display)
CREATE POLICY "Public can view lots"
ON public.lots
FOR SELECT
USING (true);

-- Allow authenticated users to manage lots
CREATE POLICY "Authenticated users can manage lots"
ON public.lots
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. zone_signal_intraday - Zone signal data
ALTER TABLE public.zone_signal_intraday ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read zone signal data
CREATE POLICY "Authenticated users can read zone signal data"
ON public.zone_signal_intraday
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow system to insert zone signal data (via service role)
CREATE POLICY "System can manage zone signal data"
ON public.zone_signal_intraday
FOR ALL
USING (true)
WITH CHECK (true);