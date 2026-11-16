BEGIN;

CREATE OR REPLACE FUNCTION public.save_mobile_goods_receipt_draft_transaction(
  p_receipt jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_receipt_id uuid;
  v_receipt_index integer;
  v_items jsonb;
  v_invalid_snapshots bigint;
BEGIN
  IF p_receipt IS NULL OR pg_catalog.jsonb_typeof(p_receipt) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Os dados do recebimento são inválidos';
  END IF;
  IF p_receipt ? 'items' THEN
    RAISE EXCEPTION 'Envie os itens somente na lista de itens do rascunho';
  END IF;
  IF p_items IS NULL OR pg_catalog.jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Os itens do recebimento devem ser uma lista';
  END IF;
  IF p_receipt ? 'attachments'
    AND pg_catalog.jsonb_typeof(p_receipt->'attachments') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Os anexos do recebimento devem ser uma lista';
  END IF;

  v_receipt_id := NULLIF(p_receipt->>'id', '')::uuid;
  IF v_receipt_id IS NULL THEN
    RAISE EXCEPTION 'O identificador do recebimento é obrigatório';
  END IF;

  SELECT
    COALESCE(
      pg_catalog.jsonb_agg(item.value->'item_snapshot' ORDER BY item.ordinality),
      '[]'::jsonb
    ),
    count(*) FILTER (
      WHERE pg_catalog.jsonb_typeof(item.value) IS DISTINCT FROM 'object'
        OR pg_catalog.jsonb_typeof(item.value->'item_snapshot') IS DISTINCT FROM 'object'
    )
  INTO v_items, v_invalid_snapshots
  FROM pg_catalog.jsonb_array_elements(p_items) WITH ORDINALITY AS item(value, ordinality);

  IF v_invalid_snapshots > 0 THEN
    RAISE EXCEPTION 'Cada item do recebimento deve conter seu retrato original';
  END IF;

  -- Usa a mesma chave da confirmação para serializar salvamentos e confirmação
  -- concorrentes do mesmo recebimento, sem bloquear outros recebimentos.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_receipt_id::text));

  INSERT INTO public.goods_receipts (
    id, receipt_index, purchase_id, supplier_id, supplier_name, received_at,
    invoice_number, invoice_date, items, total_value, observation, fiscal_key,
    attachments, status, is_draft, ipi_percent, freight_percent,
    non_fiscal_discount_mode, non_fiscal_discount_value,
    non_fiscal_freight_mode, non_fiscal_freight_value,
    non_fiscal_other_expenses_mode, non_fiscal_other_expenses_value,
    fiscal_ipi, fiscal_freight, fiscal_discount, fiscal_other_expenses, updated_at
  ) VALUES (
    v_receipt_id,
    NULLIF(p_receipt->>'receipt_index', '')::integer,
    NULLIF(p_receipt->>'purchase_id', '')::uuid,
    NULLIF(p_receipt->>'supplier_id', ''),
    COALESCE(NULLIF(p_receipt->>'supplier_name', ''), 'Fornecedor'),
    NULLIF(p_receipt->>'received_at', '')::timestamptz,
    NULLIF(p_receipt->>'invoice_number', ''),
    NULLIF(p_receipt->>'invoice_date', '')::timestamptz,
    v_items,
    COALESCE(NULLIF(p_receipt->>'total_value', '')::numeric, 0),
    COALESCE(p_receipt->>'observation', ''),
    NULLIF(p_receipt->>'fiscal_key', ''),
    COALESCE(
      ARRAY(
        SELECT attachment.value
        FROM pg_catalog.jsonb_array_elements_text(
          COALESCE(p_receipt->'attachments', '[]'::jsonb)
        ) AS attachment(value)
      ),
      ARRAY[]::text[]
    ),
    'draft',
    true,
    COALESCE(NULLIF(p_receipt->>'ipi_percent', '')::numeric, 0),
    COALESCE(NULLIF(p_receipt->>'freight_percent', '')::numeric, 0),
    NULLIF(p_receipt->>'non_fiscal_discount_mode', ''),
    COALESCE(NULLIF(p_receipt->>'non_fiscal_discount_value', '')::numeric, 0),
    NULLIF(p_receipt->>'non_fiscal_freight_mode', ''),
    COALESCE(NULLIF(p_receipt->>'non_fiscal_freight_value', '')::numeric, 0),
    NULLIF(p_receipt->>'non_fiscal_other_expenses_mode', ''),
    COALESCE(NULLIF(p_receipt->>'non_fiscal_other_expenses_value', '')::numeric, 0),
    COALESCE(NULLIF(p_receipt->>'fiscal_ipi', '')::numeric, 0),
    COALESCE(NULLIF(p_receipt->>'fiscal_freight', '')::numeric, 0),
    COALESCE(NULLIF(p_receipt->>'fiscal_discount', '')::numeric, 0),
    COALESCE(NULLIF(p_receipt->>'fiscal_other_expenses', '')::numeric, 0),
    NULLIF(p_receipt->>'updated_at', '')::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    receipt_index = EXCLUDED.receipt_index,
    purchase_id = EXCLUDED.purchase_id,
    supplier_id = EXCLUDED.supplier_id,
    supplier_name = EXCLUDED.supplier_name,
    received_at = EXCLUDED.received_at,
    invoice_number = EXCLUDED.invoice_number,
    invoice_date = EXCLUDED.invoice_date,
    items = EXCLUDED.items,
    total_value = EXCLUDED.total_value,
    observation = EXCLUDED.observation,
    fiscal_key = EXCLUDED.fiscal_key,
    attachments = EXCLUDED.attachments,
    status = EXCLUDED.status,
    is_draft = EXCLUDED.is_draft,
    ipi_percent = EXCLUDED.ipi_percent,
    freight_percent = EXCLUDED.freight_percent,
    non_fiscal_discount_mode = EXCLUDED.non_fiscal_discount_mode,
    non_fiscal_discount_value = EXCLUDED.non_fiscal_discount_value,
    non_fiscal_freight_mode = EXCLUDED.non_fiscal_freight_mode,
    non_fiscal_freight_value = EXCLUDED.non_fiscal_freight_value,
    non_fiscal_other_expenses_mode = EXCLUDED.non_fiscal_other_expenses_mode,
    non_fiscal_other_expenses_value = EXCLUDED.non_fiscal_other_expenses_value,
    fiscal_ipi = EXCLUDED.fiscal_ipi,
    fiscal_freight = EXCLUDED.fiscal_freight,
    fiscal_discount = EXCLUDED.fiscal_discount,
    fiscal_other_expenses = EXCLUDED.fiscal_other_expenses,
    updated_at = EXCLUDED.updated_at
  RETURNING receipt_index INTO v_receipt_index;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não foi possível salvar o rascunho do recebimento';
  END IF;

  DELETE FROM public.goods_receipt_items
  WHERE receipt_id = v_receipt_id;

  INSERT INTO public.goods_receipt_items (
    receipt_id, item_index, product_id, variation_id, description, quantity,
    base_cost, unit_cost, freight_fiscal_unit, freight_non_fiscal_unit,
    discount_unit, other_expenses_fiscal_unit, other_expenses_non_fiscal_unit,
    additional_cost_unit, item_snapshot
  )
  SELECT
    v_receipt_id,
    item.ordinality::integer,
    NULLIF(item.value->>'product_id', '')::uuid,
    NULLIF(item.value->>'variation_id', '')::uuid,
    COALESCE(NULLIF(item.value->>'description', ''), 'Item de Recebimento'),
    (item.value->>'quantity')::numeric,
    (item.value->>'base_cost')::numeric,
    (item.value->>'unit_cost')::numeric,
    NULLIF(item.value->>'freight_fiscal_unit', '')::numeric,
    NULLIF(item.value->>'freight_non_fiscal_unit', '')::numeric,
    NULLIF(item.value->>'discount_unit', '')::numeric,
    NULLIF(item.value->>'other_expenses_fiscal_unit', '')::numeric,
    NULLIF(item.value->>'other_expenses_non_fiscal_unit', '')::numeric,
    NULLIF(item.value->>'additional_cost_unit', '')::numeric,
    item.value->'item_snapshot'
  FROM pg_catalog.jsonb_array_elements(p_items) WITH ORDINALITY AS item(value, ordinality);

  RETURN pg_catalog.jsonb_build_object(
    'id', v_receipt_id,
    'receipt_index', v_receipt_index
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.save_mobile_goods_receipt_draft_transaction(jsonb, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_mobile_goods_receipt_draft_transaction(jsonb, jsonb)
  TO authenticated;

COMMIT;
