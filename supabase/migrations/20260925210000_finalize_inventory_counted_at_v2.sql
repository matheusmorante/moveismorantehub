-- Contrato v2: cada item contado leva countedAt; o servidor decide o saldo e o ajuste.
-- A função anterior permanece disponível para versões antigas do aplicativo.
CREATE OR REPLACE FUNCTION public.finalize_inventory_transaction_v2(
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
  v_payload_hash text;
  v_product_id uuid;
  v_variation_id uuid;
  v_merged_id uuid;
  v_counted_at timestamptz;
  v_count numeric;
  v_current numeric;
  v_delta numeric;
  v_target numeric;
  v_move_id uuid;
  v_moves jsonb := '[]'::jsonb;
BEGIN
  IF p_audit_id IS NULL OR NULLIF(btrim(p_code), '') IS NULL
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0
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
    RAISE EXCEPTION 'Contagens duplicadas no mesmo inventário';
  END IF;

  v_payload_hash := md5(p_code || p_observation::text || p_items::text || COALESCE(p_responsible_name, ''));

  PERFORM pg_advisory_xact_lock(hashtext(p_audit_id::text));
  SELECT id, COALESCE(observation::jsonb, '{}'::jsonb)
    INTO v_marker_id, v_marker_observation
    FROM public.inventory_moves
   WHERE (related_entity_id = p_audit_id::text OR order_id = p_audit_id::text)
     AND label LIKE 'Inventário #%' AND type = 'adjustment'
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF v_marker_id IS NOT NULL AND v_marker_observation->>'status' = 'completed' THEN
    IF v_marker_observation ? 'submissionHash'
       AND v_marker_observation->>'submissionHash' IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION 'Mesmo audit_id enviado com payload diferente';
    END IF;
    RETURN jsonb_build_object('auditId', p_audit_id, 'markerMoveId', v_marker_id, 'status', 'already_processed');
  END IF;

  IF v_marker_id IS NULL THEN
    INSERT INTO public.inventory_moves
      (product_id, type, quantity, date, label, observation, related_entity_id, order_id, status, created_at)
    VALUES
      (NULL, 'adjustment', 0, now(), 'Inventário #' || p_code || ' (Concluído)',
       jsonb_set(p_observation, '{submissionHash}', to_jsonb(v_payload_hash), true)::text,
       p_audit_id::text, p_audit_id::text, 'effective', now())
    RETURNING id INTO v_marker_id;
  ELSE
    UPDATE public.inventory_moves
       SET label = 'Inventário #' || p_code || ' (Concluído)',
           observation = jsonb_set(p_observation, '{submissionHash}', to_jsonb(v_payload_hash), true)::text,
           related_entity_id = p_audit_id::text,
           order_id = p_audit_id::text, status = 'effective'
     WHERE id = v_marker_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := NULLIF(v_item->>'productId', '')::uuid;
    v_variation_id := NULLIF(v_item->>'variationId', '')::uuid;
    v_count := NULLIF(v_item->>'physicalCount', '')::numeric;
    v_counted_at := NULLIF(v_item->>'countedAt', '')::timestamptz;
    IF v_product_id IS NULL OR v_count IS NULL OR v_count < 0 OR v_counted_at IS NULL
       OR v_counted_at > now() + interval '5 minutes' THEN
      RAISE EXCEPTION 'Contagem sem identidade, quantidade ou horário válido';
    END IF;
    IF v_variation_id IS NOT NULL AND v_count <> trunc(v_count) THEN
      RAISE EXCEPTION 'Quantidade de variação deve ser inteira';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_observation->'items') AS counted(item)
       WHERE counted.item->>'productId' = v_product_id::text
         AND COALESCE(counted.item->>'variationId', '') = COALESCE(v_variation_id::text, '')
         AND (counted.item->>'physicalCount')::numeric = v_count
         AND counted.item->>'countedAt' = v_item->>'countedAt'
    ) THEN
      RAISE EXCEPTION 'Submissão não corresponde ao snapshot de contagem';
    END IF;

    IF v_variation_id IS NOT NULL THEN
      SELECT stock, merged_to_variation_id
        INTO v_current, v_merged_id
        FROM public.product_variations
       WHERE id = v_variation_id AND product_id = v_product_id
       FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variação do inventário não encontrada'; END IF;
      IF v_merged_id IS NOT NULL THEN
        RAISE EXCEPTION 'Variação do inventário foi mesclada; resolução manual necessária';
      END IF;
    ELSE
      SELECT stock INTO v_current FROM public.products WHERE id = v_product_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto do inventário não encontrado'; END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.inventory_moves move
       WHERE move.product_id::text = v_product_id::text
         AND (CASE WHEN v_variation_id IS NULL THEN move.variation_id IS NULL
                   ELSE move.variation_id::text = v_variation_id::text END)
         AND COALESCE(move.created_at, move.date) > v_counted_at
         AND move.type IN ('adjustment', 'balance')
         AND COALESCE(move.status, 'effective') NOT IN ('reversed', 'cancelled')
         AND COALESCE(move.related_entity_id, '') <> p_audit_id::text
    ) THEN
      RAISE EXCEPTION 'Outro ajuste alterou o estoque após esta contagem; revisão necessária';
    END IF;

    SELECT COALESCE(sum(CASE
             WHEN move.type IN ('entry', 'in') THEN COALESCE(move.quantity, 0)
             WHEN move.type IN ('exit', 'withdrawal', 'out') THEN -COALESCE(move.quantity, 0)
             ELSE 0 END), 0)
      INTO v_delta
      FROM public.inventory_moves move
     WHERE move.product_id::text = v_product_id::text
       AND (CASE WHEN v_variation_id IS NULL THEN move.variation_id IS NULL
                 ELSE move.variation_id::text = v_variation_id::text END)
       AND COALESCE(move.created_at, move.date) > v_counted_at
       AND move.type IN ('entry', 'in', 'exit', 'withdrawal', 'out')
       AND COALESCE(move.status, 'effective') NOT IN ('reversed', 'cancelled');

    v_target := v_count + v_delta;
    IF v_target < 0 THEN RAISE EXCEPTION 'Movimentações posteriores produziram saldo negativo'; END IF;
    IF v_target IS DISTINCT FROM COALESCE(v_current, 0) THEN
      INSERT INTO public.inventory_moves
        (product_id, variation_id, product_description, type, quantity, date, label,
         observation, related_entity_id, order_id, status, created_at)
      VALUES
        (v_product_id::text, v_variation_id::text, COALESCE(v_item->>'name', 'Item do inventário'),
         'adjustment', 0, now(), 'Ajuste lançado pelo inventário #' || p_code,
         jsonb_build_object('source', 'inventory_audit', 'targetStock', v_target,
                            'previousStock', v_current, 'countedAt', v_counted_at,
                            'postCountDelta', v_delta, 'status', 'effective')::text,
         p_audit_id::text, p_audit_id::text, 'effective', now())
      RETURNING id INTO v_move_id;
      IF v_variation_id IS NOT NULL THEN
        UPDATE public.product_variations SET stock = v_target WHERE id = v_variation_id;
        UPDATE public.products SET stock = (
          SELECT COALESCE(sum(stock), 0) FROM public.product_variations WHERE product_id = v_product_id
        ) WHERE id = v_product_id;
      ELSE
        UPDATE public.products SET stock = v_target WHERE id = v_product_id;
      END IF;
      v_moves := v_moves || jsonb_build_array(jsonb_build_object('productId', v_product_id,
                                                                  'inventoryMoveId', v_move_id));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('auditId', p_audit_id, 'markerMoveId', v_marker_id,
                            'status', 'processed', 'moves', v_moves);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.finalize_inventory_transaction_v2(uuid, text, jsonb, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_transaction_v2(uuid, text, jsonb, jsonb, text) TO authenticated, service_role;
