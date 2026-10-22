-- Restore only after checking the live definition against the applied correction.
-- Original definition hash: 13fb4cfd7594ca3089f0c871628cfe27
-- No fiscal document, commercial order or counter is changed by this rollback.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.prepare_nfe_outbound_attempt(p_snapshot jsonb, p_signed_xml text, p_access_key text, p_request_command jsonb, p_attempt_token uuid, p_actor_id uuid, p_minimum_number integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_request jsonb := p_snapshot->'emissionRequest'; v_inputs jsonb := p_snapshot->'fiscalInputs';
 v_order public.orders%ROWTYPE; v_app jsonb; v_profile jsonb; v_products jsonb; v_customer jsonb; v_contribution jsonb;
 v_prior public.nfe_outbound_attempts%ROWTYPE; v_request_id uuid; v_order_id text;
 v_issuer text; v_model text; v_env integer; v_series text; v_number integer;
 v_snapshot_id uuid; v_document_id uuid; v_hash text; v_xml_hash text; v_trace jsonb; v_fingerprint text;
 v_field record;
BEGIN
 v_request_id := (v_request->>'id')::uuid; v_order_id := p_snapshot#>>'{order,id}';
 v_issuer := regexp_replace(upper(p_snapshot#>>'{issuerProfile,companyCnpj}'),'[./[:space:]-]','','g');
 v_model := v_request->>'requestedModel'; v_env := (v_request->>'environment')::integer;
 v_series := v_request->>'series'; v_number := (v_request->>'number')::integer;
 IF p_attempt_token IS NULL OR v_request_id IS NULL OR coalesce(v_order_id,'')='' OR
    jsonb_typeof(p_request_command) IS DISTINCT FROM 'object' OR
    p_request_command->>'orderId' IS DISTINCT FROM v_order_id OR
    p_request_command->>'emissionRequestId' IS DISTINCT FROM v_request_id::text OR
    p_request_command->>'environment' IS DISTINCT FROM v_env::text OR
    p_access_key IS NULL OR p_access_key !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$' OR p_signed_xml IS NULL OR
    v_model IS NULL OR v_model NOT IN ('55','65') OR v_env IS NULL OR v_env NOT IN (1,2) OR
    v_issuer IS NULL OR v_issuer !~ '^[A-Z0-9]{12}[0-9]{2}$' OR v_series IS NULL OR v_number IS NULL OR
    p_snapshot->>'schemaVersion' IS DISTINCT FROM '1' OR
    (v_env=1 AND v_order_id LIKE 'TEST_AUT_%') THEN
  RAISE EXCEPTION 'INVALID_OUTBOUND_PREPARATION' USING ERRCODE='22023';
 END IF;
 FOR v_field IN SELECT key,value FROM jsonb_each(p_request_command) LOOP
  IF v_field.key IN ('orderId','environment','emissionRequestId','requestedNumber') THEN CONTINUE; END IF;
  IF v_field.key NOT IN ('itemCsosnOverrides','itemFiscalSelections','recipientTaxId','recipientIe','recipientIeIndicator',
     'finalConsumer','deliveryByIssuer','cardNotIntegrated','transporter','freightMode','hasTransport','transportResponsible','freightContractResponsible') OR
     v_request->v_field.key IS DISTINCT FROM v_field.value THEN
   RAISE EXCEPTION 'FISCAL_COMMAND_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
  END IF;
 END LOOP;
 IF p_request_command ? 'requestedNumber' AND (p_request_command->>'requestedNumber')::integer IS DISTINCT FROM v_number THEN
  RAISE EXCEPTION 'FISCAL_COMMAND_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
 END IF;
 v_fingerprint := encode(extensions.digest(convert_to(p_request_command::text,'UTF8'),'sha256'),'hex');
 PERFORM pg_advisory_xact_lock(hashtextextended('nfe_snapshot:'||v_request_id::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('nfe_emit:'||v_order_id||':retail:'||v_env::text,0));
 SELECT * INTO v_prior FROM public.nfe_outbound_attempts WHERE emission_request_id=v_request_id;
 IF FOUND THEN
  IF v_prior.request_command IS DISTINCT FROM p_request_command OR
     v_prior.order_id IS DISTINCT FROM v_order_id OR v_prior.environment IS DISTINCT FROM v_env OR
     v_prior.issuer_cnpj IS DISTINCT FROM v_issuer THEN
   RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='23505';
  END IF;
  RETURN jsonb_build_object('documentId',v_prior.document_id,'snapshotId',v_prior.snapshot_id,'created',false);
 END IF;
 IF EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request_id) OR
    EXISTS(SELECT 1 FROM public.nfe_documents WHERE emission_request_id=v_request_id) THEN
  RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='23505';
 END IF;
 IF EXISTS(SELECT 1 FROM public.nfe_documents WHERE order_id=v_order_id AND ambiente=v_env AND
   modelo IN ('55','65') AND document_type='outbound' AND status IN ('processando','pendente','autorizada','homologada')

   AND NOT public.is_order_edit_reversal_confirmed(id)) OR
    EXISTS(SELECT 1 FROM public.nfe_outbound_attempts WHERE order_id=v_order_id AND environment=v_env AND
      issuer_cnpj=v_issuer AND state<>'rejected'

   AND NOT public.is_order_edit_reversal_confirmed(document_id)) THEN
  RAISE EXCEPTION 'ALREADY_ACTIVE_FISCAL_ATTEMPT' USING ERRCODE='23505';
 END IF;
 SELECT * INTO v_order FROM public.orders WHERE id=v_order_id FOR SHARE;
 IF NOT FOUND OR v_order.order_type IS NULL OR v_order.order_type NOT IN ('sale','showroom') OR coalesce(v_order.deleted,false) OR
    lower(coalesce(v_order.status,'')) IN ('','draft','cancelled','cancelado') OR
    v_order.order_data->>'fiscalScenario'='HML_TECHNICAL_V1' THEN
  RAISE EXCEPTION 'ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL' USING ERRCODE='23514';
 END IF;
 IF p_snapshot#>'{order,data}' IS DISTINCT FROM v_order.order_data OR
    (p_snapshot#>>'{order,version}')::integer IS DISTINCT FROM v_order.version OR
    (p_snapshot#>>'{order,updatedAt}')::timestamptz IS DISTINCT FROM v_order.updated_at OR
    p_snapshot#>>'{order,type}' IS DISTINCT FROM v_order.order_type OR
    p_snapshot#>>'{order,status}' IS DISTINCT FROM v_order.status OR
    p_snapshot#>>'{order,deleted}' IS DISTINCT FROM 'false' THEN
  RAISE EXCEPTION 'FISCAL_SOURCE_CHANGED' USING ERRCODE='40001';
 END IF;
 SELECT data INTO v_app FROM public.settings WHERE id='app' FOR SHARE;
 SELECT jsonb_object_agg(k,v_app->k) FILTER(WHERE v_app->k IS NOT NULL AND v_app->k<>'null'::jsonb)
 INTO v_profile FROM unnest(ARRAY['companyName','companyAddress','companyCnpj','companyIE','companyIM','companyCRT',
  'companyLogradouro','companyNumero','companyBairro','companyCEP','companyCMun','companyXMun','companyUF','companyPhone','cscId']) k;
 IF v_profile IS DISTINCT FROM p_snapshot->'issuerProfile' OR
    v_profile->>'companyCRT' IS DISTINCT FROM '1' OR v_profile->>'companyUF' IS DISTINCT FROM 'PR' THEN
  RAISE EXCEPTION 'FISCAL_SOURCE_CHANGED' USING ERRCODE='40001';
 END IF;
 SELECT public.simples_normal_sale_contribution_decision(v_model) INTO v_contribution;
 SELECT coalesce(jsonb_object_agg(p.id,p.fiscal),'{}'::jsonb) INTO v_products FROM (
  SELECT id,fiscal FROM public.products WHERE id IN (
   SELECT (i->>'productId')::uuid FROM jsonb_array_elements(v_order.order_data->'items') i
   WHERE i->>'productId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') FOR SHARE) p;
 SELECT jsonb_build_object('id',id,'fullName',full_name,'cpfCnpj',cpf_cnpj,'address',address,
  'ie',rg_ie,'personType',person_type_pf_pj) INTO v_customer FROM public.people
  WHERE id=v_order.order_data#>>'{customerData,id}' AND NOT coalesce(deleted,false) FOR SHARE;
 IF v_customer IS NULL OR v_inputs IS DISTINCT FROM jsonb_build_object('products',v_products,'customer',v_customer,
    'contributionDecision',v_contribution,'fiscalDefaults',v_app->'fiscalDefaults') THEN
  RAISE EXCEPTION 'FISCAL_SOURCE_CHANGED' USING ERRCODE='40001';
 END IF;
 IF v_request#>>'{modelDecision,status}' IS DISTINCT FROM 'ready' OR
    v_request#>>'{modelDecision,model}' IS DISTINCT FROM v_model OR
    v_request#>>'{modelDecision,policyVersion}' IS DISTINCT FROM 'PR_RETAIL_2026_10' OR
    v_request->>'finalConsumer' IS DISTINCT FROM v_request#>>'{modelDecision,finalConsumer}' OR
    v_model='65' AND v_request->>'finalConsumer' IS DISTINCT FROM 'true' THEN
  RAISE EXCEPTION 'RETAIL_MODEL_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(v_request->'itemFiscalSelections') IS DISTINCT FROM 'object' OR
    (SELECT count(*) FROM jsonb_each(v_request->'itemFiscalSelections')) NOT BETWEEN 1 AND 990 OR
    (SELECT count(*) FROM jsonb_each(v_request->'itemFiscalSelections')) <>
     (SELECT count(*) FROM jsonb_array_elements(v_order.order_data->'items') i WHERE coalesce(i->>'itemType','product')<>'service') OR
    EXISTS(SELECT 1 FROM jsonb_each(v_request->'itemFiscalSelections') s WHERE
     s.key !~ '^[1-9][0-9]{0,2}$' OR NOT EXISTS(SELECT 1 FROM public.ncms n WHERE
      n.code=s.value->>'ncm' AND n.active AND (n.start_date IS NULL OR n.start_date<=current_date) AND
      (n.end_date IS NULL OR n.end_date>=current_date))) THEN
  RAISE EXCEPTION 'INVALID_ITEM_FISCAL_SELECTIONS' USING ERRCODE='23514';
 END IF;
 IF substring(p_access_key,7,14)<>v_issuer OR substring(p_access_key,21,2)<>v_model OR
    substring(p_access_key,23,3)<>lpad(v_series,3,'0') OR substring(p_access_key,26,9)<>lpad(v_number::text,9,'0') OR
    strpos(p_signed_xml,'Id="NFe'||p_access_key||'"')=0 OR
    strpos(p_signed_xml,'<tpAmb>'||v_env::text||'</tpAmb>')=0 OR
    strpos(p_signed_xml,'<tpAmb>'||(3-v_env)::text||'</tpAmb>')>0 OR
    strpos(p_signed_xml,'<mod>'||v_model||'</mod>')=0 OR strpos(p_signed_xml,'<Signature')=0 THEN
  RAISE EXCEPTION 'FISCAL_XML_IDENTITY_MISMATCH' USING ERRCODE='23514';
 END IF;
 IF p_snapshot->>'capturedAt' IS NULL OR (p_snapshot->>'capturedAt')::timestamptz NOT BETWEEN clock_timestamp()-interval '5 minutes' AND clock_timestamp()+interval '1 minute' THEN
  RAISE EXCEPTION 'FISCAL_SNAPSHOT_EXPIRED' USING ERRCODE='23514';
 END IF;
 v_trace := p_snapshot->'decisionTrace';
 IF jsonb_typeof(v_trace) IS DISTINCT FROM 'array' OR jsonb_array_length(v_trace)=0 OR
    EXISTS(SELECT 1 FROM jsonb_array_elements(v_trace) t WHERE t->>'ruleSetVersion' IS DISTINCT FROM 'NORMAL_SALE_V1') THEN
  RAISE EXCEPTION 'FISCAL_DECISION_TRACE_REQUIRED' USING ERRCODE='23514';
 END IF;
 PERFORM public.reserve_nfe_outbound_number(v_issuer,v_model,v_env,v_series,p_minimum_number,v_number);
 v_hash := encode(extensions.digest(convert_to((p_snapshot-'decisionTrace')::text,'UTF8'),'sha256'),'hex');
 v_xml_hash := encode(extensions.digest(convert_to(p_signed_xml,'UTF8'),'sha256'),'hex');
 INSERT INTO public.nfe_fiscal_snapshots(emission_request_id,order_id,order_version,order_updated_at,
  requested_model,environment,series,reserved_number,snapshot_data,snapshot_sha256,captured_at,issuer_cnpj)
 VALUES(v_request_id,v_order_id,v_order.version,v_order.updated_at,v_model,v_env,v_series,v_number,
  p_snapshot-'decisionTrace',v_hash,(p_snapshot->>'capturedAt')::timestamptz,v_issuer) RETURNING id INTO v_snapshot_id;
 INSERT INTO public.nfe_documents(order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,
  document_type,finalidade,emission_request_id,motivo_status,xml_nfe,fiscal_ruleset_version,fiscal_decision_trace,issuer_cnpj)
 VALUES(v_order_id,v_number,v_series,p_access_key,v_model,v_env,'processando','outbound',1,v_request_id,
  'Documento preparado; transmissão ainda não iniciada',p_signed_xml,'NORMAL_SALE_V1',v_trace,v_issuer)
 RETURNING id INTO v_document_id;
 INSERT INTO public.nfe_outbound_attempts(emission_request_id,order_id,document_id,snapshot_id,issuer_cnpj,
  model,environment,series,number,access_key,request_fingerprint,request_command,xml_sha256,state,actor_id,attempt_token,attempt_expires_at)
 VALUES(v_request_id,v_order_id,v_document_id,v_snapshot_id,v_issuer,v_model,v_env,v_series,v_number,p_access_key,
  v_fingerprint,p_request_command,v_xml_hash,'prepared',p_actor_id,p_attempt_token,clock_timestamp()+interval '2 minutes');
 RETURN jsonb_build_object('documentId',v_document_id,'snapshotId',v_snapshot_id,'snapshotHash',v_hash,'created',true);
END; $function$

ALTER FUNCTION public.prepare_nfe_outbound_attempt(jsonb,text,text,jsonb,uuid,uuid,integer)
  RESET lock_timeout;
COMMIT;

