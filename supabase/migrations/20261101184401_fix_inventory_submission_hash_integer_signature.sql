BEGIN;

CREATE FUNCTION public.inventory_audit_submission_hash(
  p_contract_version integer,
  p_audit_id uuid,
  p_code text,
  p_observation jsonb,
  p_items jsonb,
  p_responsible_name text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT public.inventory_audit_submission_hash(
    $1::smallint,
    $2,
    $3,
    $4,
    $5,
    $6
  );
$function$;

REVOKE ALL ON FUNCTION public.inventory_audit_submission_hash(integer, uuid, text, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
