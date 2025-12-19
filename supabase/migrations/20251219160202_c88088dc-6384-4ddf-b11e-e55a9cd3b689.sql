-- Fix Security Definer View warning by enabling security_invoker on all application views
-- This ensures views respect RLS policies of the querying user, not the view creator

-- v_preorder_metrics
ALTER VIEW public.v_preorder_metrics SET (security_invoker = true);

-- user_reward_codes  
ALTER VIEW public.user_reward_codes SET (security_invoker = true);

-- zone_metric_daily
ALTER VIEW public.zone_metric_daily SET (security_invoker = true);

-- predictions_latest_by_cell
ALTER VIEW public.predictions_latest_by_cell SET (security_invoker = true);

-- alert_candidates
ALTER VIEW public.alert_candidates SET (security_invoker = true);

-- dashboard_kpis
ALTER VIEW public.dashboard_kpis SET (security_invoker = true);

-- Note: geography_columns and geometry_columns are PostGIS system views and should not be modified