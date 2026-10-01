-- Keep the HML sale summary consistent with its unchanged signed XML at authorization commit.
CREATE OR REPLACE FUNCTION public.persist_hml_nfe_result(
  p_document_id uuid,
  p_status text,
  p_reason text,
  p_response_xml text,
  p_protocol text,
  p_items jsonb,
  p_attempt_token uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_document public.nfe_documents%ROWTYPE;
  v_item jsonb;
  v_invoice_total numeric;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('homologada', 'pendente', 'erro') OR
     p_document_id IS NULL OR p_response_xml IS NULL OR p_items IS NULL OR
     pg_catalog.jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_HML_RESULT' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_document FROM public.nfe_documents
  WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND OR v_document.ambiente <> 2 OR v_document.modelo <> '55' OR
     COALESCE(v_document.fiscal_ruleset_version,'') NOT IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1') OR
     v_document.fiscal_snapshot_id IS NULL OR
     v_document.status NOT IN ('processando', 'pendente', 'homologada', 'erro') THEN
    RAISE EXCEPTION 'HML_DOCUMENT_STATE_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF p_attempt_token IS NULL OR v_document.hml_attempt_token IS DISTINCT FROM p_attempt_token OR
     v_document.hml_attempt_expires_at IS NULL OR
     v_document.hml_attempt_expires_at <= pg_catalog.clock_timestamp() THEN
    RAISE EXCEPTION 'HML_ATTEMPT_LEASE_LOST' USING ERRCODE = '23514';
  END IF;
  IF v_document.status = 'homologada' THEN
    IF p_status = 'homologada' AND v_document.numero_protocolo = p_protocol THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'AUTHORIZED_HML_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  IF p_status = 'homologada' AND
     (COALESCE(p_protocol, '') = '' OR pg_catalog.jsonb_array_length(p_items) = 0) THEN
    RAISE EXCEPTION 'AUTHORIZED_HML_INCOMPLETE' USING ERRCODE = '23514';
  END IF;

  IF p_status = 'homologada' THEN
    v_invoice_total := substring(v_document.xml_nfe FROM '<vNF>([0-9]+[.][0-9]{2})</vNF>')::numeric;
    IF v_invoice_total IS NULL OR v_invoice_total < 0 THEN
      RAISE EXCEPTION 'AUTHORIZED_HML_TOTAL_MISSING' USING ERRCODE = '23514';
    END IF;
    FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_items) LOOP
      INSERT INTO public.nfe_document_items (
        document_id, item_number, product_code, description,
        billed_quantity, unit_value, gross_value, discount_value,
        product_xml, taxes_xml
      ) VALUES (
        p_document_id, (v_item ->> 'item_number')::integer,
        v_item ->> 'product_code', v_item ->> 'description',
        (v_item ->> 'billed_quantity')::numeric,
        (v_item ->> 'unit_value')::numeric,
        (v_item ->> 'gross_value')::numeric,
        (v_item ->> 'discount_value')::numeric,
        v_item ->> 'product_xml', v_item ->> 'taxes_xml'
      );
    END LOOP;
  END IF;

  UPDATE public.nfe_documents SET
    status = p_status,
    valor_total = CASE WHEN p_status = 'homologada' THEN v_invoice_total ELSE valor_total END,
    motivo_status = p_reason,
    xml_protocolo = p_response_xml,
    numero_protocolo = p_protocol,
    hml_response_history = hml_response_history || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'recordedAt', pg_catalog.clock_timestamp(), 'attemptToken', p_attempt_token,
        'status', p_status, 'reason', p_reason, 'responseXml', p_response_xml,
        'protocol', p_protocol
      )
    ),
    updated_at = pg_catalog.now()
  WHERE id = p_document_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.persist_hml_nfe_result(
  uuid, text, text, text, text, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_hml_nfe_result(
  uuid, text, text, text, text, jsonb, uuid
) TO service_role;

-- Repair only the two original sale documents from this testRunId, including
-- the already cancelled document. Fiscal facts and commercial state stay intact.
UPDATE public.nfe_documents d
   SET valor_total=substring(d.xml_nfe FROM '<vNF>([0-9]+[.][0-9]{2})</vNF>')::numeric
  FROM public.orders o
 WHERE d.id IN ('f7212459-871b-404d-9ab7-110a4db9c79f'::uuid,'7e4f43f2-8abb-4e4e-9aae-482a9e8ba6de'::uuid)
   AND d.order_id=o.id AND d.ambiente=2 AND d.document_type='outbound'
   AND d.status IN ('homologada','cancelada') AND d.valor_total=0
   AND o.order_data->>'testRunId'='11ae099c-9497-4b0c-b308-1116c88c6d06'
   AND o.order_data->>'is_test'='true' AND o.order_data->>'test_environment'='homologation'
   AND substring(d.xml_nfe FROM '<vNF>([0-9]+[.][0-9]{2})</vNF>') IS NOT NULL;
