-- Atualiza o vínculo legado apenas se o recebimento ainda estiver efetivado
-- e corresponder à chave da nota, mesmo que um estorno antigo tenha deixado vínculo.
CREATE FUNCTION public.link_received_goods_receipt_to_invoice(p_invoice_id uuid, p_receipt_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT pg_catalog.upper(pg_catalog.regexp_replace(r.fiscal_key, '[./[:space:]-]', '', 'g'))
    INTO v_key
  FROM public.goods_receipts AS r
  WHERE r.id = p_receipt_id AND r.status = 'received' AND r.is_draft IS NOT TRUE
  FOR UPDATE;

  IF NULLIF(v_key, '') IS NULL THEN RETURN false; END IF;
  UPDATE public.inbound_invoices AS i
  SET status_recebimento = 'recebida', receipt_id = p_receipt_id, updated_at = pg_catalog.now()
  WHERE i.id = p_invoice_id
    AND pg_catalog.upper(pg_catalog.regexp_replace(i.chave_acesso, '[./[:space:]-]', '', 'g')) = v_key;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.link_received_goods_receipt_to_invoice(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_received_goods_receipt_to_invoice(uuid, uuid) TO authenticated, service_role;
