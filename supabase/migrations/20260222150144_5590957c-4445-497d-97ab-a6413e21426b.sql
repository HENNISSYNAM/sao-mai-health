
-- Table for crowd-sourced validation of community alerts (like Waze)
CREATE TABLE public.community_alert_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.community_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote_type TEXT NOT NULL DEFAULT 'confirm' CHECK (vote_type IN ('confirm', 'deny')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(alert_id, user_id)
);

-- RLS
ALTER TABLE public.community_alert_votes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read votes
CREATE POLICY "Anyone can read votes" ON public.community_alert_votes
  FOR SELECT USING (true);

-- Users can insert their own votes  
CREATE POLICY "Users can vote" ON public.community_alert_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes" ON public.community_alert_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Add vote_count to community_alerts for quick access
ALTER TABLE public.community_alerts 
  ADD COLUMN IF NOT EXISTS confirm_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deny_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promoted_to_hotspot BOOLEAN DEFAULT false;
