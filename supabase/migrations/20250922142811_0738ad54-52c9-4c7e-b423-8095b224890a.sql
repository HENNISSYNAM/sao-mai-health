-- Add more comprehensive demo data for surveillance system
INSERT INTO case_events (disease_code, patient_hash, patient_age_bucket, patient_gender, symptoms, ward_id, district_id, facility_id, occurred_at, source, lat, lon) VALUES
-- More dengue cases (D01)
('D01', 'DEN005', '20-29', 'F', '{"fever": true, "headache": true, "joint_pain": true, "confirmed": true}', 'Phường 12', 'Quận 1', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 10:30:00', 'clinic', 10.7780, 106.703),
('D01', 'DEN006', '30-39', 'M', '{"fever": true, "muscle_pain": true, "rash": true, "probable": true}', 'Phường 15', 'Quận 3', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 15:45:00', 'hospital', 10.7850, 106.715),
('D01', 'DEN007', '40-49', 'F', '{"fever": true, "nausea": true, "vomiting": true}', 'Phường 8', 'Quận 5', (SELECT id FROM health_facilities LIMIT 1), '2024-09-25 08:15:00', 'clinic', 10.7600, 106.680),

-- More Hand-Foot-Mouth cases (D02)
('D02', 'HFM004', '3-5', 'M', '{"fever": true, "mouth_sores": true, "hand_rash": true, "foot_rash": true, "confirmed": true}', 'Phường 7', 'Quận 2', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 11:20:00', 'pediatric', 10.7700, 106.685),
('D02', 'HFM005', '2-4', 'F', '{"fever": true, "mouth_sores": true, "probable": true}', 'Phường 10', 'Quận 4', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 16:30:00', 'clinic', 10.7980, 106.740),
('D02', 'HFM006', '1-3', 'M', '{"fever": true, "hand_rash": true}', 'Phường 5', 'Quận 6', (SELECT id FROM health_facilities LIMIT 1), '2024-09-25 09:45:00', 'clinic', 10.8080, 106.670),

-- More COVID-19 cases (D03)
('D03', 'COV004', '35-44', 'M', '{"fever": true, "cough": true, "loss_smell": true, "confirmed": true}', 'Phường 20', 'Quận 7', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 12:00:00', 'hospital', 10.7350, 106.695),
('D03', 'COV005', '50-59', 'F', '{"fever": true, "fatigue": true, "headache": true, "probable": true}', 'Phường 3', 'Quận 8', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 17:15:00', 'clinic', 10.7450, 106.715),
('D03', 'COV006', '25-34', 'M', '{"cough": true, "sore_throat": true, "fever": true}', 'Phường 11', 'Quận 9', (SELECT id FROM health_facilities LIMIT 1), '2024-09-25 10:30:00', 'clinic', 10.8350, 106.730),

-- More Respiratory Infection cases (D04)
('D04', 'ARI004', '70+', 'F', '{"fever": true, "cough": true, "difficulty_breathing": true, "confirmed": true}', 'Phường 14', 'Quận 6', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 13:45:00', 'hospital', 10.8250, 106.645),
('D04', 'ARI005', '40-49', 'M', '{"cough": true, "chest_pain": true, "fever": true, "probable": true}', 'Phường 6', 'Quận 8', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 18:00:00', 'clinic', 10.7150, 106.705),
('D04', 'ARI006', '60-69', 'F', '{"cough": true, "fatigue": true, "sore_throat": true}', 'Phường 13', 'Quận 9', (SELECT id FROM health_facilities LIMIT 1), '2024-09-25 11:15:00', 'clinic', 10.8400, 106.735),

-- More Malaria cases (D05)
('D05', 'MAL003', '25-34', 'M', '{"fever": true, "chills": true, "sweating": true, "headache": true, "confirmed": true}', 'Phường 16', 'Quận 10', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 14:30:00', 'hospital', 10.7450, 106.755),
('D05', 'MAL004', '40-49', 'F', '{"fever": true, "muscle_pain": true, "nausea": true, "probable": true}', 'Phường 8', 'Quận 11', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 19:20:00', 'clinic', 10.8050, 106.685),

-- H1N1 cases (D06)
('D06', 'H1N003', '20-29', 'F', '{"fever": true, "cough": true, "body_aches": true, "headache": true, "confirmed": true}', 'Phường 9', 'Quận 12', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 15:15:00', 'hospital', 10.7250, 106.715),
('D06', 'H1N004', '30-39', 'M', '{"fever": true, "runny_nose": true, "fatigue": true, "sore_throat": true, "probable": true}', 'Phường 4', 'Quận 1', (SELECT id FROM health_facilities LIMIT 1), '2024-09-24 20:45:00', 'clinic', 10.7790, 106.706),

-- Very recent cases for real-time demo (last few hours)
('D01', 'DEN_LIVE1', '35-44', 'M', '{"fever": true, "severe_headache": true, "muscle_pain": true, "probable": true}', 'Phường 2', 'Quận 1', (SELECT id FROM health_facilities LIMIT 1), now() - interval '3 hours', 'emergency', 10.7775, 106.704),
('D03', 'COV_LIVE1', '50-59', 'F', '{"fever": true, "dry_cough": true, "fatigue": true, "loss_taste": true}', 'Phường 5', 'Quận 3', (SELECT id FROM health_facilities LIMIT 1), now() - interval '90 minutes', 'clinic', 10.7925, 106.728),
('D02', 'HFM_LIVE1', '3-5', 'M', '{"fever": true, "mouth_sores": true, "hand_rash": true, "confirmed": true}', 'Phường 7', 'Quận 5', (SELECT id FROM health_facilities LIMIT 1), now() - interval '45 minutes', 'pediatric', 10.8115, 106.658),
('D04', 'ARI_LIVE1', '60-69', 'F', '{"cough": true, "fever": true, "shortness_breath": true, "probable": true}', 'Phường 9', 'Quận 7', (SELECT id FROM health_facilities LIMIT 1), now() - interval '20 minutes', 'hospital', 10.7325, 106.698),
('D05', 'MAL_LIVE1', '40-49', 'M', '{"high_fever": true, "chills": true, "sweating": true, "confirmed": true}', 'Phường 12', 'Quận 9', (SELECT id FROM health_facilities LIMIT 1), now() - interval '10 minutes', 'hospital', 10.8315, 106.728);