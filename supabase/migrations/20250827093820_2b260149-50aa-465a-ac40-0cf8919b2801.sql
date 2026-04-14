-- Create user_plans table for subscription management
CREATE TABLE public.user_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own plans
CREATE POLICY "Users can view their own plans" 
ON public.user_plans 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for edge functions to manage plans
CREATE POLICY "Service role can manage plans" 
ON public.user_plans 
FOR ALL 
USING (true);

-- Create RPC function to unlock plan
CREATE OR REPLACE FUNCTION public.fn_unlock_plan(uid UUID, plan_name TEXT)
RETURNS VOID 
LANGUAGE SQL 
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.user_plans(user_id, plan, status, started_at, expires_at)
  VALUES(uid, plan_name, 'active', now(), now() + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET plan = excluded.plan, 
        status = 'active', 
        started_at = now(), 
        expires_at = now() + interval '30 days',
        updated_at = now();
$$;