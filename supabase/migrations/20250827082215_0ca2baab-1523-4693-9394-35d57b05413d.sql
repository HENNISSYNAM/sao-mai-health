-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  facility TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')),
  doctor TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  no_show_risk NUMERIC DEFAULT 0,
  overbook_suggestion NUMERIC DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view appointments" 
ON public.appointments 
FOR SELECT 
USING (true);

CREATE POLICY "Public can manage appointments" 
ON public.appointments 
FOR ALL 
USING (true);

-- Enable realtime
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_appointments_updated_at();

-- Insert sample data
INSERT INTO public.appointments (patient_name, facility, appointment_date, appointment_time, status, doctor, phone) VALUES
('Nguyễn Văn A', 'Bệnh viện Bạch Mai', '2025-01-15', '09:00', 'scheduled', 'BS. Trần Thị B', '0901234567'),
('Lê Thị C', 'Phòng khám Đa khoa', '2025-01-15', '10:30', 'confirmed', 'BS. Phạm Văn D', '0987654321'),
('Hoàng Minh E', 'Bệnh viện Việt Đức', '2025-01-16', '14:00', 'scheduled', 'BS. Nguyễn Thị F', '0912345678'),
('Trần Văn G', 'Bệnh viện Bạch Mai', '2025-01-16', '11:15', 'scheduled', 'BS. Lê Minh H', '0923456789'),
('Phạm Thị I', 'Phòng khám Tim mạch', '2025-01-17', '08:30', 'confirmed', 'BS. Vũ Thành J', '0934567890');