
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_used TEXT NOT NULL,
  model TEXT,
  function_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'fallback')),
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert logs from edge functions
CREATE POLICY "Service role can insert ai_logs"
  ON public.ai_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can read all logs
CREATE POLICY "Service role can read ai_logs"
  ON public.ai_logs FOR SELECT
  TO service_role
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_logs;
