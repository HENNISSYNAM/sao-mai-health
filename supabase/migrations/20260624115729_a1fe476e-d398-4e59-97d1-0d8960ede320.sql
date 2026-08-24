
-- HR-NFT table
CREATE TABLE public.hr_nfts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token_id TEXT NOT NULL UNIQUE,
  patient_name TEXT NOT NULL,
  patient_hash TEXT NOT NULL,
  visit_date DATE NOT NULL,
  facility TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  icd10 TEXT NOT NULL,
  diagnosis TEXT,
  prescription JSONB DEFAULT '[]'::jsonb,
  lab_results JSONB DEFAULT '[]'::jsonb,
  ipfs_hash TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_height BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'owned',
  doctor_signature TEXT,
  minted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_nfts TO authenticated;
GRANT ALL ON public.hr_nfts TO service_role;

ALTER TABLE public.hr_nfts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own HR-NFTs" ON public.hr_nfts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- HTC transactions table
CREATE TABLE public.htc_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tx_type TEXT NOT NULL,
  amount_htc NUMERIC(18,2) NOT NULL,
  amount_vnd NUMERIC(18,0) NOT NULL,
  counterparty TEXT,
  description TEXT,
  tx_hash TEXT NOT NULL,
  block_height BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.htc_transactions TO authenticated;
GRANT ALL ON public.htc_transactions TO service_role;

ALTER TABLE public.htc_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own HTC tx" ON public.htc_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_hr_nfts_updated_at
  BEFORE UPDATE ON public.hr_nfts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hr_nfts_user ON public.hr_nfts(user_id, minted_at DESC);
CREATE INDEX idx_htc_tx_user ON public.htc_transactions(user_id, created_at DESC);
