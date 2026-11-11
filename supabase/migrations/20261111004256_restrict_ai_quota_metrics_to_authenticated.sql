BEGIN;

-- Quota and cost metrics are operational data; the dashboard only needs
-- authenticated access, while backend service calls retain access.
REVOKE ALL ON FUNCTION public.get_ai_quota_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_quota_metrics() TO authenticated, service_role;

COMMIT;
