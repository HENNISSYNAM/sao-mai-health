
-- =============================================
-- COMPREHENSIVE BODY SCAN STORAGE SCHEMA
-- For clinic-grade Digital Twin data persistence
-- =============================================

-- 1. Body Scan Sessions: master record per full-body or face scan visit
CREATE TABLE public.body_scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  encounter_id UUID REFERENCES public.health_encounters(id) ON DELETE SET NULL,
  session_code TEXT NOT NULL UNIQUE,
  scan_mode TEXT NOT NULL DEFAULT 'face' CHECK (scan_mode IN ('face', 'upper_body', 'full_body', 'targeted')),
  device_info JSONB DEFAULT '{}',
  environment JSONB DEFAULT '{}',
  ai_model_version TEXT,
  overall_confidence REAL,
  overall_health_score REAL,
  duration_seconds INTEGER,
  image_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'reviewed')),
  clinician_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Body Region Scans: per-region detailed data
CREATE TABLE public.body_region_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.body_scan_sessions(id) ON DELETE CASCADE,
  region_code TEXT NOT NULL CHECK (region_code IN (
    'face', 'forehead', 'eyes', 'nose', 'mouth', 'chin', 'ears',
    'neck', 'chest', 'abdomen', 'upper_back', 'lower_back',
    'left_shoulder', 'right_shoulder', 'left_arm', 'right_arm',
    'left_hand', 'right_hand', 'left_leg', 'right_leg',
    'left_foot', 'right_foot', 'scalp', 'skin_general'
  )),
  measurements JSONB NOT NULL DEFAULT '{}',
  anomalies JSONB DEFAULT '[]',
  risk_indicators JSONB DEFAULT '{}',
  ai_analysis JSONB DEFAULT '{}',
  icd11_codes TEXT[] DEFAULT '{}',
  confidence REAL,
  image_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Vital Signs Timeline: granular time-series vital data per scan
CREATE TABLE public.scan_vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.body_scan_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  heart_rate REAL,
  heart_rate_variability REAL,
  spo2 REAL,
  blood_pressure_systolic REAL,
  blood_pressure_diastolic REAL,
  respiratory_rate REAL,
  body_temperature REAL,
  stress_index REAL,
  fatigue_index REAL,
  hydration_level REAL,
  blood_glucose_estimate REAL,
  hemoglobin_estimate REAL,
  bmi_estimate REAL,
  biological_age_estimate REAL,
  source TEXT NOT NULL DEFAULT 'face_scan',
  confidence REAL,
  raw_data JSONB DEFAULT '{}'
);

-- 4. Dermatological Findings: skin-specific AI analysis
CREATE TABLE public.scan_dermatology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.body_scan_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  region_code TEXT NOT NULL,
  finding_type TEXT NOT NULL,
  description TEXT,
  color_analysis JSONB DEFAULT '{}',
  texture_analysis JSONB DEFAULT '{}',
  symmetry_score REAL,
  size_mm REAL,
  risk_level TEXT DEFAULT 'normal' CHECK (risk_level IN ('normal', 'monitor', 'warning', 'critical')),
  icd11_code TEXT,
  image_ref TEXT,
  ai_confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Facial Landmark Analysis: detailed 3D face geometry
CREATE TABLE public.scan_facial_landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.body_scan_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  landmark_count INTEGER,
  facial_symmetry_score REAL,
  left_right_deviation REAL,
  drooping_indicators JSONB DEFAULT '{}',
  expression_analysis JSONB DEFAULT '{}',
  muscle_tone_map JSONB DEFAULT '{}',
  skin_elasticity_map JSONB DEFAULT '{}',
  wrinkle_map JSONB DEFAULT '{}',
  pigmentation_map JSONB DEFAULT '{}',
  vascular_pattern JSONB DEFAULT '{}',
  stroke_risk_indicators JSONB DEFAULT '{}',
  bells_palsy_score REAL,
  raw_landmarks JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Clinical Measurements: precise body measurements
CREATE TABLE public.scan_clinical_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.body_scan_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  measurement_type TEXT NOT NULL,
  measurement_name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  reference_min REAL,
  reference_max REAL,
  percentile REAL,
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'low', 'high', 'critical')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Scan Media: images/frames captured during scan
CREATE TABLE public.scan_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.body_scan_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'thermal', 'depth_map', '3d_model', 'video_frame')),
  region_code TEXT,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  resolution TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Enhance health_encounters with body scan linkage
ALTER TABLE public.health_encounters 
  ADD COLUMN IF NOT EXISTS body_scan_session_id UUID REFERENCES public.body_scan_sessions(id),
  ADD COLUMN IF NOT EXISTS body_regions_scanned TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dermatology_findings JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS clinical_measurements JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stroke_risk_score REAL,
  ADD COLUMN IF NOT EXISTS biological_age REAL,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_diagnosis_codes TEXT[] DEFAULT '{}';

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_body_scan_sessions_user ON public.body_scan_sessions(user_id);
CREATE INDEX idx_body_scan_sessions_created ON public.body_scan_sessions(created_at DESC);
CREATE INDEX idx_body_region_scans_session ON public.body_region_scans(session_id);
CREATE INDEX idx_body_region_scans_region ON public.body_region_scans(region_code);
CREATE INDEX idx_scan_vital_signs_user ON public.scan_vital_signs(user_id, measured_at DESC);
CREATE INDEX idx_scan_vital_signs_session ON public.scan_vital_signs(session_id);
CREATE INDEX idx_scan_dermatology_user ON public.scan_dermatology(user_id);
CREATE INDEX idx_scan_dermatology_session ON public.scan_dermatology(session_id);
CREATE INDEX idx_scan_facial_landmarks_session ON public.scan_facial_landmarks(session_id);
CREATE INDEX idx_scan_clinical_measurements_session ON public.scan_clinical_measurements(session_id);
CREATE INDEX idx_scan_media_session ON public.scan_media(session_id);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.body_scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_region_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_dermatology ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_facial_landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_clinical_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_media ENABLE ROW LEVEL SECURITY;

-- body_scan_sessions
CREATE POLICY "Users manage own scan sessions" ON public.body_scan_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- body_region_scans (via session ownership)
CREATE POLICY "Users manage own region scans" ON public.body_region_scans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.body_scan_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.body_scan_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );

-- scan_vital_signs
CREATE POLICY "Users manage own vital signs" ON public.scan_vital_signs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- scan_dermatology
CREATE POLICY "Users manage own dermatology" ON public.scan_dermatology
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- scan_facial_landmarks
CREATE POLICY "Users manage own facial landmarks" ON public.scan_facial_landmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- scan_clinical_measurements
CREATE POLICY "Users manage own measurements" ON public.scan_clinical_measurements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- scan_media
CREATE POLICY "Users manage own scan media" ON public.scan_media
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKET for scan images
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('scan-media', 'scan-media', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own scan media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'scan-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own scan media" ON storage.objects
  FOR SELECT USING (bucket_id = 'scan-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own scan media" ON storage.objects
  FOR DELETE USING (bucket_id = 'scan-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- AUTO-UPDATE TRIGGER
-- =============================================
CREATE TRIGGER update_body_scan_sessions_updated_at
  BEFORE UPDATE ON public.body_scan_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- HELPER: Generate session code
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_scan_session_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'SCN-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 9999)::text, 4, '0');
  RETURN code;
END;
$$;
