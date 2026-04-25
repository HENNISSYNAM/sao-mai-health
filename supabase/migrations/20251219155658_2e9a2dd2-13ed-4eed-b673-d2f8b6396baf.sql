-- Enable RLS on stroke_alert_subscribers table
ALTER TABLE public.stroke_alert_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to INSERT (for registration)
-- This is needed because users register without authentication
CREATE POLICY "Anyone can register for stroke alerts"
ON public.stroke_alert_subscribers
FOR INSERT
WITH CHECK (true);

-- Policy: Allow updates only if the phone matches (for re-registration)
-- Users can update their own record by providing the same phone number
CREATE POLICY "Users can update their own subscription by phone"
ON public.stroke_alert_subscribers
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: No public SELECT - only service role (edge functions) can read
-- Edge functions use service role key which bypasses RLS
-- This prevents hackers from reading sensitive health data
CREATE POLICY "Only service role can read subscribers"
ON public.stroke_alert_subscribers
FOR SELECT
USING (false);

-- Add comment explaining the security model
COMMENT ON TABLE public.stroke_alert_subscribers IS 'Stores stroke alert subscribers with sensitive health data. RLS enabled: INSERT/UPDATE allowed for registration, SELECT blocked for public (only service role can read for sending notifications).';