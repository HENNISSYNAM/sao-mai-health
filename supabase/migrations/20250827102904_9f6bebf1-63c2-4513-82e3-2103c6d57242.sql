-- Create health schema and required tables for smart search
CREATE SCHEMA IF NOT EXISTS health;

-- Create patients table
CREATE TABLE IF NOT EXISTS health.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hash text NOT NULL,
  dob date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  phone_hash text,
  address_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cases table
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

-- Add search_text columns separately (simple text columns, not computed)
ALTER TABLE health.patients ADD COLUMN IF NOT EXISTS search_text text;
ALTER TABLE health.cases ADD COLUMN IF NOT EXISTS search_text text;

-- Create function to update search_text for patients
CREATE OR REPLACE FUNCTION update_patients_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text = unaccent(lower(CONCAT_WS(' ', NEW.name_hash, NEW.phone_hash, NEW.address_hash)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update search_text for cases  
CREATE OR REPLACE FUNCTION update_cases_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text = unaccent(lower(CONCAT_WS(' ', NEW.disease_name, NEW.case_status, NEW.ward, NEW.district, NEW.investigation_status)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update search_text
DROP TRIGGER IF EXISTS patients_search_text_trigger ON health.patients;
CREATE TRIGGER patients_search_text_trigger
  BEFORE INSERT OR UPDATE ON health.patients
  FOR EACH ROW EXECUTE FUNCTION update_patients_search_text();

DROP TRIGGER IF EXISTS cases_search_text_trigger ON health.cases;
CREATE TRIGGER cases_search_text_trigger
  BEFORE INSERT OR UPDATE ON health.cases
  FOR EACH ROW EXECUTE FUNCTION update_cases_search_text();

-- Enable RLS
ALTER TABLE health.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.facilities ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Public can view patients" ON health.patients FOR SELECT USING (true);
CREATE POLICY "Public can view cases" ON health.cases FOR SELECT USING (true);  
CREATE POLICY "Public can view facilities" ON health.facilities FOR SELECT USING (true);

-- Install extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_patients_search_text ON health.patients USING gin(search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_search_text ON health.cases USING gin(search_text gin_trgm_ops);

-- Insert some test data
INSERT INTO health.facilities (id, name, type, district, ward) VALUES
('BV001', 'Bệnh viện Chợ Rẫy', 'Bệnh viện', 'Quận 5', 'Phường 11'),
('TYT001', 'Trạm y tế Phường 1', 'Trạm y tế', 'Quận 1', 'Phường 1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO health.patients (name_hash, dob, gender, phone_hash, address_hash) VALUES
('Nguyễn Văn A', '1990-01-15', 'male', '0901234567', '123 Nguyễn Huệ'),
('Trần Thị B', '1985-05-20', 'female', '0987654321', '456 Lê Lợi'),
('Lê Minh C', '1995-12-10', 'male', '0912345678', '789 Hai Bà Trưng')
ON CONFLICT (id) DO NOTHING;