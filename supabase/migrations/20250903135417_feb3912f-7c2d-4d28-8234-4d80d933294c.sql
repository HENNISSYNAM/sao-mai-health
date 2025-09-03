-- Enable required extensions for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create simple indexes for case_events table for fast search
CREATE INDEX IF NOT EXISTS idx_case_events_id_trgm ON case_events USING gin (id::text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_case_events_patient_hash_trgm ON case_events USING gin (patient_hash gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_case_events_disease_code_trgm ON case_events USING gin (disease_code gin_trgm_ops);

-- Create index for patient name search
CREATE INDEX IF NOT EXISTS idx_patients_fullname_trgm ON patients USING gin (full_name gin_trgm_ops);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_case_events_disease_code ON case_events (disease_code);
CREATE INDEX IF NOT EXISTS idx_case_events_occurred_at ON case_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_events_ward_district ON case_events (ward_id, district_id);