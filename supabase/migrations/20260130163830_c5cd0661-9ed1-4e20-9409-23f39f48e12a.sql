-- Create user profiles table for Digital Twin
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  date_of_birth DATE,
  age_group TEXT,
  language TEXT DEFAULT 'vi',
  region JSONB DEFAULT '{}',
  living_environment JSONB DEFAULT '{}',
  health_sensitivity JSONB DEFAULT '{}',
  primary_interests TEXT[] DEFAULT '{}',
  alert_threshold TEXT DEFAULT 'high_risk_only',
  gps_consent BOOLEAN DEFAULT false,
  last_gps_coords JSONB,
  onboarding_completed BOOLEAN DEFAULT false,
  inference_log JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, avatar_url, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'vi')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user health data table for personal tracking
CREATE TABLE IF NOT EXISTS public.user_health_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_type TEXT NOT NULL, -- 'blood_pressure', 'heart_rate', 'glucose', etc.
  value JSONB NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT DEFAULT 'manual', -- 'manual', 'device', 'ai_inferred'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on health data
ALTER TABLE public.user_health_data ENABLE ROW LEVEL SECURITY;

-- Users can only access their own health data
CREATE POLICY "Users can view own health data"
ON public.user_health_data
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health data"
ON public.user_health_data
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health data"
ON public.user_health_data
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health data"
ON public.user_health_data
FOR DELETE
USING (auth.uid() = user_id);

-- Create user alerts table for personalized alerts
CREATE TABLE IF NOT EXISTS public.user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL, -- 'stroke_risk', 'weather', 'air_quality', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user alerts
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
ON public.user_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
ON public.user_alerts
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can insert alerts for users
CREATE POLICY "Service can insert alerts"
ON public.user_alerts
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_health_data_user_id ON public.user_health_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_health_data_recorded_at ON public.user_health_data(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON public.user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_created_at ON public.user_alerts(created_at DESC);

-- Update function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();