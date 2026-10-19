-- Validate authorization evidence before both first persistence and idempotent replay.
-- No data rewrite, table/column creation, number reservation, or network I/O.
-- Preserve the installed function signature, security context, and ACLs.
DO $baseline$
BEGIN
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef(
    'public.persist_authorized_nfe_operation_draft(uuid,uuid,integer,text,character varying,text,text,text,timestamptz,text,text,jsonb)'::regprocedure
  )) IS DISTINCT FROM '1341db9c8c9ad36dac0ee02e56eb90c0' THEN
    RAISE EXCEPTION 'FISCAL_AUTHORIZATION_RPC_BASELINE_CHANGED';
  END IF;
END;
$baseline$;

CREATE OR REPLACE FUNCTION public.persist_authorized_nfe_operation_draft(p_draft_id uuid, p_document_id uuid, p_number integer, p_series text, p_access_key character varying, p_signed_xml text, p_sefaz_response_xml text, p_protocol_number text, p_protocol_date timestamp with time zone, p_status text, p_status_reason text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  v_invoice_total numeric;
  v_signed xml;
  v_response xml;
  v_result_path text;
  v_protocol_path text;
  v_tag text;
  v_ns text[] := ARRAY[ARRAY['n', 'http://www.portalfiscal.inf.br/nfe']];
BEGIN
  IF p_draft_id IS NULL OR p_document_id IS NULL OR p_number IS NULL
     OR p_status IS NULL OR p_access_key IS NULL OR p_protocol_number IS NULL
     OR p_protocol_date IS NULL OR p_items IS NULL THEN
    RAISE EXCEPTION 'INVALID_FISCAL_OPERATION_AUTHORIZATION' USING ERRCODE='22023';
  END IF;
  IF p_status NOT IN ('autorizada', 'homologada')
     OR p_number <= 0 OR NULLIF(btrim(p_series), '') IS NULL
     OR p_access_key !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
     OR substring(p_access_key FROM 21 FOR 2) <> '55'
     OR substring(p_access_key FROM 23 FOR 3) <> lpad(p_series, 3, '0')
     OR substring(p_access_key FROM 26 FOR 9) <> lpad(p_number::text, 9, '0')
     OR p_protocol_number !~ '^[0-9]{15}$'
     OR NULLIF(p_signed_xml, '') IS NULL
     OR NULLIF(p_sefaz_response_xml, '') IS NULL
     OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Retorno de autorização fiscal incompleto';
  END IF;

  IF p_signed_xml ~* '<!DOCTYPE|<!ENTITY' OR p_sefaz_response_xml ~* '<!DOCTYPE|<!ENTITY'
     OR NOT pg_catalog.xml_is_well_formed_document(p_signed_xml)
     OR NOT pg_catalog.xml_is_well_formed_document(p_sefaz_response_xml) THEN
    RAISE EXCEPTION 'INVALID_FISCAL_OPERATION_XML' USING ERRCODE='22023';
  END IF;
  v_signed := p_signed_xml::xml;
  v_response := p_sefaz_response_xml::xml;

  SELECT * INTO v_draft FROM public.nfe_operation_drafts
   WHERE id = p_draft_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rascunho fiscal não encontrado'; END IF;

  IF p_status IS DISTINCT FROM (CASE v_draft.environment WHEN 1 THEN 'autorizada' WHEN 2 THEN 'homologada' END)
     OR v_draft.access_key IS DISTINCT FROM p_access_key
     OR v_draft.signed_xml IS DISTINCT FROM p_signed_xml
     OR pg_catalog.cardinality(pg_catalog.xpath('/n:NFe/n:infNFe',v_signed,v_ns)) <> 1
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/@Id)',v_signed,v_ns))[1]::text IS DISTINCT FROM 'NFe'||p_access_key
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:tpAmb)',v_signed,v_ns))[1]::text IS DISTINCT FROM v_draft.environment::text
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:mod)',v_signed,v_ns))[1]::text IS DISTINCT FROM '55'
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:finNFe)',v_signed,v_ns))[1]::text IS DISTINCT FROM v_draft.finalidade::text
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:nNF)',v_signed,v_ns))[1]::text IS DISTINCT FROM p_number::text
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:serie)',v_signed,v_ns))[1]::text IS DISTINCT FROM p_series::integer::text THEN
    RAISE EXCEPTION 'FISCAL_OPERATION_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
  END IF;

  v_result_path := CASE WHEN pg_catalog.cardinality(pg_catalog.xpath('//n:retConsSitNFe',v_response,v_ns))=1
    THEN '//n:retConsSitNFe' ELSE '//n:retEnviNFe' END;
  v_protocol_path := v_result_path||'/n:protNFe/n:infProt';
  IF pg_catalog.cardinality(pg_catalog.xpath('//*[local-name()="retEnviNFe" or local-name()="retConsSitNFe"]',v_response)) <> 1
     OR pg_catalog.cardinality(pg_catalog.xpath(v_result_path,v_response,v_ns)) <> 1
     OR pg_catalog.cardinality(pg_catalog.xpath('//*[local-name()="infProt"]',v_response)) <> 1
     OR pg_catalog.cardinality(pg_catalog.xpath(v_protocol_path,v_response,v_ns)) <> 1 THEN
    RAISE EXCEPTION 'FISCAL_OPERATION_AUTHORIZATION_IDENTITY_MISMATCH' USING ERRCODE='23514';
  END IF;
  FOREACH v_tag IN ARRAY ARRAY['tpAmb','cStat'] LOOP
    IF pg_catalog.cardinality(pg_catalog.xpath(v_result_path||'/*[local-name()="'||v_tag||'"]',v_response,v_ns)) <> 1 THEN
      RAISE EXCEPTION 'FISCAL_OPERATION_AUTHORIZATION_IDENTITY_MISMATCH' USING ERRCODE='23514';
    END IF;
  END LOOP;
  FOREACH v_tag IN ARRAY ARRAY['tpAmb','cStat','chNFe','nProt','dhRecbto'] LOOP
    IF pg_catalog.cardinality(pg_catalog.xpath(v_protocol_path||'/*[local-name()="'||v_tag||'"]',v_response,v_ns)) <> 1 THEN
      RAISE EXCEPTION 'FISCAL_OPERATION_AUTHORIZATION_IDENTITY_MISMATCH' USING ERRCODE='23514';
    END IF;
  END LOOP;
  IF (pg_catalog.xpath('string('||v_result_path||'/n:tpAmb)',v_response,v_ns))[1]::text IS DISTINCT FROM v_draft.environment::text
     OR (pg_catalog.xpath('string('||v_result_path||'/n:cStat)',v_response,v_ns))[1]::text IS DISTINCT FROM
       (CASE WHEN v_result_path='//n:retConsSitNFe' THEN '100' ELSE '104' END)
     OR (pg_catalog.xpath('string('||v_protocol_path||'/n:tpAmb)',v_response,v_ns))[1]::text IS DISTINCT FROM v_draft.environment::text
     OR (pg_catalog.xpath('string('||v_protocol_path||'/n:cStat)',v_response,v_ns))[1]::text IS DISTINCT FROM '100'
     OR (pg_catalog.xpath('string('||v_protocol_path||'/n:chNFe)',v_response,v_ns))[1]::text IS DISTINCT FROM p_access_key
     OR (pg_catalog.xpath('string('||v_protocol_path||'/n:nProt)',v_response,v_ns))[1]::text IS DISTINCT FROM p_protocol_number
     OR ((pg_catalog.xpath('string('||v_protocol_path||'/n:dhRecbto)',v_response,v_ns))[1]::text)::timestamptz IS DISTINCT FROM p_protocol_date
     OR (v_result_path='//n:retConsSitNFe' AND (
       pg_catalog.cardinality(pg_catalog.xpath(v_result_path||'/*[local-name()="chNFe"]',v_response,v_ns)) <> 1
       OR (pg_catalog.xpath('string('||v_result_path||'/n:chNFe)',v_response,v_ns))[1]::text IS DISTINCT FROM p_access_key)) THEN
    RAISE EXCEPTION 'FISCAL_OPERATION_AUTHORIZATION_IDENTITY_MISMATCH' USING ERRCODE='23514';
  END IF;

  -- A retry after an RPC/network timeout returns the already persisted result,
  -- but only when it describes the exact same authorized document.
  IF v_draft.document_id IS NOT NULL THEN
    IF v_draft.document_id <> p_document_id OR v_draft.protocol_number IS DISTINCT FROM p_protocol_number
       OR NOT EXISTS(SELECT 1 FROM public.nfe_documents d WHERE d.id=v_draft.document_id
         AND d.ambiente=v_draft.environment AND d.modelo='55' AND d.numero_nfe=p_number
         AND d.serie::integer=p_series::integer AND d.chave_acesso=p_access_key
         AND d.xml_nfe=p_signed_xml AND d.numero_protocolo=p_protocol_number
         AND d.original_document_id=v_draft.original_document_id
         AND d.related_return_order_id IS NOT DISTINCT FROM v_draft.return_order_id) THEN
      RAISE EXCEPTION 'FISCAL_OPERATION_PERSISTED_IDENTITY_MISMATCH' USING ERRCODE='23514';
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

  v_invoice_total := substring(p_signed_xml FROM '<vNF>([0-9]+[.][0-9]{2})</vNF>')::numeric;
  IF v_invoice_total IS NULL OR v_invoice_total < 0 THEN
    RAISE EXCEPTION 'Total vNF do XML autorizado ausente ou inválido';
  END IF;

  INSERT INTO public.nfe_documents(
    id, order_id, numero_nfe, serie, chave_acesso, modelo, ambiente, status,
    motivo_status, valor_total, xml_nfe, xml_protocolo, numero_protocolo, document_type,
    finalidade, original_document_id, related_return_order_id, fiscal_draft,
    created_at, updated_at
  ) VALUES (
    p_document_id, v_source.order_id, p_number, p_series, p_access_key, '55',
    v_draft.environment, p_status, p_status_reason, v_invoice_total, p_signed_xml,
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
$function$

