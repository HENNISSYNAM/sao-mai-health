-- Thêm dữ liệu bệnh nhân phong phú cho hệ thống giám sát bệnh truyền nhiễm HCMC
INSERT INTO patients (id, full_name, birth_year, gender, phone, facility_id, mpi_hash) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Nguyễn Văn An', 1995, 'male', '0901234567', 'BV_CHO_RAY', 'hash_001'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Trần Thị Bình', 1988, 'female', '0912345678', 'BV_NHI_DONG_1', 'hash_002'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Lê Văn Cường', 1979, 'male', '0923456789', 'BV_115', 'hash_003'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Phạm Thị Dung', 1992, 'female', '0934567890', 'BV_TU_DU', 'hash_004'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Hoàng Văn Em', 1985, 'male', '0945678901', 'BV_BENH_NHIET_DOI', 'hash_005'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Võ Thị Phượng', 1990, 'female', '0956789012', 'BV_CHO_RAY', 'hash_006'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Ngô Văn Giang', 1996, 'male', '0967890123', 'BV_NHI_DONG_2', 'hash_007'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Đặng Thị Hoa', 1987, 'female', '0978901234', 'BV_175', 'hash_008'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Bùi Văn Inh', 1993, 'male', '0989012345', 'BV_NGUYEN_TRI_PHUONG', 'hash_009'),
  ('550e8400-e29b-41d4-a716-446655440010', 'Cao Thị Kim', 1991, 'female', '0990123456', 'BV_TAM_DUC', 'hash_010'),
  ('550e8400-e29b-41d4-a716-446655440011', 'Đinh Văn Long', 1984, 'male', '0901123456', 'BV_CHO_RAY', 'hash_011'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Lý Thị Mai', 1989, 'female', '0912123456', 'BV_HUNG_VUONG', 'hash_012'),
  ('550e8400-e29b-41d4-a716-446655440013', 'Trương Văn Nam', 1997, 'male', '0923123456', 'BV_115', 'hash_013'),
  ('550e8400-e29b-41d4-a716-446655440014', 'Phan Thị Oanh', 1986, 'female', '0934123456', 'BV_NHI_DONG_1', 'hash_014'),
  ('550e8400-e29b-41d4-a716-446655440015', 'Dương Văn Phúc', 1994, 'male', '0945123456', 'BV_BENH_NHIET_DOI', 'hash_015');

-- Thêm ca bệnh chi tiết cho giám sát
INSERT INTO case_events (
  id, patient_id, disease_code, occurred_at, facility_id, ward_id, district_id, 
  patient_age_bucket, patient_gender, patient_hash, symptoms, source, lat, lon
) VALUES
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'DENGUE', '2024-01-15 08:30:00+00', 'BV_CHO_RAY', '27001', '760', '25-34', 'male', 'hash_001', '{"fever": true, "headache": true, "muscle_pain": true, "rash": false}', 'hospital_report', 10.7769, 106.6955),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'HFMD', '2024-01-14 10:15:00+00', 'BV_NHI_DONG_1', '27007', '760', '35-44', 'female', 'hash_002', '{"fever": true, "mouth_sores": true, "hand_rash": true, "foot_rash": true}', 'hospital_report', 10.7829, 106.6927),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440003', 'RESP_INF', '2024-01-13 14:20:00+00', 'BV_115', '27013', '760', '45-54', 'male', 'hash_003', '{"fever": true, "cough": true, "difficulty_breathing": true, "chest_pain": false}', 'hospital_report', 10.7546, 106.6677),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440004', 'DENGUE', '2024-01-12 09:45:00+00', 'BV_TU_DU', '27019', '760', '25-34', 'female', 'hash_004', '{"fever": true, "headache": true, "nausea": true, "rash": true}', 'hospital_report', 10.7699, 106.6951),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440005', 'MALARIA', '2024-01-11 16:30:00+00', 'BV_BENH_NHIET_DOI', '27025', '760', '35-44', 'male', 'hash_005', '{"fever": true, "chills": true, "sweating": true, "fatigue": true}', 'hospital_report', 10.7756, 106.7004),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440006', 'HFMD', '2024-01-10 11:20:00+00', 'BV_CHO_RAY', '27031', '760', '25-34', 'female', 'hash_006', '{"fever": true, "mouth_sores": true, "hand_rash": false, "foot_rash": true}', 'hospital_report', 10.7769, 106.6955),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440007', 'RESP_INF', '2024-01-09 13:15:00+00', 'BV_NHI_DONG_2', '27004', '760', '25-34', 'male', 'hash_007', '{"fever": true, "cough": true, "runny_nose": true, "sore_throat": true}', 'hospital_report', 10.7625, 106.6820),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440008', 'DENGUE', '2024-01-08 15:45:00+00', 'BV_175', '27010', '760', '35-44', 'female', 'hash_008', '{"fever": true, "headache": true, "eye_pain": true, "muscle_pain": true}', 'hospital_report', 10.7891, 106.6618),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440009', 'TUBERCULOSIS', '2024-01-07 08:30:00+00', 'BV_NGUYEN_TRI_PHUONG', '27016', '760', '25-34', 'male', 'hash_009', '{"persistent_cough": true, "weight_loss": true, "night_sweats": true, "fatigue": true}', 'hospital_report', 10.7543, 106.6621),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440010', 'HFMD', '2024-01-06 12:00:00+00', 'BV_TAM_DUC', '27022', '760', '25-34', 'female', 'hash_010', '{"fever": true, "mouth_sores": true, "hand_rash": true, "foot_rash": false}', 'hospital_report', 10.7891, 106.6745),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440011', 'DENGUE', '2024-01-05 09:20:00+00', 'BV_CHO_RAY', '27028', '760', '35-44', 'male', 'hash_011', '{"fever": true, "headache": false, "muscle_pain": true, "rash": true}', 'hospital_report', 10.7769, 106.6955),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440012', 'RESP_INF', '2024-01-04 14:30:00+00', 'BV_HUNG_VUONG', '27037', '760', '35-44', 'female', 'hash_012', '{"fever": true, "cough": true, "difficulty_breathing": false, "chest_pain": true}', 'hospital_report', 10.7544, 106.6696),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440013', 'MALARIA', '2024-01-03 17:15:00+00', 'BV_115', '27034', '760', '25-34', 'male', 'hash_013', '{"fever": true, "chills": true, "headache": true, "nausea": true}', 'hospital_report', 10.7546, 106.6677),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440014', 'HFMD', '2024-01-02 10:45:00+00', 'BV_NHI_DONG_1', '27040', '760', '35-44', 'female', 'hash_014', '{"fever": true, "mouth_sores": false, "hand_rash": true, "foot_rash": true}', 'hospital_report', 10.7829, 106.6927),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440015', 'DENGUE', '2024-01-01 11:30:00+00', 'BV_BENH_NHIET_DOI', '27043', '760', '25-34', 'male', 'hash_015', '{"fever": true, "headache": true, "muscle_pain": false, "rash": false}', 'hospital_report', 10.7756, 106.7004);

-- Thêm health facilities để mapping
INSERT INTO health_facilities (id, code, name, type, address, ward_id, district_id, lat, lon) VALUES
  (gen_random_uuid(), 'BV_CHO_RAY', 'Bệnh viện Chợ Rẫy', 'hospital', '201B Nguyễn Chí Thanh, Phường 12, Quận 5', '27019', '760', 10.7769, 106.6955),
  (gen_random_uuid(), 'BV_NHI_DONG_1', 'Bệnh viện Nhi Đồng 1', 'hospital', '341 Sư Vạn Hạnh, Phường 12, Quận 10', '27025', '760', 10.7829, 106.6927),
  (gen_random_uuid(), 'BV_115', 'Bệnh viện 115', 'hospital', '527 Sư Vạn Hạnh, Phường 12, Quận 10', '27025', '760', 10.7546, 106.6677),
  (gen_random_uuid(), 'BV_TU_DU', 'Bệnh viện Từ Dũ', 'hospital', '284 Cống Quỳnh, Phường Phạm Ngũ Lão, Quận 1', '27001', '760', 10.7699, 106.6951),
  (gen_random_uuid(), 'BV_BENH_NHIET_DOI', 'Bệnh viện Bệnh Nhiệt đới', 'hospital', '764 Võ Văn Kiệt, Phường 1, Quận 5', '27013', '760', 10.7756, 106.7004),
  (gen_random_uuid(), 'BV_NHI_DONG_2', 'Bệnh viện Nhi Đồng 2', 'hospital', '14 Lý Tự Trọng, Phường Bến Nghé, Quận 1', '27004', '760', 10.7625, 106.6820),
  (gen_random_uuid(), 'BV_175', 'Bệnh viện 175', 'hospital', '786 Nguyễn Kiệm, Phường 3, Quận Gò Vấp', '27010', '770', 10.7891, 106.6618),
  (gen_random_uuid(), 'BV_NGUYEN_TRI_PHUONG', 'Bệnh viện Nguyễn Tri Phương', 'hospital', '468 Nguyễn Trãi, Phường 8, Quận 5', '27016', '760', 10.7543, 106.6621),
  (gen_random_uuid(), 'BV_TAM_DUC', 'Bệnh viện Tâm Đức', 'hospital', '51-53 Phan Thanh Giản, Phường 25, Quận Bình Thạnh', '27022', '771', 10.7891, 106.6745),
  (gen_random_uuid(), 'BV_HUNG_VUONG', 'Bệnh viện Hùng Vương', 'hospital', '128 Hồng Bàng, Phường 12, Quận 5', '27019', '760', 10.7544, 106.6696);