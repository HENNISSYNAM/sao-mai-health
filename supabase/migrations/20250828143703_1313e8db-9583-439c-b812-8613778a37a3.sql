-- Fix security issues

-- 1. Fix function search path for intake_case_fast
CREATE OR REPLACE FUNCTION intake_case_fast(
  p_mpi_hash TEXT,
  p_full_name TEXT,
  p_birth_year INTEGER,
  p_gender TEXT,
  p_phone_hash TEXT,
  p_address_hash TEXT,
  p_disease_code TEXT,
  p_status TEXT,
  p_onset_date DATE,
  p_report_date DATE,
  p_district_id TEXT,
  p_ward_id TEXT,
  p_facility_id TEXT,
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_symptoms JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_case_id UUID;
  v_case_number TEXT;
BEGIN
  -- Set defaults for null parameters
  p_birth_year := COALESCE(p_birth_year, NULL);
  p_gender := COALESCE(p_gender, 'other');
  p_phone_hash := COALESCE(p_phone_hash, '');
  p_address_hash := COALESCE(p_address_hash, '');
  p_status := COALESCE(p_status, 'suspected');
  p_report_date := COALESCE(p_report_date, CURRENT_DATE);
  p_district_id := COALESCE(p_district_id, '');
  p_ward_id := COALESCE(p_ward_id, '');
  p_facility_id := COALESCE(p_facility_id, '');
  p_lat := COALESCE(p_lat, NULL);
  p_lng := COALESCE(p_lng, NULL);
  p_symptoms := COALESCE(p_symptoms, '{}');

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

-- 2. Enable RLS on existing tables that don't have it
ALTER TABLE baseline_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE geography_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE geometry_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alert ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions_latest_by_cell ENABLE ROW LEVEL SECURITY;

-- 3. Add basic policies for public read access to reference tables
CREATE POLICY "Public can read health facilities" ON health_facilities FOR SELECT USING (true);
CREATE POLICY "Public can read diseases" ON ref_diseases FOR SELECT USING (true);
CREATE POLICY "Public can read districts" ON ref_districts FOR SELECT USING (true);
CREATE POLICY "Public can read wards" ON ref_wards FOR SELECT USING (true);
CREATE POLICY "Public can read dashboard" ON dashboard_kpis FOR SELECT USING (true);
CREATE POLICY "Public can read predictions" ON predictions_latest_by_cell FOR SELECT USING (true);

-- 4. Add restrictive policies for sensitive tables
CREATE POLICY "Staff can read baseline stats" ON baseline_stats FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can read alert candidates" ON alert_candidates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can read daily counts" ON daily_counts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can read health alerts" ON health_alert FOR SELECT USING (auth.uid() IS NOT NULL);