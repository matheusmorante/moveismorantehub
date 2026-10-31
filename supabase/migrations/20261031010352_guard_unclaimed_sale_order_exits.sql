-- A stale order snapshot must never silently omit an active sales-order exit.
BEGIN;

DO $guard$
BEGIN
  IF COALESCE((SELECT md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.reconcile_sale_order_stock_lines(text,text,jsonb,jsonb,jsonb,boolean)'::regprocedure), '')
      <> 'ef5a50b3dbf2615f7441658d2ec634da' THEN
    RAISE EXCEPTION 'A conciliação de estoque mudou; revise esta migration antes de aplicá-la.';
  END IF;
END;
$guard$;

-- Candidate: reconcile sale lines inside create_order_with_inventory_transaction.
CREATE OR REPLACE FUNCTION public.reconcile_sale_order_stock_lines(
  p_order_id text,
  p_order_code text,
  p_previous_items jsonb,
  p_current_items jsonb,
  p_previous_lineage jsonb,
  p_fresh boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_old_lines jsonb := '[]'::jsonb;
  v_new_lines jsonb := '[]'::jsonb;
  v_plan jsonb;
  v_enriched jsonb := '[]'::jsonb;
  v_lineages jsonb := '[]'::jsonb;
  v_items jsonb := p_current_items;
  v_claimed uuid[] := ARRAY[]::uuid[];
  v_parents uuid[];
  v_components uuid[];
  v_source_indexes integer[];
  v_parent_reasons text[];
  v_current_moves uuid[];
  v_item record;
  v_action record;
  v_move record;
  v_component record;
  v_product record;
  v_component_product record;
  v_before jsonb;
  v_after jsonb;
  v_previous_entry jsonb;
  v_previous_raw jsonb;
  v_current_raw jsonb;
  v_product_id uuid;
  v_variation_id uuid;
  v_component_id uuid;
  v_component_variation_id uuid;
  v_new_id uuid;
  v_new_index integer;
  v_old_index integer;
  v_variation_count integer;
  v_same_sku_count integer;
  v_invalid_count integer;
  v_entry_count integer;
  v_move_count integer;
  v_cost_count integer;
  v_old_quantity numeric;
  v_new_quantity numeric;
  v_actual_quantity numeric;
  v_quantity numeric;
  v_component_quantity numeric;
  v_unit_cost numeric;
  v_component_cost numeric;
  v_total_cost numeric;
  v_tag text;
  v_reason text;
  v_note text := 'Ajuste do pedido de venda #' || p_order_code;
  v_has_stock boolean;
  v_is_combo boolean;
BEGIN
  IF jsonb_typeof(p_previous_items) <> 'array' OR jsonb_typeof(p_current_items) <> 'array' THEN
    RAISE EXCEPTION 'Itens do pedido devem ser listas.';
  END IF;
  IF p_previous_lineage IS NOT NULL AND p_previous_lineage <> 'null'::jsonb
     AND (p_previous_lineage->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(p_previous_lineage->'lines') IS DISTINCT FROM 'array') THEN
    RAISE EXCEPTION 'O histórico de estoque do pedido precisa ser conferido antes da edição.';
  END IF;

  -- Keep the reconciliation and any concurrent reversal from changing the same
  -- existing movement between quantity validation and stock adjustment.
  PERFORM m.id FROM public.inventory_moves m
    WHERE m.order_id = p_order_id AND m.type IN ('exit', 'withdrawal')
    ORDER BY m.id FOR UPDATE;

  -- Normalize legacy lines with exactly one variation to the same physical SKU.
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
    PERFORM 1 FROM public.product_variations WHERE id = v_variation_id AND product_id = v_product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'A variação não pertence ao produto %.', v_product_id; END IF;
    v_quantity := NULLIF(v_item.value->>'quantity', '')::numeric;
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity <> trunc(v_quantity) THEN
      RAISE EXCEPTION 'Quantidade inválida no item % do pedido.', v_item.item_index;
    END IF;
    IF v_item.previous THEN
      v_old_lines := v_old_lines || jsonb_build_array(jsonb_build_object(
        'index', v_item.item_index, 'itemId', v_item.value->>'orderItemId',
        'productId', v_product_id, 'variationId', v_variation_id,
        'quantity', v_quantity, 'raw', v_item.value));
    ELSE
      v_new_lines := v_new_lines || jsonb_build_array(jsonb_build_object(
        'index', v_item.item_index, 'itemId', v_item.value->>'orderItemId',
        'productId', v_product_id, 'variationId', v_variation_id,
        'quantity', v_quantity, 'raw', v_item.value));
    END IF;
  END LOOP;

  IF p_fresh THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('action', 'unchanged', 'before', l.value, 'after', l.value)
                              ORDER BY (l.value->>'index')::integer), '[]'::jsonb)
      INTO v_plan FROM jsonb_array_elements(v_old_lines) l;
  ELSE
    v_plan := public.plan_sale_order_stock_changes(v_old_lines, v_new_lines);
  END IF;

  -- Resolve every existing line before changing stock, so an added duplicate SKU
  -- cannot accidentally claim the movement of another line.
  FOR v_action IN SELECT value FROM jsonb_array_elements(v_plan) LOOP
    v_before := v_action.value->'before';
    v_parents := ARRAY[]::uuid[];
    v_components := ARRAY[]::uuid[];
    v_previous_entry := NULL;
    v_tag := NULL;
    IF jsonb_typeof(v_before) = 'object' THEN
      v_product_id := (v_before->>'productId')::uuid;
      v_variation_id := (v_before->>'variationId')::uuid;
      v_old_index := (v_before->>'index')::integer;
      SELECT count(*) INTO v_same_sku_count FROM jsonb_array_elements(v_old_lines) l
       WHERE l.value->>'productId' = v_before->>'productId'
         AND l.value->>'variationId' = v_before->>'variationId';
      IF jsonb_typeof(p_previous_lineage->'lines') = 'array' THEN
        SELECT count(*) INTO v_entry_count FROM jsonb_array_elements(p_previous_lineage->'lines') l
         WHERE (NULLIF(v_before->>'itemId', '') IS NOT NULL
                AND l.value->>'itemId' = v_before->>'itemId')
            OR (NULLIF(l.value->>'itemId', '') IS NULL
                AND (l.value->>'index')::integer = v_old_index
                AND l.value->>'productId' = v_before->>'productId'
                AND l.value->>'variationId' = v_before->>'variationId');
        IF v_entry_count > 1 THEN
          RAISE EXCEPTION 'O histórico de estoque tem mais de uma origem para a linha %.', v_old_index;
        END IF;
        SELECT l.value INTO v_previous_entry FROM jsonb_array_elements(p_previous_lineage->'lines') l
         WHERE (NULLIF(v_before->>'itemId', '') IS NOT NULL
                AND l.value->>'itemId' = v_before->>'itemId')
            OR (NULLIF(l.value->>'itemId', '') IS NULL
                AND (l.value->>'index')::integer = v_old_index
                AND l.value->>'productId' = v_before->>'productId'
                AND l.value->>'variationId' = v_before->>'variationId')
         LIMIT 1;
      END IF;

      IF v_previous_entry IS NOT NULL THEN
        IF v_previous_entry->>'productId' IS DISTINCT FROM v_before->>'productId'
           OR v_previous_entry->>'variationId' IS DISTINCT FROM v_before->>'variationId'
           OR jsonb_typeof(v_previous_entry->'parents') IS DISTINCT FROM 'array'
           OR jsonb_typeof(v_previous_entry->'components') IS DISTINCT FROM 'array' THEN
          RAISE EXCEPTION 'O histórico de estoque da linha % não corresponde ao pedido.', v_old_index;
        END IF;
        v_tag := NULLIF(v_previous_entry->>'tag', '');
        IF v_tag IS NOT NULL AND v_tag !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
          RAISE EXCEPTION 'O identificador de origem da linha % é inválido.', v_old_index;
        END IF;
        SELECT COALESCE(array_agg(ids.id::uuid), ARRAY[]::uuid[]) INTO v_parents
          FROM jsonb_array_elements_text(v_previous_entry->'parents') AS ids(id);
        SELECT COALESCE(array_agg(ids.id::uuid), ARRAY[]::uuid[]) INTO v_components
          FROM jsonb_array_elements_text(v_previous_entry->'components') AS ids(id);
        IF cardinality(v_parents) <> (SELECT count(DISTINCT id) FROM unnest(v_parents) AS ids(id))
           OR cardinality(v_components) <> (SELECT count(DISTINCT id) FROM unnest(v_components) AS ids(id)) THEN
          RAISE EXCEPTION 'O histórico de estoque da linha % contém movimentações repetidas.', v_old_index;
        END IF;
        SELECT count(*) INTO v_invalid_count FROM unnest(v_parents) AS ids(id)
        LEFT JOIN public.inventory_moves m ON m.id = ids.id
        WHERE m.id IS NULL OR m.order_id IS DISTINCT FROM p_order_id
           OR m.product_id IS DISTINCT FROM v_product_id::text
           OR m.variation_id IS DISTINCT FROM v_variation_id::text
           OR COALESCE(m.source_order_component_index, 0) <> 0
           OR m.type IS NULL OR m.type NOT IN ('exit', 'withdrawal');
        IF v_invalid_count > 0 THEN RAISE EXCEPTION 'A origem das saídas da linha % não pôde ser confirmada.', v_old_index; END IF;
        SELECT COALESCE(array_agg(m.id), ARRAY[]::uuid[]) INTO v_parents
          FROM public.inventory_moves m WHERE m.id = ANY(v_parents)
            AND public.inventory_batch_is_effective(m.status, m.observation, m.reason);
        SELECT COALESCE(array_agg(DISTINCT m.source_order_item_index)
                   FILTER (WHERE m.source_order_id = p_order_id AND m.source_order_item_index IS NOT NULL), ARRAY[]::integer[]),
               COALESCE(array_agg(DISTINCT m.reason)
                   FILTER (WHERE m.reason LIKE 'sale-stock-adjustment:%'), ARRAY[]::text[])
          INTO v_source_indexes, v_parent_reasons FROM public.inventory_moves m WHERE m.id = ANY(v_parents);
        SELECT count(*) INTO v_invalid_count FROM unnest(v_components) AS ids(id)
        LEFT JOIN public.inventory_moves m ON m.id = ids.id
        WHERE m.id IS NULL OR m.order_id IS DISTINCT FROM p_order_id
           OR COALESCE(m.source_order_component_index, 0) <= 0
           OR m.type IS NULL OR m.type NOT IN ('exit', 'withdrawal')
           OR NOT COALESCE((m.source_order_id = p_order_id AND m.source_order_item_index = ANY(v_source_indexes))
                           OR m.reason = ANY(v_parent_reasons), false);
        IF v_invalid_count > 0 THEN RAISE EXCEPTION 'A origem dos componentes da linha % não pôde ser confirmada.', v_old_index; END IF;
        SELECT COALESCE(array_agg(m.id), ARRAY[]::uuid[]) INTO v_components
          FROM public.inventory_moves m WHERE m.id = ANY(v_components)
            AND public.inventory_batch_is_effective(m.status, m.observation, m.reason);
      ELSE
        IF v_same_sku_count > 1 AND NOT p_fresh THEN
          RAISE EXCEPTION 'O histórico tem linhas repetidas sem identificação de origem. Confira as movimentações antes de editar o pedido.';
        END IF;
        SELECT COALESCE(array_agg(m.id), ARRAY[]::uuid[]) INTO v_parents
          FROM public.inventory_moves m
         WHERE m.order_id = p_order_id AND m.product_id = v_product_id::text
           AND m.variation_id = v_variation_id::text AND m.type IN ('exit', 'withdrawal')
           AND COALESCE(m.source_order_component_index, 0) = 0
           AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
           AND (v_same_sku_count = 1 OR (m.source_order_id = p_order_id AND m.source_order_item_index = v_old_index));
        SELECT COALESCE(array_agg(DISTINCT m.source_order_item_index)
                   FILTER (WHERE m.source_order_id = p_order_id AND m.source_order_item_index IS NOT NULL), ARRAY[]::integer[]),
               COALESCE(array_agg(DISTINCT m.reason)
                   FILTER (WHERE m.reason LIKE 'sale-stock-adjustment:%'), ARRAY[]::text[])
          INTO v_source_indexes, v_parent_reasons FROM public.inventory_moves m WHERE m.id = ANY(v_parents);
        SELECT COALESCE(array_agg(m.id), ARRAY[]::uuid[]) INTO v_components
          FROM public.inventory_moves m
         WHERE m.order_id = p_order_id AND m.type IN ('exit', 'withdrawal')
           AND m.source_order_component_index > 0
           AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
           AND ((m.source_order_id = p_order_id AND m.source_order_item_index = ANY(v_source_indexes))
                OR m.reason = ANY(v_parent_reasons));
        SELECT COALESCE(is_combo, false) INTO v_is_combo FROM public.products WHERE id = v_product_id;
        IF v_is_combo AND EXISTS (SELECT 1 FROM public.inventory_moves m WHERE m.id = ANY(v_parents)
          AND m.source_order_item_index IS NULL AND COALESCE(m.reason, '') NOT LIKE 'sale-stock-adjustment:%') THEN
          RAISE EXCEPTION 'O histórico de componentes da linha % não identifica sua origem.', v_old_index;
        END IF;
      END IF;

      IF v_claimed && (v_parents || v_components) THEN
        RAISE EXCEPTION 'Uma movimentação está vinculada a mais de um item do pedido.';
      END IF;
      v_claimed := v_claimed || v_parents || v_components;
      SELECT COALESCE(sum(m.quantity), 0) INTO v_actual_quantity FROM public.inventory_moves m
        WHERE m.id = ANY(v_parents);
      v_old_quantity := (v_before->>'quantity')::numeric;
      IF (p_fresh OR v_action.value->>'action' <> 'unchanged') AND v_actual_quantity <> v_old_quantity THEN
        RAISE EXCEPTION 'A quantidade movimentada da linha % difere do pedido. Confira o histórico antes de salvar.', v_old_index;
      END IF;
    END IF;
    v_enriched := v_enriched || jsonb_build_array(v_action.value || jsonb_build_object(
      'parents', to_jsonb(v_parents), 'components', to_jsonb(v_components), 'tag', v_tag));
  END LOOP;

  -- A stale order_data snapshot can omit a later adjustment. Never change stock
  -- while an effective exit for this order is outside the lineages just resolved.
  IF EXISTS (
    SELECT 1 FROM public.inventory_moves m
     WHERE m.order_id = p_order_id AND m.type IN ('exit', 'withdrawal')
       AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
       AND NOT (m.id = ANY(v_claimed))
  ) THEN
    RAISE EXCEPTION 'Há saídas sem origem confirmada no pedido. Confira as movimentações antes de salvar.';
  END IF;

  FOR v_action IN SELECT value FROM jsonb_array_elements(v_enriched) LOOP
    v_before := v_action.value->'before';
    v_after := v_action.value->'after';
    SELECT COALESCE(array_agg(ids.id::uuid), ARRAY[]::uuid[]) INTO v_parents
      FROM jsonb_array_elements_text(v_action.value->'parents') AS ids(id);
    SELECT COALESCE(array_agg(ids.id::uuid), ARRAY[]::uuid[]) INTO v_components
      FROM jsonb_array_elements_text(v_action.value->'components') AS ids(id);
    v_tag := COALESCE(NULLIF(v_action.value->>'tag', ''), pg_catalog.gen_random_uuid()::text);
    v_reason := 'sale-stock-adjustment:' || v_tag;

    IF v_action.value->>'action' IN ('remove', 'replace', 'decrease') THEN
      FOR v_move IN
        SELECT m.id, m.product_id, m.variation_id, m.quantity, m.observation
          FROM public.inventory_moves m
         WHERE m.id = ANY(v_parents || v_components)
           AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
         ORDER BY m.id FOR UPDATE
      LOOP
        IF v_move.product_id IS NULL OR v_move.variation_id IS NULL THEN
          RAISE EXCEPTION 'Movimentação antiga sem produto ou variação; confira o histórico do pedido.';
        END IF;
        UPDATE public.inventory_moves SET status = 'reversed', reversal_reason = v_note,
          reversed_at = now(),
          observation = (public.inventory_batch_metadata(v_move.observation)
            || CASE WHEN v_move.observation IS NOT NULL AND btrim(v_move.observation) <> ''
                      AND left(ltrim(v_move.observation), 1) <> '{'
                    THEN jsonb_build_object('note', v_move.observation) ELSE '{}'::jsonb END
            || jsonb_build_object('status', 'reversed', 'reversalReason', v_note, 'reversedAt', now()))::text
          WHERE id = v_move.id;
        PERFORM public.apply_order_document_stock_delta(
          v_move.product_id::uuid, v_move.variation_id::uuid, v_move.quantity);
      END LOOP;
      v_parents := ARRAY[]::uuid[];
      v_components := ARRAY[]::uuid[];
    END IF;

    IF v_action.value->>'action' IN ('add', 'replace', 'increase', 'decrease')
       AND jsonb_typeof(v_after) = 'object' THEN
      v_product_id := (v_after->>'productId')::uuid;
      v_variation_id := (v_after->>'variationId')::uuid;
      v_new_quantity := (v_after->>'quantity')::numeric;
      v_quantity := CASE WHEN v_action.value->>'action' = 'increase'
        THEN v_new_quantity - (v_before->>'quantity')::numeric ELSE v_new_quantity END;
      IF v_quantity <= 0 THEN RAISE EXCEPTION 'Quantidade de ajuste inválida.'; END IF;

      IF v_action.value->>'action' IN ('add', 'replace') AND EXISTS (
        SELECT 1 FROM public.inventory_moves m
         WHERE m.order_id = p_order_id AND m.product_id = v_product_id::text
           AND m.variation_id = v_variation_id::text AND m.type IN ('exit', 'withdrawal')
           AND COALESCE(m.source_order_component_index, 0) = 0
           AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
           AND NOT (m.id = ANY(v_claimed))
      ) THEN
        RAISE EXCEPTION 'Há uma saída sem linha identificada para o produto %. Confira o histórico antes de salvar.', v_product_id;
      END IF;
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
          ) RETURNING id INTO v_new_id;
          v_components := array_append(v_components, v_new_id);
          v_claimed := array_append(v_claimed, v_new_id);
          PERFORM public.apply_order_document_stock_delta(v_component_id, v_component_variation_id, -v_component_quantity);
        END LOOP;
      END IF;

      -- NULL line index permits multiple active adjustments under the existing
      -- unique index; the order and lineage retain the exact association.
      v_current_raw := v_after->'raw';
      INSERT INTO public.inventory_moves (
        product_id, variation_id, product_description, type, quantity, date, label,
        unit_cost, unit_price, observation, reason, order_id, related_entity_id, related_entity_type,
        source_order_id, source_order_item_index, source_order_component_index, status
      ) VALUES (
        v_product_id, v_variation_id, COALESCE(v_current_raw->>'description', v_product.description, v_product.name),
        'exit', v_quantity, now(), 'Saída - Pedido #' || p_order_code, v_unit_cost,
        NULLIF(v_current_raw->>'unitPrice', '')::numeric,
        jsonb_build_object('status', 'effective', 'orderId', p_order_id, 'note', v_note)::text,
        v_reason, p_order_id, p_order_id, 'sales_order', p_order_id, NULL, 0, 'effective'
      ) RETURNING id INTO v_new_id;
      v_parents := array_append(v_parents, v_new_id);
      v_claimed := array_append(v_claimed, v_new_id);
      PERFORM public.apply_order_document_stock_delta(v_product_id, v_variation_id, -v_quantity);
    END IF;

    IF jsonb_typeof(v_after) = 'object' THEN
      v_new_index := (v_after->>'index')::integer;
      v_current_raw := v_after->'raw';
      IF v_action.value->>'action' = 'unchanged' AND jsonb_typeof(v_before) = 'object' THEN
        v_previous_raw := v_before->'raw';
        IF v_previous_raw ? 'cmvUnitCost' THEN
          v_current_raw := v_current_raw || jsonb_build_object(
            'unitCost', v_previous_raw->'unitCost', 'cmvUnitCost', v_previous_raw->'cmvUnitCost',
            'cmvTotal', v_previous_raw->'cmvTotal');
        END IF;
      ELSE
        SELECT count(*), count(NULLIF(m.unit_cost, 0)), sum(m.quantity * m.unit_cost), sum(m.quantity)
          INTO v_move_count, v_cost_count, v_total_cost, v_actual_quantity
          FROM public.inventory_moves m WHERE m.id = ANY(v_parents)
            AND public.inventory_batch_is_effective(m.status, m.observation, m.reason);
        IF COALESCE(v_actual_quantity, 0) <> (v_after->>'quantity')::numeric THEN
          RAISE EXCEPTION 'O ajuste de estoque da linha % não corresponde à quantidade do pedido.', v_new_index;
        END IF;
        v_unit_cost := CASE WHEN v_move_count = v_cost_count AND v_actual_quantity > 0
          THEN v_total_cost / v_actual_quantity ELSE NULL END;
        v_current_raw := v_current_raw || jsonb_build_object(
          'unitCost', v_unit_cost, 'cmvUnitCost', v_unit_cost,
          'cmvTotal', CASE WHEN v_unit_cost IS NULL THEN NULL
                           ELSE v_unit_cost * (v_after->>'quantity')::numeric END);
      END IF;
      v_items := jsonb_set(v_items, ARRAY[(v_new_index - 1)::text], v_current_raw);
      IF v_current_raw ? 'cmvUnitCost' THEN
        UPDATE public.order_items SET cost_price = NULLIF(v_current_raw->>'cmvUnitCost', '')::numeric,
          item_snapshot = v_current_raw WHERE order_id = p_order_id AND item_index = v_new_index;
      END IF;
      v_lineages := v_lineages || jsonb_build_array(jsonb_build_object(
        'itemId', v_after->'itemId', 'index', v_new_index,
        'productId', v_after->'productId', 'variationId', v_after->'variationId',
        'tag', v_tag, 'parents', to_jsonb(v_parents), 'components', to_jsonb(v_components)));
    END IF;
  END LOOP;

  SELECT EXISTS(SELECT 1 FROM public.inventory_moves m WHERE m.order_id = p_order_id
    AND m.type IN ('exit', 'withdrawal') AND public.inventory_batch_is_effective(m.status, m.observation, m.reason))
    INTO v_has_stock;
  RETURN jsonb_build_object('items', v_items, 'hasStock', v_has_stock,
    'lineage', jsonb_build_object('version', 1, 'lines', v_lineages));
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_sale_order_stock_lines(text, text, jsonb, jsonb, jsonb, boolean)
  FROM PUBLIC, anon, authenticated;

COMMIT;
