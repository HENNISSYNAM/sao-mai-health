-- Insert missing disease codes using existing structure
INSERT INTO ref_diseases (code, name, threshold_daily, threshold_growth) VALUES
('dengue', 'Sốt xuất huyết', 20, 2.0),
('covid19', 'COVID-19', 15, 1.5),
('hfmd', 'Bệnh tay chân miệng', 10, 2.5),
('ari', 'Nhiễm khuẩn hô hấp', 25, 1.8),
('malaria', 'Sốt rét', 5, 3.0),
('h1n1', 'Cúm A/H1N1', 12, 2.2),
('tcm', 'Tay chân miệng', 8, 2.0)
ON CONFLICT (code) DO NOTHING;

-- Insert comprehensive demo surveillance data  
INSERT INTO case_events (disease_code, patient_hash, patient_age_bucket, patient_gender, symptoms, ward_id, district_id, facility_id, occurred_at, source, lat, lon) VALUES
-- Dengue cases from this week
('dengue', 'DEN001', '25-34', 'M', '{"fever": true, "headache": true, "muscle_pain": true, "confirmed": true}', 'Phường 1', 'Quận 1', (SELECT id FROM health_facilities LIMIT 1), '2024-09-20 08:30:00', 'clinic', 10.7769, 106.701),
('dengue', 'DEN002', '35-44', 'F', '{"fever": true, "rash": true, "probable": true}', 'Phường 2', 'Quận 1', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 14:15:00', 'hospital', 10.7850, 106.711),
('dengue', 'DEN003', '15-24', 'M', '{"fever": true, "nausea": true}', 'Phường 3', 'Quận 3', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 09:45:00', 'clinic', 10.7900, 106.720),
('dengue', 'DEN004', '45-54', 'F', '{"fever": true, "joint_pain": true, "confirmed": true}', 'Phường 4', 'Quận 4', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 16:20:00', 'hospital', 10.7600, 106.715),

-- COVID-19 cases  
('covid19', 'COV001', '45-54', 'F', '{"fever": true, "cough": true, "difficulty_breathing": true, "confirmed": true}', 'Phường 5', 'Quận 5', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 11:20:00', 'hospital', 10.8100, 106.650),
('covid19', 'COV002', '55-64', 'M', '{"fever": true, "fatigue": true, "loss_taste": true, "probable": true}', 'Phường 7', 'Quận 7', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 16:30:00', 'clinic', 10.7300, 106.690),
('covid19', 'COV003', '25-34', 'F', '{"cough": true, "fever": true, "sore_throat": true}', 'Phường 8', 'Quận 8', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 10:15:00', 'clinic', 10.7400, 106.710),

-- Hand Foot Mouth Disease
('hfmd', 'HFM001', '1-4', 'F', '{"fever": true, "mouth_sores": true, "hand_rash": true, "confirmed": true}', 'Phường 2', 'Quận 2', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 10:00:00', 'pediatric', 10.7650, 106.681),
('hfmd', 'HFM002', '1-4', 'M', '{"fever": true, "foot_rash": true}', 'Phường 4', 'Quận 4', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 13:45:00', 'clinic', 10.7950, 106.731),
('hfmd', 'HFM003', '5-9', 'F', '{"fever": true, "mouth_sores": true, "probable": true}', 'Phường 6', 'Quận 6', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 08:30:00', 'clinic', 10.8050, 106.665),

-- Respiratory infections
('ari', 'ARI001', '65+', 'M', '{"fever": true, "cough": true, "chest_pain": true, "probable": true}', 'Phường 6', 'Quận 6', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 15:20:00', 'hospital', 10.8200, 106.640),
('ari', 'ARI002', '25-34', 'F', '{"cough": true, "sore_throat": true}', 'Phường 8', 'Quận 8', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 08:15:00', 'clinic', 10.7100, 106.700),
('ari', 'ARI003', '55-64', 'M', '{"fever": true, "cough": true, "confirmed": true}', 'Phường 9', 'Quận 9', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 14:45:00', 'hospital', 10.8300, 106.730),

-- Malaria cases
('malaria', 'MAL001', '35-44', 'M', '{"fever": true, "chills": true, "sweating": true, "confirmed": true}', 'Phường 9', 'Quận 9', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 12:30:00', 'hospital', 10.8300, 106.720),
('malaria', 'MAL002', '45-54', 'F', '{"fever": true, "headache": true, "muscle_pain": true, "probable": true}', 'Phường 10', 'Quận 10', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 17:00:00', 'clinic', 10.7400, 106.750),

-- H1N1 cases
('h1n1', 'H1N001', '15-24', 'M', '{"fever": true, "cough": true, "body_aches": true, "confirmed": true}', 'Phường 11', 'Quận 11', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 09:00:00', 'hospital', 10.8000, 106.680),
('h1n1', 'H1N002', '25-34', 'F', '{"fever": true, "fatigue": true, "runny_nose": true}', 'Phường 12', 'Quận 12', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 14:30:00', 'clinic', 10.7200, 106.710),

-- Recent cases for real-time feel (using current timestamp for demo)
('dengue', 'DEN_NEW1', '30-39', 'F', '{"fever": true, "headache": true, "probable": true}', 'Phường 1', 'Quận 1', (SELECT id FROM health_facilities LIMIT 1), now() - interval '2 hours', 'emergency', 10.7770, 106.702),
('covid19', 'COV_NEW1', '40-49', 'M', '{"fever": true, "cough": true, "fatigue": true}', 'Phường 3', 'Quận 3', (SELECT id FROM health_facilities LIMIT 1), now() - interval '1 hour', 'clinic', 10.7920, 106.725),
('hfmd', 'HFM_NEW1', '2-4', 'M', '{"fever": true, "mouth_sores": true, "confirmed": true}', 'Phường 5', 'Quận 5', (SELECT id FROM health_facilities LIMIT 1), now() - interval '30 minutes', 'pediatric', 10.8110, 106.655);

-- Enable real-time updates for case_events table
ALTER TABLE case_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE case_events;