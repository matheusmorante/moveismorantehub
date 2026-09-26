-- Valida os fatos gerados pelas RPCs existentes antes de confirmar o commit.
-- Nenhum dado histórico é corrigido automaticamente: inconsistências bloqueiam
-- a operação e exigem conciliação explícita.
CREATE OR REPLACE FUNCTION public.confirm_goods_receipt_checked_transaction(
  p_receipt jsonb, p_items jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $function$
DECLARE
  v_receipt_id uuid := (p_receipt->>'id')::uuid;
  v_previous_status text;
  v_result jsonb;
  v_item record;
  v_move record;
  v_expected integer := 0;
  v_actual integer;
  v_variation_id uuid;
  v_variation_count integer;
BEGIN
  IF v_receipt_id IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Recebimento requer identificador e itens válidos';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_receipt_id::text));
  SELECT status INTO v_previous_status FROM public.goods_receipts WHERE id = v_receipt_id FOR UPDATE;
  IF v_previous_status = 'estornado' THEN
    RAISE EXCEPTION 'Recebimento estornado deve ser reativado, não confirmado novamente';
  END IF;

  IF v_previous_status = 'received' AND EXISTS (
    SELECT 1 FROM (
      SELECT item_index, item_snapshot FROM public.goods_receipt_items WHERE receipt_id = v_receipt_id
    ) AS stored
    FULL JOIN jsonb_array_elements(p_items) WITH ORDINALITY AS supplied(value, item_index)
      ON supplied.item_index = stored.item_index
    WHERE (stored.item_snapshot - 'inventoryMoveId') IS DISTINCT FROM (supplied.value - 'inventoryMoveId')
       OR stored.item_index IS NULL OR supplied.item_index IS NULL
  ) THEN
    RAISE EXCEPTION 'Recebimento já confirmado com itens diferentes';
  END IF;

  FOR v_item IN SELECT value, ordinality::integer AS item_index
                  FROM jsonb_array_elements(p_items) WITH ORDINALITY LOOP
    IF NULLIF(v_item.value->>'productId', '') IS NOT NULL THEN
      IF COALESCE(NULLIF(v_item.value->>'quantity', '')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION 'Quantidade inválida no item % do recebimento', v_item.item_index;
      END IF;
      v_expected := v_expected + 1;
    END IF;
  END LOOP;

  v_result := public.confirm_goods_receipt_transaction(p_receipt, p_items);
  PERFORM 1 FROM public.goods_receipts WHERE id = v_receipt_id AND status = 'received';
  IF NOT FOUND THEN RAISE EXCEPTION 'Recebimento não foi confirmado no banco'; END IF;

  FOR v_item IN SELECT value, ordinality::integer AS item_index
                  FROM jsonb_array_elements(p_items) WITH ORDINALITY LOOP
    IF NULLIF(v_item.value->>'productId', '') IS NULL THEN CONTINUE; END IF;
    SELECT product_id, variation_id, quantity, status INTO v_move
      FROM public.inventory_moves
      WHERE source_receipt_id = v_receipt_id AND source_item_index = v_item.item_index;
    IF NOT FOUND OR v_move.product_id::text <> v_item.value->>'productId'
       OR v_move.variation_id::text IS DISTINCT FROM NULLIF(v_item.value->>'variationId', '')
       OR v_move.quantity <> (v_item.value->>'quantity')::numeric
       OR v_move.status <> 'effective' THEN
      RAISE EXCEPTION 'Entrada de estoque não confirmada para o item %', v_item.item_index;
    END IF;
  END LOOP;
  SELECT count(*) INTO v_actual FROM public.inventory_moves WHERE source_receipt_id = v_receipt_id;
  IF v_actual <> v_expected THEN RAISE EXCEPTION 'Quantidade de entradas divergente no recebimento'; END IF;
  IF v_previous_status IS DISTINCT FROM 'received' THEN
    FOR v_item IN SELECT value, ordinality::integer AS item_index
                    FROM jsonb_array_elements(p_items) WITH ORDINALITY LOOP
      IF NULLIF(v_item.value->>'productId', '') IS NULL THEN CONTINUE; END IF;
      v_variation_id := NULLIF(v_item.value->>'variationId', '')::uuid;
      IF v_variation_id IS NULL THEN
        SELECT count(*), min(id) INTO v_variation_count, v_variation_id
          FROM public.product_variations WHERE product_id = (v_item.value->>'productId')::uuid;
        IF v_variation_count <> 1 THEN
          RAISE EXCEPTION 'Variação não identificada no item % do recebimento', v_item.item_index;
        END IF;
      END IF;
      PERFORM public.apply_order_document_stock_delta(
        (v_item.value->>'productId')::uuid, v_variation_id,
        (v_item.value->>'quantity')::numeric,
        NULLIF(v_item.value->>'unitCost', '')::numeric);
    END LOOP;
  END IF;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_goods_receipt_inventory_status_checked_transaction(
  p_receipt_id uuid, p_status text, p_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, extensions AS $function$
DECLARE
  v_result jsonb;
  v_expected integer;
  v_actual integer;
  v_move_status text;
  v_previous_status text;
  v_item record;
  v_variation_id uuid;
  v_variation_count integer;
BEGIN
  SELECT status INTO v_previous_status FROM public.goods_receipts WHERE id = p_receipt_id FOR UPDATE;
  v_result := public.set_goods_receipt_inventory_status_transaction(p_receipt_id, p_status, p_reason);
  SELECT count(*) INTO v_expected FROM public.goods_receipt_items
    WHERE receipt_id = p_receipt_id AND product_id IS NOT NULL;
  v_move_status := CASE WHEN p_status = 'estornado' THEN 'reversed' ELSE 'effective' END;
  SELECT count(*) INTO v_actual FROM public.inventory_moves
    WHERE source_receipt_id = p_receipt_id AND status = v_move_status;
  IF v_actual <> v_expected THEN
    RAISE EXCEPTION 'Recebimento não pode mudar de status: movimentações de estoque incompletas';
  END IF;
  IF v_previous_status IS DISTINCT FROM p_status THEN
    FOR v_item IN SELECT product_id, variation_id, quantity, unit_cost, item_index
                    FROM public.goods_receipt_items
                    WHERE receipt_id = p_receipt_id AND product_id IS NOT NULL ORDER BY item_index LOOP
      v_variation_id := v_item.variation_id;
      IF v_variation_id IS NULL THEN
        SELECT count(*), min(id) INTO v_variation_count, v_variation_id
          FROM public.product_variations WHERE product_id = v_item.product_id;
        IF v_variation_count <> 1 THEN
          RAISE EXCEPTION 'Variação não identificada no item % do recebimento', v_item.item_index;
        END IF;
      END IF;
      PERFORM public.apply_order_document_stock_delta(
        v_item.product_id, v_variation_id,
        CASE WHEN p_status = 'estornado' THEN -v_item.quantity ELSE v_item.quantity END,
        CASE WHEN p_status = 'received' THEN v_item.unit_cost ELSE NULL END);
    END LOOP;
  END IF;
  RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.confirm_goods_receipt_checked_transaction(jsonb, jsonb)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_goods_receipt_inventory_status_checked_transaction(uuid, text, text)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_goods_receipt_draft_transaction(p_receipt_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.goods_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_status <> 'draft' OR EXISTS (
    SELECT 1 FROM public.inventory_moves WHERE source_receipt_id = p_receipt_id
  ) THEN
    RAISE EXCEPTION 'Recebimento confirmado não pode ser excluído; use o estorno';
  END IF;
  DELETE FROM public.goods_receipt_items WHERE receipt_id = p_receipt_id;
  DELETE FROM public.goods_receipts WHERE id = p_receipt_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.delete_goods_receipt_draft_transaction(uuid)
  TO anon, authenticated, service_role;
