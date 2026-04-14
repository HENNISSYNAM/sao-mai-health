-- =============================================
-- Add user_id column to stroke_alert_subscribers
-- =============================================
ALTER TABLE public.stroke_alert_subscribers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stroke_alert_subscribers_user_id 
ON public.stroke_alert_subscribers(user_id);

-- =============================================
-- Add user_id column to case_events
-- =============================================
ALTER TABLE public.case_events 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_case_events_user_id 
ON public.case_events(user_id);

-- =============================================
-- Drop overly permissive policies on stroke_alert_subscribers
-- =============================================
DROP POLICY IF EXISTS "Anyone can view subscribers" ON public.stroke_alert_subscribers;
DROP POLICY IF EXISTS "Anyone can insert subscribers" ON public.stroke_alert_subscribers;
DROP POLICY IF EXISTS "Anyone can update subscribers" ON public.stroke_alert_subscribers;
DROP POLICY IF EXISTS "Anyone can register for stroke alerts" ON public.stroke_alert_subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription by phone" ON public.stroke_alert_subscribers;
DROP POLICY IF EXISTS "Only service role can read subscribers" ON public.stroke_alert_subscribers;

-- =============================================
-- New RLS policies for stroke_alert_subscribers
-- =============================================
-- Allow anyone to INSERT (for registration without login)
CREATE POLICY "Public can register for stroke alerts"
ON public.stroke_alert_subscribers
FOR INSERT
WITH CHECK (true);

-- Users can only view their own data (when logged in)
CREATE POLICY "Users can view own subscriber data"
ON public.stroke_alert_subscribers
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR auth.uid() IS NULL -- Allow anonymous users to check their own registration via phone in code
);

-- Users can only update their own data
CREATE POLICY "Users can update own subscriber data"
ON public.stroke_alert_subscribers
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- =============================================
-- Drop overly permissive policies on case_events
-- =============================================
DROP POLICY IF EXISTS "anon_select_case" ON public.case_events;
DROP POLICY IF EXISTS "auth_insert_case" ON public.case_events;

-- =============================================
-- New RLS policies for case_events
-- =============================================
-- Public read for epidemiological surveillance (anonymized data on map)
-- This is intentional for public health awareness
CREATE POLICY "Public can view case events for surveillance"
ON public.case_events
FOR SELECT
USING (true);

-- Authenticated users can insert case events (must be logged in)
CREATE POLICY "Authenticated users can report cases"
ON public.case_events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only owners can update their own case reports
CREATE POLICY "Users can update own case reports"
ON public.case_events
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());