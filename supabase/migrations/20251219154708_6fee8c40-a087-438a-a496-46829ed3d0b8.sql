-- Add push subscription column to stroke_alert_subscribers
ALTER TABLE public.stroke_alert_subscribers 
ADD COLUMN IF NOT EXISTS push_subscription jsonb,
ADD COLUMN IF NOT EXISTS notification_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_push_sent timestamp with time zone;