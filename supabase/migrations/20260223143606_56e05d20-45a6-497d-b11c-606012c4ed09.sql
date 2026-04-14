
-- Create sensor_daily_summary table
CREATE TABLE public.sensor_daily_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_steps INTEGER DEFAULT 0,
  avg_activity_level TEXT,
  tremor_events INTEGER DEFAULT 0,
  avg_tremor_intensity DOUBLE PRECISION DEFAULT 0,
  balance_avg_score DOUBLE PRECISION DEFAULT 100,
  balance_issue_count INTEGER DEFAULT 0,
  fall_events INTEGER DEFAULT 0,
  ambient_light_avg_lux DOUBLE PRECISION,
  magnetic_field_avg DOUBLE PRECISION,
  accelerometer_samples INTEGER DEFAULT 0,
  gyroscope_samples INTEGER DEFAULT 0,
  environment_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.sensor_daily_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sensor summaries"
  ON public.sensor_daily_summary FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own sensor summaries"
  ON public.sensor_daily_summary FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own sensor summaries"
  ON public.sensor_daily_summary FOR UPDATE
  USING (user_id = auth.uid()::text);

-- Trigger for updated_at
CREATE TRIGGER update_sensor_daily_summary_updated_at
  BEFORE UPDATE ON public.sensor_daily_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
