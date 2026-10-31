CREATE OR REPLACE FUNCTION public.create_order_with_inventory_transaction(p_order_id text, p_order_payload jsonb, p_items jsonb, p_payments jsonb, p_is_update boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_result jsonb;
  v_existing public.orders%ROWTYPE;
  v_order_type text := COALESCE(p_order_payload->>'order_type', 'sale');
  v_status text := COALESCE(p_order_payload->>'status', 'draft');
  v_effect text;
  v_prior_effect text;
  v_prior_signature jsonb;
  v_next_signature jsonb;
  v_expected_count integer := 0;
  v_active_count integer := 0;
  v_replace boolean := true;
  v_old_move record;
  v_old_item record;
  v_return_row public.orders%ROWTYPE;
  v_return_item record;
  v_return_items jsonb;
  v_return_data jsonb;
  v_return_changed boolean;
  v_date timestamptz;
  v_item record;
  v_component record;
  v_product record;
  v_component_product record;
  v_product_id uuid;
  v_variation_id uuid;
  v_component_id uuid;
  v_component_variation_id uuid;
  v_quantity numeric;
  v_component_quantity numeric;
  v_unit_cost numeric;
  v_component_cost numeric;
  v_items jsonb := p_items;
  v_request_hash text;
  v_saved_data jsonb;
  v_has_stock boolean := false;
  v_count integer;
BEGIN
  IF p_order_id IS NULL OR btrim(p_order_id) = '' THEN
    RAISE EXCEPTION 'Identificador idempotente do pedido é obrigatório';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_typeof(p_payments) <> 'array' THEN
    RAISE EXCEPTION 'Itens e pagamentos do pedido devem ser listas';
  END IF;
  v_request_hash := md5((p_order_payload - 'updated_at')::text || p_items::text || p_payments::text);

  PERFORM pg_advisory_xact_lock(hashtext(p_order_id));
  SELECT * INTO v_existing FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF FOUND THEN
    IF NOT p_is_update THEN
      IF v_existing.order_data->>'inventoryRequestHash' = v_request_hash THEN
        RETURN jsonb_build_object('id', v_existing.id, 'order_index', v_existing.order_index,
                                  'order_data', v_existing.order_data, 'status', v_existing.status,
                                  'stock_processed', v_existing.stock_processed);
      END IF;
      RAISE EXCEPTION 'Identificador do pedido já utilizado com conteúdo diferente';
    END IF;
  ELSIF p_is_update THEN
    RAISE EXCEPTION 'Pedido não encontrado para atualização: %', p_order_id;
  END IF;

  v_effect := CASE WHEN v_order_type = 'sale' AND v_status IN ('scheduled', 'fulfilled') THEN 'exit'
                   WHEN v_order_type = 'return' AND v_status = 'fulfilled' THEN 'entry'
                   ELSE NULL END;
  IF p_is_update THEN
    v_prior_effect := CASE WHEN v_existing.order_type = 'sale' AND v_existing.status IN ('scheduled', 'fulfilled') THEN 'exit'
                           WHEN v_existing.order_type = 'return' AND v_existing.status = 'fulfilled' THEN 'entry'
                           ELSE NULL END;
    SELECT COALESCE(jsonb_agg(jsonb_build_array(value->>'productId', value->>'variationId',
             NULLIF(value->>'quantity', '')::numeric,
             COALESCE((value->>'isTemporaryProduct')::boolean, false), value->>'itemType') ORDER BY ordinality), '[]'::jsonb)
      INTO v_prior_signature
      FROM jsonb_array_elements(COALESCE(v_existing.items, '[]'::jsonb)) WITH ORDINALITY;
    SELECT COALESCE(jsonb_agg(jsonb_build_array(value->>'productId', value->>'variationId',
             NULLIF(value->>'quantity', '')::numeric,
             COALESCE((value->>'isTemporaryProduct')::boolean, false), value->>'itemType') ORDER BY ordinality), '[]'::jsonb)
      INTO v_next_signature FROM jsonb_array_elements(p_items) WITH ORDINALITY;

    IF v_effect IS NOT NULL THEN
      SELECT COALESCE(sum(1 + CASE WHEN v_effect = 'exit' AND COALESCE(product.is_combo, false)
                                  THEN jsonb_array_length(COALESCE(product.combo_items, '[]'::jsonb)) ELSE 0 END), 0)::integer
        INTO v_expected_count
        FROM jsonb_array_elements(p_items) AS item(value)
        JOIN public.products AS product ON product.id::text = item.value->>'productId'
        WHERE NOT COALESCE((item.value->>'isTemporaryProduct')::boolean, false)
          AND item.value->>'itemType' IS DISTINCT FROM 'service';
    END IF;
    SELECT count(*) INTO v_active_count FROM public.inventory_moves
      WHERE order_id = p_order_id AND type IN ('exit', 'withdrawal', 'entry')
        AND COALESCE(status, 'effective') NOT IN ('reversed', 'cancelled');
    v_replace := v_prior_effect IS DISTINCT FROM v_effect
      OR v_prior_signature IS DISTINCT FROM v_next_signature
      OR v_active_count <> v_expected_count;

    IF v_replace THEN
      FOR v_old_move IN SELECT id, product_id, variation_id, type, quantity
                          FROM public.inventory_moves
                          WHERE order_id = p_order_id AND type IN ('exit', 'withdrawal', 'entry')
                            AND COALESCE(status, 'effective') NOT IN ('reversed', 'cancelled')
                          ORDER BY id FOR UPDATE LOOP
        UPDATE public.inventory_moves
           SET status = 'reversed', reversal_reason = 'Substituição ou cancelamento do pedido',
               reversed_at = now()
         WHERE id = v_old_move.id;
        PERFORM public.apply_order_document_stock_delta(
          v_old_move.product_id::uuid, v_old_move.variation_id::uuid,
          CASE WHEN v_old_move.type = 'entry' THEN -v_old_move.quantity ELSE v_old_move.quantity END);
      END LOOP;
    ELSE
      v_has_stock := v_active_count > 0;
    END IF;
  END IF;
  v_date := COALESCE(NULLIF(p_order_payload->'order_data'->>'date', '')::timestamptz, now());

  -- A RPC existente grava cabeçalho, itens e pagamentos; o bloco inteiro continua
  -- dentro da mesma transação PostgreSQL desta chamada.
  v_result := public.save_order_transaction(p_order_id, p_order_payload, p_items, p_payments, p_is_update);

  -- Uma transição scheduled -> fulfilled sem nova saída conserva o CMV do
  -- instante original, mesmo que o custo atual do produto tenha mudado.
  IF p_is_update AND NOT v_replace AND v_effect = 'exit' THEN
    FOR v_old_item IN SELECT value, ordinality::integer AS item_index
                        FROM jsonb_array_elements(COALESCE(v_existing.items, '[]'::jsonb)) WITH ORDINALITY LOOP
      IF v_old_item.value ? 'cmvUnitCost' THEN
        v_items := jsonb_set(v_items, ARRAY[(v_old_item.item_index - 1)::text],
          (v_items->(v_old_item.item_index - 1)) ||
          jsonb_build_object('unitCost', v_old_item.value->'unitCost',
                             'cmvUnitCost', v_old_item.value->'cmvUnitCost',
                             'cmvTotal', v_old_item.value->'cmvTotal'));
        UPDATE public.order_items SET cost_price = NULLIF(v_old_item.value->>'cmvUnitCost', '')::numeric,
          item_snapshot = v_items->(v_old_item.item_index - 1)
          WHERE order_id = p_order_id AND item_index = v_old_item.item_index;
      END IF;
    END LOOP;
  END IF;

  IF v_effect IS NOT NULL AND v_replace THEN
    FOR v_item IN SELECT value, ordinality::integer AS item_index
                    FROM jsonb_array_elements(p_items) WITH ORDINALITY LOOP
      IF NULLIF(btrim(v_item.value->>'productId'), '') IS NULL
         OR COALESCE((v_item.value->>'isTemporaryProduct')::boolean, false)
         OR v_item.value->>'itemType' = 'service' THEN
        CONTINUE;
      END IF;

      v_product_id := (v_item.value->>'productId')::uuid;
      SELECT id, description, name, cost_price, is_combo, combo_items
        INTO v_product FROM public.products WHERE id = v_product_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto cadastrado não encontrado no estoque: %', v_product_id; END IF;

      v_variation_id := NULLIF(v_item.value->>'variationId', '')::uuid;
      IF v_variation_id IS NULL THEN
        SELECT count(*), min(id::text)::uuid INTO v_count, v_variation_id
          FROM public.product_variations WHERE product_id = v_product_id;
        IF v_count <> 1 THEN RAISE EXCEPTION 'Variação não identificada para o produto: %', v_product_id; END IF;
      END IF;
      PERFORM 1 FROM public.product_variations
        WHERE id = v_variation_id AND product_id = v_product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variação não pertence ao produto: %', v_variation_id; END IF;

      v_quantity := NULLIF(v_item.value->>'quantity', '')::numeric;
      IF v_quantity IS NULL OR v_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantidade inválida no item % do pedido', v_item.item_index;
      END IF;
      SELECT COALESCE(NULLIF(variation.cost_price, 0), NULLIF(v_product.cost_price, 0))
        INTO v_unit_cost FROM public.product_variations AS variation WHERE variation.id = v_variation_id;
      IF v_effect = 'entry' THEN
        v_unit_cost := NULLIF(NULLIF(v_item.value->>'unitCost', '')::numeric, 0);
      END IF;

      -- Mantém o comportamento existente de composição: componentes e item pai
      -- recebem fatos distintos, cada qual com chave de origem própria.
      IF v_effect = 'exit' AND COALESCE(v_product.is_combo, false) THEN
        FOR v_component IN SELECT value, ordinality::integer AS component_index
                             FROM jsonb_array_elements(COALESCE(v_product.combo_items, '[]'::jsonb)) WITH ORDINALITY LOOP
          v_component_id := (v_component.value->>'productId')::uuid;
          SELECT id, cost_price INTO v_component_product FROM public.products
            WHERE id = v_component_id FOR UPDATE;
          IF NOT FOUND THEN RAISE EXCEPTION 'Componente do produto composto não encontrado'; END IF;
          v_component_variation_id := NULLIF(v_component.value->>'variationId', '')::uuid;
          IF v_component_variation_id IS NULL THEN
            SELECT count(*), min(id::text)::uuid INTO v_count, v_component_variation_id
              FROM public.product_variations WHERE product_id = v_component_id;
            IF v_count <> 1 THEN RAISE EXCEPTION 'Variação do componente não identificada'; END IF;
          END IF;
          SELECT COALESCE(NULLIF(variation.cost_price, 0), NULLIF(v_component_product.cost_price, 0))
            INTO v_component_cost FROM public.product_variations AS variation
            WHERE variation.id = v_component_variation_id AND variation.product_id = v_component_id;
          IF NOT FOUND THEN RAISE EXCEPTION 'Variação do componente inválida'; END IF;
          v_component_quantity := NULLIF(v_component.value->>'quantity', '')::numeric * v_quantity;
          IF v_component_quantity IS NULL OR v_component_quantity <= 0 THEN
            RAISE EXCEPTION 'Quantidade inválida no componente do item %', v_item.item_index;
          END IF;
          INSERT INTO public.inventory_moves (
            product_id, variation_id, product_description, type, quantity, date, label,
            unit_cost, observation, order_id, related_entity_id, related_entity_type,
            source_order_id, source_order_item_index, source_order_component_index, status
          ) VALUES (
            v_component_id, v_component_variation_id,
            COALESCE(v_component.value->>'description', 'Componente de produto composto'),
            'exit', v_component_quantity, v_date, 'Saída - Pedido #' || COALESCE(p_order_payload->>'order_index', p_order_id),
            v_component_cost, jsonb_build_object('status', 'effective', 'orderId', p_order_id)::text,
            p_order_id, p_order_id, 'sales_order', p_order_id, v_item.item_index, v_component.component_index, 'effective'
          );
          PERFORM public.apply_order_document_stock_delta(v_component_id, v_component_variation_id, -v_component_quantity);
        END LOOP;
      END IF;

      INSERT INTO public.inventory_moves (
        product_id, variation_id, product_description, type, quantity, date, label,
        unit_cost, unit_price, observation, order_id, related_entity_id, related_entity_type,
        source_order_id, source_order_item_index, source_order_component_index, status
      ) VALUES (
        v_product_id, v_variation_id, COALESCE(v_item.value->>'description', v_product.description, v_product.name),
        v_effect, v_quantity, v_date,
        CASE WHEN v_effect = 'exit' THEN 'Saída - Pedido #' ELSE 'Entrada - Devolução #' END
          || COALESCE(p_order_payload->>'order_index', p_order_id),
        v_unit_cost, NULLIF(v_item.value->>'unitPrice', '')::numeric,
        jsonb_build_object('status', 'effective', 'orderId', p_order_id)::text,
        p_order_id, p_order_id, 'sales_order', p_order_id, v_item.item_index, 0, 'effective'
      );
      PERFORM public.apply_order_document_stock_delta(
        v_product_id, v_variation_id,
        CASE WHEN v_effect = 'exit' THEN -v_quantity ELSE v_quantity END,
        CASE WHEN v_effect = 'entry' THEN v_unit_cost ELSE NULL END
      );

      IF v_effect = 'exit' THEN
        v_items := jsonb_set(v_items, ARRAY[(v_item.item_index - 1)::text],
          v_item.value || jsonb_build_object('unitCost', v_unit_cost, 'cmvUnitCost', v_unit_cost,
                                             'cmvTotal', CASE WHEN v_unit_cost IS NULL THEN NULL ELSE v_unit_cost * v_quantity END));
        UPDATE public.order_items SET cost_price = v_unit_cost,
          item_snapshot = v_items->(v_item.item_index - 1)
          WHERE order_id = p_order_id AND item_index = v_item.item_index;
      END IF;
      v_has_stock := true;
    END LOOP;
  END IF;

  UPDATE public.orders
     SET items = v_items,
         stock_processed = v_order_type = 'sale' AND v_has_stock,
         order_data = jsonb_set(
           jsonb_set(
             jsonb_set(order_data, '{items}', v_items, true),
             (CASE WHEN v_order_type = 'return' THEN '{returnStockProcessed}' ELSE '{stockProcessed}' END)::text[],
             to_jsonb(v_has_stock), true),
           '{inventoryRequestHash}', to_jsonb(v_request_hash), true)
   WHERE id = p_order_id
   RETURNING order_data INTO v_saved_data;

  -- Vincular um item temporário de venda também à devolução correspondente é
  -- parte da mesma transação. Uma devolução já atendida recebe sua entrada aqui;
  -- uma devolução agendada apenas atualiza a referência de catálogo.
  IF p_is_update AND v_order_type = 'sale' AND v_effect = 'exit' THEN
    FOR v_old_item IN
      SELECT previous.value AS previous_item, current.value AS current_item
      FROM jsonb_array_elements(COALESCE(v_existing.items, '[]'::jsonb)) WITH ORDINALITY AS previous(value, item_index)
      JOIN jsonb_array_elements(p_items) WITH ORDINALITY AS current(value, item_index)
        ON current.item_index = previous.item_index
      WHERE (NULLIF(previous.value->>'productId', '') IS NULL
             OR COALESCE((previous.value->>'isTemporaryProduct')::boolean, false))
        AND NULLIF(current.value->>'productId', '') IS NOT NULL
        AND NOT COALESCE((current.value->>'isTemporaryProduct')::boolean, false)
    LOOP
      FOR v_return_row IN
        SELECT * FROM public.orders
        WHERE order_type = 'return'
          AND (linked_order_id = p_order_id OR order_data->>'linkedOrderId' = p_order_id)
        FOR UPDATE
      LOOP
        v_return_items := COALESCE(v_return_row.order_data->'items', '[]'::jsonb);
        v_return_changed := false;
        FOR v_return_item IN SELECT value, ordinality::integer AS item_index
                               FROM jsonb_array_elements(v_return_items) WITH ORDINALITY LOOP
          IF lower(btrim(COALESCE(v_return_item.value->>'description', ''))) =
             lower(btrim(COALESCE(v_old_item.previous_item->>'description', '')))
             AND btrim(COALESCE(v_old_item.previous_item->>'description', '')) <> '' THEN
            v_return_items := jsonb_set(v_return_items, ARRAY[(v_return_item.item_index - 1)::text],
              v_return_item.value || jsonb_build_object(
                'productId', v_old_item.current_item->>'productId',
                'variationId', v_old_item.current_item->>'variationId',
                'isTemporaryProduct', false));
            v_return_changed := true;
          END IF;
        END LOOP;
        IF v_return_changed THEN
          v_return_data := jsonb_set(v_return_row.order_data, '{items}', v_return_items, true);
          PERFORM public.create_order_with_inventory_transaction(
            v_return_row.id, to_jsonb(v_return_row) || jsonb_build_object('order_data', v_return_data),
            v_return_items, COALESCE(v_return_data->'payments', '[]'::jsonb), true);
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  IF NOT p_is_update OR v_existing.status IS DISTINCT FROM v_status THEN
    INSERT INTO public.order_status_history(order_id, old_status, new_status, changed_by)
    VALUES (p_order_id, CASE WHEN p_is_update THEN v_existing.status ELSE NULL END,
            v_status, COALESCE(NULLIF(p_order_payload->>'seller_name', ''),
                               NULLIF(p_order_payload->'order_data'->>'seller', ''), 'system'));
  END IF;

  RETURN v_result || jsonb_build_object('order_data', v_saved_data,
                                        'stock_processed', v_order_type = 'sale' AND v_has_stock);
END;
$function$

