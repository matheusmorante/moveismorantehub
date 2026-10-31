-- Candidate only: reconciles a previously moved sale inside the order transaction.
CREATE OR REPLACE FUNCTION public.reconcile_sale_order_stock_items(
  p_order_id text,
  p_order_code text,
  p_previous_items jsonb,
  p_current_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_old_lines jsonb := '[]'::jsonb;
  v_new_lines jsonb := '[]'::jsonb;
  v_old_groups jsonb := '{}'::jsonb;
  v_new_groups jsonb := '{}'::jsonb;
  v_changed_keys text[] := ARRAY[]::text[];
  v_item record;
  v_line record;
  v_group record;
  v_move record;
  v_component record;
  v_product record;
  v_component_product record;
  v_product_id uuid;
  v_variation_id uuid;
  v_component_id uuid;
  v_component_variation_id uuid;
  v_variation_count integer;
  v_key text;
  v_reason text;
  v_old_quantity numeric;
  v_new_quantity numeric;
  v_actual_quantity numeric;
  v_quantity numeric;
  v_component_quantity numeric;
  v_unit_cost numeric;
  v_component_cost numeric;
  v_total_cost numeric;
  v_cost_count integer;
  v_move_count integer;
  v_old_line_count integer;
  v_new_line_count integer;
  v_indexes integer[];
  v_new_index integer;
  v_representative jsonb;
  v_previous_item jsonb;
  v_items jsonb := p_current_items;
  v_note text := 'Ajuste do pedido de venda #' || p_order_code;
  v_has_stock boolean;
BEGIN
  IF jsonb_typeof(p_previous_items) <> 'array' OR jsonb_typeof(p_current_items) <> 'array' THEN
    RAISE EXCEPTION 'Itens do pedido devem ser listas.';
  END IF;

  -- Canonicalize each stocked item so legacy single-variation items match their movements.
  FOR v_item IN
    SELECT value, ordinality::integer AS item_index, true AS previous
      FROM jsonb_array_elements(p_previous_items) WITH ORDINALITY
    UNION ALL
    SELECT value, ordinality::integer AS item_index, false AS previous
      FROM jsonb_array_elements(p_current_items) WITH ORDINALITY
  LOOP
    IF NULLIF(btrim(v_item.value->>'productId'), '') IS NULL
       OR COALESCE((v_item.value->>'isTemporaryProduct')::boolean, false)
       OR v_item.value->>'itemType' = 'service' THEN
      CONTINUE;
    END IF;
    v_product_id := (v_item.value->>'productId')::uuid;
    PERFORM 1 FROM public.products WHERE id = v_product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto do pedido não encontrado: %', v_product_id; END IF;
    v_variation_id := NULLIF(v_item.value->>'variationId', '')::uuid;
    IF v_variation_id IS NULL THEN
      SELECT count(*), min(id::text)::uuid INTO v_variation_count, v_variation_id
        FROM public.product_variations WHERE product_id = v_product_id;
      IF v_variation_count <> 1 THEN
        RAISE EXCEPTION 'Não foi possível identificar a variação do produto %; revise o pedido.', v_product_id;
      END IF;
    END IF;
    PERFORM 1 FROM public.product_variations
      WHERE id = v_variation_id AND product_id = v_product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'A variação não pertence ao produto %.', v_product_id; END IF;
    v_quantity := NULLIF(v_item.value->>'quantity', '')::numeric;
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity <> trunc(v_quantity) THEN
      RAISE EXCEPTION 'Quantidade inválida no item % do pedido.', v_item.item_index;
    END IF;
    v_key := v_product_id::text || '|' || v_variation_id::text;
    IF v_item.previous THEN
      v_old_lines := v_old_lines || jsonb_build_array(jsonb_build_object(
        'key', v_key, 'index', v_item.item_index, 'item', v_item.value));
      v_old_groups := jsonb_set(v_old_groups, ARRAY[v_key],
        to_jsonb(COALESCE((v_old_groups->>v_key)::numeric, 0) + v_quantity), true);
    ELSE
      v_new_lines := v_new_lines || jsonb_build_array(jsonb_build_object(
        'key', v_key, 'index', v_item.item_index, 'item', v_item.value));
      v_new_groups := jsonb_set(v_new_groups, ARRAY[v_key],
        to_jsonb(COALESCE((v_new_groups->>v_key)::numeric, 0) + v_quantity), true);
    END IF;
  END LOOP;

  -- Old combos without a source line cannot be assigned safely to a sale item.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_old_lines) l
    JOIN public.products p ON p.id::text = l.value->'item'->>'productId'
    WHERE COALESCE(p.is_combo, false)
  ) AND EXISTS (
    SELECT 1 FROM public.inventory_moves m
    WHERE m.order_id = p_order_id AND m.type IN ('exit', 'withdrawal')
      AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
      AND m.source_order_item_index IS NULL
      AND COALESCE(m.reason, '') NOT LIKE 'sale-stock-adjustment:%'
  ) THEN
    RAISE EXCEPTION 'O histórico de componentes deste pedido não identifica os itens de origem. Confira as movimentações antes de alterar os produtos.';
  END IF;

  FOR v_group IN SELECT key FROM jsonb_object_keys(v_old_groups || v_new_groups) AS keys(key) ORDER BY key LOOP
    v_key := v_group.key;
    v_old_quantity := COALESCE((v_old_groups->>v_key)::numeric, 0);
    v_new_quantity := COALESCE((v_new_groups->>v_key)::numeric, 0);
    IF v_old_quantity = v_new_quantity THEN CONTINUE; END IF;
    SELECT count(*) INTO v_old_line_count FROM jsonb_array_elements(v_old_lines) l WHERE l.value->>'key' = v_key;
    SELECT count(*) INTO v_new_line_count FROM jsonb_array_elements(v_new_lines) l WHERE l.value->>'key' = v_key;
    IF v_old_line_count > 1 OR v_new_line_count > 1 THEN
      RAISE EXCEPTION 'O produto aparece em mais de uma linha do pedido; não é possível identificar com segurança qual saída deve ser ajustada.';
    END IF;
    v_changed_keys := array_append(v_changed_keys, v_key);
    v_product_id := split_part(v_key, '|', 1)::uuid;
    v_variation_id := split_part(v_key, '|', 2)::uuid;
    v_reason := 'sale-stock-adjustment:' || v_key;

    SELECT COALESCE(sum(m.quantity), 0),
           COALESCE(array_agg(DISTINCT m.source_order_item_index)
             FILTER (WHERE m.source_order_id = p_order_id AND m.source_order_item_index IS NOT NULL), ARRAY[]::integer[])
      INTO v_actual_quantity, v_indexes
      FROM public.inventory_moves m
     WHERE m.order_id = p_order_id AND m.product_id = v_product_id::text
       AND m.variation_id = v_variation_id::text AND m.type IN ('exit', 'withdrawal')
       AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
       AND COALESCE(m.source_order_component_index, 0) = 0;
    IF v_actual_quantity <> v_old_quantity THEN
      RAISE EXCEPTION 'O saldo movimentado do produto % difere da quantidade anterior do pedido. Confira as movimentações antes de salvar.', v_product_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.inventory_moves m WHERE m.order_id = p_order_id
        AND m.product_id = v_product_id::text AND m.variation_id = v_variation_id::text
        AND m.type = 'entry' AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
    ) THEN
      RAISE EXCEPTION 'O pedido possui uma entrada ativa para o produto %. Confira as movimentações antes de salvar.', v_product_id;
    END IF;

    IF v_new_quantity < v_old_quantity THEN
      FOR v_move IN
        SELECT m.id, m.product_id, m.variation_id, m.quantity, m.observation
          FROM public.inventory_moves m
         WHERE m.order_id = p_order_id AND m.type IN ('exit', 'withdrawal')
           AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
           AND (
             (m.product_id = v_product_id::text AND m.variation_id = v_variation_id::text
               AND COALESCE(m.source_order_component_index, 0) = 0)
             OR (m.source_order_id = p_order_id AND m.source_order_item_index = ANY(v_indexes)
               AND m.source_order_component_index > 0)
             OR (m.source_order_id = p_order_id AND m.reason = v_reason
               AND m.source_order_component_index > 0)
           )
         ORDER BY m.id FOR UPDATE
      LOOP
        IF v_move.product_id IS NULL OR v_move.variation_id IS NULL THEN
          RAISE EXCEPTION 'Movimentação antiga sem produto ou variação; confira o histórico do pedido.';
        END IF;
        UPDATE public.inventory_moves SET status = 'reversed',
          reversal_reason = v_note, reversed_at = now(),
          observation = (public.inventory_batch_metadata(v_move.observation)
            || CASE WHEN v_move.observation IS NOT NULL AND btrim(v_move.observation) <> ''
                      AND left(ltrim(v_move.observation), 1) <> '{'
                    THEN jsonb_build_object('note', v_move.observation) ELSE '{}'::jsonb END
            || jsonb_build_object('status', 'reversed', 'reversalReason', v_note, 'reversedAt', now()))::text
          WHERE id = v_move.id;
        PERFORM public.apply_order_document_stock_delta(
          v_move.product_id::uuid, v_move.variation_id::uuid, v_move.quantity);
      END LOOP;
      v_quantity := v_new_quantity;
    ELSE
      v_quantity := v_new_quantity - v_old_quantity;
    END IF;

    IF v_quantity <= 0 THEN CONTINUE; END IF;
    SELECT l.value->'item', (l.value->>'index')::integer
      INTO v_representative, v_new_index
      FROM jsonb_array_elements(v_new_lines) l
     WHERE l.value->>'key' = v_key ORDER BY (l.value->>'index')::integer LIMIT 1;
    SELECT id, description, name, cost_price, is_combo, combo_items INTO v_product
      FROM public.products WHERE id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto do pedido não encontrado: %', v_product_id; END IF;
    SELECT COALESCE(NULLIF(v.cost_price, 0), NULLIF(v_product.cost_price, 0)) INTO v_unit_cost
      FROM public.product_variations v WHERE v.id = v_variation_id AND v.product_id = v_product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Variação do pedido inválida: %', v_variation_id; END IF;

    IF COALESCE(v_product.is_combo, false) THEN
      FOR v_component IN SELECT value, ordinality::integer AS component_index
        FROM jsonb_array_elements(COALESCE(v_product.combo_items, '[]'::jsonb)) WITH ORDINALITY LOOP
        v_component_id := (v_component.value->>'productId')::uuid;
        SELECT id, cost_price INTO v_component_product FROM public.products WHERE id = v_component_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Componente do produto composto não encontrado.'; END IF;
        v_component_variation_id := NULLIF(v_component.value->>'variationId', '')::uuid;
        IF v_component_variation_id IS NULL THEN
          SELECT count(*), min(id::text)::uuid INTO v_variation_count, v_component_variation_id
            FROM public.product_variations WHERE product_id = v_component_id;
          IF v_variation_count <> 1 THEN RAISE EXCEPTION 'Variação do componente não identificada.'; END IF;
        END IF;
        SELECT COALESCE(NULLIF(v.cost_price, 0), NULLIF(v_component_product.cost_price, 0))
          INTO v_component_cost FROM public.product_variations v
          WHERE v.id = v_component_variation_id AND v.product_id = v_component_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Variação do componente inválida.'; END IF;
        v_component_quantity := NULLIF(v_component.value->>'quantity', '')::numeric * v_quantity;
        IF v_component_quantity IS NULL OR v_component_quantity <= 0 OR v_component_quantity <> trunc(v_component_quantity) THEN
          RAISE EXCEPTION 'Quantidade inválida no componente do pedido.';
        END IF;
        INSERT INTO public.inventory_moves (
          product_id, variation_id, product_description, type, quantity, date, label, unit_cost,
          observation, reason, order_id, related_entity_id, related_entity_type,
          source_order_id, source_order_item_index, source_order_component_index, status
        ) VALUES (
          v_component_id, v_component_variation_id, COALESCE(v_component.value->>'description', 'Componente'),
          'exit', v_component_quantity, now(), 'Saída - Pedido #' || p_order_code, v_component_cost,
          jsonb_build_object('status', 'effective', 'orderId', p_order_id, 'note', v_note)::text,
          v_reason, p_order_id, p_order_id, 'sales_order', p_order_id, NULL, v_component.component_index, 'effective'
        );
        PERFORM public.apply_order_document_stock_delta(v_component_id, v_component_variation_id, -v_component_quantity);
      END LOOP;
    END IF;

    -- NULL source line leaves the existing unique index intact while order_id and
    -- source_order_id retain the association; reason identifies this adjustment group.
    INSERT INTO public.inventory_moves (
      product_id, variation_id, product_description, type, quantity, date, label,
      unit_cost, unit_price, observation, reason, order_id, related_entity_id, related_entity_type,
      source_order_id, source_order_item_index, source_order_component_index, status
    ) VALUES (
      v_product_id, v_variation_id, COALESCE(v_representative->>'description', v_product.description, v_product.name),
      'exit', v_quantity, now(), 'Saída - Pedido #' || p_order_code, v_unit_cost,
      NULLIF(v_representative->>'unitPrice', '')::numeric,
      jsonb_build_object('status', 'effective', 'orderId', p_order_id, 'note', v_note)::text,
      v_reason, p_order_id, p_order_id, 'sales_order', p_order_id, NULL, 0, 'effective'
    );
    PERFORM public.apply_order_document_stock_delta(v_product_id, v_variation_id, -v_quantity);
  END LOOP;

  FOR v_line IN SELECT value FROM jsonb_array_elements(v_new_lines) LOOP
    v_key := v_line.value->>'key';
    v_new_index := (v_line.value->>'index')::integer;
    v_representative := v_line.value->'item';
    IF v_key = ANY(v_changed_keys) THEN
      v_product_id := split_part(v_key, '|', 1)::uuid;
      v_variation_id := split_part(v_key, '|', 2)::uuid;
      SELECT count(*), count(m.unit_cost), sum(m.quantity * m.unit_cost), sum(m.quantity)
        INTO v_move_count, v_cost_count, v_total_cost, v_actual_quantity
        FROM public.inventory_moves m
       WHERE m.order_id = p_order_id AND m.product_id = v_product_id::text
         AND m.variation_id = v_variation_id::text AND m.type IN ('exit', 'withdrawal')
         AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
         AND COALESCE(m.source_order_component_index, 0) = 0;
      v_unit_cost := CASE WHEN v_move_count = v_cost_count AND v_actual_quantity > 0
        THEN v_total_cost / v_actual_quantity ELSE NULL END;
      v_representative := v_representative || jsonb_build_object(
        'unitCost', v_unit_cost, 'cmvUnitCost', v_unit_cost,
        'cmvTotal', CASE WHEN v_unit_cost IS NULL THEN NULL
                         ELSE v_unit_cost * (v_representative->>'quantity')::numeric END);
    ELSE
      SELECT l.value->'item' INTO v_previous_item FROM jsonb_array_elements(v_old_lines) l
       WHERE l.value->>'key' = v_key
         AND ((NULLIF(v_representative->>'orderItemId', '') IS NOT NULL
               AND l.value->'item'->>'orderItemId' = v_representative->>'orderItemId')
              OR (l.value->>'index')::integer = v_new_index)
       ORDER BY CASE WHEN l.value->'item'->>'orderItemId' = v_representative->>'orderItemId' THEN 0 ELSE 1 END
       LIMIT 1;
      IF v_previous_item ? 'cmvUnitCost' THEN
        v_representative := v_representative || jsonb_build_object(
          'unitCost', v_previous_item->'unitCost', 'cmvUnitCost', v_previous_item->'cmvUnitCost',
          'cmvTotal', v_previous_item->'cmvTotal');
      END IF;
    END IF;
    v_items := jsonb_set(v_items, ARRAY[(v_new_index - 1)::text], v_representative);
    IF v_representative ? 'cmvUnitCost' THEN
      UPDATE public.order_items SET cost_price = NULLIF(v_representative->>'cmvUnitCost', '')::numeric,
        item_snapshot = v_representative WHERE order_id = p_order_id AND item_index = v_new_index;
    END IF;
    v_previous_item := NULL;
  END LOOP;
  SELECT EXISTS(SELECT 1 FROM public.inventory_moves m WHERE m.order_id = p_order_id
    AND m.type IN ('exit', 'withdrawal') AND public.inventory_batch_is_effective(m.status, m.observation, m.reason))
    INTO v_has_stock;
  RETURN jsonb_build_object('items', v_items, 'hasStock', v_has_stock);
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_sale_order_stock_items(text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
