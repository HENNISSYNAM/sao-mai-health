-- Insert comprehensive demo data for disease surveillance
INSERT INTO case_events (disease_code, patient_hash, patient_age_bucket, patient_gender, symptoms, ward_id, district_id, facility_id, occurred_at, source, lat, lon) VALUES
-- Dengue cases
('dengue', 'patient_001', '25-34', 'M', '{"fever": true, "headache": true, "muscle_pain": true, "confirmed": true}', 'Phuong 1', 'Quan 1', (SELECT id FROM health_facilities LIMIT 1), '2024-09-20 08:30:00', 'clinic', 10.7769, 106.701),
('dengue', 'patient_002', '35-44', 'F', '{"fever": true, "rash": true, "probable": true}', 'Phuong 2', 'Quan 1', (SELECT id FROM health_facilities LIMIT 1), '2024-09-20 14:15:00', 'hospital', 10.7850, 106.711),
('dengue', 'patient_003', '15-24', 'M', '{"fever": true, "nausea": true}', 'Phuong 3', 'Quan 3', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 09:45:00', 'clinic', 10.7900, 106.720),

-- COVID-19 cases  
('covid19', 'patient_004', '45-54', 'F', '{"fever": true, "cough": true, "difficulty_breathing": true, "confirmed": true}', 'Phuong 5', 'Quan 5', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 11:20:00', 'hospital', 10.8100, 106.650),
('covid19', 'patient_005', '55-64', 'M', '{"fever": true, "fatigue": true, "loss_taste": true, "probable": true}', 'Phuong 7', 'Quan 7', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 16:30:00', 'clinic', 10.7300, 106.690),

-- Hand Foot Mouth Disease
('hfmd', 'patient_006', '1-4', 'F', '{"fever": true, "mouth_sores": true, "hand_rash": true, "confirmed": true}', 'Phuong 2', 'Quan 2', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 10:00:00', 'pediatric', 10.7650, 106.681),
('hfmd', 'patient_007', '1-4', 'M', '{"fever": true, "foot_rash": true}', 'Phuong 4', 'Quan 4', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 13:45:00', 'clinic', 10.7950, 106.731),

-- Respiratory infections
('ari', 'patient_008', '65+', 'M', '{"fever": true, "cough": true, "chest_pain": true, "probable": true}', 'Phuong 6', 'Quan 6', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 15:20:00', 'hospital', 10.8200, 106.640),
('ari', 'patient_009', '25-34', 'F', '{"cough": true, "sore_throat": true}', 'Phuong 8', 'Quan 8', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 08:15:00', 'clinic', 10.7100, 106.700),

-- Malaria cases
('malaria', 'patient_010', '35-44', 'M', '{"fever": true, "chills": true, "sweating": true, "confirmed": true}', 'Phuong 9', 'Quan 9', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 12:30:00', 'hospital', 10.8300, 106.720),
('malaria', 'patient_011', '45-54', 'F', '{"fever": true, "headache": true, "muscle_pain": true, "probable": true}', 'Phuong 10', 'Quan 10', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 17:00:00', 'clinic', 10.7400, 106.750),

-- H1N1 cases
('h1n1', 'patient_012', '15-24', 'M', '{"fever": true, "cough": true, "body_aches": true, "confirmed": true}', 'Phuong 11', 'Quan 11', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 09:00:00', 'hospital', 10.8000, 106.680),
('h1n1', 'patient_013', '25-34', 'F', '{"fever": true, "fatigue": true, "runny_nose": true}', 'Phuong 12', 'Quan 12', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 14:30:00', 'clinic', 10.7200, 106.710);

-- Create patients table if not exists for better data relationships
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create policy for patients
CREATE POLICY "Healthcare staff can manage patients" ON patients
FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert demo patients
INSERT INTO patients (id, full_name, phone, date_of_birth, gender, address) VALUES
(gen_random_uuid(), 'Nguyễn Văn An', '0901234567', '1990-05-15', 'M', '123 Đường ABC, Phường 1, Quận 1'),
(gen_random_uuid(), 'Trần Thị Bình', '0907654321', '1985-08-22', 'F', '456 Đường XYZ, Phường 2, Quận 1'),
(gen_random_uuid(), 'Lê Văn Cường', '0912345678', '2000-12-10', 'M', '789 Đường DEF, Phường 3, Quận 3'),
(gen_random_uuid(), 'Phạm Thị Dung', '0987654321', '1975-03-18', 'F', '321 Đường GHI, Phường 5, Quận 5'),
(gen_random_uuid(), 'Hoàng Văn Em', '0934567890', '1965-11-25', 'M', '654 Đường JKL, Phường 7, Quận 7');

-- Update some case_events to link with patients
UPDATE case_events SET patient_id = (
  SELECT id FROM patients WHERE full_name = 'Nguyễn Văn An'
) WHERE patient_hash = 'patient_001';

UPDATE case_events SET patient_id = (
  SELECT id FROM patients WHERE full_name = 'Trần Thị Bình'  
) WHERE patient_hash = 'patient_002';

UPDATE case_events SET patient_id = (
  SELECT id FROM patients WHERE full_name = 'Lê Văn Cường'
) WHERE patient_hash = 'patient_003';