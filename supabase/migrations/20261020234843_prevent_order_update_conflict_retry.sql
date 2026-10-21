BEGIN;

-- PostgREST treats SQLSTATE 40001 as transient and retries the transaction.
-- A stale order version is an expected business conflict, so use PL/pgSQL's
-- default P0001 while preserving the message consumed by the ERP client.
CREATE OR REPLACE FUNCTION public.update_order_with_inventory_transaction_if_version(
  p_order_id text,
  p_expected_updated_at timestamptz,
  p_order_payload jsonb,
  p_items jsonb,
  p_payments jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_current_updated_at timestamptz;
  v_result jsonb;
BEGIN
  IF p_order_id IS NULL OR pg_catalog.btrim(p_order_id) = '' THEN
    RAISE EXCEPTION 'Identificador do pedido obrigatório';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_order_id));

  SELECT order_row.updated_at
    INTO v_current_updated_at
    FROM public.orders AS order_row
   WHERE order_row.id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado para atualização';
  END IF;

  IF p_expected_updated_at IS NULL
     OR v_current_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'ORDER_VERSION_CONFLICT';
  END IF;

  v_result := public.create_order_with_inventory_transaction(
    p_order_id,
    p_order_payload,
    p_items,
    p_payments,
    true
  );
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_order_with_inventory_transaction_if_version(
  text, timestamptz, jsonb, jsonb, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_order_with_inventory_transaction_if_version(
  text, timestamptz, jsonb, jsonb, jsonb
) TO authenticated, service_role;

COMMENT ON FUNCTION public.update_order_with_inventory_transaction_if_version(
  text, timestamptz, jsonb, jsonb, jsonb
) IS 'Atomically compare order updated_at before applying the existing commercial and inventory transaction; stale versions return ORDER_VERSION_CONFLICT without retryable SQLSTATE.';

COMMIT;
