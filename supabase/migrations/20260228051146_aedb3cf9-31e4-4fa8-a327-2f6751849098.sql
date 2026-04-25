CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('enterprise', 'individual')),
  full_name TEXT NOT NULL,
  organization TEXT,
  position TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  org_size TEXT,
  city TEXT,
  use_case TEXT,
  preferred_time TIMESTAMPTZ,
  join_beta BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow anonymous inserts (public lead capture form)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT WITH CHECK (true);

-- Only authenticated admin can read
CREATE POLICY "Admins can read leads" ON public.leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Create unique index on email + lead_type to prevent duplicates
CREATE UNIQUE INDEX leads_email_type_unique ON public.leads (email, lead_type);