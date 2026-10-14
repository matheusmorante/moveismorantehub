-- Enforce commercial return capacity at the table boundary, including direct
-- writes and the general inventory RPC. No existing business row is rewritten.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $guard$
BEGIN
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.create_return_order_with_capacity(text,jsonb,jsonb,jsonb)'::regprocedure)) <> '56f10e508ee4372f88b6abcee84b1de9' THEN
    RAISE EXCEPTION 'COMMERCIAL_RETURN_SCHEMA_DRIFT';
  END IF;
END;
$guard$;
CREATE OR REPLACE FUNCTION public.commercial_return_line_identity(p_item jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT pg_catalog.jsonb_build_array(
    pg_catalog.lower(pg_catalog.btrim(COALESCE(p_item->>'productId', ''))),
    pg_catalog.lower(pg_catalog.btrim(COALESCE(p_item->>'variationId', ''))),
    pg_catalog.lower(pg_catalog.btrim(COALESCE(p_item->>'description', '')))
  );
$$;

CREATE OR REPLACE FUNCTION public.commercial_return_remaining(
  p_sold_items jsonb, p_prior_returns jsonb
) RETURNS numeric[] LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  v_remaining numeric[] := ARRAY[]::numeric[];
  v_indexed numeric[] := ARRAY[]::numeric[];
  v_legacy jsonb := '[]'::jsonb;
  v_order jsonb;
  v_item jsonb;
  v_quantity numeric;
  v_allocated numeric;
  v_index integer;
  v_count integer := pg_catalog.jsonb_array_length(p_sold_items);
  v_position integer;
BEGIN
  IF v_count = 0 THEN RETURN v_remaining; END IF;
  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_sold_items) LOOP
    v_remaining := pg_catalog.array_append(v_remaining,
      CASE WHEN COALESCE(v_item->>'quantity', '') ~ '^[0-9]+([.][0-9]+)?([eE][+-]?[0-9]+)?$'
        THEN (v_item->>'quantity')::numeric ELSE 0 END);
    v_indexed := pg_catalog.array_append(v_indexed, 0::numeric);
  END LOOP;
  FOR v_order IN SELECT value FROM pg_catalog.jsonb_array_elements(p_prior_returns) LOOP
    IF v_order->>'status' = 'cancelled' THEN CONTINUE; END IF;
    FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(COALESCE(v_order->'items', '[]'::jsonb)) LOOP
      IF COALESCE(v_item->>'returnedQuantity', v_item->>'quantity', '') !~ '^[0-9]+([.][0-9]+)?([eE][+-]?[0-9]+)?$' THEN CONTINUE; END IF;
      v_quantity := COALESCE(v_item->>'returnedQuantity', v_item->>'quantity')::numeric;
      IF v_quantity <= 0 THEN CONTINUE; END IF;
      IF COALESCE(v_item->>'originalOrderItemIndex', '') ~ '^[0-9]+$' THEN
        IF (v_item->>'originalOrderItemIndex')::numeric < v_count THEN
          v_index := (v_item->>'originalOrderItemIndex')::integer + 1;
          v_indexed[v_index] := v_indexed[v_index] + v_quantity;
        END IF;
      ELSE
        v_legacy := v_legacy || pg_catalog.jsonb_build_array(v_item);
      END IF;
    END LOOP;
  END LOOP;
  FOR v_position IN 1..v_count LOOP
    v_remaining[v_position] := GREATEST(v_remaining[v_position] - v_indexed[v_position], 0);
  END LOOP;
  -- Old returns have no original line index. Allocate each one in source order,
  -- matching the shared TypeScript domain rule instead of pooling duplicate SKUs.
  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(v_legacy) LOOP
    v_quantity := COALESCE(v_item->>'returnedQuantity', v_item->>'quantity')::numeric;
    FOR v_position IN 1..v_count LOOP
      EXIT WHEN v_quantity <= 0;
      IF public.commercial_return_line_identity(v_item) = public.commercial_return_line_identity(p_sold_items->(v_position - 1)) THEN
        v_allocated := LEAST(v_remaining[v_position], v_quantity);
        v_remaining[v_position] := v_remaining[v_position] - v_allocated;
        v_quantity := v_quantity - v_allocated;
      END IF;
    END LOOP;
  END LOOP;
  RETURN v_remaining;
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_return_validation_error(
  p_sold_items jsonb, p_prior_returns jsonb, p_requested_items jsonb
) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  v_remaining numeric[];
  v_requested numeric[];
  v_item jsonb;
  v_index integer;
  v_quantity numeric;
BEGIN
  IF pg_catalog.jsonb_typeof(p_requested_items) IS DISTINCT FROM 'array' THEN RETURN 'RETURN_ITEMS_REQUIRED'; END IF;
  IF pg_catalog.jsonb_array_length(p_requested_items) = 0 THEN RETURN 'RETURN_ITEMS_REQUIRED'; END IF;
  IF pg_catalog.jsonb_typeof(p_sold_items) IS DISTINCT FROM 'array' THEN RETURN 'RETURN_SOURCE_LINE_INVALID'; END IF;
  v_remaining := public.commercial_return_remaining(p_sold_items, p_prior_returns);
  v_requested := pg_catalog.array_fill(0::numeric, ARRAY[pg_catalog.jsonb_array_length(p_sold_items)]);
  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_requested_items) LOOP
    IF pg_catalog.jsonb_typeof(v_item->'originalOrderItemIndex') IS DISTINCT FROM 'number'
       OR COALESCE(v_item->>'originalOrderItemIndex', '') !~ '^[0-9]+$' THEN RETURN 'RETURN_SOURCE_LINE_INVALID'; END IF;
    IF (v_item->>'originalOrderItemIndex')::numeric >= pg_catalog.jsonb_array_length(p_sold_items) THEN RETURN 'RETURN_SOURCE_LINE_INVALID'; END IF;
    v_index := (v_item->>'originalOrderItemIndex')::integer + 1;
    IF public.commercial_return_line_identity(v_item) IS DISTINCT FROM public.commercial_return_line_identity(p_sold_items->(v_index - 1)) THEN RETURN 'RETURN_SOURCE_LINE_MISMATCH'; END IF;
    IF pg_catalog.jsonb_typeof(v_item->'quantity') IS DISTINCT FROM 'number'
       OR (v_item->>'quantity')::numeric <= 0 THEN RETURN 'RETURN_QUANTITY_INVALID'; END IF;
    v_quantity := (v_item->>'quantity')::numeric;
    IF v_item ? 'returnedQuantity' AND (
      pg_catalog.jsonb_typeof(v_item->'returnedQuantity') IS DISTINCT FROM 'number'
      OR (v_item->>'returnedQuantity')::numeric IS DISTINCT FROM v_quantity
    ) THEN RETURN 'RETURN_QUANTITY_MISMATCH'; END IF;
    v_requested[v_index] := v_requested[v_index] + v_quantity;
  END LOOP;
  FOR v_index IN 1..COALESCE(pg_catalog.array_length(v_remaining, 1), 0) LOOP
    IF v_requested[v_index] > v_remaining[v_index] THEN RETURN 'RETURN_CAPACITY_EXCEEDED'; END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_commercial_return_domain()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_source public.orders%ROWTYPE;
  v_source_id text;
  v_prior jsonb;
  v_error text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'ORDER_CANCELLED_TERMINAL' USING ERRCODE = '23514';
    END IF;
    IF OLD.status <> 'draft' AND NEW.status = 'draft' THEN
      RAISE EXCEPTION 'ORDER_CANNOT_RETURN_TO_DRAFT' USING ERRCODE = '23514';
    END IF;
    IF OLD.status = 'quoted' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'ORDER_QUOTED_TERMINAL' USING ERRCODE = '23514';
    END IF;
    IF OLD.order_type = 'return' AND NEW.order_type IS DISTINCT FROM OLD.order_type THEN
      RAISE EXCEPTION 'RETURN_TYPE_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.status = 'quoted' AND NEW.order_type IS DISTINCT FROM 'budget' THEN
    RAISE EXCEPTION 'ORDER_QUOTED_REQUIRES_BUDGET' USING ERRCODE = '23514';
  END IF;
  IF NEW.order_type IS DISTINCT FROM 'return' OR NEW.status IN ('draft', 'cancelled') THEN RETURN NEW; END IF;
  v_source_id := COALESCE(NULLIF(NEW.linked_order_id, ''), NULLIF(NEW.order_data->>'linkedOrderId', ''));
  IF v_source_id IS NULL OR v_source_id = NEW.id THEN
    RAISE EXCEPTION 'RETURN_SOURCE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  -- The same source row lock serializes the capacity decision for every writer.
  SELECT * INTO v_source FROM public.orders WHERE id = v_source_id FOR UPDATE;
  IF NOT FOUND OR v_source.order_type <> 'sale' OR v_source.status = 'cancelled' THEN
    RAISE EXCEPTION 'RETURN_SOURCE_INVALID' USING ERRCODE = '23514';
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('status', prior.status, 'items', prior.items)), '[]'::jsonb)
    INTO v_prior FROM public.orders prior
   WHERE prior.order_type = 'return' AND prior.status <> 'cancelled'
     AND prior.id <> NEW.id
     AND (prior.linked_order_id = v_source_id OR prior.order_data->>'linkedOrderId' = v_source_id);
  v_error := public.commercial_return_validation_error(v_source.items, v_prior, NEW.items);
  IF v_error IS NOT NULL THEN RAISE EXCEPTION '%', v_error USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;

-- Run after the existing column synchronization. The existing physical/fiscal
-- circulation and immutable-snapshot triggers continue to apply independently.
CREATE TRIGGER zz_commercial_return_domain
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_commercial_return_domain();

REVOKE ALL ON FUNCTION public.commercial_return_line_identity(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.commercial_return_remaining(jsonb,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.commercial_return_validation_error(jsonb,jsonb,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.guard_commercial_return_domain() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commercial_return_line_identity(jsonb), public.commercial_return_remaining(jsonb,jsonb), public.commercial_return_validation_error(jsonb,jsonb,jsonb) TO authenticated, service_role;

-- An idempotency key may replay only the exact commercial request.
CREATE OR REPLACE FUNCTION public.create_return_order_with_capacity(p_order_id text, p_order_payload jsonb, p_items jsonb, p_payments jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_source_id text := COALESCE(p_order_payload->>'linked_order_id', p_order_payload->'order_data'->>'linkedOrderId');
  v_source public.orders%ROWTYPE;
  v_requested jsonb;
  v_source_item jsonb;
  v_signature text;
  v_index integer;
  v_sold numeric;
  v_already_returned numeric;
  v_requested_quantity numeric;
  v_line_quantity numeric;
  v_result jsonb;
  v_existing public.orders%ROWTYPE;
  v_return_kind text;
  v_return_total numeric;
BEGIN
  IF v_source_id IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Devolução precisa estar vinculada à venda e conter itens';
  END IF;
  IF COALESCE(p_order_payload->>'order_type', p_order_payload->'order_data'->>'orderType') <> 'return' THEN
    RAISE EXCEPTION 'Operação inválida: pedido informado não é uma devolução';
  END IF;

  -- Serializa criações concorrentes para a mesma venda antes de calcular o saldo.
  SELECT * INTO v_source FROM public.orders WHERE id::text = v_source_id FOR UPDATE;
  IF NOT FOUND OR v_source.order_type <> 'sale' THEN
    RAISE EXCEPTION 'Venda original não encontrada para a devolução';
  END IF;
  IF v_source.status = 'cancelled' THEN
    RAISE EXCEPTION 'Não é possível devolver itens de uma venda cancelada';
  END IF;

  SELECT * INTO v_existing FROM public.orders WHERE id::text = p_order_id;
  IF FOUND THEN
    IF v_existing.order_type = 'return'
       AND (v_existing.linked_order_id = v_source_id OR v_existing.order_data->>'linkedOrderId' = v_source_id)
       AND v_existing.order_data->>'returnRequestId' = p_order_payload->'order_data'->>'returnRequestId'
       AND v_existing.order_data->>'inventoryRequestHash' = md5((p_order_payload - 'updated_at')::text || p_items::text || p_payments::text) THEN
      RETURN jsonb_build_object('id', v_existing.id, 'order_index', v_existing.order_index,
        'order_data', v_existing.order_data, 'status', v_existing.status,
        'stock_processed', v_existing.stock_processed, 'idempotent_replay', true);
    END IF;
    RAISE EXCEPTION 'Identificador da devolução já utilizado por outra solicitação';
  END IF;

  FOR v_requested IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_index := NULLIF(v_requested->>'originalOrderItemIndex', '')::integer;
    IF v_index IS NULL OR v_index < 0 THEN
      RAISE EXCEPTION 'Item da devolução sem vínculo com a linha original';
    END IF;
    v_source_item := v_source.items->v_index;
    IF v_source_item IS NULL OR v_source_item = 'null'::jsonb THEN
      RAISE EXCEPTION 'Linha original da venda não encontrada';
    END IF;
    v_line_quantity := COALESCE(NULLIF(v_requested->>'returnedQuantity', '')::numeric,
                                NULLIF(v_requested->>'quantity', '')::numeric, 0);
    IF v_line_quantity <= 0 OR
       jsonb_build_array(COALESCE(v_requested->>'productId', ''),
         COALESCE(v_requested->>'variationId', ''),
         lower(btrim(COALESCE(v_requested->>'description', ''))))::text IS DISTINCT FROM
       jsonb_build_array(COALESCE(v_source_item->>'productId', ''),
         COALESCE(v_source_item->>'variationId', ''),
         lower(btrim(COALESCE(v_source_item->>'description', ''))))::text THEN
      RAISE EXCEPTION 'Item ou quantidade da devolução não corresponde à linha original';
    END IF;
    v_signature := jsonb_build_array(
      COALESCE(v_source_item->>'productId', ''),
      COALESCE(v_source_item->>'variationId', ''),
      lower(btrim(COALESCE(v_source_item->>'description', '')))
    )::text;

    SELECT COALESCE(sum(COALESCE(NULLIF(sold.value->>'quantity', '')::numeric, 0)), 0)
      INTO v_sold
      FROM jsonb_array_elements(v_source.items) AS sold(value)
     WHERE jsonb_build_array(COALESCE(sold.value->>'productId', ''),
       COALESCE(sold.value->>'variationId', ''),
       lower(btrim(COALESCE(sold.value->>'description', ''))))::text = v_signature;

    SELECT COALESCE(sum(COALESCE(NULLIF(returned.value->>'returnedQuantity', '')::numeric,
                                 NULLIF(returned.value->>'quantity', '')::numeric, 0)), 0)
      INTO v_already_returned
      FROM public.orders AS prior
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(prior.items, '[]'::jsonb)) AS returned(value)
     WHERE prior.order_type = 'return'
       AND (prior.linked_order_id = v_source_id OR prior.order_data->>'linkedOrderId' = v_source_id)
       AND prior.status <> 'cancelled'
       AND jsonb_build_array(COALESCE(returned.value->>'productId', ''),
         COALESCE(returned.value->>'variationId', ''),
         lower(btrim(COALESCE(returned.value->>'description', ''))))::text = v_signature;

    SELECT COALESCE(sum(COALESCE(NULLIF(requested.value->>'returnedQuantity', '')::numeric,
                                 NULLIF(requested.value->>'quantity', '')::numeric, 0)), 0)
      INTO v_requested_quantity
      FROM jsonb_array_elements(p_items) AS requested(value)
      JOIN LATERAL (SELECT v_source.items->NULLIF(requested.value->>'originalOrderItemIndex', '')::integer AS source_item) source_line ON true
     WHERE jsonb_build_array(COALESCE(source_line.source_item->>'productId', ''),
       COALESCE(source_line.source_item->>'variationId', ''),
       lower(btrim(COALESCE(source_line.source_item->>'description', ''))))::text = v_signature;

    IF v_requested_quantity <= 0 OR v_already_returned + v_requested_quantity > v_sold THEN
      RAISE EXCEPTION 'Quantidade excede o saldo devolvível do item: disponível %, já devolvido %, solicitado %',
        GREATEST(v_sold - v_already_returned, 0), v_already_returned, v_requested_quantity;
    END IF;
  END LOOP;

  v_result := public.create_order_with_inventory_transaction(
    p_order_id, p_order_payload, p_items, p_payments, false
  );

  SELECT COALESCE(sum(return_order.total_amount), 0)
    INTO v_return_total
    FROM public.orders AS return_order
   WHERE return_order.order_type = 'return'
     AND (return_order.linked_order_id = v_source_id OR return_order.order_data->>'linkedOrderId' = v_source_id)
     AND return_order.status <> 'cancelled';

  SELECT CASE WHEN NOT EXISTS (
      SELECT 1
        FROM (
          SELECT jsonb_build_array(COALESCE(sold_item.value->>'productId', ''),
                   COALESCE(sold_item.value->>'variationId', ''),
                   lower(btrim(COALESCE(sold_item.value->>'description', ''))))::text AS signature,
                 sum(COALESCE(NULLIF(sold_item.value->>'quantity', '')::numeric, 0)) AS sold_quantity
            FROM jsonb_array_elements(v_source.items) AS sold_item(value)
           GROUP BY 1
        ) AS sold
       WHERE sold.sold_quantity > (
         SELECT COALESCE(sum(COALESCE(NULLIF(returned.value->>'returnedQuantity', '')::numeric,
                                      NULLIF(returned.value->>'quantity', '')::numeric, 0)), 0)
           FROM public.orders AS return_order
           CROSS JOIN LATERAL jsonb_array_elements(COALESCE(return_order.items, '[]'::jsonb)) AS returned(value)
          WHERE return_order.order_type = 'return'
            AND (return_order.linked_order_id = v_source_id OR return_order.order_data->>'linkedOrderId' = v_source_id)
            AND return_order.status <> 'cancelled'
            AND jsonb_build_array(COALESCE(returned.value->>'productId', ''),
              COALESCE(returned.value->>'variationId', ''),
              lower(btrim(COALESCE(returned.value->>'description', ''))))::text = sold.signature
       )
    ) THEN 'complete' ELSE 'partial' END
    INTO v_return_kind;

  UPDATE public.orders
     SET return_order_id = p_order_id,
         order_data = jsonb_set(
           jsonb_set(
             jsonb_set(COALESCE(order_data, '{}'::jsonb), '{returnOrderId}', to_jsonb(p_order_id), true),
             '{returnKind}', to_jsonb(v_return_kind), true),
           '{returnedTotalAmount}', to_jsonb(v_return_total), true),
         updated_at = now()
   WHERE id::text = v_source_id;

  RETURN v_result;
END;
$function$;

COMMIT;

