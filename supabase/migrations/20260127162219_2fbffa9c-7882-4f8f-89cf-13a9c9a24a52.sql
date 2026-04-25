-- Create table to store crawled health news articles
CREATE TABLE IF NOT EXISTS public.health_news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_hash TEXT UNIQUE NOT NULL, -- SHA256 hash for deduplication
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  content_summary TEXT,
  disease_type TEXT,
  location TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  classification TEXT CHECK (classification IN ('confirmed', 'emerging', 'predictive')),
  raw_content TEXT,
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table to track scheduler executions
CREATE TABLE IF NOT EXISTS public.scheduler_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  articles_found INTEGER DEFAULT 0,
  articles_new INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_health_news_hash ON public.health_news_articles(article_hash);
CREATE INDEX IF NOT EXISTS idx_health_news_crawled ON public.health_news_articles(crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_news_disease ON public.health_news_articles(disease_type);
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_job ON public.scheduler_runs(job_name, started_at DESC);

-- Enable RLS
ALTER TABLE public.health_news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_runs ENABLE ROW LEVEL SECURITY;

-- Public read access for dashboard
CREATE POLICY "Health news are publicly readable"
ON public.health_news_articles
FOR SELECT
USING (true);

CREATE POLICY "Scheduler runs are publicly readable"
ON public.scheduler_runs
FOR SELECT
USING (true);

-- Service role can insert/update (for edge functions)
CREATE POLICY "Service role can manage health news"
ON public.health_news_articles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage scheduler runs"
ON public.scheduler_runs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;