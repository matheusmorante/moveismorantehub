-- Expansion only: old readers/writers remain available until the fiscal API is updated.
-- The API validates/signs/XSD-checks the XML before this short database transaction.
-- No SEFAZ I/O, historical rewrite or sequence reset belongs in this function.
CREATE FUNCTION public.prepare_nfe_operation_attempt(
  p_draft_id uuid,
  p_expected_updated_at timestamptz,
  p_expected_review_data jsonb,
  p_expected_lines jsonb,
  p_signed_xml text,
  p_access_key text,
  p_minimum_number integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_draft public.nfe_operation_drafts%ROWTYPE;
  v_source public.nfe_documents%ROWTYPE;
  v_lines jsonb;
  v_xml xml;
  v_ns text[] := ARRAY[ARRAY['n', 'http://www.portalfiscal.inf.br/nfe']];
  v_issuer text;
  v_series text;
  v_number integer;
BEGIN
  IF p_draft_id IS NULL OR p_expected_updated_at IS NULL
     OR pg_catalog.jsonb_typeof(p_expected_review_data) IS DISTINCT FROM 'object'
     OR pg_catalog.jsonb_typeof(p_expected_lines) IS DISTINCT FROM 'array'
     OR pg_catalog.jsonb_array_length(p_expected_lines) = 0
     OR p_access_key IS NULL OR p_access_key !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
     OR p_signed_xml IS NULL OR p_signed_xml ~* '<!DOCTYPE'
     OR NOT pg_catalog.xml_is_well_formed_document(p_signed_xml)
     OR p_minimum_number IS NULL OR p_minimum_number NOT BETWEEN 1 AND 999999999 THEN
    RAISE EXCEPTION 'INVALID_FISCAL_OPERATION_ATTEMPT' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_draft FROM public.nfe_operation_drafts
    WHERE id = p_draft_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FISCAL_DRAFT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_draft.status IN ('transmitting', 'unknown', 'authorized') THEN
    RETURN pg_catalog.jsonb_build_object('created', false, 'draftId', v_draft.id,
      'status', v_draft.status, 'documentId', v_draft.document_id, 'accessKey', v_draft.access_key);
  END IF;
  IF v_draft.status IS DISTINCT FROM 'ready'
     OR v_draft.access_key IS NOT NULL OR v_draft.signed_xml IS NOT NULL
     OR v_draft.document_id IS NOT NULL
     OR v_draft.updated_at IS DISTINCT FROM p_expected_updated_at
     OR v_draft.review_data IS DISTINCT FROM p_expected_review_data
     OR v_draft.reviewed_at IS NULL THEN
    RAISE EXCEPTION 'FISCAL_DRAFT_CHANGED' USING ERRCODE = '23514';
  END IF;

  PERFORM 1 FROM public.nfe_operation_draft_lines
    WHERE draft_id = v_draft.id ORDER BY fiscal_item_number, id FOR SHARE;
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', l.id, 'original_document_item_id', l.original_document_item_id,
    'fiscal_item_number', l.fiscal_item_number, 'quantity', l.quantity,
    'gross_value', l.gross_value, 'discount_value', l.discount_value,
    'reviewed_cfop', l.reviewed_cfop, 'reviewed_product_xml', l.reviewed_product_xml,
    'reviewed_taxes_xml', l.reviewed_taxes_xml) ORDER BY l.fiscal_item_number, l.id)
    INTO v_lines FROM public.nfe_operation_draft_lines l WHERE l.draft_id = v_draft.id;
  IF v_lines IS DISTINCT FROM p_expected_lines THEN
    RAISE EXCEPTION 'FISCAL_DRAFT_LINES_CHANGED' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_source FROM public.nfe_documents
    WHERE id = v_draft.original_document_id FOR SHARE;
  IF NOT FOUND OR v_source.status IS NULL OR v_source.status NOT IN ('autorizada', 'homologada')
     OR v_source.ambiente IS DISTINCT FROM v_draft.environment
     OR v_source.chave_acesso IS DISTINCT FROM v_draft.original_access_key
     OR v_source.numero_protocolo IS NULL THEN
    RAISE EXCEPTION 'FISCAL_OPERATION_SOURCE_CHANGED' USING ERRCODE = '23514';
  END IF;

  v_issuer := pg_catalog.substring(v_source.chave_acesso, 7, 14);
  v_series := pg_catalog.substring(p_access_key, 23, 3)::integer::text;
  v_number := pg_catalog.substring(p_access_key, 26, 9)::integer;
  v_xml := p_signed_xml::xml;
  IF pg_catalog.substring(p_access_key, 7, 14) IS DISTINCT FROM v_issuer
     OR pg_catalog.substring(p_access_key, 21, 2) IS DISTINCT FROM '55'
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/@Id)', v_xml, v_ns))[1]::text IS DISTINCT FROM 'NFe' || p_access_key
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:mod)', v_xml, v_ns))[1]::text IS DISTINCT FROM '55'
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:tpAmb)', v_xml, v_ns))[1]::text IS DISTINCT FROM v_draft.environment::text
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:finNFe)', v_xml, v_ns))[1]::text IS DISTINCT FROM v_draft.finalidade::text
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:serie)', v_xml, v_ns))[1]::text IS DISTINCT FROM v_series
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:ide/n:nNF)', v_xml, v_ns))[1]::text IS DISTINCT FROM v_number::text
     OR (pg_catalog.xpath('string(/n:NFe/n:infNFe/n:emit/n:CNPJ)', v_xml, v_ns))[1]::text IS DISTINCT FROM v_issuer THEN
    RAISE EXCEPTION 'FISCAL_OPERATION_XML_IDENTITY_MISMATCH' USING ERRCODE = '23514';
  END IF;

  -- The shared allocator locks the establishment and legacy counters and compares
  -- the expected number. Any later error rolls both reservation and draft back.
  PERFORM public.reserve_nfe_outbound_number(v_issuer, '55', v_draft.environment,
    v_series, p_minimum_number, v_number);
  UPDATE public.nfe_operation_drafts SET status = 'transmitting',
    access_key = p_access_key, signed_xml = p_signed_xml,
    transmitted_at = pg_catalog.clock_timestamp(), updated_at = pg_catalog.clock_timestamp()
    WHERE id = v_draft.id RETURNING updated_at INTO v_draft.updated_at;
  RETURN pg_catalog.jsonb_build_object('created', true, 'draftId', v_draft.id,
    'status', 'transmitting', 'accessKey', p_access_key, 'number', v_number,
    'updatedAt', v_draft.updated_at);
END;
$function$;

REVOKE ALL ON FUNCTION public.prepare_nfe_operation_attempt(uuid,timestamptz,jsonb,jsonb,text,text,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_operation_attempt(uuid,timestamptz,jsonb,jsonb,text,text,integer)
  TO service_role;
