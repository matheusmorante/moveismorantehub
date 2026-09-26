-- Only records an authorization already confirmed by SEFAZ. This function is
-- idempotent and commits the fiscal document, its item snapshot, allocation
-- links, and draft state as one database transaction.
CREATE OR REPLACE FUNCTION public.persist_authorized_nfe_operation_draft(
  p_draft_id uuid,
  p_document_id uuid,
  p_number integer,
  p_series text,
  p_access_key varchar(44),
  p_signed_xml text,
  p_sefaz_response_xml text,
  p_protocol_number text,
  p_protocol_date timestamptz,
  p_status text,
  p_status_reason text,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_draft public.nfe_operation_drafts%ROWTYPE;
  v_source public.nfe_documents%ROWTYPE;
  v_document_id uuid;
  v_expected_items integer;
  v_inserted_items integer;
  v_item jsonb;
  v_line public.nfe_operation_draft_lines%ROWTYPE;
  v_linked_allocations numeric;
BEGIN
  IF p_status NOT IN ('autorizada', 'homologada')
     OR p_number <= 0 OR NULLIF(btrim(p_series), '') IS NULL
     OR p_access_key !~ '^[0-9]{44}$'
     OR substring(p_access_key FROM 21 FOR 2) <> '55'
     OR substring(p_access_key FROM 23 FOR 3) <> lpad(p_series, 3, '0')
     OR substring(p_access_key FROM 26 FOR 9) <> lpad(p_number::text, 9, '0')
     OR p_protocol_number !~ '^[0-9]{15}$'
     OR NULLIF(p_signed_xml, '') IS NULL
     OR NULLIF(p_sefaz_response_xml, '') IS NULL
     OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Retorno de autorização fiscal incompleto';
  END IF;

  SELECT * INTO v_draft FROM public.nfe_operation_drafts
   WHERE id = p_draft_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rascunho fiscal não encontrado'; END IF;

  -- A retry after an RPC/network timeout returns the already persisted result,
  -- but only when it describes the exact same authorized document.
  IF v_draft.document_id IS NOT NULL THEN
    IF v_draft.document_id <> p_document_id OR v_draft.access_key <> p_access_key
       OR v_draft.signed_xml IS DISTINCT FROM p_signed_xml THEN
      RAISE EXCEPTION 'Rascunho já vinculado a outro documento fiscal';
    END IF;
    RETURN v_draft.document_id;
  END IF;
  IF v_draft.status NOT IN ('transmitting', 'unknown')
     OR (p_status = 'autorizada' AND v_draft.environment <> 1)
     OR (p_status = 'homologada' AND v_draft.environment <> 2) THEN
    RAISE EXCEPTION 'Rascunho não está em estado compatível com autorização';
  END IF;

  SELECT * INTO v_source FROM public.nfe_documents
   WHERE id = v_draft.original_document_id FOR UPDATE;
  IF NOT FOUND OR v_source.status <> p_status
     OR v_source.ambiente <> v_draft.environment
     OR v_source.document_type <> 'outbound'
     OR v_source.chave_acesso <> v_draft.original_access_key
     OR p_access_key = v_draft.original_access_key THEN
    RAISE EXCEPTION 'Documento fiscal original diverge do ambiente autorizado';
  END IF;

  SELECT count(*) INTO v_expected_items FROM public.nfe_operation_draft_lines
   WHERE draft_id = v_draft.id;
  IF v_expected_items <> jsonb_array_length(p_items) THEN
    RAISE EXCEPTION 'Itens fiscais recebidos diferem do rascunho revisado';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_line FROM public.nfe_operation_draft_lines
     WHERE id = NULLIF(v_item->>'draft_line_id', '')::uuid
       AND draft_id = v_draft.id FOR UPDATE;
    IF NOT FOUND OR v_line.reviewed_cfop IS NULL
       OR v_line.reviewed_product_xml IS DISTINCT FROM v_item->>'product_xml'
       OR v_line.reviewed_taxes_xml IS DISTINCT FROM v_item->>'taxes_xml'
       OR (v_item->>'quantity')::numeric <> v_line.quantity
       OR (v_item->>'gross_value')::numeric <> v_line.gross_value
       OR COALESCE((v_item->>'discount_value')::numeric, 0) <> v_line.discount_value
       OR (v_item->>'item_number')::integer <> v_line.fiscal_item_number
       OR NOT EXISTS (
         SELECT 1 FROM public.nfe_document_items source_line
          WHERE source_line.id = v_line.original_document_item_id
            AND source_line.product_code = v_item->>'product_code'
            AND source_line.description = v_item->>'description'
       ) THEN
      RAISE EXCEPTION 'Item transmitido não corresponde à revisão fiscal persistida';
    END IF;
    IF v_draft.operation_kind = 'return' THEN
      SELECT COALESCE(sum(allocation.quantity), 0) INTO v_linked_allocations
        FROM public.nfe_operation_draft_allocations link
        JOIN public.nfe_return_item_allocations allocation ON allocation.id = link.allocation_id
       WHERE link.draft_line_id = v_line.id
         AND (allocation.fiscal_return_document_id IS NULL OR allocation.fiscal_return_document_id = p_document_id);
      IF v_linked_allocations <> v_line.quantity THEN
        RAISE EXCEPTION 'Quantidade transmitida não corresponde às alocações da devolução';
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.nfe_documents(
    id, order_id, numero_nfe, serie, chave_acesso, modelo, ambiente, status,
    motivo_status, xml_nfe, xml_protocolo, numero_protocolo, document_type,
    finalidade, original_document_id, related_return_order_id, fiscal_draft,
    created_at, updated_at
  ) VALUES (
    p_document_id, v_source.order_id, p_number, p_series, p_access_key, '55',
    v_draft.environment, p_status, p_status_reason, p_signed_xml,
    p_sefaz_response_xml, p_protocol_number,
    CASE WHEN v_draft.operation_kind = 'estorno' THEN 'estorno' ELSE 'return' END,
    v_draft.finalidade, v_source.id, v_draft.return_order_id,
    jsonb_build_object('draft_id', v_draft.id, 'reason', v_draft.reason,
      'nature_of_operation', v_draft.nature_of_operation,
      'review_data', v_draft.review_data),
    now(), now()
  );

  INSERT INTO public.nfe_document_items(
    document_id, item_number, product_code, description, billed_quantity,
    unit_value, gross_value, discount_value, product_xml, taxes_xml
  )
  SELECT p_document_id, (item->>'item_number')::integer,
    item->>'product_code', item->>'description', (item->>'quantity')::numeric,
    (item->>'unit_value')::numeric, (item->>'gross_value')::numeric,
    COALESCE((item->>'discount_value')::numeric, 0),
    item->>'product_xml', item->>'taxes_xml'
  FROM jsonb_array_elements(p_items) AS items(item);
  GET DIAGNOSTICS v_inserted_items = ROW_COUNT;
  IF v_inserted_items <> v_expected_items THEN
    RAISE EXCEPTION 'Snapshot dos itens fiscais incompleto';
  END IF;

  IF v_draft.operation_kind = 'return' THEN
    UPDATE public.nfe_return_item_allocations allocation
       SET fiscal_return_document_id = p_document_id
      FROM public.nfe_operation_draft_allocations link
      JOIN public.nfe_operation_draft_lines line ON line.id = link.draft_line_id
     WHERE link.allocation_id = allocation.id AND line.draft_id = v_draft.id
       AND (allocation.fiscal_return_document_id IS NULL OR allocation.fiscal_return_document_id = p_document_id);
  END IF;

  UPDATE public.nfe_operation_drafts SET
    status = 'authorized', document_id = p_document_id, access_key = p_access_key,
    signed_xml = p_signed_xml, sefaz_response_xml = p_sefaz_response_xml,
    protocol_number = p_protocol_number, authorized_at = COALESCE(p_protocol_date, now()),
    updated_at = now()
   WHERE id = v_draft.id;
  RETURN p_document_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.persist_authorized_nfe_operation_draft(
  uuid,uuid,integer,text,varchar,text,text,text,timestamptz,text,text,jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_authorized_nfe_operation_draft(
  uuid,uuid,integer,text,varchar,text,text,text,timestamptz,text,text,jsonb
) TO service_role;
