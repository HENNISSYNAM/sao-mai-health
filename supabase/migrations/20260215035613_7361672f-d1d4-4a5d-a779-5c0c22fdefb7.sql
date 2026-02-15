
-- Create community_alerts table for user-submitted alerts
CREATE TABLE public.community_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  category TEXT NOT NULL DEFAULT 'unknown',
  icon TEXT NOT NULL DEFAULT 'alert',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  ai_classification JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can read alerts (public surveillance data)
CREATE POLICY "Anyone can view community alerts"
ON public.community_alerts FOR SELECT USING (true);

-- Authenticated users can create their own alerts
CREATE POLICY "Users can create their own alerts"
ON public.community_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own alerts
CREATE POLICY "Users can update their own alerts"
ON public.community_alerts FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own alerts
CREATE POLICY "Users can delete their own alerts"
ON public.community_alerts FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for alert photos
INSERT INTO storage.buckets (id, name, public) VALUES ('alert-photos', 'alert-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view alert photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'alert-photos');

CREATE POLICY "Authenticated users can upload alert photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'alert-photos' AND auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_community_alerts_updated_at
BEFORE UPDATE ON public.community_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
