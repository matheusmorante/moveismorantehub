-- Return the already-readable order snapshot with business rejections after the order lookup.
-- The client can then reconcile its offline copy without issuing a second REST request.
CREATE OR REPLACE FUNCTION public.apply_order_delivery_operation_with_state(
  p_order_id text,
  p_operation_id text,
  p_event_id text,
  p_event_type text,
  p_expected_revision integer,
  p_patch jsonb,
  p_expected_payments jsonb DEFAULT NULL,
  p_payments jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
  v_result jsonb;
  v_server_state jsonb;
BEGIN
  -- Keep malformed or incomplete calls on the original validation path.
  IF p_order_id IS NULL OR p_operation_id IS NULL OR p_operation_id = ''
     OR p_event_id IS NULL OR p_event_id = ''
     OR p_expected_revision IS NULL OR p_expected_revision < 0
     OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN
    RETURN public.apply_order_delivery_operation(
      p_order_id, p_operation_id, p_event_id, p_event_type,
      p_expected_revision, p_patch, p_expected_payments, p_payments
    );
  END IF;

  v_result := public.apply_order_delivery_operation(
    p_order_id, p_operation_id, p_event_id, p_event_type,
    p_expected_revision, p_patch, p_expected_payments, p_payments
  );

  -- Success and duplicate acknowledgements already include this snapshot.
  -- Missing or inaccessible orders must not reveal any additional state.
  IF (v_result->>'success') IS DISTINCT FROM 'false'
     OR v_result ? 'server_state'
     OR (v_result->>'reason') IS NOT DISTINCT FROM 'ENTITY_NOT_FOUND' THEN
    RETURN v_result;
  END IF;

  v_server_state := public.read_delivery_operation_order_state(p_order_id);
  IF v_server_state IS NULL THEN
    RETURN v_result;
  END IF;

  RETURN v_result || jsonb_build_object('server_state', v_server_state);
END;
$fn$;

REVOKE ALL ON FUNCTION public.apply_order_delivery_operation_with_state(text,text,text,text,integer,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_order_delivery_operation_with_state(text,text,text,text,integer,jsonb,jsonb,jsonb) TO authenticated, service_role;
