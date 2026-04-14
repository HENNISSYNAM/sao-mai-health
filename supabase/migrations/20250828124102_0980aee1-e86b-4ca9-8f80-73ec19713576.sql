-- Create healthcare standards tables
CREATE TYPE public.hl7_message_type AS ENUM ('ADT', 'ORU', 'ORM', 'MDM', 'SIU', 'DFT');
CREATE TYPE public.fhir_resource_type AS ENUM ('Patient', 'Observation', 'DiagnosticReport', 'Procedure', 'Medication', 'Encounter', 'Organization', 'Practitioner');
CREATE TYPE public.integration_status AS ENUM ('active', 'inactive', 'pending', 'error');
CREATE TYPE public.security_compliance AS ENUM ('iso27001', 'hipaa', 'vnlaw', 'gdpr');

-- HL7 Messages table
CREATE TABLE public.hl7_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_type hl7_message_type NOT NULL,
  message_content TEXT NOT NULL,
  patient_id UUID,
  facility_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  received_at TIMESTAMP WITH TIME ZONE,
  status integration_status DEFAULT 'pending',
  ack_code TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- FHIR Resources table
CREATE TABLE public.fhir_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type fhir_resource_type NOT NULL,
  resource_id TEXT NOT NULL,
  resource_content JSONB NOT NULL,
  patient_id UUID,
  version_id TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status integration_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resource_type, resource_id)
);

-- DICOM Studies table
CREATE TABLE public.dicom_studies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_instance_uid TEXT NOT NULL UNIQUE,
  patient_id UUID,
  study_date DATE,
  study_time TIME,
  modality TEXT,
  study_description TEXT,
  accession_number TEXT,
  referring_physician TEXT,
  institution_name TEXT,
  series_count INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  file_path TEXT,
  file_size BIGINT,
  status integration_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ICD Codes table
CREATE TABLE public.icd_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  version TEXT NOT NULL, -- ICD-10 or ICD-11
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  parent_code TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(code, version)
);

-- VNeID Integration table
CREATE TABLE public.vneid_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID,
  vneid_number TEXT NOT NULL UNIQUE,
  citizen_id TEXT,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  place_of_birth TEXT,
  gender TEXT,
  nationality TEXT,
  address TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_status integration_status DEFAULT 'pending',
  verification_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- BHYT (Social Health Insurance) table
CREATE TABLE public.bhyt_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID,
  bhyt_number TEXT NOT NULL,
  card_number TEXT,
  valid_from DATE,
  valid_to DATE,
  benefit_level TEXT,
  hospital_code TEXT,
  province_code TEXT,
  district_code TEXT,
  ward_code TEXT,
  status integration_status DEFAULT 'active',
  verification_data JSONB,
  last_verified TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(bhyt_number)
);

-- HIS/LIS/PACS Integration table
CREATE TABLE public.his_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_type TEXT NOT NULL, -- HIS, LIS, PACS
  system_name TEXT NOT NULL,
  endpoint_url TEXT,
  api_key_encrypted TEXT,
  facility_id TEXT,
  configuration JSONB,
  status integration_status DEFAULT 'inactive',
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_interval INTEGER DEFAULT 3600, -- seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Security Compliance Audit table
CREATE TABLE public.security_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  compliance_standard security_compliance NOT NULL,
  audit_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  user_id UUID,
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  request_data JSONB,
  response_data JSONB,
  status TEXT,
  risk_level TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hl7_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fhir_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dicom_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icd_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vneid_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bhyt_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for healthcare staff
CREATE POLICY "Healthcare staff can manage HL7 messages" ON public.hl7_messages FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Healthcare staff can manage FHIR resources" ON public.fhir_resources FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Healthcare staff can manage DICOM studies" ON public.dicom_studies FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public can read ICD codes" ON public.icd_codes FOR SELECT USING (true);
CREATE POLICY "Healthcare staff can manage VNeID integrations" ON public.vneid_integrations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Healthcare staff can manage BHYT records" ON public.bhyt_records FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Healthcare staff can manage HIS integrations" ON public.his_integrations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Healthcare staff can view security audits" ON public.security_audits FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_hl7_messages_patient_id ON public.hl7_messages(patient_id);
CREATE INDEX idx_hl7_messages_facility_id ON public.hl7_messages(facility_id);
CREATE INDEX idx_fhir_resources_patient_id ON public.fhir_resources(patient_id);
CREATE INDEX idx_fhir_resources_type ON public.fhir_resources(resource_type);
CREATE INDEX idx_dicom_studies_patient_id ON public.dicom_studies(patient_id);
CREATE INDEX idx_vneid_citizen_id ON public.vneid_integrations(citizen_id);
CREATE INDEX idx_bhyt_patient_id ON public.bhyt_records(patient_id);
CREATE INDEX idx_security_audits_user_id ON public.security_audits(user_id);
CREATE INDEX idx_security_audits_timestamp ON public.security_audits(timestamp);

-- Insert sample ICD-10 codes
INSERT INTO public.icd_codes (code, version, title, description, category) VALUES
('A00-A09', 'ICD-10', 'Intestinal infectious diseases', 'Cholera, typhoid and paratyphoid fevers, other salmonella infections', 'Infectious diseases'),
('B00-B09', 'ICD-10', 'Viral infections characterized by skin and mucous membrane lesions', 'Herpes simplex, varicella, zoster', 'Infectious diseases'),
('C00-C97', 'ICD-10', 'Malignant neoplasms', 'Cancer and malignant tumors', 'Neoplasms'),
('D50-D89', 'ICD-10', 'Diseases of the blood and blood-forming organs', 'Anemia, coagulation defects', 'Blood disorders'),
('E00-E89', 'ICD-10', 'Endocrine, nutritional and metabolic diseases', 'Diabetes, thyroid disorders, obesity', 'Endocrine diseases'),
('F00-F99', 'ICD-10', 'Mental, Behavioral and Neurodevelopmental disorders', 'Dementia, schizophrenia, mood disorders', 'Mental health'),
('G00-G99', 'ICD-10', 'Diseases of the nervous system', 'Meningitis, epilepsy, migraine, Alzheimer', 'Neurological diseases'),
('H00-H59', 'ICD-10', 'Diseases of the eye and adnexa', 'Glaucoma, cataract, conjunctivitis', 'Eye diseases'),
('H60-H95', 'ICD-10', 'Diseases of the ear and mastoid process', 'Otitis, hearing loss', 'Ear diseases'),
('I00-I99', 'ICD-10', 'Diseases of the circulatory system', 'Hypertension, heart disease, stroke', 'Cardiovascular diseases');