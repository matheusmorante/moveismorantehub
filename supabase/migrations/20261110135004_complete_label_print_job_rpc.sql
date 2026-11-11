CREATE FUNCTION public.complete_label_print_job(
  p_agent_token_hash text,
  p_job_id text,
  p_claim_token text,
  p_status text,
  p_error text,
  p_completed_at timestamptz
)
RETURNS TABLE (
  authenticated boolean,
  request_valid boolean,
  accepted boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_agent_id uuid;
  v_updated_job_id uuid;
BEGIN
  SELECT agent.id INTO v_agent_id
  FROM public.label_print_agents AS agent
  WHERE agent.token_hash = p_agent_token_hash;

  IF v_agent_id IS NULL THEN
    RETURN QUERY SELECT false, false, false;
    RETURN;
  END IF;

  IF p_job_id IS NULL
     OR p_job_id !~* '^[0-9a-f-]{36}$'
     OR p_claim_token IS NULL
     OR p_claim_token !~* '^[0-9a-f-]{36}$'
     OR p_status IS NULL
     OR p_status NOT IN ('printed', 'failed') THEN
    RETURN QUERY SELECT true, false, false;
    RETURN;
  END IF;

  UPDATE public.label_print_jobs AS job
  SET status = p_status,
      html = ' ',
      error = CASE
        WHEN p_status = 'failed'
          THEN COALESCE(NULLIF(left(p_error, 500), ''), 'A estação não conseguiu imprimir.')
        ELSE NULL
      END,
      completed_at = p_completed_at
  WHERE job.id = p_job_id::uuid
    AND job.agent_id = v_agent_id
    AND job.claim_token = p_claim_token::uuid
    AND job.status = 'processing'
  RETURNING job.id INTO v_updated_job_id;

  RETURN QUERY SELECT true, true, v_updated_job_id IS NOT NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_label_print_job(text, text, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_label_print_job(text, text, text, text, text, timestamptz) TO service_role;
