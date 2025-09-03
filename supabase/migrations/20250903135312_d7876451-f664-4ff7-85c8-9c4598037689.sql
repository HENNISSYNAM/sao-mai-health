-- Enable required extensions for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create indexes for case_events table for fast search
CREATE INDEX IF NOT EXISTS idx_case_events_search_text 
ON case_events USING gin (
  (
    coalesce(id::text, '') || ' ' ||
    coalesce(patient_hash, '') || ' ' ||
    coalesce(disease_code, '') || ' ' ||
    coalesce(ward_id, '') || ' ' ||
    coalesce(district_id, '')
  ) gin_trgm_ops
);

-- Create index for unaccented search on patients table
CREATE INDEX IF NOT EXISTS idx_patients_search_unaccent 
ON patients USING gin (
  unaccent(coalesce(full_name, '')) gin_trgm_ops
);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_case_events_disease_code ON case_events (disease_code);
CREATE INDEX IF NOT EXISTS idx_case_events_occurred_at ON case_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_events_ward_district ON case_events (ward_id, district_id);

-- Create a view for surveillance cases with patient data
CREATE OR REPLACE VIEW surveillance_cases AS
SELECT 
  ce.id,
  ce.occurred_at,
  ce.disease_code,
  ce.patient_hash,
  ce.patient_age_bucket,
  ce.patient_gender,
  ce.symptoms,
  ce.ward_id,
  ce.district_id,
  ce.facility_id,
  p.full_name as patient_name,
  p.phone as patient_phone,
  hf.name as facility_name,
  -- Determine status based on symptoms or other criteria
  CASE 
    WHEN ce.symptoms ? 'confirmed' THEN 'confirmed'
    WHEN ce.symptoms ? 'probable' THEN 'probable'
    ELSE 'suspected'
  END as status
FROM case_events ce
LEFT JOIN patients p ON ce.patient_id = p.id
LEFT JOIN health_facilities hf ON ce.facility_id = hf.id;