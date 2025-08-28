-- Create patients table if not exists
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mpi_hash TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  birth_year INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone_hash TEXT,
  address_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cases table if not exists  
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  case_number TEXT UNIQUE NOT NULL,
  disease_code TEXT NOT NULL,
  status TEXT DEFAULT 'suspected' CHECK (status IN ('suspected', 'probable', 'confirmed', 'ruled_out', 'pending')),
  onset_date DATE NOT NULL,
  report_date DATE DEFAULT CURRENT_DATE,
  district_id TEXT,
  ward_id TEXT,
  facility_id TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  symptoms JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- RLS policies for patients
CREATE POLICY "Healthcare staff can manage patients" 
ON patients FOR ALL 
USING (auth.uid() IS NOT NULL);

-- RLS policies for cases
CREATE POLICY "Healthcare staff can manage cases" 
ON cases FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create function for case intake
CREATE OR REPLACE FUNCTION intake_case_fast(
  p_mpi_hash TEXT,
  p_full_name TEXT,
  p_birth_year INTEGER DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_phone_hash TEXT DEFAULT NULL,
  p_address_hash TEXT DEFAULT NULL,
  p_disease_code TEXT,
  p_status TEXT DEFAULT 'suspected',
  p_onset_date DATE,
  p_report_date DATE DEFAULT CURRENT_DATE,
  p_district_id TEXT DEFAULT NULL,
  p_ward_id TEXT DEFAULT NULL,
  p_facility_id TEXT DEFAULT NULL,
  p_lat DECIMAL DEFAULT NULL,
  p_lng DECIMAL DEFAULT NULL,
  p_symptoms JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_patient_id UUID;
  v_case_id UUID;
  v_case_number TEXT;
BEGIN
  -- Upsert patient
  INSERT INTO patients (mpi_hash, full_name, birth_year, gender, phone_hash, address_hash)
  VALUES (p_mpi_hash, p_full_name, p_birth_year, p_gender, p_phone_hash, p_address_hash)
  ON CONFLICT (mpi_hash) 
  DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    birth_year = COALESCE(EXCLUDED.birth_year, patients.birth_year),
    gender = COALESCE(EXCLUDED.gender, patients.gender),
    phone_hash = COALESCE(EXCLUDED.phone_hash, patients.phone_hash),
    address_hash = COALESCE(EXCLUDED.address_hash, patients.address_hash),
    updated_at = NOW()
  RETURNING id INTO v_patient_id;

  -- Generate case number
  v_case_number := 'CASE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Insert case
  INSERT INTO cases (
    patient_id, case_number, disease_code, status, onset_date, report_date,
    district_id, ward_id, facility_id, lat, lng, symptoms
  )
  VALUES (
    v_patient_id, v_case_number, p_disease_code, p_status, p_onset_date, p_report_date,
    p_district_id, p_ward_id, p_facility_id, p_lat, p_lng, p_symptoms
  )
  RETURNING id INTO v_case_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'patient_id', v_patient_id,
    'case_id', v_case_id,
    'case_number', v_case_number,
    'message', 'Case intake completed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Case intake failed'
    );
END;
$$;

-- Add tables to realtime publication
ALTER TABLE patients REPLICA IDENTITY FULL;
ALTER TABLE cases REPLICA IDENTITY FULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at  
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();