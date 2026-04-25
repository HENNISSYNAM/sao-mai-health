-- Create v_cases_list view for surveillance page
CREATE OR REPLACE VIEW health.v_cases_list AS
SELECT 
  c.id,
  c.patient_id,
  p.name_hash as patient_name,
  p.dob,
  p.gender,
  c.disease_code,
  c.disease_name as diagnosis,
  c.case_status as status,
  c.onset_date,
  c.report_date,
  f.name as facility_name,
  c.facility_id,
  c.ward,
  c.district,
  c.investigation_status,
  c.outcome,
  c.created_at,
  c.updated_at,
  -- Search text for full-text search
  CONCAT_WS(' ', 
    p.name_hash, 
    c.disease_name, 
    c.case_status, 
    f.name, 
    c.ward, 
    c.district
  ) as search_text
FROM health.cases c
LEFT JOIN health.patients p ON c.patient_id = p.id
LEFT JOIN health.facilities f ON c.facility_id = f.id;

-- Enable RLS on the view
ALTER VIEW health.v_cases_list OWNER TO postgres;

-- Create policy for public access to the view
CREATE POLICY "Public can view cases list" 
ON health.cases 
FOR SELECT 
USING (true);