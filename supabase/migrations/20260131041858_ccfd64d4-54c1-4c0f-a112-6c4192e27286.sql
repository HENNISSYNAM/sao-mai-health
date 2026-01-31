-- Create table for storing biometric scan data per user
CREATE TABLE IF NOT EXISTS public.user_biometric_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  iris_pattern TEXT NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  eye_health DECIMAL(5,2),
  blood_vessel_clarity DECIMAL(5,2),
  pupil_reactivity DECIMAL(5,2),
  sclera_condition DECIMAL(5,2),
  estimated_heart_rate DECIMAL(5,2),
  estimated_oxygen_level DECIMAL(5,2),
  stress_indicators DECIMAL(5,2),
  skin_health DECIMAL(5,2),
  hydration_level DECIMAL(5,2),
  scan_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, iris_pattern)
);

-- Add columns to user_profiles for health info if not exists
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS blood_type TEXT,
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS medical_conditions TEXT[],
ADD COLUMN IF NOT EXISTS allergies TEXT[],
ADD COLUMN IF NOT EXISTS medications TEXT[],
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS last_biometric_scan TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS biometric_verified BOOLEAN DEFAULT false;

-- Enable RLS on biometric scans table
ALTER TABLE public.user_biometric_scans ENABLE ROW LEVEL SECURITY;

-- RLS policies for biometric scans - users can only see their own data
CREATE POLICY "Users can view their own biometric scans"
ON public.user_biometric_scans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometric scans"
ON public.user_biometric_scans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biometric scans"
ON public.user_biometric_scans
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_biometric_scans_user_id ON public.user_biometric_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_biometric_scans_timestamp ON public.user_biometric_scans(scan_timestamp DESC);