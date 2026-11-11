BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.get_ai_quota_metrics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  IF coalesce(auth.jwt()->>'role', '') <> 'service_role' AND NOT public.is_administrator() THEN
    RAISE EXCEPTION 'AI_QUOTA_METRICS_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  RETURN public.check_and_reserve_ai_quota('all', 'ai_unified', 0, 'readonly_metrics', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_ai_quota_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_quota_metrics() TO authenticated, service_role;
COMMIT;
