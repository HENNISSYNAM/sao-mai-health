-- Create health schema and required tables for smart search
CREATE SCHEMA IF NOT EXISTS health;

-- Create patients table with search_text
CREATE TABLE IF NOT EXISTS health.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hash text NOT NULL,
  dob date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  phone_hash text,
  address_hash text,
  search_text text GENERATED ALWAYS AS (
    unaccent(lower(CONCAT_WS(' ', name_hash, phone_hash, address_hash)))
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cases table with search_text
CREATE TABLE IF NOT EXISTS health.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES health.patients(id),
  disease_code text NOT NULL,
  disease_name text NOT NULL,
  case_status text CHECK (case_status IN ('suspected', 'probable', 'confirmed', 'ruled_out', 'pending')),
  onset_date date,
  report_date date DEFAULT CURRENT_DATE,
  facility_id text,
  ward text,
  district text,
  investigation_status text,
  outcome text,
  search_text text GENERATED ALWAYS AS (
    unaccent(lower(CONCAT_WS(' ', disease_name, case_status, ward, district, investigation_status)))
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create facilities table
CREATE TABLE IF NOT EXISTS health.facilities (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text,
  district text,
  ward text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE health.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.facilities ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security needs)
CREATE POLICY "Public can view patients" ON health.patients FOR SELECT USING (true);
CREATE POLICY "Public can view cases" ON health.cases FOR SELECT USING (true);
CREATE POLICY "Public can view facilities" ON health.facilities FOR SELECT USING (true);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_patients_search_text ON health.patients USING gin(search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_search_text ON health.cases USING gin(search_text gin_trgm_ops);

-- Install pg_trgm extension if not exists (for trigram similarity search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;