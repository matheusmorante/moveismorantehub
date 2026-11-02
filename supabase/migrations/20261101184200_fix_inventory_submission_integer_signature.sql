BEGIN;

CREATE FUNCTION public.assert_inventory_submission_envelope(
  p_contract_version integer,
  p_audit_id uuid,
  p_code text,
  p_observation jsonb,
  p_items jsonb
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
SET row_security = 'off'
AS $function$
  SELECT public.assert_inventory_submission_envelope(
    p_contract_version::smallint,
    p_audit_id,
    p_code,
    p_observation,
    p_items
  );
$function$;

REVOKE ALL ON FUNCTION public.assert_inventory_submission_envelope(integer, uuid, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
