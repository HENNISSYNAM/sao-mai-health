-- Fix facility_id to be uuid and add test data correctly
ALTER TABLE health.facilities ALTER COLUMN id TYPE uuid USING id::uuid;

-- Add some test cases now that we have patients
INSERT INTO health.cases (patient_id, disease_code, disease_name, case_status, onset_date, facility_id, ward, district) 
SELECT 
  p.id, 
  'DENGUE', 
  'Sốt xuất huyết dengue', 
  'confirmed', 
  '2024-08-20', 
  f.id, 
  'Phường 1', 
  'Quận 1'
FROM health.patients p 
CROSS JOIN health.facilities f 
WHERE p.name_hash = 'Nguyễn Văn A' AND f.name = 'Bệnh viện Chợ Rẫy'
LIMIT 1;

INSERT INTO health.cases (patient_id, disease_code, disease_name, case_status, onset_date, facility_id, ward, district)
SELECT 
  p.id, 
  'COVID19', 
  'COVID-19', 
  'suspected', 
  '2024-08-25', 
  f.id, 
  'Phường 2', 
  'Quận 5'
FROM health.patients p 
CROSS JOIN health.facilities f 
WHERE p.name_hash = 'Trần Thị B' AND f.name = 'Trạm y tế Phường 1'
LIMIT 1;