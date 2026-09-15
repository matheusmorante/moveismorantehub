-- Operações de estoque precisam gravar o documento e seus fatos de estoque na
-- mesma transação. Estas funções não fazem chamadas externas (notificações,
-- storage ou integrações), que devem continuar após o commit.

CREATE OR REPLACE FUNCTION public.confirm_goods_receipt_transaction(
  p_receipt jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $function$
DECLARE
  v_receipt_id uuid := (p_receipt->>'id')::uuid;
  v_existing_status text;
  v_item record;
  v_index integer := 0;
  v_move_id uuid;
  v_moves jsonb := '[]'::jsonb;
  v_now timestamptz := now();
BEGIN
  IF v_receipt_id IS NULL THEN
    RAISE EXCEPTION 'O identificador do recebimento é obrigatório';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Os itens do recebimento devem ser uma lista';
  END IF;

  -- Serializa confirmações concorrentes do mesmo recebimento.
  PERFORM pg_advisory_xact_lock(hashtext(v_receipt_id::text));
  SELECT status INTO v_existing_status FROM public.goods_receipts WHERE id = v_receipt_id FOR UPDATE;

  INSERT INTO public.goods_receipts (
    id, receipt_index, purchase_id, supplier_id, supplier_name, received_at,
    invoice_number, invoice_date, total_value, observation, fiscal_key,
    attachments, status, is_draft, ipi_percent, freight_percent,
    non_fiscal_discount_mode, non_fiscal_discount_value,
    non_fiscal_freight_mode, non_fiscal_freight_value,
    non_fiscal_other_expenses_mode, non_fiscal_other_expenses_value,
    fiscal_ipi, fiscal_freight, fiscal_discount, fiscal_other_expenses, updated_at
  ) VALUES (
    v_receipt_id, NULLIF(p_receipt->>'receipt_index', '')::integer,
    NULLIF(p_receipt->>'purchase_id', '')::uuid, NULLIF(p_receipt->>'supplier_id', '')::uuid,
    COALESCE(p_receipt->>'supplier_name', 'Fornecedor'),
    COALESCE(NULLIF(p_receipt->>'received_at', '')::timestamptz, v_now),
    NULLIF(p_receipt->>'invoice_number', ''), NULLIF(p_receipt->>'invoice_date', '')::timestamptz,
    COALESCE(NULLIF(p_receipt->>'total_value', '')::numeric, 0), COALESCE(p_receipt->>'observation', ''),
    NULLIF(p_receipt->>'fiscal_key', ''), COALESCE(p_receipt->'attachments', '[]'::jsonb),
    'received', false, COALESCE(NULLIF(p_receipt->>'ipi_percent', '')::numeric, 0),
    COALESCE(NULLIF(p_receipt->>'freight_percent', '')::numeric, 0),
    NULLIF(p_receipt->>'non_fiscal_discount_mode', ''), COALESCE(NULLIF(p_receipt->>'non_fiscal_discount_value', '')::numeric, 0),
    NULLIF(p_receipt->>'non_fiscal_freight_mode', ''), COALESCE(NULLIF(p_receipt->>'non_fiscal_freight_value', '')::numeric, 0),
    NULLIF(p_receipt->>'non_fiscal_other_expenses_mode', ''), COALESCE(NULLIF(p_receipt->>'non_fiscal_other_expenses_value', '')::numeric, 0),
    COALESCE(NULLIF(p_receipt->>'fiscal_ipi', '')::numeric, 0), COALESCE(NULLIF(p_receipt->>'fiscal_freight', '')::numeric, 0),
    COALESCE(NULLIF(p_receipt->>'fiscal_discount', '')::numeric, 0), COALESCE(NULLIF(p_receipt->>'fiscal_other_expenses', '')::numeric, 0), v_now
  ) ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at
  -- A confirmação é idempotente: dados já confirmados não são silenciosamente reescritos.
  WHERE public.goods_receipts.status <> 'received';

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_index := v_index + 1;
    INSERT INTO public.goods_receipt_items (
      receipt_id, item_index, product_id, variation_id, description, quantity,
      base_cost, unit_cost, freight_fiscal_unit, freight_non_fiscal_unit,
      discount_unit, other_expenses_fiscal_unit, other_expenses_non_fiscal_unit,
      additional_cost_unit, item_snapshot
    ) VALUES (
      v_receipt_id, v_index, NULLIF(v_item.value->>'productId', '')::uuid,
      NULLIF(v_item.value->>'variationId', '')::uuid,
      COALESCE(v_item.value->>'description', 'Item de Recebimento'),
      COALESCE(NULLIF(v_item.value->>'quantity', '')::numeric, 0),
      COALESCE(NULLIF(v_item.value->>'baseCost', '')::numeric, 0),
      COALESCE(NULLIF(v_item.value->>'unitCost', '')::numeric, 0),
      COALESCE(NULLIF(v_item.value->>'freightFiscalUnit', '')::numeric, 0),
      COALESCE(NULLIF(v_item.value->>'freightNonFiscalUnit', '')::numeric, 0),
      COALESCE(NULLIF(v_item.value->>'discountUnit', '')::numeric, 0),
      COALESCE(NULLIF(v_item.value->>'otherExpensesFiscalUnit', '')::numeric, 0),
      COALESCE(NULLIF(v_item.value->>'otherExpensesNonFiscalUnit', '')::numeric, 0),
      COALESCE(NULLIF(v_item.value->>'additionalCostUnit', '')::numeric, 0), v_item.value
    ) ON CONFLICT (receipt_id, item_index) DO NOTHING;

    IF NULLIF(v_item.value->>'productId', '') IS NOT NULL THEN
      INSERT INTO public.inventory_moves (
        product_id, variation_id, product_description, type, quantity, date, label,
        unit_cost, observation, order_id, related_entity_id, related_entity_type,
        source_receipt_id, source_item_index, status, created_at
      ) VALUES (
        (v_item.value->>'productId')::uuid, NULLIF(v_item.value->>'variationId', '')::uuid,
        COALESCE(v_item.value->>'description', 'Mercadoria recebida'), 'entry',
        COALESCE(NULLIF(v_item.value->>'quantity', '')::numeric, 0),
        COALESCE(NULLIF(p_receipt->>'received_at', '')::timestamptz, v_now),
        COALESCE(NULLIF(p_receipt->>'invoice_number', ''), 'Recebimento de Mercadorias'),
        COALESCE(NULLIF(v_item.value->>'unitCost', '')::numeric, 0),
        jsonb_build_object('goodsReceiptId', v_receipt_id, 'status', 'effective')::text,
        v_receipt_id::text, v_receipt_id::text, 'goods_receipt', v_receipt_id, v_index, 'effective', v_now
      ) ON CONFLICT (source_receipt_id, source_item_index) WHERE source_receipt_id IS NOT NULL AND source_item_index IS NOT NULL
        DO UPDATE SET id = public.inventory_moves.id
      RETURNING id INTO v_move_id;
      v_moves := v_moves || jsonb_build_array(jsonb_build_object('itemIndex', v_index, 'inventoryMoveId', v_move_id));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('receiptId', v_receipt_id, 'status', 'received', 'moves', v_moves);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_goods_receipt_inventory_status_transaction(
  p_receipt_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $function$
DECLARE v_now timestamptz := now(); BEGIN
  IF p_status NOT IN ('received', 'estornado') THEN RAISE EXCEPTION 'Status de recebimento inválido'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_receipt_id::text));
  PERFORM 1 FROM public.goods_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recebimento não encontrado'; END IF;
  UPDATE public.inventory_moves SET status = CASE WHEN p_status = 'estornado' THEN 'reversed' ELSE 'effective' END,
    reversal_reason = CASE WHEN p_status = 'estornado' THEN p_reason ELSE NULL END,
    reversed_at = CASE WHEN p_status = 'estornado' THEN v_now ELSE NULL END
  WHERE source_receipt_id = p_receipt_id;
  UPDATE public.goods_receipts SET status = p_status, is_draft = false, updated_at = v_now WHERE id = p_receipt_id;
  RETURN jsonb_build_object('receiptId', p_receipt_id, 'status', p_status);
END; $function$;

GRANT EXECUTE ON FUNCTION public.confirm_goods_receipt_transaction(jsonb, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_goods_receipt_inventory_status_transaction(uuid, text, text) TO anon, authenticated, service_role;
