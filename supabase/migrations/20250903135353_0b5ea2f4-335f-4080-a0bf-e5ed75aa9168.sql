-- Enable required extensions for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create immutable function for search text concatenation
CREATE OR REPLACE FUNCTION case_search_text(case_events)
RETURNS text AS $$
  SELECT coalesce($1.id::text, '') || ' ' ||
         coalesce($1.patient_hash, '') || ' ' ||
         coalesce($1.disease_code, '') || ' ' ||
         coalesce($1.ward_id, '') || ' ' ||
         coalesce($1.district_id, '')
$$ LANGUAGE sql IMMUTABLE;

-- Create immutable function for unaccented patient name
CREATE OR REPLACE FUNCTION patient_name_unaccent(patients)
RETURNS text AS $$
  SELECT unaccent(coalesce($1.full_name, ''))
$$ LANGUAGE sql IMMUTABLE;

-- Create indexes for case_events table for fast search
CREATE INDEX IF NOT EXISTS idx_case_events_search_text 
ON case_events USING gin (case_search_text(case_events) gin_trgm_ops);

-- Create index for unaccented search on patients table
CREATE INDEX IF NOT EXISTS idx_patients_search_unaccent 
ON patients USING gin (patient_name_unaccent(patients) gin_trgm_ops);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_case_events_disease_code ON case_events (disease_code);
CREATE INDEX IF NOT EXISTS idx_case_events_occurred_at ON case_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_events_ward_district ON case_events (ward_id, district_id);