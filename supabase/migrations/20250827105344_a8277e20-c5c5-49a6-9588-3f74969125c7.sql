-- Fix security issues for the new RPC functions by adding search_path
CREATE OR REPLACE FUNCTION health.fn_alert_mark_read(p_alert_id UUID)
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = health, public
AS $$
  INSERT INTO health.alert_reads(alert_id, user_id)
  VALUES (p_alert_id, auth.uid())
  ON CONFLICT (alert_id, user_id) DO UPDATE SET read_at = now();
$$;

CREATE OR REPLACE FUNCTION health.fn_alert_mark_all_read()
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = health, public
AS $$
  INSERT INTO health.alert_reads(alert_id, user_id)
  SELECT a.id, auth.uid()
  FROM health.alerts a
  LEFT JOIN health.alert_reads r ON r.alert_id = a.id AND r.user_id = auth.uid()
  WHERE a.status IN ('new', 'acknowledged', 'investigating')
    AND r.alert_id IS NULL;
$$;