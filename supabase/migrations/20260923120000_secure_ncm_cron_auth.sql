-- Authorize only the scheduled NCM sync using a high-entropy secret whose
-- plaintext remains in Supabase Vault and whose digest is stored in the DB.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE TABLE IF NOT EXISTS public.ncm_cron_secrets (
  name text PRIMARY KEY,
  secret_hash text NOT NULL CHECK (secret_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ncm_cron_secrets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.verify_ncm_cron_secret(p_secret_hash text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ncm_cron_secrets
    WHERE name = 'daily-ncm-catalog-sync' AND secret_hash = p_secret_hash
  );
$$;

REVOKE ALL ON TABLE public.ncm_cron_secrets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_ncm_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ncm_cron_secret(text) TO service_role;
