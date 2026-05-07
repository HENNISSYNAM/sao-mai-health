
-- 1. Fix appointments: remove fully public policies, restrict to authenticated healthcare users
DROP POLICY IF EXISTS "Public can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can manage appointments" ON public.appointments;

-- Add created_by column for ownership tracking if not exists
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Authenticated users can view/manage only appointments they created
CREATE POLICY "Users view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users insert own appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users delete own appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- 2. Fix user_plans privilege escalation
DROP POLICY IF EXISTS "Service role can manage plans" ON public.user_plans;

-- Restrict mutations to service_role only
CREATE POLICY "Service role manages plans"
  ON public.user_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own plan
DROP POLICY IF EXISTS "Users can view own plan" ON public.user_plans;
CREATE POLICY "Users can view own plan"
  ON public.user_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
