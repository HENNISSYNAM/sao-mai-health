-- Create medical_research_articles table for PubMed/NCBI articles
CREATE TABLE public.medical_research_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pmid TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  abstract TEXT,
  authors TEXT[],
  journal TEXT,
  publication_date DATE,
  doi TEXT,
  pubmed_url TEXT NOT NULL,
  topic_category TEXT NOT NULL,
  keywords TEXT[],
  mesh_terms TEXT[],
  citation_count INTEGER DEFAULT 0,
  relevance_score NUMERIC,
  language TEXT DEFAULT 'en',
  ai_summary_vi TEXT,
  ai_clinical_relevance TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_research_pmid ON public.medical_research_articles(pmid);
CREATE INDEX idx_research_topic ON public.medical_research_articles(topic_category);
CREATE INDEX idx_research_pub_date ON public.medical_research_articles(publication_date DESC);
CREATE INDEX idx_research_fetched ON public.medical_research_articles(fetched_at DESC);

ALTER TABLE public.medical_research_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Research articles are viewable by everyone"
ON public.medical_research_articles
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage research articles"
ON public.medical_research_articles
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Bookmarks table (per user)
CREATE TABLE public.research_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  article_id UUID NOT NULL REFERENCES public.medical_research_articles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);

ALTER TABLE public.research_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own bookmarks"
ON public.research_bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create their own bookmarks"
ON public.research_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own bookmarks"
ON public.research_bookmarks FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users update their own bookmarks"
ON public.research_bookmarks FOR UPDATE
USING (auth.uid() = user_id);

-- Schedule daily PubMed fetch at 6AM ICT (23:00 UTC previous day)
SELECT cron.schedule(
  'daily-pubmed-research-fetch',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url:='https://eovndykfixqvvsvovmsw.supabase.co/functions/v1/fetch-pubmed-research',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm5keWtmaXhxdnZzdm92bXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY4MTAsImV4cCI6MjA3MTE2MjgxMH0._sn10APETWHKlUrV3zXIl5A7x683d5GCaaDm6NPWrPQ"}'::jsonb,
    body:='{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);