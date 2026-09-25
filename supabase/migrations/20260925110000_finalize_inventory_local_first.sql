-- Um único commit remoto para o inventário; reenvios usam o mesmo audit_id.
ALTER TABLE public.inventory_moves
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'effective',
  ADD COLUMN IF NOT EXISTS related_entity_id text;

CREATE INDEX IF NOT EXISTS inventory_moves_related_entity_id_idx
  ON public.inventory_moves (related_entity_id);

CREATE OR REPLACE FUNCTION public.finalize_inventory_transaction(
  p_audit_id uuid,
  p_code text,
  p_observation jsonb,
  p_items jsonb,
  p_responsible_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $function$
DECLARE
  v_item jsonb;
  v_marker_id uuid;
  v_marker_observation jsonb;
  v_product_id uuid;
  v_variation_id uuid;
  v_target numeric;
  v_previous numeric;
  v_moves jsonb := '[]'::jsonb;
  v_move_id uuid;
BEGIN
  IF p_audit_id IS NULL OR NULLIF(btrim(p_code), '') IS NULL
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR p_observation->>'status' IS DISTINCT FROM 'completed'
     OR p_observation->>'inventoryCode' IS DISTINCT FROM p_code
     OR p_observation->>'inventoryAudit' IS DISTINCT FROM 'true'
     OR jsonb_typeof(p_observation->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Dados de conclusão do inventário inválidos';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS adjusted(item)
    GROUP BY adjusted.item->>'productId', adjusted.item->>'variationId'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Ajustes duplicados no mesmo inventário';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_audit_id::text));

  SELECT id, COALESCE(observation::jsonb, '{}'::jsonb)
    INTO v_marker_id, v_marker_observation
    FROM public.inventory_moves
   WHERE (related_entity_id = p_audit_id::text OR order_id = p_audit_id::text)
     AND label LIKE 'Inventário #%' AND type = 'adjustment'
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF v_marker_id IS NOT NULL AND v_marker_observation->>'status' = 'completed' THEN
    RETURN jsonb_build_object('auditId', p_audit_id, 'markerMoveId', v_marker_id, 'status', 'already_processed');
  END IF;

  IF v_marker_id IS NULL THEN
    INSERT INTO public.inventory_moves
      (product_id, type, quantity, date, label, observation, related_entity_id, order_id, status, created_at)
    VALUES
      (NULL, 'adjustment', 0, now(), 'Inventário #' || p_code || ' (Concluído)',
       p_observation::text, p_audit_id::text, p_audit_id::text, 'effective', now())
    RETURNING id INTO v_marker_id;
  ELSE
    UPDATE public.inventory_moves
       SET label = 'Inventário #' || p_code || ' (Concluído)',
           observation = p_observation::text, related_entity_id = p_audit_id::text,
           order_id = p_audit_id::text, status = 'effective'
     WHERE id = v_marker_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := NULLIF(v_item->>'productId', '')::uuid;
    v_variation_id := NULLIF(v_item->>'variationId', '')::uuid;
    v_target := NULLIF(v_item->>'physicalCount', '')::numeric;
    v_previous := NULLIF(v_item->>'previousStock', '')::numeric;
    IF v_product_id IS NULL OR v_target IS NULL OR v_target < 0 OR v_previous IS NULL THEN
      RAISE EXCEPTION 'Ajuste de inventário inválido';
    END IF;
    IF v_variation_id IS NOT NULL AND v_target <> trunc(v_target) THEN
      RAISE EXCEPTION 'Quantidade de variação deve ser inteira';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_observation->'items') AS counted(item)
      WHERE counted.item->>'productId' = v_product_id::text
        AND COALESCE(counted.item->>'variationId', '') = COALESCE(v_variation_id::text, '')
        AND (counted.item->>'physicalCount')::numeric = v_target
    ) THEN
      RAISE EXCEPTION 'Ajuste não corresponde à contagem consolidada';
    END IF;

    INSERT INTO public.inventory_moves
      (product_id, variation_id, product_description, type, quantity, date, label,
       observation, related_entity_id, order_id, status, created_at)
    VALUES
      (v_product_id::text, v_variation_id::text, COALESCE(v_item->>'name', 'Item do inventário'),
       'adjustment', 0, now(), 'Ajuste lançado pelo inventário #' || p_code,
       jsonb_build_object('source', 'inventory_audit', 'targetStock', v_target,
                          'previousStock', v_previous, 'status', 'effective')::text,
       p_audit_id::text, p_audit_id::text, 'effective', now())
    RETURNING id INTO v_move_id;

    IF v_variation_id IS NOT NULL THEN
      UPDATE public.product_variations SET stock = v_target
       WHERE id = v_variation_id AND product_id = v_product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variação do inventário não encontrada'; END IF;
      UPDATE public.products SET stock = (
        SELECT COALESCE(sum(stock), 0) FROM public.product_variations WHERE product_id = v_product_id
      ) WHERE id = v_product_id;
    ELSE
      UPDATE public.products SET stock = v_target WHERE id = v_product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto do inventário não encontrado'; END IF;
    END IF;
    v_moves := v_moves || jsonb_build_array(jsonb_build_object('productId', v_product_id, 'inventoryMoveId', v_move_id));
  END LOOP;

  RETURN jsonb_build_object('auditId', p_audit_id, 'markerMoveId', v_marker_id,
                            'status', 'processed', 'moves', v_moves);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.finalize_inventory_transaction(uuid, text, jsonb, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_transaction(uuid, text, jsonb, jsonb, text) TO authenticated, service_role;
