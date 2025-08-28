-- Only enable RLS on actual tables, not views
ALTER TABLE baseline_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alert ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_wards ENABLE ROW LEVEL SECURITY;

-- Add basic policies for public read access to reference tables
CREATE POLICY "Public can read health facilities" ON health_facilities FOR SELECT USING (true);
CREATE POLICY "Public can read diseases" ON ref_diseases FOR SELECT USING (true);
CREATE POLICY "Public can read districts" ON ref_districts FOR SELECT USING (true);
CREATE POLICY "Public can read wards" ON ref_wards FOR SELECT USING (true);
CREATE POLICY "Public can read dashboard" ON dashboard_kpis FOR SELECT USING (true);

-- Add restrictive policies for sensitive tables
CREATE POLICY "Staff can read baseline stats" ON baseline_stats FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can read daily counts" ON daily_counts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can read health alerts" ON health_alert FOR SELECT USING (auth.uid() IS NOT NULL);