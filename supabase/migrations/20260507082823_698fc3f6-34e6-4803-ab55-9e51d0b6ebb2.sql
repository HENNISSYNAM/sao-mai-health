
CREATE TABLE IF NOT EXISTS public.environment_daily_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  lat double precision,
  lon double precision,
  temperature double precision,
  humidity double precision,
  pressure double precision,
  wind_speed double precision,
  uv_index double precision,
  aqi double precision,
  pm25 double precision,
  pm10 double precision,
  no2 double precision,
  so2 double precision,
  co double precision,
  o3 double precision,
  main_pollutant text,
  weather_source text,
  air_quality_source text,
  risk_score integer,
  overall_risk text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_env_daily_user_date ON public.environment_daily_log(user_id, recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_env_daily_recorded_at ON public.environment_daily_log(recorded_at DESC);

ALTER TABLE public.environment_daily_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own environment logs"
  ON public.environment_daily_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own environment logs"
  ON public.environment_daily_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous environment logs allowed"
  ON public.environment_daily_log FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
