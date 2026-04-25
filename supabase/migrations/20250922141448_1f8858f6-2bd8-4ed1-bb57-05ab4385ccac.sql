-- First add the missing disease codes to ref_diseases
INSERT INTO ref_diseases (code, name, threshold_daily, threshold_growth) VALUES
('D03', 'COVID-19', 15, 1.5),
('D04', 'Nhiễm khuẩn hô hấp', 25, 1.8),
('D05', 'Sốt rét', 5, 3.0),
('D06', 'Cúm A/H1N1', 12, 2.2)
ON CONFLICT (code) DO NOTHING;