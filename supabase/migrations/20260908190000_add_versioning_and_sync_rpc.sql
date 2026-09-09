-- A fila local transporta intenções; esta função é a autoridade para revalidá-las.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.sync_operation_receipts (
  idempotency_key text PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_operation_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_entity_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_orders_version ON public.orders;
CREATE TRIGGER trg_increment_orders_version BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.increment_entity_version();

DROP TRIGGER IF EXISTS trg_increment_financial_transactions_version ON public.financial_transactions;
CREATE TRIGGER trg_increment_financial_transactions_version BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.increment_entity_version();

CREATE OR REPLACE FUNCTION public.sync_entity_operation(
  p_entity_type text, p_entity_id text, p_operation text, p_expected_version integer,
  p_idempotency_key text, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_result jsonb;
  v_patch jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'PERMISSION_DENIED'; END IF;
  IF p_entity_type <> 'order' OR p_operation <> 'update' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'UNSUPPORTED_OPERATION');
  END IF;

  SELECT result INTO v_result FROM public.sync_operation_receipts
  WHERE idempotency_key = p_idempotency_key AND actor_id = auth.uid();
  IF FOUND THEN RETURN v_result; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_entity_id FOR UPDATE;
  IF NOT FOUND THEN
    v_result := jsonb_build_object('success', false, 'reason', 'ENTITY_NOT_FOUND');
  ELSIF lower(coalesce(v_order.status, '')) IN ('fulfilled', 'atendido', 'completed', 'cancelled', 'cancelado') THEN
    v_result := jsonb_build_object('success', false,
      'reason', CASE WHEN lower(v_order.status) IN ('cancelled', 'cancelado') THEN 'ORDER_CANCELLED' ELSE 'ORDER_ALREADY_COMPLETED' END,
      'server_version', v_order.version,
      'server_state', jsonb_build_object('id', v_order.id, 'status', v_order.status, 'order_data', v_order.order_data, 'version', v_order.version));
  ELSIF v_order.version <> p_expected_version THEN
    v_result := jsonb_build_object('success', false, 'reason', 'VERSION_CONFLICT', 'server_version', v_order.version,
      'server_state', jsonb_build_object('id', v_order.id, 'status', v_order.status, 'order_data', v_order.order_data, 'version', v_order.version));
  ELSE
    v_patch := coalesce(p_payload->'order_data_patch', '{}'::jsonb);
    UPDATE public.orders SET order_data = coalesce(v_order.order_data, '{}'::jsonb) || v_patch,
      status = coalesce(v_patch->>'status', v_order.status)
    WHERE id = v_order.id RETURNING * INTO v_order;
    v_result := jsonb_build_object('success', true, 'server_version', v_order.version,
      'server_state', jsonb_build_object('id', v_order.id, 'status', v_order.status, 'order_data', v_order.order_data, 'version', v_order.version));
  END IF;

  INSERT INTO public.sync_operation_receipts (idempotency_key, entity_type, entity_id, actor_id, result)
  VALUES (p_idempotency_key, p_entity_type, p_entity_id, auth.uid(), v_result)
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_entity_operation(text, text, text, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_entity_operation(text, text, text, integer, text, jsonb) TO authenticated;
