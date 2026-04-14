-- Create storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents', 'patient-documents', false);

-- Create patient_documents table
CREATE TABLE public.patient_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  document_type TEXT DEFAULT 'general',
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for patient documents
CREATE POLICY "Healthcare staff can view patient documents" 
ON public.patient_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Healthcare staff can upload patient documents" 
ON public.patient_documents 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Healthcare staff can update patient documents" 
ON public.patient_documents 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Healthcare staff can delete patient documents" 
ON public.patient_documents 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create storage policies for patient documents
CREATE POLICY "Healthcare staff can view patient document files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'patient-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Healthcare staff can upload patient document files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'patient-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Healthcare staff can update patient document files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'patient-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Healthcare staff can delete patient document files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'patient-documents' AND auth.uid() IS NOT NULL);