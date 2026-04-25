CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

SELECT cron.schedule(
  'daily-health-news-search',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eovndykfixqvvsvovmsw.supabase.co/functions/v1/scheduled-health-search',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm5keWtmaXhxdnZzdm92bXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY4MTAsImV4cCI6MjA3MTE2MjgxMH0._sn10APETWHKlUrV3zXIl5A7x683d5GCaaDm6NPWrPQ"}'::jsonb,
    body := concat('{"time": "', now(), '", "source": "cron"}')::jsonb
  ) AS request_id;
  $$
);