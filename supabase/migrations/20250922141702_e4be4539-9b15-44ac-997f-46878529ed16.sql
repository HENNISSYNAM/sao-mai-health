-- Insert demo surveillance data using existing disease codes
INSERT INTO case_events (disease_code, patient_hash, patient_age_bucket, patient_gender, symptoms, ward_id, district_id, facility_id, occurred_at, source, lat, lon) VALUES
-- Using existing D01 (Sốt xuất huyết)
('D01', 'DEN001', '25-34', 'M', '{"fever": true, "headache": true, "muscle_pain": true, "confirmed": true}', 'Phường 1', 'Quận 1', (SELECT id FROM health_facilities LIMIT 1), '2024-09-20 08:30:00', 'clinic', 10.7769, 106.701),
('D01', 'DEN002', '35-44', 'F', '{"fever": true, "rash": true, "probable": true}', 'Phường 2', 'Quận 1', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 14:15:00', 'hospital', 10.7850, 106.711),
('D01', 'DEN003', '15-24', 'M', '{"fever": true, "nausea": true}', 'Phường 3', 'Quận 3', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 09:45:00', 'clinic', 10.7900, 106.720),
('D01', 'DEN004', '45-54', 'F', '{"fever": true, "joint_pain": true, "confirmed": true}', 'Phường 4', 'Quận 4', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 16:20:00', 'hospital', 10.7600, 106.715),

-- Using existing D02 (Tay chân miệng)  
('D02', 'HFM001', '1-4', 'F', '{"fever": true, "mouth_sores": true, "hand_rash": true, "confirmed": true}', 'Phường 2', 'Quận 2', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 10:00:00', 'pediatric', 10.7650, 106.681),
('D02', 'HFM002', '1-4', 'M', '{"fever": true, "foot_rash": true}', 'Phường 4', 'Quận 4', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 13:45:00', 'clinic', 10.7950, 106.731),
('D02', 'HFM003', '5-9', 'F', '{"fever": true, "mouth_sores": true, "probable": true}', 'Phường 6', 'Quận 6', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 08:30:00', 'clinic', 10.8050, 106.665),

-- COVID-19 cases with D03
('D03', 'COV001', '45-54', 'F', '{"fever": true, "cough": true, "difficulty_breathing": true, "confirmed": true}', 'Phường 5', 'Quận 5', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 11:20:00', 'hospital', 10.8100, 106.650),
('D03', 'COV002', '55-64', 'M', '{"fever": true, "fatigue": true, "loss_taste": true, "probable": true}', 'Phường 7', 'Quận 7', (SELECT id FROM health_facilities LIMIT 1), '2024-09-21 16:30:00', 'clinic', 10.7300, 106.690),

-- Respiratory infections with D04
('D04', 'ARI001', '65+', 'M', '{"fever": true, "cough": true, "chest_pain": true, "probable": true}', 'Phường 6', 'Quận 6', (SELECT id FROM health_facilities LIMIT 1), '2024-09-22 15:20:00', 'hospital', 10.8200, 106.640),
('D04', 'ARI002', '25-34', 'F', '{"cough": true, "sore_throat": true}', 'Phường 8', 'Quận 8', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 08:15:00', 'clinic', 10.7100, 106.700),

-- Malaria cases with D05
('D05', 'MAL001', '35-44', 'M', '{"fever": true, "chills": true, "sweating": true, "confirmed": true}', 'Phường 9', 'Quận 9', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 12:30:00', 'hospital', 10.8300, 106.720),
('D05', 'MAL002', '45-54', 'F', '{"fever": true, "headache": true, "muscle_pain": true, "probable": true}', 'Phường 10', 'Quận 10', (SELECT id FROM health_facilities LIMIT 1), '2024-09-23 17:00:00', 'clinic', 10.7400, 106.750),

-- Recent cases for real-time demo
('D01', 'DEN_NEW1', '30-39', 'F', '{"fever": true, "headache": true, "probable": true}', 'Phường 1', 'Quận 1', (SELECT id FROM health_facilities LIMIT 1), now() - interval '2 hours', 'emergency', 10.7770, 106.702),
('D03', 'COV_NEW1', '40-49', 'M', '{"fever": true, "cough": true, "fatigue": true}', 'Phường 3', 'Quận 3', (SELECT id FROM health_facilities LIMIT 1), now() - interval '1 hour', 'clinic', 10.7920, 106.725),
('D02', 'HFM_NEW1', '2-4', 'M', '{"fever": true, "mouth_sores": true, "confirmed": true}', 'Phường 5', 'Quận 5', (SELECT id FROM health_facilities LIMIT 1), now() - interval '30 minutes', 'pediatric', 10.8110, 106.655),
('D04', 'ARI_NEW1', '35-44', 'F', '{"cough": true, "fever": true, "runny_nose": true}', 'Phường 7', 'Quận 7', (SELECT id FROM health_facilities LIMIT 1), now() - interval '15 minutes', 'clinic', 10.7320, 106.695),
('D05', 'MAL_NEW1', '50-59', 'M', '{"fever": true, "chills": true, "probable": true}', 'Phường 9', 'Quận 9', (SELECT id FROM health_facilities LIMIT 1), now() - interval '5 minutes', 'hospital', 10.8310, 106.725);