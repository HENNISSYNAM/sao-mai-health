
CREATE TABLE public.user_logins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  provider TEXT,
  user_agent TEXT,
  language TEXT,
  timezone TEXT,
  platform TEXT,
  screen_size TEXT,
  referrer TEXT,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_logins_user_id ON public.user_logins(user_id);
CREATE INDEX idx_user_logins_logged_in_at ON public.user_logins(logged_in_at DESC);

ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own logins"
  ON public.user_logins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own logins"
  ON public.user_logins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
