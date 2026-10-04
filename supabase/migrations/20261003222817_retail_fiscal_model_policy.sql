-- Retail model decision is captured with numbering; no commercial, stock or financial writes.
-- Existing V1 documents retain their model, signed XML and decision trace.
CREATE OR REPLACE FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(
 p_order_id text,p_emission_request_id uuid,p_modelo varchar(2),p_ambiente integer,p_serie varchar(4),
 p_numero_minimo integer,p_item_csosn_overrides jsonb,p_item_fiscal_selections jsonb,
 p_recipient_tax_id text,p_final_consumer boolean,p_delivery_by_issuer boolean,p_card_not_integrated boolean,p_model_decision jsonb,
 p_requested_number integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_reservation jsonb; v_snapshot public.nfe_fiscal_snapshots%ROWTYPE; v_request jsonb; v_hash text;
BEGIN
 IF p_ambiente IS DISTINCT FROM 2 OR p_final_consumer IS NULL OR p_delivery_by_issuer IS NULL OR p_card_not_integrated IS NULL OR
    COALESCE(p_model_decision->>'status','')<>'ready' OR
    p_model_decision->>'model' IS DISTINCT FROM p_modelo OR
    p_model_decision->>'finalConsumer' IS DISTINCT FROM p_final_consumer::text OR
    COALESCE(p_model_decision->>'policyVersion','')<>'PR_RETAIL_2026_10' THEN
  RAISE EXCEPTION 'INVALID_RETAIL_FISCAL_CONTEXT' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('nfe_emit:'||p_order_id||':retail:2',0));
 IF EXISTS (SELECT 1 FROM public.nfe_documents WHERE order_id=p_order_id AND ambiente=2
    AND modelo<>p_modelo AND status IN ('processando','pendente','homologada','autorizada')) THEN
  RAISE EXCEPTION 'ALREADY_ACTIVE_HML_ATTEMPT' USING ERRCODE='23505';
 END IF;
 IF EXISTS (SELECT 1 FROM public.nfe_fiscal_snapshots s WHERE s.order_id=p_order_id AND s.environment=2
   AND s.requested_model<>p_modelo AND s.emission_request_id<>p_emission_request_id
   AND NOT EXISTS (SELECT 1 FROM public.nfe_documents d WHERE d.fiscal_snapshot_id=s.id
      AND d.status='erro' AND d.numero_protocolo IS NULL AND d.xml_protocolo IS NOT NULL)) THEN
  RAISE EXCEPTION 'UNRESOLVED_FISCAL_SNAPSHOT' USING ERRCODE='23505';
 END IF;
 IF p_requested_number IS NULL THEN
  v_reservation := public.prepare_nfe_fiscal_snapshot(p_order_id,p_emission_request_id,
    p_modelo,p_ambiente,p_serie,p_numero_minimo,p_item_csosn_overrides,p_item_fiscal_selections);
 ELSE
  v_reservation := public.prepare_numbered_nfe_fiscal_snapshot(p_order_id,p_emission_request_id,
    p_modelo,p_ambiente,p_serie,p_numero_minimo,p_item_csosn_overrides,p_item_fiscal_selections,p_requested_number);
 END IF;
 IF COALESCE(p_recipient_tax_id,'')<>'' THEN
  v_reservation := public.apply_nfe_snapshot_recipient_tax_id(v_reservation,p_emission_request_id,p_recipient_tax_id);
 END IF;
 SELECT * INTO v_snapshot FROM public.nfe_fiscal_snapshots
  WHERE id=(v_reservation->>'snapshotId')::uuid FOR UPDATE;
 v_request := pg_catalog.jsonb_build_object('finalConsumer',p_final_consumer,
   'recipientTaxId',COALESCE(p_recipient_tax_id,''),'deliveryByIssuer',p_delivery_by_issuer,'cardNotIntegrated',p_card_not_integrated,'modelDecision',p_model_decision);
 IF v_snapshot.snapshot_data#>'{emissionRequest,modelDecision}' IS NOT NULL THEN
  IF (v_snapshot.snapshot_data->'emissionRequest') @> v_request THEN RETURN v_reservation; END IF;
  RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='23505';
 END IF;
 IF EXISTS (SELECT 1 FROM public.nfe_documents WHERE fiscal_snapshot_id=v_snapshot.id) THEN
  RAISE EXCEPTION 'FISCAL_CONTEXT_ALREADY_FROZEN' USING ERRCODE='23514';
 END IF;
 UPDATE public.nfe_fiscal_snapshots SET snapshot_data=pg_catalog.jsonb_set(snapshot_data,'{emissionRequest}',
    (snapshot_data->'emissionRequest')||v_request)
  WHERE id=v_snapshot.id;
 UPDATE public.nfe_fiscal_snapshots SET snapshot_sha256=pg_catalog.encode(extensions.digest(
   pg_catalog.convert_to(snapshot_data::text,'UTF8'),'sha256'),'hex') WHERE id=v_snapshot.id
  RETURNING snapshot_sha256 INTO v_hash;
 RETURN pg_catalog.jsonb_set(v_reservation,'{snapshotHash}',pg_catalog.to_jsonb(v_hash));
END; $function$;
REVOKE ALL ON FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.prepare_numbered_nfe_fiscal_snapshot_with_context(
 p_order_id text,p_emission_request_id uuid,p_modelo varchar(2),p_ambiente integer,p_serie varchar(4),
 p_numero_minimo integer,p_item_csosn_overrides jsonb,p_item_fiscal_selections jsonb,p_requested_number integer,
 p_recipient_tax_id text,p_final_consumer boolean,p_delivery_by_issuer boolean,p_card_not_integrated boolean,p_model_decision jsonb
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $function$
 SELECT public.prepare_nfe_fiscal_snapshot_with_context(p_order_id,p_emission_request_id,p_modelo,p_ambiente,
  p_serie,p_numero_minimo,p_item_csosn_overrides,p_item_fiscal_selections,p_recipient_tax_id,p_final_consumer,
  p_delivery_by_issuer,p_card_not_integrated,p_model_decision,p_requested_number);
$function$;
REVOKE ALL ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot_with_context(text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,integer,text,boolean,boolean,boolean,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot_with_context(text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,integer,text,boolean,boolean,boolean,jsonb) TO service_role;

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
    pg_catalog.hashtextextended('nfe_emit:' || p_order_id || ':retail:2', 0)
  );
  SELECT * INTO v_snapshot FROM public.nfe_fiscal_snapshots
  WHERE emission_request_id = p_emission_request_id;
  IF NOT FOUND OR v_snapshot.order_id <> p_order_id OR
     v_snapshot.requested_model NOT IN ('55','65') OR v_snapshot.environment <> 2 OR
     v_snapshot.reserved_number <> p_number OR v_snapshot.series <> p_series OR
     pg_catalog.substr(p_access_key, 21, 2) <> v_snapshot.requested_model OR
     pg_catalog.substr(p_access_key, 23, 3) <> pg_catalog.lpad(p_series, 3, '0') OR
     pg_catalog.substr(p_access_key, 26, 9) <> pg_catalog.lpad(p_number::text, 9, '0') OR
     COALESCE(p_decision_trace->0->>'ruleSetVersion','') NOT IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') THEN
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
  IF v_version IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') AND
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
  IF v_version='HML_NORMAL_SALE_V2' AND (
    v_snapshot.snapshot_data#>>'{emissionRequest,modelDecision,model}' IS DISTINCT FROM v_snapshot.requested_model OR
    v_snapshot.snapshot_data#>>'{emissionRequest,modelDecision,policyVersion}' IS DISTINCT FROM 'PR_RETAIL_2026_10' OR
    (p_decision_trace->0->'result'->'modelDecision') IS DISTINCT FROM v_snapshot.snapshot_data#>'{emissionRequest,modelDecision}' OR
    pg_catalog.strpos(p_signed_xml,'<mod>'||v_snapshot.requested_model||'</mod>')=0 OR
    pg_catalog.strpos(p_signed_xml,'<indFinal>'||CASE WHEN v_snapshot.snapshot_data#>>'{emissionRequest,finalConsumer}'='true' THEN '1' ELSE '0' END||'</indFinal>')=0 OR
    v_snapshot.requested_model='65' AND v_snapshot.snapshot_data#>>'{emissionRequest,finalConsumer}' IS DISTINCT FROM 'true') THEN
   RAISE EXCEPTION 'RETAIL_MODEL_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
  END IF;
  IF v_version IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1') AND v_snapshot.requested_model<>'55' THEN
   RAISE EXCEPTION 'LEGACY_HML_MODEL_MISMATCH' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nfe_documents
             WHERE emission_request_id = p_emission_request_id) THEN
    RAISE EXCEPTION 'DUPLICATE_HML_ATTEMPT' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nfe_documents
             WHERE order_id = p_order_id AND modelo IN ('55','65') AND ambiente = 2
               AND status IN ('processando', 'pendente', 'homologada', 'autorizada')) THEN
    RAISE EXCEPTION 'ALREADY_ACTIVE_HML_ATTEMPT' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.nfe_documents (
    order_id, numero_nfe, serie, chave_acesso, modelo, ambiente,
    status, document_type, finalidade, emission_request_id, motivo_status,
    xml_nfe, fiscal_ruleset_version, fiscal_decision_trace,
    hml_attempt_token, hml_attempt_expires_at,
    created_at, updated_at
  ) VALUES (
    p_order_id, p_number, p_series, p_access_key, v_snapshot.requested_model, 2,
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
  WHERE id = p_document_id AND ambiente = 2 AND modelo IN ('55','65')
    AND fiscal_ruleset_version IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2')
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
  WHERE id = p_document_id AND ambiente = 2 AND modelo IN ('55','65')
    AND fiscal_ruleset_version IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2')
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
    pg_catalog.hashtextextended('nfe_emit:' || v_doc.order_id || ':retail:2', 0)
  );
  UPDATE public.nfe_documents SET status = 'processando',
    motivo_status = 'Retransmissão HML da chave original após consulta 217',
    updated_at = pg_catalog.now()
  WHERE id = p_document_id AND ambiente = 2 AND modelo IN ('55','65')
    AND fiscal_ruleset_version IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2')
    AND hml_attempt_token = p_attempt_token
    AND hml_attempt_expires_at > pg_catalog.clock_timestamp()
    AND status = 'erro' AND motivo_status LIKE '217:%'
    AND NOT EXISTS (
      SELECT 1 FROM public.nfe_documents AS other
      WHERE other.order_id = v_doc.order_id AND other.modelo IN ('55','65')
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
  IF NOT FOUND OR v_document.ambiente <> 2 OR v_document.modelo NOT IN ('55','65') OR
     COALESCE(v_document.fiscal_ruleset_version,'') NOT IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') OR
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

DO $migration$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname='nfe_hml_retail_rule_environment_check' AND conrelid='public.nfe_documents'::regclass) THEN
ALTER TABLE public.nfe_documents ADD CONSTRAINT nfe_hml_retail_rule_environment_check
 CHECK (fiscal_ruleset_version IS DISTINCT FROM 'HML_NORMAL_SALE_V2' OR
   (ambiente=2 AND modelo IN ('55','65') AND finalidade=1 AND document_type='outbound' AND
    jsonb_typeof(fiscal_decision_trace)='array' AND jsonb_array_length(fiscal_decision_trace)>0));
 END IF; END $migration$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_hml_retail_active_order ON public.nfe_documents(order_id,ambiente)
 WHERE fiscal_ruleset_version='HML_NORMAL_SALE_V2' AND status IN ('processando','pendente','homologada');
CREATE OR REPLACE FUNCTION public.is_nfe_hml_correction_allowed(
 p_prior_id uuid,p_new_series text,p_new_snapshot jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_prior public.nfe_documents%ROWTYPE; v_old_ie text; v_new_ie text; v_new_number integer;
BEGIN
 SELECT * INTO v_prior FROM public.nfe_documents WHERE id=p_prior_id;
 IF NOT FOUND OR v_prior.ambiente IS DISTINCT FROM 2 OR v_prior.modelo NOT IN ('55','65') OR v_prior.modelo IS DISTINCT FROM p_new_snapshot#>>'{emissionRequest,requestedModel}' OR
    COALESCE(v_prior.fiscal_ruleset_version,'') NOT IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') OR
    v_prior.status IS DISTINCT FROM 'erro' OR v_prior.numero_protocolo IS NOT NULL THEN RETURN false; END IF;
 IF public.is_nfe_hml_series_rejection(v_prior.xml_protocolo) THEN
  RETURN v_prior.serie IS DISTINCT FROM p_new_series;
 END IF;
 IF public.is_nfe_hml_ie_rejection(v_prior.xml_protocolo) THEN
  SELECT snapshot_data#>>'{issuerProfile,companyIE}' INTO v_old_ie
   FROM public.nfe_fiscal_snapshots WHERE id=v_prior.fiscal_snapshot_id;
  v_new_ie := p_new_snapshot#>>'{issuerProfile,companyIE}';
  RETURN COALESCE(v_old_ie IS NOT NULL AND public.is_valid_nfe_hml_parana_ie(v_new_ie) AND
   pg_catalog.regexp_replace(v_old_ie,'[.[:space:]-]','','g')<>
   pg_catalog.regexp_replace(v_new_ie,'[.[:space:]-]','','g'),false);
 END IF;
 IF public.is_nfe_hml_number_conflict(v_prior.xml_protocolo,v_prior.chave_acesso) THEN
  BEGIN v_new_number := (p_new_snapshot#>>'{emissionRequest,number}')::integer;
  EXCEPTION WHEN OTHERS THEN RETURN false; END;
  RETURN v_prior.serie IS NOT DISTINCT FROM p_new_series AND
    v_prior.numero_nfe IS DISTINCT FROM v_new_number;
 END IF;
 RETURN false;
END;
$function$;
REVOKE ALL ON FUNCTION public.is_nfe_hml_correction_allowed(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_nfe_hml_correction_allowed(uuid,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_nfe_hml_correction_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_prior public.nfe_documents%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.hml_correction_of_document_id IS DISTINCT FROM OLD.hml_correction_of_document_id THEN
   RAISE EXCEPTION 'HML_CORRECTION_LINK_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.environment<>2 OR NEW.requested_model NOT IN ('55','65') THEN
  IF NEW.hml_correction_of_document_id IS NOT NULL THEN
   RAISE EXCEPTION 'HML_CORRECTION_SCOPE_MISMATCH' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.series !~ '^[0-9]{1,3}$' OR NEW.series::integer NOT BETWEEN 0 AND 889 THEN
  RAISE EXCEPTION 'HML_CONTRIBUTOR_SERIES_INVALID' USING ERRCODE='23514';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('nfe_emit:'||NEW.order_id||':retail:2',0));
 SELECT d.* INTO v_prior FROM public.nfe_documents d
  WHERE d.order_id=NEW.order_id AND d.modelo=NEW.requested_model AND d.ambiente=2
    AND d.fiscal_ruleset_version IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2')
    AND NOT EXISTS (SELECT 1 FROM public.nfe_documents child
      WHERE child.hml_correction_of_document_id=d.id)
  ORDER BY d.created_at DESC,d.id LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF v_prior.status IS DISTINCT FROM 'erro' OR v_prior.numero_protocolo IS NOT NULL OR
     NOT public.is_nfe_hml_correction_allowed(v_prior.id,NEW.series,NEW.snapshot_data) OR
     (v_prior.hml_attempt_token IS NOT NULL AND
      v_prior.hml_attempt_expires_at>pg_catalog.clock_timestamp()) THEN
   RAISE EXCEPTION 'HML_CORRECTION_REQUIRES_CONFIRMED_REJECTION' USING ERRCODE='23514';
  END IF;
  IF NEW.hml_correction_of_document_id IS NOT NULL AND
     NEW.hml_correction_of_document_id<>v_prior.id THEN
   RAISE EXCEPTION 'HML_CORRECTION_ORIGIN_MISMATCH' USING ERRCODE='23514';
  END IF;
  NEW.hml_correction_of_document_id := v_prior.id;
 ELSIF NEW.hml_correction_of_document_id IS NOT NULL THEN
  RAISE EXCEPTION 'HML_CORRECTION_ORIGIN_MISMATCH' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_nfe_hml_correction_snapshot() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_nfe_hml_correction_snapshot() TO service_role;
DROP TRIGGER IF EXISTS guard_nfe_hml_correction_snapshot ON public.nfe_fiscal_snapshots;
CREATE TRIGGER guard_nfe_hml_correction_snapshot BEFORE INSERT OR UPDATE
 ON public.nfe_fiscal_snapshots FOR EACH ROW EXECUTE FUNCTION public.guard_nfe_hml_correction_snapshot();

CREATE OR REPLACE FUNCTION public.guard_nfe_hml_correction_document()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_snapshot public.nfe_fiscal_snapshots%ROWTYPE; v_prior public.nfe_documents%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.hml_correction_of_document_id IS DISTINCT FROM OLD.hml_correction_of_document_id THEN
   RAISE EXCEPTION 'HML_CORRECTION_LINK_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF OLD.fiscal_ruleset_version IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') AND OLD.status='erro' AND
     (public.is_nfe_hml_series_rejection(OLD.xml_protocolo) OR public.is_nfe_hml_ie_rejection(OLD.xml_protocolo)) AND
     (NEW.status IS DISTINCT FROM OLD.status OR NEW.xml_nfe IS DISTINCT FROM OLD.xml_nfe OR
      NEW.chave_acesso IS DISTINCT FROM OLD.chave_acesso OR NEW.serie IS DISTINCT FROM OLD.serie OR
      NEW.numero_nfe IS DISTINCT FROM OLD.numero_nfe OR NEW.xml_protocolo IS DISTINCT FROM OLD.xml_protocolo OR
      NEW.numero_protocolo IS DISTINCT FROM OLD.numero_protocolo OR NEW.motivo_status IS DISTINCT FROM OLD.motivo_status OR
      NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.modelo IS DISTINCT FROM OLD.modelo OR
      NEW.ambiente IS DISTINCT FROM OLD.ambiente OR NEW.fiscal_snapshot_id IS DISTINCT FROM OLD.fiscal_snapshot_id OR
      NEW.emission_request_id IS DISTINCT FROM OLD.emission_request_id OR
      NEW.fiscal_ruleset_version IS DISTINCT FROM OLD.fiscal_ruleset_version OR
      NEW.hml_response_history IS DISTINCT FROM OLD.hml_response_history OR
      (NEW.hml_attempt_token IS NOT NULL AND NEW.hml_attempt_token IS DISTINCT FROM OLD.hml_attempt_token)) THEN
   RAISE EXCEPTION 'REJECTED_HML_SERIES_ATTEMPT_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 IF COALESCE(NEW.fiscal_ruleset_version,'') NOT IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') THEN RETURN NEW; END IF;
 SELECT * INTO v_snapshot FROM public.nfe_fiscal_snapshots WHERE emission_request_id=NEW.emission_request_id;
 IF NOT FOUND OR NEW.ambiente IS DISTINCT FROM 2 OR NEW.modelo NOT IN ('55','65') OR
    v_snapshot.order_id<>NEW.order_id OR v_snapshot.environment<>2 OR
    v_snapshot.requested_model<>NEW.modelo OR v_snapshot.series<>NEW.serie OR
    v_snapshot.reserved_number<>NEW.numero_nfe OR NEW.serie::integer NOT BETWEEN 0 AND 889 OR
    (NEW.fiscal_snapshot_id IS NOT NULL AND NEW.fiscal_snapshot_id<>v_snapshot.id) THEN
  RAISE EXCEPTION 'HML_CORRECTION_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
 END IF;
 NEW.fiscal_snapshot_id := v_snapshot.id;
 IF NEW.hml_correction_of_document_id IS NOT NULL AND
    NEW.hml_correction_of_document_id IS DISTINCT FROM v_snapshot.hml_correction_of_document_id THEN
  RAISE EXCEPTION 'HML_CORRECTION_ORIGIN_MISMATCH' USING ERRCODE='23514';
 END IF;
 NEW.hml_correction_of_document_id := v_snapshot.hml_correction_of_document_id;
 IF NEW.hml_correction_of_document_id IS NOT NULL THEN
  SELECT * INTO v_prior FROM public.nfe_documents WHERE id=NEW.hml_correction_of_document_id FOR UPDATE;
  IF NOT FOUND OR v_prior.order_id<>NEW.order_id OR v_prior.ambiente<>2 OR v_prior.modelo<>NEW.modelo OR
     COALESCE(v_prior.fiscal_ruleset_version,'') NOT IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') OR
     v_prior.status IS DISTINCT FROM 'erro' OR v_prior.numero_protocolo IS NOT NULL OR
     NOT public.is_nfe_hml_correction_allowed(v_prior.id,NEW.serie,v_snapshot.snapshot_data) THEN
   RAISE EXCEPTION 'HML_CORRECTION_ORIGIN_MISMATCH' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_nfe_hml_correction_document() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_nfe_hml_correction_document() TO service_role;
DROP TRIGGER IF EXISTS guard_nfe_hml_correction_document ON public.nfe_documents;
CREATE TRIGGER guard_nfe_hml_correction_document BEFORE INSERT OR UPDATE
 ON public.nfe_documents FOR EACH ROW EXECUTE FUNCTION public.guard_nfe_hml_correction_document();
ALTER TABLE public.nfe_documents DROP CONSTRAINT IF EXISTS nfe_hml_correction_scope_check;
ALTER TABLE public.nfe_documents ADD CONSTRAINT nfe_hml_correction_scope_check
 CHECK (hml_correction_of_document_id IS NULL OR
   (ambiente=2 AND modelo IN ('55','65') AND fiscal_ruleset_version IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2')
    AND hml_correction_of_document_id<>id));
CREATE OR REPLACE FUNCTION public.guard_nfe_hml_retail_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
BEGIN
 IF OLD.fiscal_ruleset_version='HML_NORMAL_SALE_V2' AND (
   NEW.xml_nfe IS DISTINCT FROM OLD.xml_nfe OR NEW.chave_acesso IS DISTINCT FROM OLD.chave_acesso OR
   NEW.modelo IS DISTINCT FROM OLD.modelo OR NEW.ambiente IS DISTINCT FROM OLD.ambiente OR
   NEW.serie IS DISTINCT FROM OLD.serie OR NEW.numero_nfe IS DISTINCT FROM OLD.numero_nfe OR
   NEW.fiscal_snapshot_id IS DISTINCT FROM OLD.fiscal_snapshot_id OR NEW.emission_request_id IS DISTINCT FROM OLD.emission_request_id OR
   NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.fiscal_decision_trace IS DISTINCT FROM OLD.fiscal_decision_trace OR
   NEW.fiscal_ruleset_version IS DISTINCT FROM OLD.fiscal_ruleset_version) THEN
  RAISE EXCEPTION 'FROZEN_RETAIL_DOCUMENT' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.guard_nfe_hml_retail_immutable() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_nfe_hml_retail_immutable() TO service_role;
DROP TRIGGER IF EXISTS guard_nfe_hml_retail_immutable ON public.nfe_documents;
CREATE TRIGGER guard_nfe_hml_retail_immutable BEFORE UPDATE ON public.nfe_documents
 FOR EACH ROW EXECUTE FUNCTION public.guard_nfe_hml_retail_immutable();
