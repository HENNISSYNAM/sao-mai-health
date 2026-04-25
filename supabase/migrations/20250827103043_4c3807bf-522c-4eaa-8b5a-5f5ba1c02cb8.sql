-- Clean up and recreate with proper structure
-- First change facility_id to uuid type in cases table
ALTER TABLE health.cases ALTER COLUMN facility_id TYPE uuid USING facility_id::uuid;

-- Now fix the facilities table UUID issue by recreating with proper UUIDs
DELETE FROM health.facilities;
INSERT INTO health.facilities (id, name, type, district, ward) VALUES
(gen_random_uuid(), 'Bệnh viện Chợ Rẫy', 'Bệnh viện', 'Quận 5', 'Phường 11'),
(gen_random_uuid(), 'Trạm y tế Phường 1', 'Trạm y tế', 'Quận 1', 'Phường 1');

-- Now we can add test cases properly
INSERT INTO health.cases (patient_id, disease_code, disease_name, case_status, onset_date, facility_id, ward, district) 
SELECT 
  (SELECT id FROM health.patients WHERE name_hash = 'Nguyễn Văn A' LIMIT 1), 
  'DENGUE', 
  'Sốt xuất huyết dengue', 
  'confirmed', 
  '2024-08-20', 
  (SELECT id FROM health.facilities WHERE name = 'Bệnh viện Chợ Rẫy' LIMIT 1), 
  'Phường 1', 
  'Quận 1';

INSERT INTO health.cases (patient_id, disease_code, disease_name, case_status, onset_date, facility_id, ward, district)
SELECT 
  (SELECT id FROM health.patients WHERE name_hash = 'Trần Thị B' LIMIT 1), 
  'COVID19', 
  'COVID-19', 
  'suspected', 
  '2024-08-25', 
  (SELECT id FROM health.facilities WHERE name = 'Trạm y tế Phường 1' LIMIT 1), 
  'Phường 2', 
  'Quận 5';