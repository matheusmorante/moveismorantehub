-- Correct terminal outbound classifications and include legacy uncertain states in summary pending totals.

CREATE OR REPLACE FUNCTION public.persist_nfe_outbound_result(
 p_document_id uuid,p_attempt_token uuid,p_state text,p_reason text,p_response_xml text,p_protocol text,p_items jsonb
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_attempt public.nfe_outbound_attempts%ROWTYPE; v_doc public.nfe_documents%ROWTYPE;
 v_item jsonb; v_protocols xml[]; v_protocol xml; v_total numeric; v_xml xml; v_status text; v_cstat text;
BEGIN
 IF p_state IS NULL OR p_state NOT IN ('reconciling','authorized','rejected','confirmed_not_found') OR
    p_response_xml IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'INVALID_FISCAL_RESULT' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_attempt FROM public.nfe_outbound_attempts WHERE document_id=p_document_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FISCAL_ATTEMPT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 SELECT * INTO v_doc FROM public.nfe_documents WHERE id=p_document_id FOR UPDATE;
 IF v_attempt.state='authorized' THEN
  IF p_state='authorized' AND v_doc.numero_protocolo IS NOT DISTINCT FROM p_protocol THEN RETURN; END IF;
  RAISE EXCEPTION 'AUTHORIZED_FISCAL_IMMUTABLE' USING ERRCODE='23514';
 END IF;
 IF p_attempt_token IS NULL OR v_attempt.attempt_token IS DISTINCT FROM p_attempt_token OR
    v_attempt.attempt_expires_at IS NULL OR v_attempt.attempt_expires_at<=clock_timestamp() OR v_attempt.state IN ('prepared','rejected') THEN
  RAISE EXCEPTION 'FISCAL_ATTEMPT_LEASE_LOST' USING ERRCODE='23514';
 END IF;
 IF v_doc.ambiente IS DISTINCT FROM v_attempt.environment OR v_doc.modelo IS DISTINCT FROM v_attempt.model OR
    v_doc.chave_acesso IS DISTINCT FROM v_attempt.access_key OR v_doc.issuer_cnpj IS DISTINCT FROM v_attempt.issuer_cnpj OR
    encode(extensions.digest(convert_to(v_doc.xml_nfe,'UTF8'),'sha256'),'hex') IS DISTINCT FROM v_attempt.xml_sha256 THEN
  RAISE EXCEPTION 'FISCAL_DOCUMENT_IDENTITY_MISMATCH' USING ERRCODE='23514';
 END IF;
 v_status := CASE p_state
  WHEN 'authorized' THEN CASE v_attempt.environment WHEN 1 THEN 'autorizada' ELSE 'homologada' END
  WHEN 'reconciling' THEN 'pendente'
  WHEN 'rejected' THEN 'rejeitada'
  ELSE 'erro'
 END;
 IF p_state='rejected' AND pg_catalog.xml_is_well_formed_document(p_response_xml) THEN
  v_cstat := (pg_catalog.xpath(
   'string((//*[local-name()="cStat"])[last()])',
   xmlparse(document p_response_xml)
  ))[1]::text;
  IF v_cstat IN ('110','301','302','303') THEN
   v_status := 'denegada';
  END IF;
 END IF;
 IF p_state='authorized' THEN
  v_xml := xmlparse(document p_response_xml);
  v_protocols := xpath('//*[local-name()="infProt"]',v_xml);
  IF cardinality(v_protocols)<>1 OR coalesce(p_protocol,'')='' OR jsonb_array_length(p_items)=0 THEN
   RAISE EXCEPTION 'AUTHORIZED_FISCAL_INCOMPLETE' USING ERRCODE='23514';
  END IF;
  IF jsonb_array_length(p_items)<>cardinality(xpath('//*[local-name()="infNFe"]/*[local-name()="det"]',xmlparse(document v_doc.xml_nfe))) THEN
   RAISE EXCEPTION 'AUTHORIZED_FISCAL_ITEMS_INCOMPLETE' USING ERRCODE='23514';
  END IF;
  v_protocol := v_protocols[1];
  IF (xpath('/*/*[local-name()="chNFe"]/text()',v_protocol))[1]::text IS DISTINCT FROM v_attempt.access_key OR
     (xpath('/*/*[local-name()="tpAmb"]/text()',v_protocol))[1]::text IS DISTINCT FROM v_attempt.environment::text OR
     (xpath('/*/*[local-name()="cStat"]/text()',v_protocol))[1]::text IS DISTINCT FROM '100' OR
     (xpath('/*/*[local-name()="nProt"]/text()',v_protocol))[1]::text IS DISTINCT FROM p_protocol THEN
   RAISE EXCEPTION 'FISCAL_PROTOCOL_MISMATCH' USING ERRCODE='23514';
  END IF;
  v_total := substring(v_doc.xml_nfe FROM '<vNF>([0-9]+[.][0-9]{2})</vNF>')::numeric;
  IF v_total IS NULL THEN RAISE EXCEPTION 'AUTHORIZED_FISCAL_TOTAL_MISSING' USING ERRCODE='23514'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
   INSERT INTO public.nfe_document_items(document_id,item_number,product_code,description,billed_quantity,
    unit_value,gross_value,discount_value,product_xml,taxes_xml)
   VALUES(p_document_id,(v_item->>'item_number')::integer,v_item->>'product_code',v_item->>'description',
    (v_item->>'billed_quantity')::numeric,(v_item->>'unit_value')::numeric,(v_item->>'gross_value')::numeric,
    (v_item->>'discount_value')::numeric,v_item->>'product_xml',v_item->>'taxes_xml');
  END LOOP;
 END IF;
 IF p_state='confirmed_not_found' AND (
  (xpath('//*[local-name()="retConsSitNFe"]/*[local-name()="cStat"]/text()',xmlparse(document p_response_xml)))[1]::text IS DISTINCT FROM '217' OR
  (xpath('//*[local-name()="retConsSitNFe"]/*[local-name()="tpAmb"]/text()',xmlparse(document p_response_xml)))[1]::text IS DISTINCT FROM v_attempt.environment::text OR
  (xpath('//*[local-name()="retConsSitNFe"]/*[local-name()="chNFe"]/text()',xmlparse(document p_response_xml)))[1]::text IS DISTINCT FROM v_attempt.access_key) THEN
  RAISE EXCEPTION 'FISCAL_NOT_FOUND_UNVERIFIED' USING ERRCODE='23514';
 END IF;
 UPDATE public.nfe_documents SET status=v_status,motivo_status=p_reason,xml_protocolo=p_response_xml,
  numero_protocolo=CASE WHEN p_state='authorized' THEN p_protocol ELSE NULL END,
  valor_total=CASE WHEN p_state='authorized' THEN v_total ELSE valor_total END,updated_at=clock_timestamp()
 WHERE id=p_document_id;
 UPDATE public.nfe_outbound_attempts SET state=p_state,updated_at=clock_timestamp(),response_history=response_history||
  jsonb_build_array(jsonb_build_object('recordedAt',clock_timestamp(),'state',p_state,'responseXml',p_response_xml,
   'reason',p_reason,'protocol',p_protocol,'attemptToken',p_attempt_token)) WHERE id=v_attempt.id;
END; $fn$;

-- Correct only terminal rejected attempts persisted as generic errors; keep XML, protocol, and timestamps intact.
UPDATE public.nfe_documents AS d
SET status = CASE
  WHEN pg_catalog.xml_is_well_formed_document(d.xml_protocolo) THEN
    CASE
      WHEN (pg_catalog.xpath(
        'string((//*[local-name()="cStat"])[last()])',
        xmlparse(document d.xml_protocolo)
      ))[1]::text IN ('110','301','302','303') THEN 'denegada'
      ELSE 'rejeitada'
    END
  ELSE 'rejeitada'
END
FROM public.nfe_outbound_attempts AS a
WHERE a.document_id = d.id
  AND a.state = 'rejected'
  AND d.status = 'erro';

REVOKE ALL ON FUNCTION public.persist_nfe_outbound_result(
  uuid, uuid, text, text, text, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_nfe_outbound_result(
  uuid, uuid, text, text, text, text, jsonb
) TO service_role;
CREATE OR REPLACE FUNCTION public.get_fiscal_documents_summary(
  p_search text DEFAULT '',
  p_status text DEFAULT 'all',
  p_model text DEFAULT 'all',
  p_environment integer DEFAULT NULL,
  p_document_type text DEFAULT 'all',
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_target_document_id uuid DEFAULT NULL,
  p_accountant_view boolean DEFAULT false
)
RETURNS TABLE (
  total_count bigint,
  total_value numeric,
  authorized_count bigint,
  authorized_value numeric,
  canceled_count bigint,
  canceled_value numeric,
  estorno_count bigint,
  estorno_value numeric,
  pending_count bigint,
  pending_value numeric,
  rejected_count bigint,
  rejected_value numeric,
  abandoned_count bigint,
  abandoned_value numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '8s'
AS $function$
  WITH sanitized_input AS (
    SELECT
      nullif(btrim(coalesce(p_search, '')), '') IS NOT NULL AS search_requested,
      nullif(
        btrim(
          replace(
            regexp_replace(coalesce(p_search, ''), '[,%*()"]', ' ', 'g'),
            chr(92),
            ' '
          )
        ),
        ''
      ) AS search_text
  ),
  input AS (
    SELECT
      search_requested,
      search_text,
      regexp_replace(coalesce(search_text, ''), '^#', '') AS search_number,
      coalesce(
        nullif(ltrim(regexp_replace(coalesce(search_text, ''), '^#', ''), '0'), ''),
        '0'
      ) AS normalized_search_number
    FROM sanitized_input
  ),
  filtered_documents AS (
    SELECT d.status, d.document_type, d.valor_total
    FROM public.nfe_documents AS d
    CROSS JOIN input AS i
    WHERE (p_target_document_id IS NULL OR d.id = p_target_document_id)
      AND (
        p_target_document_id IS NOT NULL
        OR p_document_type = 'all' AND (
          d.document_type IN ('outbound', 'estorno') OR d.document_type IS NULL
        )
        OR p_document_type = 'outbound' AND (
          d.document_type = 'outbound' OR d.document_type IS NULL
        )
        OR p_document_type = 'estorno' AND d.document_type = 'estorno'
      )
      AND (
        p_status = 'all'
        OR p_accountant_view AND p_status = 'autorizada' AND (
          p_environment = 1 AND d.status = 'autorizada'
          OR p_environment = 2 AND d.status = 'homologada'
          OR p_environment IS NULL AND d.status IN ('autorizada', 'homologada')
        )
        OR d.status = p_status
      )
      AND (p_model = 'all' OR d.modelo = p_model)
      AND (p_environment IS NULL OR d.ambiente = p_environment)
      AND (
        p_target_document_id IS NOT NULL
        OR p_date_from IS NULL
        OR d.created_at >= (p_date_from::text || 'T00:00:00-03:00')::timestamptz
      )
      AND (
        p_target_document_id IS NOT NULL
        OR p_date_to IS NULL
        OR d.created_at < ((p_date_to + 1)::text || 'T00:00:00-03:00')::timestamptz
      )
      AND (
        NOT i.search_requested
        OR i.search_text IS NOT NULL AND (
          i.search_number ~ '^[0-9]{1,9}$'
          AND d.numero_nfe = CASE
            WHEN i.search_number ~ '^[0-9]{1,9}$' THEN i.search_number::integer
          END
          OR d.chave_acesso ILIKE '%' || i.search_text || '%'
          OR d.destinatario_nome ILIKE '%' || i.search_text || '%'
          OR d.destinatario_documento ILIKE '%' || i.search_text || '%'
          OR (
            i.search_number ~ '^[0-9]{1,12}$'
            AND EXISTS (
              SELECT 1
              FROM public.orders AS o
              WHERE o.id = d.order_id
                AND o.order_number::text = i.normalized_search_number
            )
          )
        )
      )
  )
  SELECT
    count(*)::bigint,
    coalesce(sum(valor_total), 0),
    count(*) FILTER (WHERE status IN ('autorizada', 'homologada'))::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status IN ('autorizada', 'homologada')), 0),
    count(*) FILTER (WHERE status = 'cancelada')::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status = 'cancelada'), 0),
    count(*) FILTER (WHERE document_type = 'estorno')::bigint,
    coalesce(sum(valor_total) FILTER (WHERE document_type = 'estorno'), 0),
    count(*) FILTER (WHERE status IN ('pendente', 'processando', 'transmitting', 'unknown', 'erro'))::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status IN ('pendente', 'processando', 'transmitting', 'unknown', 'erro')), 0),
    count(*) FILTER (WHERE status IN ('rejeitada', 'denegada'))::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status IN ('rejeitada', 'denegada')), 0),
    count(*) FILTER (WHERE status = 'abandoned')::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status = 'abandoned'), 0)
  FROM filtered_documents;
$function$;

REVOKE ALL ON FUNCTION public.get_fiscal_documents_summary(
  text, text, text, integer, text, date, date, uuid, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fiscal_documents_summary(
  text, text, text, integer, text, date, date, uuid, boolean
) TO authenticated;

COMMENT ON FUNCTION public.get_fiscal_documents_summary(
  text, text, text, integer, text, date, date, uuid, boolean
) IS 'Retorna totalizadores fiscais somente de leitura aplicando os filtros da listagem e o RLS do operador.';
