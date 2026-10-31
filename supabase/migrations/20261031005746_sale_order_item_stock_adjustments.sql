-- Preserve the original exit for price changes and quantity increases.
-- Reconcile only the affected sales-order line within the existing transaction.
-- The body guard prevents replacing an RPC changed since this migration was reviewed.
BEGIN;

DO $guard$
BEGIN
  IF COALESCE((SELECT md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.create_order_with_inventory_transaction(text,jsonb,jsonb,jsonb,boolean)'::regprocedure), '')
      <> '04911356b089673f2c0935925e467791' THEN
    RAISE EXCEPTION 'A função transacional de pedidos mudou; revise esta migration antes de aplicá-la.';
  END IF;
  IF to_regprocedure('public.plan_sale_order_stock_changes(jsonb,jsonb)') IS NOT NULL
     OR to_regprocedure('public.reconcile_sale_order_stock_lines(text,text,jsonb,jsonb,jsonb,boolean)') IS NOT NULL THEN
    RAISE EXCEPTION 'Uma função auxiliar com este nome já existe; revise a migration.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'inventory_moves_source_order_item_unique'
       AND i.indisunique AND i.indisvalid AND NOT i.indnullsnotdistinct
  ) THEN
    RAISE EXCEPTION 'O índice de origem das movimentações difere do contrato revisado.';
  END IF;
END;
$guard$;

-- Candidate pure planner; inputs are normalized, stock-eligible order lines.
CREATE OR REPLACE FUNCTION public.plan_sale_order_stock_changes(
  p_previous jsonb,
  p_current jsonb
) RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_old record;
  v_new record;
  v_candidate record;
  v_pairs jsonb := '{}'::jsonb;
  v_used_new integer[] := ARRAY[]::integer[];
  v_changes jsonb := '[]'::jsonb;
  v_match_count integer;
  v_old_count integer;
  v_new_index integer;
  v_action text;
  v_old_quantity numeric;
  v_new_quantity numeric;
BEGIN
  IF jsonb_typeof(p_previous) <> 'array' OR jsonb_typeof(p_current) <> 'array'
     OR jsonb_array_length(p_previous) > 500 OR jsonb_array_length(p_current) > 500 THEN
    RAISE EXCEPTION 'Itens do pedido inválidos para a conferência de estoque.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_previous) l
    WHERE NULLIF(l.value->>'itemId', '') IS NOT NULL
    GROUP BY l.value->>'itemId' HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_current) l
    WHERE NULLIF(l.value->>'itemId', '') IS NOT NULL
    GROUP BY l.value->>'itemId' HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'O pedido possui identificadores de itens duplicados.';
  END IF;

  -- Stable commercial line IDs take priority even when the product changes.
  FOR v_old IN SELECT value FROM jsonb_array_elements(p_previous) LOOP
    IF NULLIF(v_old.value->>'itemId', '') IS NULL THEN CONTINUE; END IF;
    SELECT l.value INTO v_candidate FROM jsonb_array_elements(p_current) l
      WHERE l.value->>'itemId' = v_old.value->>'itemId' LIMIT 1;
    IF FOUND THEN
      v_new_index := (v_candidate.value->>'index')::integer;
      v_pairs := jsonb_set(v_pairs, ARRAY[v_old.value->>'index'], to_jsonb(v_new_index), true);
      v_used_new := array_append(v_used_new, v_new_index);
    END IF;
  END LOOP;

  -- Unmatched lines can be matched by SKU when the match is unique.
  FOR v_old IN SELECT value FROM jsonb_array_elements(p_previous) LOOP
    IF v_pairs ? (v_old.value->>'index') THEN CONTINUE; END IF;
    SELECT count(*) INTO v_old_count FROM jsonb_array_elements(p_previous) l
      WHERE NOT (v_pairs ? (l.value->>'index'))
        AND l.value->>'productId' = v_old.value->>'productId'
        AND l.value->>'variationId' = v_old.value->>'variationId';
    SELECT count(*), min((l.value->>'index')::integer) INTO v_match_count, v_new_index
      FROM jsonb_array_elements(p_current) l
      WHERE NOT ((l.value->>'index')::integer = ANY(v_used_new))
        AND l.value->>'productId' = v_old.value->>'productId'
        AND l.value->>'variationId' = v_old.value->>'variationId';
    IF v_match_count > 0 AND (v_match_count <> 1 OR v_old_count <> 1) THEN
      RAISE EXCEPTION 'O histórico tem linhas repetidas sem identificador; confira os itens antes de alterar o estoque.';
    ELSIF v_match_count = 1 THEN
      v_pairs := jsonb_set(v_pairs, ARRAY[v_old.value->>'index'], to_jsonb(v_new_index), true);
      v_used_new := array_append(v_used_new, v_new_index);
    END IF;
  END LOOP;

  -- Remaining lines at the same position represent a replacement.
  FOR v_old IN SELECT value FROM jsonb_array_elements(p_previous) LOOP
    IF v_pairs ? (v_old.value->>'index') THEN CONTINUE; END IF;
    v_new_index := (v_old.value->>'index')::integer;
    SELECT l.value INTO v_candidate FROM jsonb_array_elements(p_current) l
      WHERE (l.value->>'index')::integer = v_new_index AND NOT (v_new_index = ANY(v_used_new)) LIMIT 1;
    IF FOUND THEN
      v_pairs := jsonb_set(v_pairs, ARRAY[v_old.value->>'index'], to_jsonb(v_new_index), true);
      v_used_new := array_append(v_used_new, v_new_index);
    END IF;
  END LOOP;

  FOR v_old IN SELECT value FROM jsonb_array_elements(p_previous) LOOP
    v_new_index := NULLIF(v_pairs->>(v_old.value->>'index'), '')::integer;
    IF v_new_index IS NULL THEN
      v_changes := v_changes || jsonb_build_array(jsonb_build_object('action', 'remove', 'before', v_old.value));
      CONTINUE;
    END IF;
    SELECT l.value INTO v_new FROM jsonb_array_elements(p_current) l
      WHERE (l.value->>'index')::integer = v_new_index LIMIT 1;
    v_old_quantity := (v_old.value->>'quantity')::numeric;
    v_new_quantity := (v_new.value->>'quantity')::numeric;
    IF v_old.value->>'productId' IS DISTINCT FROM v_new.value->>'productId'
       OR v_old.value->>'variationId' IS DISTINCT FROM v_new.value->>'variationId' THEN
      v_action := 'replace';
    ELSIF v_new_quantity > v_old_quantity THEN
      v_action := 'increase';
    ELSIF v_new_quantity < v_old_quantity THEN
      v_action := 'decrease';
    ELSE
      v_action := 'unchanged';
    END IF;
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('action', v_action, 'before', v_old.value, 'after', v_new.value));
  END LOOP;
  FOR v_new IN SELECT value FROM jsonb_array_elements(p_current) LOOP
    IF NOT ((v_new.value->>'index')::integer = ANY(v_used_new)) THEN
      v_changes := v_changes || jsonb_build_array(jsonb_build_object('action', 'add', 'after', v_new.value));
    END IF;
  END LOOP;
  RETURN v_changes;
END;
$function$;

REVOKE ALL ON FUNCTION public.plan_sale_order_stock_changes(jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;

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
  v_sale_delta boolean := false;
  v_sale_result jsonb;
  v_effective_exits boolean := false;
  v_stock_lineage jsonb := NULL;
  v_line_ids_reordered boolean := false;
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
    v_stock_lineage := v_existing.order_data->'stockMovementLineage';
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
    SELECT EXISTS (
      SELECT 1 FROM public.inventory_moves m
      WHERE m.order_id = p_order_id AND m.type IN ('exit', 'withdrawal')
        AND public.inventory_batch_is_effective(m.status, m.observation, m.reason)
    ) INTO v_effective_exits;
    IF v_prior_effect = 'exit' AND v_effect = 'exit'
       AND (COALESCE(v_existing.stock_processed, false) OR v_effective_exits) THEN
      SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_existing.items, '[]'::jsonb)) WITH ORDINALITY old_item(value, item_index)
        JOIN jsonb_array_elements(p_items) WITH ORDINALITY new_item(value, item_index) USING (item_index)
        WHERE NULLIF(old_item.value->>'orderItemId', '') IS NOT NULL
          AND NULLIF(new_item.value->>'orderItemId', '') IS NOT NULL
          AND old_item.value->>'orderItemId' IS DISTINCT FROM new_item.value->>'orderItemId'
      ) INTO v_line_ids_reordered;
      v_sale_delta := v_prior_signature IS DISTINCT FROM v_next_signature OR v_line_ids_reordered;
      v_replace := false;
      v_has_stock := COALESCE(v_existing.stock_processed, false) OR v_effective_exits;
    ELSE
      v_replace := v_prior_effect IS DISTINCT FROM v_effect
        OR v_prior_signature IS DISTINCT FROM v_next_signature
        OR v_active_count <> v_expected_count;
  
      IF v_replace THEN
        FOR v_old_move IN SELECT id, product_id, variation_id, type, quantity, observation
                            FROM public.inventory_moves
                            WHERE order_id = p_order_id AND type IN ('exit', 'withdrawal', 'entry')
                              AND public.inventory_batch_is_effective(status, observation, reason)
                            ORDER BY id FOR UPDATE LOOP
          UPDATE public.inventory_moves
             SET status = 'reversed', reversal_reason = 'Substituição ou cancelamento do pedido',
                 reversed_at = now(),
                 observation = (public.inventory_batch_metadata(v_old_move.observation)
                   || CASE WHEN v_old_move.observation IS NOT NULL AND btrim(v_old_move.observation) <> ''
                             AND left(ltrim(v_old_move.observation), 1) <> '{'
                           THEN jsonb_build_object('note', v_old_move.observation) ELSE '{}'::jsonb END
                   || jsonb_build_object('status', 'reversed', 'reversalReason', 'Substituição ou cancelamento do pedido',
                                         'reversedAt', now()))::text
           WHERE id = v_old_move.id;
          PERFORM public.apply_order_document_stock_delta(
            v_old_move.product_id::uuid, v_old_move.variation_id::uuid,
            CASE WHEN v_old_move.type = 'entry' THEN -v_old_move.quantity ELSE v_old_move.quantity END);
        END LOOP;
      ELSE
        v_has_stock := v_active_count > 0;
      END IF;
    END IF;
  END IF;
  v_date := COALESCE(NULLIF(p_order_payload->'order_data'->>'date', '')::timestamptz, now());

  -- A RPC existente grava cabeçalho, itens e pagamentos; o bloco inteiro continua
  -- dentro da mesma transação PostgreSQL desta chamada.
  v_result := public.save_order_transaction(p_order_id, p_order_payload, p_items, p_payments, p_is_update);

  IF v_sale_delta THEN
    v_sale_result := public.reconcile_sale_order_stock_lines(
      p_order_id, COALESCE(NULLIF(p_order_payload->>'order_index', ''), NULLIF(v_existing.order_index::text, ''), p_order_id),
      COALESCE(v_existing.items, '[]'::jsonb), p_items, v_stock_lineage, false
    );
    v_items := v_sale_result->'items';
    v_has_stock := COALESCE((v_sale_result->>'hasStock')::boolean, false);
    v_stock_lineage := v_sale_result->'lineage';
  END IF;

  -- Uma transição scheduled -> fulfilled sem nova saída conserva o CMV do
  -- instante original, mesmo que o custo atual do produto tenha mudado.
  IF p_is_update AND NOT v_replace AND NOT v_sale_delta AND v_effect = 'exit' THEN
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

  IF v_effect = 'exit' AND v_replace THEN
    v_sale_result := public.reconcile_sale_order_stock_lines(
      p_order_id, COALESCE(NULLIF(p_order_payload->>'order_index', ''), p_order_id),
      v_items, v_items, NULL, true
    );
    v_items := v_sale_result->'items';
    v_has_stock := COALESCE((v_sale_result->>'hasStock')::boolean, false);
    v_stock_lineage := v_sale_result->'lineage';
  ELSIF v_effect IS DISTINCT FROM 'exit' THEN
    v_stock_lineage := NULL;
  END IF;

  UPDATE public.orders
     SET items = v_items,
         stock_processed = v_order_type = 'sale' AND v_has_stock,
         order_data = (jsonb_set(
           jsonb_set(
             jsonb_set(order_data, '{items}', v_items, true),
             (CASE WHEN v_order_type = 'return' THEN '{returnStockProcessed}' ELSE '{stockProcessed}' END)::text[],
             to_jsonb(v_has_stock), true),
           '{inventoryRequestHash}', to_jsonb(v_request_hash), true) - 'stockMovementLineage')
           || CASE WHEN v_stock_lineage IS NULL OR v_stock_lineage = 'null'::jsonb THEN '{}'::jsonb
                   ELSE jsonb_build_object('stockMovementLineage', v_stock_lineage) END
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
$function$;

COMMIT;
