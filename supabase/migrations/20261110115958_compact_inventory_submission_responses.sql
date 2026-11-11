BEGIN;

-- Background outbox sync needs only auditId/status. Keep the existing
-- finalizers unchanged because interactive callers consume the full `moves` list.
CREATE OR REPLACE FUNCTION public.finalize_inventory_transaction_compact(
  p_audit_id uuid,
  p_code text,
  p_observation jsonb,
  p_items jsonb,
  p_responsible_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.finalize_inventory_transaction(
    p_audit_id, p_code, p_observation, p_items, p_responsible_name
  );
  RETURN pg_catalog.jsonb_build_object(
    'auditId', v_result->'auditId',
    'status', v_result->'status'
  );
END;
$function$;

COMMENT ON FUNCTION public.finalize_inventory_transaction_compact(uuid, text, jsonb, jsonb, text)
  IS 'Finaliza uma submissão v1 pelo finalizador autorizado e devolve somente auditId/status para sincronização em segundo plano.';
REVOKE ALL ON FUNCTION public.finalize_inventory_transaction_compact(uuid, text, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_transaction_compact(uuid, text, jsonb, jsonb, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_inventory_transaction_v2_compact(
  p_audit_id uuid,
  p_code text,
  p_observation jsonb,
  p_items jsonb,
  p_responsible_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.finalize_inventory_transaction_v2(
    p_audit_id, p_code, p_observation, p_items, p_responsible_name
  );
  RETURN pg_catalog.jsonb_build_object(
    'auditId', v_result->'auditId',
    'status', v_result->'status'
  );
END;
$function$;

COMMENT ON FUNCTION public.finalize_inventory_transaction_v2_compact(uuid, text, jsonb, jsonb, text)
  IS 'Finaliza uma submissão v2 pelo finalizador autorizado e devolve somente auditId/status para sincronização em segundo plano.';
REVOKE ALL ON FUNCTION public.finalize_inventory_transaction_v2_compact(uuid, text, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_transaction_v2_compact(uuid, text, jsonb, jsonb, text)
  TO authenticated;

COMMIT;
