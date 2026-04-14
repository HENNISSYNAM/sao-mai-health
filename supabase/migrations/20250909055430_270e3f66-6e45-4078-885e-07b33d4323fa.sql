-- Create function to create appointments
CREATE OR REPLACE FUNCTION public.create_appointment(
  p_patient_name text,
  p_patient_phone text DEFAULT NULL,
  p_facility_id uuid DEFAULT NULL,
  p_doctor_id text DEFAULT NULL,
  p_start_at timestamp with time zone,
  p_end_at timestamp with time zone DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_appointment_id uuid;
  appointment_date date;
  appointment_time time;
  duration_mins integer;
BEGIN
  -- Validate required parameters
  IF p_patient_name IS NULL OR trim(p_patient_name) = '' THEN
    RAISE EXCEPTION 'Patient name is required';
  END IF;
  
  IF p_start_at IS NULL THEN
    RAISE EXCEPTION 'Start time is required';
  END IF;

  -- Extract date and time components
  appointment_date := p_start_at::date;
  appointment_time := p_start_at::time;
  
  -- Calculate duration if end time is provided
  IF p_end_at IS NOT NULL THEN
    duration_mins := EXTRACT(EPOCH FROM (p_end_at - p_start_at)) / 60;
  ELSE
    duration_mins := 30; -- Default 30 minutes
  END IF;

  -- Insert the appointment
  INSERT INTO public.appointments (
    patient_name,
    phone,
    facility_id,
    doctor,
    appointment_date,
    appointment_time,
    scheduled_date,
    duration_minutes,
    notes,
    status,
    appointment_type
  )
  VALUES (
    trim(p_patient_name),
    p_patient_phone,
    p_facility_id,
    p_doctor_id,
    appointment_date,
    appointment_time,
    p_start_at,
    duration_mins,
    p_notes,
    'scheduled',
    'consultation'
  )
  RETURNING id INTO new_appointment_id;

  RETURN new_appointment_id;
END;
$function$;