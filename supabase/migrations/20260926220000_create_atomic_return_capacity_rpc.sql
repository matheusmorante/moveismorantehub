CREATE OR REPLACE FUNCTION public.create_return_order_with_capacity(
  p_order_id text,
  p_order_payload jsonb,
  p_items jsonb,
  p_payments jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
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
       AND v_existing.order_data->>'returnRequestId' = p_order_payload->'order_data'->>'returnRequestId' THEN
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

REVOKE ALL ON FUNCTION public.create_return_order_with_capacity(text, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_return_order_with_capacity(text, jsonb, jsonb, jsonb)
  TO anon, authenticated, service_role;
