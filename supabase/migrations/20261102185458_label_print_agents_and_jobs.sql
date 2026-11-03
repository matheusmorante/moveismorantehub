CREATE TABLE public.label_print_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

CREATE TABLE public.label_print_jobs (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('identificacao', 'precos')),
  html text NOT NULL CHECK (char_length(html) BETWEEN 1 AND 3000000),
  asset_origin text NOT NULL CHECK (asset_origin ~ '^https?://'),
  paper_width_mm numeric(8, 2) NOT NULL CHECK (paper_width_mm BETWEEN 20 AND 500),
  paper_height_mm numeric(8, 2) NOT NULL CHECK (paper_height_mm BETWEEN 30 AND 1200),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'printed', 'failed')),
  agent_id uuid REFERENCES public.label_print_agents(id) ON DELETE CASCADE,
  claim_token uuid,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  error text CHECK (error IS NULL OR char_length(error) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  CHECK (
    (status = 'processing' AND agent_id IS NOT NULL AND claim_token IS NOT NULL AND claimed_at IS NOT NULL)
    OR status <> 'processing'
  )
);

CREATE INDEX label_print_agents_owner_active_idx
  ON public.label_print_agents(owner_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX label_print_jobs_pending_idx
  ON public.label_print_jobs(owner_id, created_at)
  WHERE status = 'pending';

CREATE INDEX label_print_jobs_owner_created_idx
  ON public.label_print_jobs(owner_id, created_at DESC);

ALTER TABLE public.label_print_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_print_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.label_print_agents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.label_print_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.label_print_agents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.label_print_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.claim_label_print_job(p_agent_id uuid)
RETURNS SETOF public.label_print_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM public.label_print_agents
  WHERE id = p_agent_id AND revoked_at IS NULL
  FOR SHARE;

  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.label_print_agents
  SET last_seen_at = clock_timestamp()
  WHERE id = p_agent_id
    AND (last_seen_at IS NULL OR last_seen_at < clock_timestamp() - interval '30 seconds');

  RETURN QUERY
  WITH next_job AS (
    SELECT id
    FROM public.label_print_jobs
    WHERE owner_id = v_owner_id AND status = 'pending'
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.label_print_jobs AS job
  SET status = 'processing',
      agent_id = p_agent_id,
      claim_token = gen_random_uuid(),
      claimed_at = clock_timestamp(),
      attempts = attempts + 1
  FROM next_job
  WHERE job.id = next_job.id
  RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_label_print_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_label_print_job(uuid) TO service_role;
