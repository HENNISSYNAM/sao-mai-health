-- A) Create health schema if not exists
CREATE SCHEMA IF NOT EXISTS health;

-- B) Create alerts table first if not exists (assuming we need this)
CREATE TABLE IF NOT EXISTS health.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  facility_id TEXT,
  ward TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on alerts
ALTER TABLE health.alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for alerts (allow all for now)
DROP POLICY IF EXISTS "Public can view alerts" ON health.alerts;
CREATE POLICY "Public can view alerts" ON health.alerts FOR SELECT USING (true);

-- C) Create alert_reads table for tracking read status per user
CREATE TABLE IF NOT EXISTS health.alert_reads (
  alert_id UUID REFERENCES health.alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (alert_id, user_id)
);

-- Enable RLS on alert_reads
ALTER TABLE health.alert_reads ENABLE ROW LEVEL SECURITY;

-- D) Create views for alerts bell functionality
CREATE OR REPLACE VIEW health.v_alerts_bell AS
SELECT 
  a.id, 
  a.title, 
  a.severity, 
  a.status, 
  a.facility_id, 
  a.ward,
  a.created_at,
  (r.alert_id IS NULL) AS is_unread
FROM health.alerts a
LEFT JOIN health.alert_reads r ON r.alert_id = a.id AND r.user_id = auth.uid()
WHERE a.status IN ('new', 'acknowledged', 'investigating')
ORDER BY a.created_at DESC
LIMIT 10;

-- E) Create view for unread count
CREATE OR REPLACE VIEW health.v_alerts_unread_count AS
SELECT COUNT(*)::int AS unread
FROM health.alerts a
LEFT JOIN health.alert_reads r ON r.alert_id = a.id AND r.user_id = auth.uid()
WHERE a.status IN ('new', 'acknowledged', 'investigating')
  AND r.alert_id IS NULL;

-- F) Create RPC functions for marking alerts as read
CREATE OR REPLACE FUNCTION health.fn_alert_mark_read(p_alert_id UUID)
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER AS $$
  INSERT INTO health.alert_reads(alert_id, user_id)
  VALUES (p_alert_id, auth.uid())
  ON CONFLICT (alert_id, user_id) DO UPDATE SET read_at = now();
$$;

CREATE OR REPLACE FUNCTION health.fn_alert_mark_all_read()
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER AS $$
  INSERT INTO health.alert_reads(alert_id, user_id)
  SELECT a.id, auth.uid()
  FROM health.alerts a
  LEFT JOIN health.alert_reads r ON r.alert_id = a.id AND r.user_id = auth.uid()
  WHERE a.status IN ('new', 'acknowledged', 'investigating')
    AND r.alert_id IS NULL;
$$;

-- G) Create RLS policies for alert_reads (user can only see/manage their own reads)
DROP POLICY IF EXISTS "Users can view their own alert reads" ON health.alert_reads;
CREATE POLICY "Users can view their own alert reads" ON health.alert_reads
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own alert reads" ON health.alert_reads;
CREATE POLICY "Users can insert their own alert reads" ON health.alert_reads
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own alert reads" ON health.alert_reads;
CREATE POLICY "Users can update their own alert reads" ON health.alert_reads
FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- H) Add tables to realtime publication using DO blocks
DO $$
BEGIN
  -- Ensure the publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Set replica identity for realtime
ALTER TABLE health.alerts REPLICA IDENTITY FULL;
ALTER TABLE health.alert_reads REPLICA IDENTITY FULL;

-- Add tables to publication
DO $$
BEGIN
  -- Add alerts table
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE health.alerts';
  EXCEPTION WHEN duplicate_object THEN 
    NULL;
  END;
  
  -- Add alert_reads table  
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE health.alert_reads';
  EXCEPTION WHEN duplicate_object THEN 
    NULL;
  END;
END $$;

-- I) Insert some sample alerts for testing
INSERT INTO health.alerts (title, severity, status, facility_id, ward, message) VALUES
('High fever cases detected', 'high', 'new', 'FAC001', 'Ward A', 'Unusual spike in fever cases reported'),
('Medicine stock low', 'medium', 'acknowledged', 'FAC002', 'Ward B', 'Antibiotics running low'),
('Equipment malfunction', 'low', 'investigating', 'FAC001', 'Ward C', 'X-ray machine needs maintenance')
ON CONFLICT DO NOTHING;