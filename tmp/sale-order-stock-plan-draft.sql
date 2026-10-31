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
