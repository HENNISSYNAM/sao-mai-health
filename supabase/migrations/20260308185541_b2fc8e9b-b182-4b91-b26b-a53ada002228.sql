
-- Health Record System: Patient ID + Encounter tracking from face scans
-- Each user gets a unique health_record_id (Patient ID), each scan creates an encounter

CREATE TABLE public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_code TEXT NOT NULL UNIQUE, -- e.g. SMH-2026-XXXX
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.health_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES public.health_records(id) ON DELETE CASCADE NOT NULL,
  encounter_code TEXT NOT NULL UNIQUE, -- e.g. ENC-20260308-XXXX
  scan_type TEXT NOT NULL DEFAULT 'face_scan', -- face_scan, retina_scan, manual
  status TEXT NOT NULL DEFAULT 'completed', -- completed, in_progress, cancelled
  vital_signs JSONB DEFAULT '{}'::jsonb,
  facial_metrics JSONB DEFAULT '{}'::jsonb,
  inferred_health JSONB DEFAULT '{}'::jsonb,
  recommendations TEXT[] DEFAULT '{}',
  confidence REAL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_health_records_user ON public.health_records(user_id);
CREATE INDEX idx_health_encounters_record ON public.health_encounters(record_id);
CREATE INDEX idx_health_encounters_created ON public.health_encounters(created_at DESC);

-- RLS
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own health records"
  ON public.health_records FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own encounters"
  ON public.health_encounters FOR ALL TO authenticated
  USING (record_id IN (SELECT id FROM public.health_records WHERE user_id = auth.uid()))
  WITH CHECK (record_id IN (SELECT id FROM public.health_records WHERE user_id = auth.uid()));

-- Function to generate patient code
CREATE OR REPLACE FUNCTION public.generate_patient_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq INT;
  code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_code FROM '[0-9]+$') AS INT)), 0) + 1
  INTO seq FROM public.health_records;
  code := 'SMH-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN code;
END;
$$;

-- Function to generate encounter code
CREATE OR REPLACE FUNCTION public.generate_encounter_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq INT;
  code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(encounter_code FROM '[0-9]+$') AS INT)), 0) + 1
  INTO seq FROM public.health_encounters;
  code := 'ENC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN code;
END;
$$;
