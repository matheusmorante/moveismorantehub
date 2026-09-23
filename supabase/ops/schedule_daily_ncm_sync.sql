-- Execute once after applying the NCM migrations. The project URL and
-- publishable key may be added to Vault as shown below. The cron secret is
-- generated and stored in Vault by this script; only its SHA-256 digest is
-- kept in the public schema.
--   project_url       = https://<project-ref>.supabase.co
--   publishable_key   = the project's publishable key
-- Never store the service-role key in the cron job or this file.
-- Cron uses UTC; 06:30 UTC is 03:30 in America/Sao_Paulo (UTC-3).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'vault')
     OR NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron')
     OR NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    RAISE EXCEPTION 'Ative Supabase Vault, Cron (pg_cron) e pg_net antes de agendar a sincronização NCM.';
  END IF;

  IF (SELECT count(*) FROM vault.decrypted_secrets
      WHERE name IN ('project_url', 'publishable_key')) <> 2 THEN
    RAISE EXCEPTION 'Adicione project_url e publishable_key ao Supabase Vault antes de executar este script.';
  END IF;
END $$;

DO $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'ncm_sync_cron_secret';
  IF v_secret IS NULL THEN
    v_secret := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    PERFORM vault.create_secret(v_secret, 'ncm_sync_cron_secret', 'Autorização exclusiva do cron diário de sincronização NCM.');
  END IF;
  INSERT INTO public.ncm_cron_secrets(name, secret_hash)
    VALUES ('daily-ncm-catalog-sync', encode(sha256(convert_to(v_secret, 'UTF8')), 'hex'))
    ON CONFLICT (name) DO UPDATE SET secret_hash = EXCLUDED.secret_hash, created_at = now();
END $$;

DO $$
DECLARE v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'daily-ncm-catalog-sync';
  IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;
END $$;

SELECT cron.schedule(
  'daily-ncm-catalog-sync',
  '30 6 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/sync-ncms',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key'),
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key'),
        'x-ncm-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ncm_sync_cron_secret')
      ),
      body := '{"mode":"sync"}'::jsonb
    );
  $$
);
