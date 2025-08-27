-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create cases_geo view for map visualization
CREATE OR REPLACE VIEW health.cases_geo AS
SELECT 
  c.id,
  c.lat,
  c.lng, 
  c.diagnosis,
  c.reported_at,
  c.ward_name,
  c.facility_name,
  COUNT(*) OVER (
    PARTITION BY DATE_TRUNC('week', c.reported_at), 
    ST_DWithin(ST_MakePoint(c.lng, c.lat)::geography, ST_MakePoint(lng, lat)::geography, 1000)
  ) as cases_7d
FROM (
  SELECT 
    gen_random_uuid() as id,
    10.762622 + (random() - 0.5) * 0.1 as lat,
    106.660172 + (random() - 0.5) * 0.1 as lng,
    CASE (random() * 4)::int 
      WHEN 0 THEN 'Dengue'
      WHEN 1 THEN 'COVID-19' 
      WHEN 2 THEN 'Influenza'
      ELSE 'Hand-foot-mouth'
    END as diagnosis,
    NOW() - (random() * interval '30 days') as reported_at,
    'Ward ' || (1 + (random() * 10)::int) as ward_name,
    'Hospital ' || (1 + (random() * 5)::int) as facility_name
  FROM generate_series(1, 200)
) c;

-- Create outbreak detection table
CREATE TABLE IF NOT EXISTS health.outbreak_clusters (
  id SERIAL PRIMARY KEY,
  cluster_id INTEGER NOT NULL,
  center_lat FLOAT NOT NULL,
  center_lng FLOAT NOT NULL,
  radius_m INTEGER NOT NULL,
  case_count INTEGER NOT NULL,
  dominant_diagnosis TEXT NOT NULL,
  detection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  geom GEOMETRY(POINT, 4326)
);

-- Create function to detect outbreak clusters using DBSCAN-like logic
CREATE OR REPLACE FUNCTION health.detect_outbreaks(
  min_cases INTEGER DEFAULT 5,
  radius_meters INTEGER DEFAULT 1000,
  days_lookback INTEGER DEFAULT 7
) RETURNS VOID AS $$
DECLARE
  cluster_rec RECORD;
  cluster_id INTEGER := 1;
BEGIN
  -- Clear existing clusters for today
  DELETE FROM health.outbreak_clusters WHERE detection_date = CURRENT_DATE;
  
  -- Simple clustering based on geographic proximity and case density
  FOR cluster_rec IN 
    WITH recent_cases AS (
      SELECT lat, lng, diagnosis, reported_at
      FROM health.cases_geo 
      WHERE reported_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    case_clusters AS (
      SELECT 
        AVG(lat) as center_lat,
        AVG(lng) as center_lng,
        diagnosis,
        COUNT(*) as case_count,
        ST_Centroid(ST_Collect(ST_MakePoint(lng, lat))) as center_geom
      FROM recent_cases rc1
      WHERE (
        SELECT COUNT(*) 
        FROM recent_cases rc2 
        WHERE ST_DWithin(
          ST_MakePoint(rc1.lng, rc1.lat)::geography,
          ST_MakePoint(rc2.lng, rc2.lat)::geography,
          radius_meters
        )
      ) >= min_cases
      GROUP BY diagnosis, 
        ST_SnapToGrid(ST_MakePoint(lng, lat), 0.01, 0.01)
      HAVING COUNT(*) >= min_cases
    )
    SELECT * FROM case_clusters
  LOOP
    INSERT INTO health.outbreak_clusters (
      cluster_id, center_lat, center_lng, radius_m, case_count, 
      dominant_diagnosis, severity, geom
    ) VALUES (
      cluster_id,
      cluster_rec.center_lat,
      cluster_rec.center_lng, 
      radius_meters,
      cluster_rec.case_count,
      cluster_rec.diagnosis,
      CASE 
        WHEN cluster_rec.case_count >= 20 THEN 'high'
        WHEN cluster_rec.case_count >= 10 THEN 'medium'
        ELSE 'low'
      END,
      cluster_rec.center_geom
    );
    
    cluster_id := cluster_id + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run initial outbreak detection
SELECT health.detect_outbreaks();

-- Create outbreaks view
CREATE OR REPLACE VIEW health.outbreaks AS
SELECT 
  id,
  cluster_id,
  case_count as n,
  center_lat as lat,
  center_lng as lng,
  radius_m as radius,
  dominant_diagnosis as diagnosis,
  severity,
  detection_date as d
FROM health.outbreak_clusters
WHERE detection_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY detection_date DESC, case_count DESC;

-- Enable realtime for cases updates
ALTER TABLE health.outbreak_clusters REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE health.outbreak_clusters;