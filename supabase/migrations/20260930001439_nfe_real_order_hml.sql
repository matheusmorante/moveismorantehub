-- Extend the same lease, transport reservation and atomic result RPCs to real HML sales.
-- No order, stock, financial, reservation or receivable writes.
DO $migration$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='nfe_hml_real_rule_environment_check'
   AND conrelid='public.nfe_documents'::regclass) THEN
  ALTER TABLE public.nfe_documents ADD CONSTRAINT nfe_hml_real_rule_environment_check
   CHECK (fiscal_ruleset_version IS DISTINCT FROM 'HML_NORMAL_SALE_V1' OR
    (ambiente=2 AND modelo='55' AND finalidade=1 AND document_type='outbound' AND
     fiscal_decision_trace IS NOT NULL AND jsonb_typeof(fiscal_decision_trace)='array'));
 END IF;
END $migration$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_hml_real_one_document_per_order
 ON public.nfe_documents(order_id,modelo,ambiente)
 WHERE fiscal_ruleset_version='HML_NORMAL_SALE_V1';
CREATE OR REPLACE FUNCTION public.reserve_hml_nfe_outbound(
  p_order_id text,
  p_emission_request_id uuid,
  p_access_key varchar(44),
  p_signed_xml text,
  p_number integer,
  p_series varchar(4),
  p_decision_trace jsonb,
  p_attempt_token uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_snapshot public.nfe_fiscal_snapshots%ROWTYPE;
  v_id uuid;
  v_version text;
BEGIN
  IF p_order_id IS NULL OR p_emission_request_id IS NULL OR p_attempt_token IS NULL OR
     COALESCE(p_access_key, '') !~ '^[0-9]{44}$' OR
     p_signed_xml IS NULL OR pg_catalog.strpos(p_signed_xml,'<tpAmb>2</tpAmb>')=0 OR
     pg_catalog.strpos(p_signed_xml,'<tpAmb>1</tpAmb>')>0 OR
     pg_catalog.strpos(p_signed_xml, 'Id="NFe' || p_access_key || '"') = 0 OR
     COALESCE(p_series, '') !~ '^[0-9]{1,3}$' OR
     p_number IS NULL OR p_number NOT BETWEEN 1 AND 999999999 OR
     p_decision_trace IS NULL OR
     pg_catalog.jsonb_typeof(p_decision_trace) <> 'array' OR
     pg_catalog.jsonb_array_length(p_decision_trace) = 0 THEN
    RAISE EXCEPTION 'INVALID_HML_RESERVATION' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nfe_emit:' || p_order_id || ':55:2', 0)
  );
  SELECT * INTO v_snapshot FROM public.nfe_fiscal_snapshots
  WHERE emission_request_id = p_emission_request_id;
  IF NOT FOUND OR v_snapshot.order_id <> p_order_id OR
     v_snapshot.requested_model <> '55' OR v_snapshot.environment <> 2 OR
     v_snapshot.reserved_number <> p_number OR v_snapshot.series <> p_series OR
     pg_catalog.substr(p_access_key, 21, 2) <> '55' OR
     pg_catalog.substr(p_access_key, 23, 3) <> pg_catalog.lpad(p_series, 3, '0') OR
     pg_catalog.substr(p_access_key, 26, 9) <> pg_catalog.lpad(p_number::text, 9, '0') OR
     COALESCE(p_decision_trace->0->>'ruleSetVersion','') NOT IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1') THEN
    RAISE EXCEPTION 'HML_SNAPSHOT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  v_version := p_decision_trace->0->>'ruleSetVersion';
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_decision_trace) t
    WHERE t->>'ruleSetVersion' IS DISTINCT FROM v_version) THEN
    RAISE EXCEPTION 'HML_RULESET_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF v_version='HML_TECHNICAL_V1' AND
    (COALESCE(v_snapshot.snapshot_data#>>'{order,data,fiscalScenario}','')<>'HML_TECHNICAL_V1' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,data,testRunId}','')<>p_order_id OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,status}','')<>'draft' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,deleted}','')<>'true' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,data,deleted}','')<>'true' OR
     jsonb_array_length(COALESCE(v_snapshot.snapshot_data#>'{order,data,payments}','[]'::jsonb))<>0 OR
     p_order_id !~ '^TEST_AUT_[0-9a-f-]{36}$') THEN
    RAISE EXCEPTION 'HML_SYNTHETIC_SNAPSHOT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF v_version='HML_NORMAL_SALE_V1' AND
    (p_order_id ~ '^TEST_AUT_' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,type}','')<>'sale' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,deleted}','true')<>'false' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,status}','draft') IN ('draft','cancelled','cancelado') OR
     COALESCE(v_snapshot.snapshot_data#>>'{issuerProfile,companyCRT}','')<>'1' OR
     COALESCE(v_snapshot.snapshot_data#>>'{issuerProfile,companyUF}','')<>'PR' OR
     COALESCE(v_snapshot.snapshot_data#>'{emissionRequest,itemFiscalSelections}','{}'::jsonb)='{}'::jsonb OR
     COALESCE(v_snapshot.snapshot_data#>>'{fiscalInputs,customer,id}','')='') THEN
    RAISE EXCEPTION 'HML_REAL_SNAPSHOT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nfe_documents
             WHERE emission_request_id = p_emission_request_id) THEN
    RAISE EXCEPTION 'DUPLICATE_HML_ATTEMPT' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nfe_documents
             WHERE order_id = p_order_id AND modelo = '55' AND ambiente = 2
               AND status IN ('processando', 'pendente')) THEN
    RAISE EXCEPTION 'ALREADY_ACTIVE_HML_ATTEMPT' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.nfe_documents (
    order_id, numero_nfe, serie, chave_acesso, modelo, ambiente,
    status, document_type, finalidade, emission_request_id, motivo_status,
    xml_nfe, fiscal_ruleset_version, fiscal_decision_trace,
    hml_attempt_token, hml_attempt_expires_at,
    created_at, updated_at
  ) VALUES (
    p_order_id, p_number, p_series, p_access_key, '55', 2,
    'processando', 'outbound', 1, p_emission_request_id,
    'Transmissão HML em andamento', p_signed_xml,
    v_version, p_decision_trace,
    p_attempt_token, pg_catalog.clock_timestamp() + interval '2 minutes',
    pg_catalog.now(), pg_catalog.now()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_hml_nfe_outbound(
  text, uuid, varchar, text, integer, varchar, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_hml_nfe_outbound(
  text, uuid, varchar, text, integer, varchar, jsonb, uuid
) TO service_role;

-- A short SQL transaction owns the attempt; no transaction remains open during SOAP.
-- Two minutes exceed the two sequential 25s SOAP timeouts (consultation + transmission).
CREATE OR REPLACE FUNCTION public.claim_hml_nfe_attempt(
  p_document_id uuid, p_attempt_token uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_attempt_token IS NULL THEN
    RAISE EXCEPTION 'INVALID_HML_ATTEMPT_TOKEN' USING ERRCODE = '22023';
  END IF;
  UPDATE public.nfe_documents SET
    hml_attempt_token = p_attempt_token,
    hml_attempt_expires_at = pg_catalog.clock_timestamp() + interval '2 minutes'
  WHERE id = p_document_id AND ambiente = 2 AND modelo = '55'
    AND fiscal_ruleset_version IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1')
    AND status IN ('processando', 'pendente', 'erro')
    AND (hml_attempt_token IS NULL OR
         hml_attempt_expires_at <= pg_catalog.clock_timestamp());
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_hml_nfe_attempt(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_hml_nfe_attempt(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.release_hml_nfe_attempt(
  p_document_id uuid, p_attempt_token uuid
) RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  UPDATE public.nfe_documents SET hml_attempt_token = NULL, hml_attempt_expires_at = NULL
  WHERE id = p_document_id AND ambiente = 2 AND modelo = '55'
    AND fiscal_ruleset_version IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1')
    AND hml_attempt_token = p_attempt_token;
$function$;

REVOKE ALL ON FUNCTION public.release_hml_nfe_attempt(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_hml_nfe_attempt(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reactivate_hml_nfe_retry(
  p_document_id uuid, p_attempt_token uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_doc public.nfe_documents%ROWTYPE;
BEGIN
  SELECT * INTO v_doc FROM public.nfe_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HML_DOCUMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nfe_emit:' || v_doc.order_id || ':55:2', 0)
  );
  UPDATE public.nfe_documents SET status = 'processando',
    motivo_status = 'Retransmissão HML da chave original após consulta 217',
    updated_at = pg_catalog.now()
  WHERE id = p_document_id AND ambiente = 2 AND modelo = '55'
    AND fiscal_ruleset_version IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1')
    AND hml_attempt_token = p_attempt_token
    AND hml_attempt_expires_at > pg_catalog.clock_timestamp()
    AND status = 'erro' AND motivo_status LIKE '217:%'
    AND NOT EXISTS (
      SELECT 1 FROM public.nfe_documents AS other
      WHERE other.order_id = v_doc.order_id AND other.modelo = '55'
        AND other.ambiente = 2 AND other.id <> p_document_id
        AND other.status IN ('processando', 'pendente')
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HML_RETRY_STATE_CHANGED' USING ERRCODE = '23514';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.reactivate_hml_nfe_retry(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_hml_nfe_retry(uuid, uuid) TO service_role;

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
