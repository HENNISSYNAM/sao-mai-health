-- Add new columns to stroke_alert_subscribers for health profile
ALTER TABLE public.stroke_alert_subscribers 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS age_group text,
ADD COLUMN IF NOT EXISTS ai_risk_analysis jsonb,
ADD COLUMN IF NOT EXISTS health_data_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_gps_data jsonb,
ADD COLUMN IF NOT EXISTS last_barometer_data jsonb;

-- Create index for faster lookup by phone
CREATE INDEX IF NOT EXISTS idx_stroke_subscribers_phone ON public.stroke_alert_subscribers(phone);

-- Add constraint for gender
ALTER TABLE public.stroke_alert_subscribers 
ADD CONSTRAINT chk_gender CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL);