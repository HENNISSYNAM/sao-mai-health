
-- Bảng biovault_documents
CREATE TABLE public.biovault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'processing',
  extracted_data JSONB,
  icd11_codes TEXT[],
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bảng biovault_metrics  
CREATE TABLE public.biovault_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID REFERENCES public.biovault_documents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  category TEXT NOT NULL,
  icd11_code TEXT,
  risk_level TEXT DEFAULT 'normal',
  source TEXT,
  recorded_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.biovault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biovault_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for biovault_documents
CREATE POLICY "Users can view own documents" ON public.biovault_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.biovault_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.biovault_documents
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.biovault_documents
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for biovault_metrics
CREATE POLICY "Users can view own metrics" ON public.biovault_metrics
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics" ON public.biovault_metrics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics" ON public.biovault_metrics
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own metrics" ON public.biovault_metrics
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for medical document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('biovault-documents', 'biovault-documents', false);

-- Storage RLS: users can manage own files
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'biovault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'biovault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'biovault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
