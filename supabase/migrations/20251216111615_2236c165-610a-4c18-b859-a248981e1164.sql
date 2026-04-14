-- Table for stroke risk predictions by area
CREATE TABLE public.stroke_risk_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id TEXT,
  ward_id TEXT,
  lat NUMERIC,
  lon NUMERIC,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_score NUMERIC,
  
  -- Environmental factors
  aqi NUMERIC,
  pm25 NUMERIC,
  pm10 NUMERIC,
  temperature NUMERIC,
  humidity NUMERIC,
  pressure NUMERIC,
  weather_condition TEXT,
  
  -- AI analysis
  ai_analysis TEXT,
  risk_factors JSONB,
  recommendations JSONB,
  
  -- Metadata
  data_source TEXT,
  predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for location-based queries
CREATE INDEX idx_stroke_predictions_location ON public.stroke_risk_predictions (lat, lon);
CREATE INDEX idx_stroke_predictions_district ON public.stroke_risk_predictions (district_id);
CREATE INDEX idx_stroke_predictions_time ON public.stroke_risk_predictions (predicted_at DESC);
CREATE INDEX idx_stroke_predictions_risk ON public.stroke_risk_predictions (risk_level);

-- Table for user phone subscriptions
CREATE TABLE public.stroke_alert_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  lat NUMERIC,
  lon NUMERIC,
  district_id TEXT,
  is_active BOOLEAN DEFAULT true,
  last_alert_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_stroke_subscribers_phone ON public.stroke_alert_subscribers (phone);

-- Enable RLS
ALTER TABLE public.stroke_risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stroke_alert_subscribers ENABLE ROW LEVEL SECURITY;

-- Public read access for predictions
CREATE POLICY "Anyone can view stroke predictions" 
ON public.stroke_risk_predictions 
FOR SELECT 
USING (true);

-- Public insert for predictions (from edge functions)
CREATE POLICY "System can insert stroke predictions" 
ON public.stroke_risk_predictions 
FOR INSERT 
WITH CHECK (true);

-- Public access for subscribers
CREATE POLICY "Anyone can view subscribers" 
ON public.stroke_alert_subscribers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert subscribers" 
ON public.stroke_alert_subscribers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update subscribers" 
ON public.stroke_alert_subscribers 
FOR UPDATE 
USING (true);