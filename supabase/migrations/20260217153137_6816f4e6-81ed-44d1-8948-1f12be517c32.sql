
-- Create user_events table for tracking all user actions (DB-first pattern)
CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_user_events_user_id ON public.user_events (user_id);
CREATE INDEX idx_user_events_action_type ON public.user_events (action_type);
CREATE INDEX idx_user_events_created_at ON public.user_events (created_at DESC);

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events
CREATE POLICY "Users can insert own events"
  ON public.user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own events
CREATE POLICY "Users can read own events"
  ON public.user_events FOR SELECT
  USING (auth.uid() = user_id);

-- Allow anon inserts for non-authenticated tracking (with null user_id fallback)
CREATE POLICY "Anon can insert events"
  ON public.user_events FOR INSERT
  WITH CHECK (user_id IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_events;
