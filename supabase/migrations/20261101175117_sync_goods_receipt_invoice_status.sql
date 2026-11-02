-- Mantém a marcação da NF alinhada com o recebimento efetivamente recebido.
CREATE OR REPLACE FUNCTION public.set_goods_receipt_inventory_status_transaction(
  p_receipt_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := pg_catalog.now();
  v_fiscal_key text;
BEGIN
  IF p_status NOT IN ('received', 'estornado') THEN
    RAISE EXCEPTION 'Status de recebimento inválido';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_receipt_id::text));
  SELECT pg_catalog.upper(pg_catalog.regexp_replace(COALESCE(fiscal_key, ''), '[./[:space:]-]', '', 'g'))
    INTO v_fiscal_key
  FROM public.goods_receipts
  WHERE id = p_receipt_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recebimento não encontrado'; END IF;

  UPDATE public.inventory_moves
  SET status = CASE WHEN p_status = 'estornado' THEN 'reversed' ELSE 'effective' END,
      reversal_reason = CASE WHEN p_status = 'estornado' THEN p_reason ELSE NULL END,
      reversed_at = CASE WHEN p_status = 'estornado' THEN v_now ELSE NULL END
  WHERE source_receipt_id = p_receipt_id;

  UPDATE public.goods_receipts
  SET status = p_status, is_draft = false, updated_at = v_now
  WHERE id = p_receipt_id;

  IF v_fiscal_key <> '' THEN
    UPDATE public.inbound_invoices AS i
    SET status_recebimento = CASE
          WHEN p_status = 'received' THEN 'recebida'
          WHEN EXISTS (
            SELECT 1
            FROM public.goods_receipts AS r
            WHERE pg_catalog.upper(pg_catalog.regexp_replace(COALESCE(r.fiscal_key, ''), '[./[:space:]-]', '', 'g')) = v_fiscal_key
              AND r.status = 'received'
              AND r.is_draft IS NOT TRUE
          ) THEN 'recebida'
          ELSE 'pendente'
        END,
        receipt_id = CASE
          WHEN p_status = 'received' THEN p_receipt_id
          ELSE (
            SELECT r.id
            FROM public.goods_receipts AS r
            WHERE pg_catalog.upper(pg_catalog.regexp_replace(COALESCE(r.fiscal_key, ''), '[./[:space:]-]', '', 'g')) = v_fiscal_key
              AND r.status = 'received'
              AND r.is_draft IS NOT TRUE
            ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC
            LIMIT 1
          )
        END,
        updated_at = v_now
    WHERE pg_catalog.upper(pg_catalog.regexp_replace(COALESCE(i.chave_acesso, ''), '[./[:space:]-]', '', 'g')) = v_fiscal_key;
  END IF;

  RETURN pg_catalog.jsonb_build_object('receiptId', p_receipt_id, 'status', p_status);
END;
$function$;

ALTER FUNCTION public.set_goods_receipt_inventory_status_transaction(uuid, text, text)
  SET search_path = '';
REVOKE ALL ON FUNCTION public.set_goods_receipt_inventory_status_transaction(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_goods_receipt_inventory_status_transaction(uuid, text, text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_goods_receipt_inventory_status_checked_transaction(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_goods_receipt_inventory_status_checked_transaction(uuid, text, text)
  TO authenticated, service_role;
