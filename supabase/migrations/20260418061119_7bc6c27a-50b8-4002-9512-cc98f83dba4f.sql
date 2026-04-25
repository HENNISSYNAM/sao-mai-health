-- Medical Intelligence Insights: tri thức thế hệ mới sinh từ đối chiếu PubMed × Tin tức dịch tễ
CREATE TABLE public.medical_intelligence_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Phân loại tri thức
  insight_type TEXT NOT NULL DEFAULT 'cross_evidence', -- cross_evidence | trend_synthesis | clinical_alert | public_briefing
  topic_category TEXT NOT NULL, -- infectious_diseases | chronic_diseases | ai_medicine | public_health
  disease_codes TEXT[] DEFAULT ARRAY[]::TEXT[], -- mã ICD/disease liên quan
  region TEXT DEFAULT 'VN', -- VN | ASEAN | global
  
  -- Nội dung 2 vai trò
  title_vi TEXT NOT NULL,
  clinician_summary TEXT NOT NULL, -- bản chuyên gia: ngôn ngữ y khoa, có dẫn chứng
  community_summary TEXT NOT NULL, -- bản cộng đồng: dễ hiểu, hành động cụ thể
  key_findings JSONB DEFAULT '[]'::jsonb, -- danh sách phát hiện chính
  recommendations JSONB DEFAULT '[]'::jsonb, -- khuyến nghị hành động (theo vai trò)
  
  -- Bằng chứng nguồn (cross-evidence)
  research_sources JSONB DEFAULT '[]'::jsonb, -- [{pmid, title, doi, journal}]
  news_sources JSONB DEFAULT '[]'::jsonb,     -- [{title, url, source_name, date}]
  evidence_count INTEGER DEFAULT 0,
  
  -- Chỉ số AI
  confidence_score NUMERIC(3,2) DEFAULT 0.0, -- 0.00 - 1.00
  novelty_score NUMERIC(3,2) DEFAULT 0.0,    -- mức độ "mới" so với tri thức cũ
  urgency_level TEXT DEFAULT 'normal',       -- low | normal | high | critical
  ai_model TEXT DEFAULT 'google/gemini-2.5-flash',
  
  -- Vòng đời
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- một số insight có hạn (ví dụ cảnh báo dịch)
  superseded_by UUID REFERENCES public.medical_intelligence_insights(id) ON DELETE SET NULL,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_intel_insights_category ON public.medical_intelligence_insights(topic_category);
CREATE INDEX idx_intel_insights_generated ON public.medical_intelligence_insights(generated_at DESC);
CREATE INDEX idx_intel_insights_urgency ON public.medical_intelligence_insights(urgency_level);
CREATE INDEX idx_intel_insights_disease ON public.medical_intelligence_insights USING GIN(disease_codes);
CREATE INDEX idx_intel_insights_region ON public.medical_intelligence_insights(region);

-- RLS: public read (đây là tri thức cộng đồng), admin write qua service role
ALTER TABLE public.medical_intelligence_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insights are publicly readable"
  ON public.medical_intelligence_insights FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage insights"
  ON public.medical_intelligence_insights FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger updated_at
CREATE TRIGGER update_intel_insights_updated_at
  BEFORE UPDATE ON public.medical_intelligence_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_intelligence_insights;

-- Cron: chạy cross-evidence synthesizer 2 lần/ngày (sau khi PubMed fetch lúc 6h)
-- 23:30 UTC = 6:30 ICT, 11:30 UTC = 18:30 ICT
SELECT cron.schedule(
  'cross-evidence-synthesis-morning',
  '30 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eovndykfixqvvsvovmsw.supabase.co/functions/v1/cross-evidence-synthesizer',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm5keWtmaXhxdnZzdm92bXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY4MTAsImV4cCI6MjA3MTE2MjgxMH0._sn10APETWHKlUrV3zXIl5A7x683d5GCaaDm6NPWrPQ"}'::jsonb,
    body := '{"trigger": "scheduled_morning"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'cross-evidence-synthesis-evening',
  '30 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eovndykfixqvvsvovmsw.supabase.co/functions/v1/cross-evidence-synthesizer',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm5keWtmaXhxdnZzdm92bXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1ODY4MTAsImV4cCI6MjA3MTE2MjgxMH0._sn10APETWHKlUrV3zXIl5A7x683d5GCaaDm6NPWrPQ"}'::jsonb,
    body := '{"trigger": "scheduled_evening"}'::jsonb
  );
  $$
);