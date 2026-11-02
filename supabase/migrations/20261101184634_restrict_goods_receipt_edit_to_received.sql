BEGIN;

CREATE OR REPLACE FUNCTION public.edit_goods_receipt_checked_transaction(
  p_receipt jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_receipt_id uuid := NULLIF(p_receipt->>'id', '')::uuid;
  v_receipt public.goods_receipts%ROWTYPE;
  v_old_item public.goods_receipt_items%ROWTYPE;
  v_old_move public.inventory_moves%ROWTYPE;
  v_item jsonb;
  v_item_id uuid;
  v_product_id uuid;
  v_variation_id uuid;
  v_old_product_id uuid;
  v_old_variation_id uuid;
  v_quantity numeric;
  v_unit_cost numeric;
  v_old_quantity numeric;
  v_old_unit_cost numeric;
  v_received_at timestamptz;
  v_reversed_at timestamptz;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_attachments text[];
  v_item_index integer := 0;
  v_expected integer;
  v_actual integer;
  v_variation_count integer;
  v_stock_variation_id uuid;
  v_has_old_move boolean;
  v_product_changed boolean;
  v_stock_values_changed boolean;
  v_move_status text;
  v_move_id uuid;
  v_receipt_item_id uuid;
  v_moves jsonb := '[]'::jsonb;
  v_fiscal_key text;
  v_new_fiscal_key text;
BEGIN
  IF v_receipt_id IS NULL OR jsonb_typeof(p_receipt) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Recebimento inválido para alteração';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'O recebimento deve manter pelo menos um produto';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_receipt_id::text));
  SELECT * INTO v_receipt
  FROM public.goods_receipts AS receipt
  WHERE receipt.id = v_receipt_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recebimento não encontrado'; END IF;
  IF v_receipt.status IS DISTINCT FROM 'received' OR v_receipt.is_draft IS TRUE THEN
    RAISE EXCEPTION 'Desfaça o estorno antes de alterar o recebimento';
  END IF;
  IF p_receipt->>'status' IS DISTINCT FROM v_receipt.status THEN
    RAISE EXCEPTION 'O status do recebimento mudou. Atualize a lista antes de salvar';
  END IF;
  IF NULLIF(p_receipt->>'supplier_id', '') IS NULL THEN
    RAISE EXCEPTION 'Selecione o fornecedor para continuar';
  END IF;

  v_fiscal_key := pg_catalog.upper(pg_catalog.regexp_replace(COALESCE(v_receipt.fiscal_key, ''), '[./[:space:]-]', '', 'g'));
  v_new_fiscal_key := pg_catalog.upper(pg_catalog.regexp_replace(COALESCE(p_receipt->>'fiscal_key', ''), '[./[:space:]-]', '', 'g'));
  IF v_fiscal_key IS DISTINCT FROM v_new_fiscal_key THEN
    RAISE EXCEPTION 'A nota fiscal vinculada não pode ser trocada durante a alteração do recebimento';
  END IF;
  IF v_fiscal_key <> '' AND NULLIF(p_receipt->>'supplier_id', '') IS DISTINCT FROM v_receipt.supplier_id THEN
    RAISE EXCEPTION 'O fornecedor de um recebimento vinculado a NF-e deve permanecer igual ao emitente';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS supplied(value)
    WHERE NULLIF(supplied.value->>'productId', '') IS NULL
       OR COALESCE(NULLIF(supplied.value->>'quantity', '')::numeric, 0) <= 0
       OR COALESCE(NULLIF(supplied.value->>'quantity', '')::numeric, 0)
            <> trunc(COALESCE(NULLIF(supplied.value->>'quantity', '')::numeric, 0))
       OR COALESCE(NULLIF(supplied.value->>'unitCost', '')::numeric, 0) < 0
  ) THEN
    RAISE EXCEPTION 'Confira os produtos, quantidades inteiras e custos do recebimento';
  END IF;
  IF (
    SELECT count(*) FILTER (WHERE NULLIF(supplied.value->>'receiptItemId', '') IS NOT NULL)
         <> count(DISTINCT NULLIF(supplied.value->>'receiptItemId', ''))
    FROM jsonb_array_elements(p_items) AS supplied(value)
  ) THEN
    RAISE EXCEPTION 'Um item do recebimento foi enviado mais de uma vez';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS supplied(value)
    WHERE NULLIF(supplied.value->>'receiptItemId', '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.goods_receipt_items AS stored
        WHERE stored.id::text = supplied.value->>'receiptItemId'
          AND stored.receipt_id = v_receipt_id
      )
  ) THEN
    RAISE EXCEPTION 'Um item pertence a outro recebimento. Reabra o formulário';
  END IF;

  SELECT count(*) INTO v_expected
  FROM public.goods_receipt_items AS item
  WHERE item.receipt_id = v_receipt_id AND item.product_id IS NOT NULL;
  SELECT count(*) INTO v_actual
  FROM public.inventory_moves AS move
  WHERE move.source_receipt_id = v_receipt_id AND move.source_item_index IS NOT NULL;
  IF v_actual <> v_expected THEN
    RAISE EXCEPTION 'As movimentações deste recebimento estão incompletas; a alteração foi cancelada';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.goods_receipt_items AS item
    LEFT JOIN public.inventory_moves AS move
      ON move.source_receipt_id = item.receipt_id
     AND move.source_item_index = item.item_index
    WHERE item.receipt_id = v_receipt_id
      AND item.product_id IS NOT NULL
      AND (move.id IS NULL
        OR move.product_id IS DISTINCT FROM item.product_id::text
        OR move.variation_id IS DISTINCT FROM item.variation_id::text
        OR move.quantity IS DISTINCT FROM item.quantity
        OR move.status IS DISTINCT FROM CASE WHEN v_receipt.status = 'received' THEN 'effective' ELSE 'reversed' END)
  ) THEN
    RAISE EXCEPTION 'Os itens e movimentos atuais não correspondem; a alteração foi cancelada';
  END IF;

  v_received_at := CASE
    WHEN v_receipt.status = 'received' THEN COALESCE(NULLIF(p_receipt->>'received_at', '')::timestamptz, v_receipt.received_at)
    ELSE v_receipt.received_at
  END;
  v_reversed_at := CASE
    WHEN v_receipt.status = 'estornado' THEN COALESCE(NULLIF(p_receipt->>'reversed_at', '')::timestamptz, v_receipt.reversed_at, v_receipt.updated_at, v_now)
    ELSE NULL
  END;
  v_move_status := CASE WHEN v_receipt.status = 'received' THEN 'effective' ELSE 'reversed' END;
  IF jsonb_typeof(p_receipt->'attachments') = 'array' THEN
    v_attachments := ARRAY(SELECT jsonb_array_elements_text(p_receipt->'attachments'));
  ELSE
    v_attachments := v_receipt.attachments;
  END IF;

  PERFORM pg_catalog.set_config('morante.goods_receipt_item_mutation', 'confirm', true);

  UPDATE public.goods_receipt_items AS item
  SET item_index = -item.item_index
  WHERE item.receipt_id = v_receipt_id AND item.item_index > 0;
  UPDATE public.inventory_moves AS move
  SET source_item_index = -move.source_item_index
  WHERE move.source_receipt_id = v_receipt_id AND move.source_item_index > 0;

  FOR v_old_item IN
    SELECT * FROM public.goods_receipt_items AS item
    WHERE item.receipt_id = v_receipt_id AND item.item_index < 0
    ORDER BY item.item_index
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_items) AS supplied(value)
      WHERE supplied.value->>'receiptItemId' = v_old_item.id::text
    ) THEN
      IF v_old_item.product_id IS NOT NULL THEN
        SELECT * INTO v_old_move
        FROM public.inventory_moves AS move
        WHERE move.source_receipt_id = v_receipt_id
          AND move.source_item_index = v_old_item.item_index
        FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação ausente para o item removido'; END IF;
        IF v_receipt.status = 'received' THEN
          UPDATE public.inventory_moves AS move
          SET status = 'reversed', reversal_reason = 'Item removido na alteração do recebimento', reversed_at = v_now
          WHERE move.id = v_old_move.id;
          v_stock_variation_id := v_old_item.variation_id;
          IF v_stock_variation_id IS NULL THEN
            SELECT count(*), min(variation.id) INTO v_variation_count, v_stock_variation_id
            FROM public.product_variations AS variation
            WHERE variation.product_id = v_old_item.product_id;
            IF v_variation_count <> 1 THEN RAISE EXCEPTION 'Variação não identificada no item removido'; END IF;
          END IF;
          PERFORM public.apply_order_document_stock_delta(
            v_old_item.product_id, v_stock_variation_id, -v_old_item.quantity, NULL
          );
        ELSE
          UPDATE public.inventory_moves AS move
          SET reversal_reason = 'Item removido na alteração do recebimento', reversed_at = v_reversed_at
          WHERE move.id = v_old_move.id;
        END IF;
        UPDATE public.inventory_moves AS move
        SET source_receipt_id = NULL, source_item_index = NULL
        WHERE move.id = v_old_move.id;
      END IF;
      DELETE FROM public.goods_receipt_items AS item WHERE item.id = v_old_item.id;
    END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_item_index := v_item_index + 1;
    v_item_id := NULLIF(v_item->>'receiptItemId', '')::uuid;
    v_product_id := NULLIF(v_item->>'productId', '')::uuid;
    v_variation_id := NULLIF(v_item->>'variationId', '')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_cost := COALESCE(NULLIF(v_item->>'unitCost', '')::numeric, 0);
    v_has_old_move := false;
    v_product_changed := true;
    v_stock_values_changed := false;

    IF v_item_id IS NOT NULL THEN
      SELECT * INTO v_old_item
      FROM public.goods_receipt_items AS item
      WHERE item.id = v_item_id AND item.receipt_id = v_receipt_id AND item.item_index < 0
      FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Um item foi removido ou alterado em outro lugar; reabra o formulário'; END IF;
      IF v_old_item.product_id IS NOT NULL THEN
        SELECT * INTO v_old_move
        FROM public.inventory_moves AS move
        WHERE move.source_receipt_id = v_receipt_id
          AND move.source_item_index = v_old_item.item_index
        FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação ausente para um item do recebimento'; END IF;
        v_has_old_move := true;
        v_old_product_id := v_old_item.product_id;
        v_old_variation_id := v_old_item.variation_id;
        v_old_quantity := v_old_item.quantity;
        v_old_unit_cost := v_old_item.unit_cost;
        v_product_changed := v_old_product_id IS DISTINCT FROM v_product_id
          OR v_old_variation_id IS DISTINCT FROM v_variation_id;
        v_stock_values_changed := v_old_quantity IS DISTINCT FROM v_quantity
          OR v_old_unit_cost IS DISTINCT FROM v_unit_cost;
      END IF;
    END IF;

    IF v_has_old_move AND NOT v_product_changed THEN
      v_move_id := v_old_move.id;
      IF v_receipt.status = 'received' AND v_stock_values_changed THEN
        UPDATE public.inventory_moves AS move
        SET status = 'reversed', reversal_reason = 'Ajuste do item na alteração do recebimento', reversed_at = v_now
        WHERE move.id = v_move_id;
        v_stock_variation_id := v_old_variation_id;
        IF v_stock_variation_id IS NULL THEN
          SELECT count(*), min(variation.id) INTO v_variation_count, v_stock_variation_id
          FROM public.product_variations AS variation
          WHERE variation.product_id = v_old_product_id;
          IF v_variation_count <> 1 THEN RAISE EXCEPTION 'Variação não identificada no item ajustado'; END IF;
        END IF;
        PERFORM public.apply_order_document_stock_delta(v_old_product_id, v_stock_variation_id, -v_old_quantity, NULL);
      END IF;

      UPDATE public.goods_receipt_items AS stored
      SET item_index = v_item_index,
          product_id = v_product_id,
          variation_id = v_variation_id,
          description = COALESCE(NULLIF(v_item->>'description', ''), 'Item de Recebimento'),
          quantity = v_quantity,
          base_cost = COALESCE(NULLIF(v_item->>'baseCost', '')::numeric, 0),
          unit_cost = v_unit_cost,
          freight_fiscal_unit = COALESCE(NULLIF(v_item->>'freightFiscalUnit', '')::numeric, 0),
          freight_non_fiscal_unit = COALESCE(NULLIF(v_item->>'freightNonFiscalUnit', '')::numeric, 0),
          discount_unit = COALESCE(NULLIF(v_item->>'discountUnit', '')::numeric, 0),
          other_expenses_fiscal_unit = COALESCE(NULLIF(v_item->>'otherExpensesFiscalUnit', '')::numeric, 0),
          other_expenses_non_fiscal_unit = COALESCE(NULLIF(v_item->>'otherExpensesNonFiscalUnit', '')::numeric, 0),
          additional_cost_unit = COALESCE(NULLIF(v_item->>'additionalCostUnit', '')::numeric, 0),
          item_snapshot = v_item
      WHERE stored.id = v_item_id;

      UPDATE public.inventory_moves AS move
      SET source_item_index = v_item_index,
          product_description = COALESCE(NULLIF(v_item->>'description', ''), 'Mercadoria recebida'),
          quantity = v_quantity,
          date = v_received_at,
          label = COALESCE(NULLIF(p_receipt->>'invoice_number', ''), 'Recebimento de Mercadorias'),
          unit_cost = v_unit_cost,
          observation = pg_catalog.jsonb_build_object('goodsReceiptId', v_receipt_id, 'status', v_move_status)::text,
          status = v_move_status,
          reversal_reason = CASE WHEN v_move_status = 'reversed' THEN move.reversal_reason ELSE NULL END,
          reversed_at = CASE WHEN v_move_status = 'reversed' THEN v_reversed_at ELSE NULL END
      WHERE move.id = v_move_id;
      IF v_receipt.status = 'received' AND v_stock_values_changed THEN
        v_stock_variation_id := v_variation_id;
        IF v_stock_variation_id IS NULL THEN
          SELECT count(*), min(variation.id) INTO v_variation_count, v_stock_variation_id
          FROM public.product_variations AS variation
          WHERE variation.product_id = v_product_id;
          IF v_variation_count <> 1 THEN RAISE EXCEPTION 'Variação não identificada no item ajustado'; END IF;
        END IF;
        PERFORM public.apply_order_document_stock_delta(v_product_id, v_stock_variation_id, v_quantity, v_unit_cost);
      END IF;
    ELSE
      IF v_has_old_move THEN
        v_move_id := v_old_move.id;
        IF v_receipt.status = 'received' THEN
          UPDATE public.inventory_moves AS move
          SET status = 'reversed', reversal_reason = 'Produto alterado na alteração do recebimento', reversed_at = v_now
          WHERE move.id = v_move_id;
          v_stock_variation_id := v_old_variation_id;
          IF v_stock_variation_id IS NULL THEN
            SELECT count(*), min(variation.id) INTO v_variation_count, v_stock_variation_id
            FROM public.product_variations AS variation
            WHERE variation.product_id = v_old_product_id;
            IF v_variation_count <> 1 THEN RAISE EXCEPTION 'Variação não identificada no item substituído'; END IF;
          END IF;
          PERFORM public.apply_order_document_stock_delta(v_old_product_id, v_stock_variation_id, -v_old_quantity, NULL);
        ELSE
          UPDATE public.inventory_moves AS move
          SET reversal_reason = 'Produto alterado na alteração do recebimento', reversed_at = v_reversed_at
          WHERE move.id = v_move_id;
        END IF;
        UPDATE public.inventory_moves AS move
        SET source_receipt_id = NULL, source_item_index = NULL
        WHERE move.id = v_move_id;
      END IF;

      IF v_item_id IS NULL THEN
        INSERT INTO public.goods_receipt_items (
          receipt_id, item_index, product_id, variation_id, description, quantity,
          base_cost, unit_cost, freight_fiscal_unit, freight_non_fiscal_unit,
          discount_unit, other_expenses_fiscal_unit, other_expenses_non_fiscal_unit,
          additional_cost_unit, item_snapshot
        ) VALUES (
          v_receipt_id, v_item_index, v_product_id, v_variation_id,
          COALESCE(NULLIF(v_item->>'description', ''), 'Item de Recebimento'), v_quantity,
          COALESCE(NULLIF(v_item->>'baseCost', '')::numeric, 0), v_unit_cost,
          COALESCE(NULLIF(v_item->>'freightFiscalUnit', '')::numeric, 0),
          COALESCE(NULLIF(v_item->>'freightNonFiscalUnit', '')::numeric, 0),
          COALESCE(NULLIF(v_item->>'discountUnit', '')::numeric, 0),
          COALESCE(NULLIF(v_item->>'otherExpensesFiscalUnit', '')::numeric, 0),
          COALESCE(NULLIF(v_item->>'otherExpensesNonFiscalUnit', '')::numeric, 0),
          COALESCE(NULLIF(v_item->>'additionalCostUnit', '')::numeric, 0), v_item
        ) RETURNING id INTO v_receipt_item_id;
      ELSE
        UPDATE public.goods_receipt_items AS stored
        SET item_index = v_item_index,
            product_id = v_product_id,
            variation_id = v_variation_id,
            description = COALESCE(NULLIF(v_item->>'description', ''), 'Item de Recebimento'),
            quantity = v_quantity,
            base_cost = COALESCE(NULLIF(v_item->>'baseCost', '')::numeric, 0),
            unit_cost = v_unit_cost,
            freight_fiscal_unit = COALESCE(NULLIF(v_item->>'freightFiscalUnit', '')::numeric, 0),
            freight_non_fiscal_unit = COALESCE(NULLIF(v_item->>'freightNonFiscalUnit', '')::numeric, 0),
            discount_unit = COALESCE(NULLIF(v_item->>'discountUnit', '')::numeric, 0),
            other_expenses_fiscal_unit = COALESCE(NULLIF(v_item->>'otherExpensesFiscalUnit', '')::numeric, 0),
            other_expenses_non_fiscal_unit = COALESCE(NULLIF(v_item->>'otherExpensesNonFiscalUnit', '')::numeric, 0),
            additional_cost_unit = COALESCE(NULLIF(v_item->>'additionalCostUnit', '')::numeric, 0),
            item_snapshot = v_item
        WHERE stored.id = v_item_id
        RETURNING id INTO v_receipt_item_id;
      END IF;

      INSERT INTO public.inventory_moves (
        product_id, variation_id, product_description, type, quantity, date, label,
        unit_cost, observation, order_id, related_entity_id, related_entity_type,
        source_receipt_id, source_item_index, status, reversal_reason, reversed_at
      ) VALUES (
        v_product_id::text, v_variation_id::text,
        COALESCE(NULLIF(v_item->>'description', ''), 'Mercadoria recebida'), 'entry', v_quantity,
        v_received_at, COALESCE(NULLIF(p_receipt->>'invoice_number', ''), 'Recebimento de Mercadorias'),
        v_unit_cost,
        pg_catalog.jsonb_build_object('goodsReceiptId', v_receipt_id, 'status', v_move_status)::text,
        v_receipt_id::text, v_receipt_id::text, 'goods_receipt', v_receipt_id, v_item_index,
        v_move_status,
        CASE WHEN v_move_status = 'reversed' THEN 'Item incluído em recebimento já estornado' ELSE NULL END,
        v_reversed_at
      ) RETURNING id INTO v_move_id;
      IF v_receipt.status = 'received' THEN
        v_stock_variation_id := v_variation_id;
        IF v_stock_variation_id IS NULL THEN
          SELECT count(*), min(variation.id) INTO v_variation_count, v_stock_variation_id
          FROM public.product_variations AS variation
          WHERE variation.product_id = v_product_id;
          IF v_variation_count <> 1 THEN RAISE EXCEPTION 'Variação não identificada no novo item'; END IF;
        END IF;
        PERFORM public.apply_order_document_stock_delta(v_product_id, v_stock_variation_id, v_quantity, v_unit_cost);
      END IF;
    END IF;

    IF v_item_id IS NOT NULL THEN
      v_receipt_item_id := v_item_id;
    END IF;
    v_moves := v_moves || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'itemIndex', v_item_index,
      'inventoryMoveId', v_move_id,
      'receiptItemId', v_receipt_item_id
    ));
  END LOOP;

  DELETE FROM public.goods_receipt_items AS item
  WHERE item.receipt_id = v_receipt_id AND item.item_index < 0;

  IF jsonb_typeof(p_receipt->'attachments') = 'array' THEN
    v_attachments := ARRAY(SELECT jsonb_array_elements_text(p_receipt->'attachments'));
  END IF;
  UPDATE public.goods_receipts AS receipt
  SET purchase_id = NULLIF(p_receipt->>'purchase_id', '')::uuid,
      supplier_id = NULLIF(p_receipt->>'supplier_id', ''),
      supplier_name = COALESCE(NULLIF(p_receipt->>'supplier_name', ''), receipt.supplier_name),
      received_at = v_received_at,
      reversed_at = v_reversed_at,
      invoice_number = NULLIF(p_receipt->>'invoice_number', ''),
      invoice_date = NULLIF(p_receipt->>'invoice_date', '')::timestamptz,
      total_value = COALESCE(NULLIF(p_receipt->>'total_value', '')::numeric, 0),
      observation = COALESCE(p_receipt->>'observation', ''),
      attachments = v_attachments,
      items = p_items,
      is_draft = false,
      ipi_percent = COALESCE(NULLIF(p_receipt->>'ipi_percent', '')::numeric, 0),
      freight_percent = COALESCE(NULLIF(p_receipt->>'freight_percent', '')::numeric, 0),
      non_fiscal_discount_mode = NULLIF(p_receipt->>'non_fiscal_discount_mode', ''),
      non_fiscal_discount_value = COALESCE(NULLIF(p_receipt->>'non_fiscal_discount_value', '')::numeric, 0),
      non_fiscal_freight_mode = NULLIF(p_receipt->>'non_fiscal_freight_mode', ''),
      non_fiscal_freight_value = COALESCE(NULLIF(p_receipt->>'non_fiscal_freight_value', '')::numeric, 0),
      non_fiscal_other_expenses_mode = NULLIF(p_receipt->>'non_fiscal_other_expenses_mode', ''),
      non_fiscal_other_expenses_value = COALESCE(NULLIF(p_receipt->>'non_fiscal_other_expenses_value', '')::numeric, 0),
      fiscal_ipi = COALESCE(NULLIF(p_receipt->>'fiscal_ipi', '')::numeric, 0),
      fiscal_freight = COALESCE(NULLIF(p_receipt->>'fiscal_freight', '')::numeric, 0),
      fiscal_discount = COALESCE(NULLIF(p_receipt->>'fiscal_discount', '')::numeric, 0),
      fiscal_other_expenses = COALESCE(NULLIF(p_receipt->>'fiscal_other_expenses', '')::numeric, 0),
      updated_at = v_now
  WHERE receipt.id = v_receipt_id;

  IF v_fiscal_key <> '' THEN
    UPDATE public.inbound_invoices AS invoice
    SET status_recebimento = CASE
          WHEN v_receipt.status = 'received' THEN 'recebida'
          WHEN EXISTS (
            SELECT 1 FROM public.goods_receipts AS other_receipt
            WHERE pg_catalog.upper(pg_catalog.regexp_replace(COALESCE(other_receipt.fiscal_key, ''), '[./[:space:]-]', '', 'g')) = v_fiscal_key
              AND other_receipt.id <> v_receipt_id
              AND other_receipt.status = 'received'
              AND other_receipt.is_draft IS NOT TRUE
          ) THEN 'recebida'
          ELSE 'pendente'
        END,
        receipt_id = CASE
          WHEN v_receipt.status = 'received' THEN v_receipt_id
          ELSE (
            SELECT other_receipt.id FROM public.goods_receipts AS other_receipt
            WHERE pg_catalog.upper(pg_catalog.regexp_replace(COALESCE(other_receipt.fiscal_key, ''), '[./[:space:]-]', '', 'g')) = v_fiscal_key
              AND other_receipt.id <> v_receipt_id
              AND other_receipt.status = 'received'
              AND other_receipt.is_draft IS NOT TRUE
            ORDER BY other_receipt.updated_at DESC NULLS LAST, other_receipt.created_at DESC
            LIMIT 1
          )
        END,
        updated_at = v_now
    WHERE pg_catalog.upper(pg_catalog.regexp_replace(COALESCE(invoice.chave_acesso, ''), '[./[:space:]-]', '', 'g')) = v_fiscal_key;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'receiptId', v_receipt_id,
    'status', v_receipt.status,
    'moves', v_moves
  );
END;
$function$;

ALTER FUNCTION public.edit_goods_receipt_checked_transaction(jsonb, jsonb) SET search_path = '';
REVOKE ALL ON FUNCTION public.edit_goods_receipt_checked_transaction(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_goods_receipt_checked_transaction(jsonb, jsonb) TO authenticated, service_role;

COMMIT;

