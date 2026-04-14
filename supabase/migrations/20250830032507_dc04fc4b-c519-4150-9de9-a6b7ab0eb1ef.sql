-- Create patients table for storing patient information
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  mpi_hash TEXT NOT NULL,
  birth_year INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT,
  facility_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Healthcare staff can view patients" 
ON public.patients 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Healthcare staff can create patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Healthcare staff can update patients" 
ON public.patients 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update case_events table to reference patients
ALTER TABLE public.case_events 
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id);

-- Create index for better performance
CREATE INDEX idx_patients_mpi_hash ON public.patients(mpi_hash);
CREATE INDEX idx_patients_facility ON public.patients(facility_id);
CREATE INDEX idx_case_events_patient ON public.case_events(patient_id);