-- Common preparation/attempt policy for normal sales in environments 1 and 2.
-- Existing HML fixtures, documents, functions and sequence values are preserved.
CREATE TABLE IF NOT EXISTS public.nfe_establishment_sequences (
  issuer_cnpj text NOT NULL CHECK (issuer_cnpj ~ '^[0-9]{14}$'),
  model text NOT NULL CHECK (model IN ('55','65')),
  environment integer NOT NULL CHECK (environment IN (1,2)),
  series text NOT NULL CHECK (series ~ '^[0-9]{1,3}$' AND series::integer BETWEEN 0 AND 889),
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number BETWEEN 0 AND 999999999),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer_cnpj,model,environment,series)
);
CREATE TABLE IF NOT EXISTS public.nfe_legacy_sequence_scope (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  issuer_cnpj text NOT NULL CHECK (issuer_cnpj ~ '^[0-9]{14}$')
);
INSERT INTO public.nfe_legacy_sequence_scope(singleton,issuer_cnpj)
 SELECT true,regexp_replace(data->>'companyCnpj','[^0-9]','','g') FROM public.settings
 WHERE id='app' AND regexp_replace(data->>'companyCnpj','[^0-9]','','g') ~ '^[0-9]{14}$'
 ON CONFLICT DO NOTHING;
-- This binding is fixed at cutover. Another establishment never inherits the
-- legacy counter merely because the current app profile changes later.
INSERT INTO public.nfe_establishment_sequences(issuer_cnpj,model,environment,series,last_number,updated_at)
 SELECT s.issuer_cnpj,n.modelo,n.ambiente,n.serie::integer::text,max(n.ultimo_numero),max(n.updated_at)
 FROM public.nfe_sequences n CROSS JOIN public.nfe_legacy_sequence_scope s
 WHERE n.modelo IN ('55','65') AND n.ambiente IN (1,2)
   AND n.serie ~ '^[0-9]{1,3}$' AND n.serie::integer BETWEEN 0 AND 889
 GROUP BY s.issuer_cnpj,n.modelo,n.ambiente,n.serie::integer
 ON CONFLICT DO NOTHING;
ALTER TABLE public.nfe_fiscal_snapshots ADD COLUMN IF NOT EXISTS issuer_cnpj text;
ALTER TABLE public.nfe_documents ADD COLUMN IF NOT EXISTS issuer_cnpj text;
-- Build the replacement before removing the old three-part uniqueness. Legacy
-- snapshots retain their issuer from their immutable JSON; no row is rewritten.
CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_snapshot_establishment_sequence
 ON public.nfe_fiscal_snapshots(
  (coalesce(issuer_cnpj,regexp_replace(snapshot_data#>>'{issuerProfile,companyCnpj}','[^0-9]','','g'))),
  requested_model,(series::integer),environment,reserved_number);
ALTER TABLE public.nfe_fiscal_snapshots DROP CONSTRAINT IF EXISTS uq_nfe_fiscal_snapshot_sequence;

CREATE TABLE IF NOT EXISTS public.nfe_outbound_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emission_request_id uuid NOT NULL UNIQUE,
  order_id text NOT NULL REFERENCES public.orders(id),
  document_id uuid NOT NULL UNIQUE REFERENCES public.nfe_documents(id),
  snapshot_id uuid NOT NULL UNIQUE REFERENCES public.nfe_fiscal_snapshots(id),
  issuer_cnpj text NOT NULL CHECK (issuer_cnpj ~ '^[0-9]{14}$'),
  model text NOT NULL CHECK (model IN ('55','65')),
  environment integer NOT NULL CHECK (environment IN (1,2)),
  series text NOT NULL,
  number integer NOT NULL CHECK (number BETWEEN 1 AND 999999999),
  access_key text NOT NULL UNIQUE CHECK (access_key ~ '^[0-9]{44}$'),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  request_command jsonb NOT NULL CHECK (jsonb_typeof(request_command)='object'),
  xml_sha256 text NOT NULL CHECK (xml_sha256 ~ '^[0-9a-f]{64}$'),
  state text NOT NULL CHECK (state IN ('prepared','transmitting','reconciling','authorized','rejected','confirmed_not_found')),
  actor_id uuid REFERENCES auth.users(id),
  attempt_token uuid,
  attempt_expires_at timestamptz,
  transmission_started_at timestamptz,
  response_history jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(response_history)='array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer_cnpj,model,environment,series,number)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_normal_active_sale
 ON public.nfe_outbound_attempts(order_id,issuer_cnpj,environment)
 WHERE state IN ('prepared','transmitting','reconciling','authorized','confirmed_not_found');
CREATE INDEX IF NOT EXISTS idx_nfe_outbound_attempts_pending
 ON public.nfe_outbound_attempts(state,attempt_expires_at)
 WHERE state IN ('prepared','transmitting','reconciling');
CREATE INDEX IF NOT EXISTS idx_nfe_outbound_attempts_actor ON public.nfe_outbound_attempts(actor_id);
ALTER TABLE public.nfe_establishment_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_legacy_sequence_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_outbound_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nfe_establishment_sequences,public.nfe_legacy_sequence_scope,public.nfe_outbound_attempts
 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.nfe_establishment_sequences,public.nfe_legacy_sequence_scope,public.nfe_outbound_attempts TO service_role;

-- Read-only suggestion. Allocation happens only under row locks below; a stale
-- suggestion causes a local CAS conflict, with no snapshot or counter committed.
CREATE OR REPLACE FUNCTION public.peek_nfe_outbound_number(
 p_issuer_cnpj text,p_model text,p_environment integer,p_series text,p_minimum integer
) RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_number bigint; v_legacy integer := 0; v_document integer; v_snapshot integer;
BEGIN
 IF p_issuer_cnpj IS NULL OR p_issuer_cnpj !~ '^[0-9]{14}$' OR p_model IS NULL OR p_model NOT IN ('55','65') OR
    p_environment IS NULL OR p_environment NOT IN (1,2) OR p_series IS NULL OR p_series !~ '^(0|[1-9][0-9]{0,2})$' OR p_series::integer NOT BETWEEN 0 AND 889 OR
    p_minimum IS NULL OR p_minimum NOT BETWEEN 1 AND 999999999 THEN
  RAISE EXCEPTION 'INVALID_FISCAL_SEQUENCE' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM public.nfe_legacy_sequence_scope WHERE issuer_cnpj=p_issuer_cnpj) THEN
  SELECT max(ultimo_numero) INTO v_legacy FROM public.nfe_sequences
   WHERE modelo=p_model AND ambiente=p_environment AND serie::integer=p_series::integer;
 END IF;
 SELECT numero_nfe INTO v_document FROM public.nfe_documents
  WHERE modelo=p_model AND ambiente=p_environment AND serie::integer=p_series::integer AND
   (issuer_cnpj=p_issuer_cnpj OR issuer_cnpj IS NULL AND
    substring(xml_nfe FROM '<emit>.*?<CNPJ>([0-9]{14})</CNPJ>')=p_issuer_cnpj)
  ORDER BY numero_nfe DESC LIMIT 1;
 SELECT reserved_number INTO v_snapshot FROM public.nfe_fiscal_snapshots
  WHERE requested_model=p_model AND environment=p_environment AND series::integer=p_series::integer AND
   coalesce(issuer_cnpj,regexp_replace(snapshot_data#>>'{issuerProfile,companyCnpj}','[^0-9]','','g'))=p_issuer_cnpj
  ORDER BY reserved_number DESC LIMIT 1;
 SELECT greatest(p_minimum::bigint,coalesce(last_number,0)::bigint+1,
   coalesce(v_legacy,0)::bigint+1,coalesce(v_document,0)::bigint+1,coalesce(v_snapshot,0)::bigint+1)
 INTO v_number FROM (SELECT 1) seed LEFT JOIN public.nfe_establishment_sequences n
  ON n.issuer_cnpj=p_issuer_cnpj AND n.model=p_model AND n.environment=p_environment AND n.series=p_series;
 IF v_number>999999999 THEN RAISE EXCEPTION 'FISCAL_SEQUENCE_EXHAUSTED' USING ERRCODE='23514'; END IF;
 RETURN v_number::integer;
END; $fn$;

CREATE OR REPLACE FUNCTION public.reserve_nfe_outbound_number(
 p_issuer_cnpj text,p_model text,p_environment integer,p_series text,p_minimum integer,p_expected_number integer
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_number integer; v_is_legacy boolean;
BEGIN
 -- Validate before creating a counter. peek is a floor, never the allocator.
 PERFORM public.peek_nfe_outbound_number(p_issuer_cnpj,p_model,p_environment,p_series,p_minimum);
 INSERT INTO public.nfe_establishment_sequences(issuer_cnpj,model,environment,series)
 VALUES(p_issuer_cnpj,p_model,p_environment,p_series) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.nfe_establishment_sequences WHERE issuer_cnpj=p_issuer_cnpj AND
  model=p_model AND environment=p_environment AND series=p_series FOR UPDATE;
 SELECT EXISTS(SELECT 1 FROM public.nfe_legacy_sequence_scope WHERE issuer_cnpj=p_issuer_cnpj) INTO v_is_legacy;
 IF v_is_legacy THEN
  INSERT INTO public.nfe_sequences(modelo,serie,ambiente,ultimo_numero,updated_at)
   VALUES(p_model,p_series,p_environment,0,now()) ON CONFLICT(modelo,serie,ambiente) DO NOTHING;
  PERFORM 1 FROM public.nfe_sequences WHERE modelo=p_model AND serie=p_series AND ambiente=p_environment FOR UPDATE;
 END IF;
 v_number := public.peek_nfe_outbound_number(p_issuer_cnpj,p_model,p_environment,p_series,p_minimum);
 IF p_expected_number IS DISTINCT FROM v_number THEN
  RAISE EXCEPTION 'FISCAL_SEQUENCE_CHANGED' USING ERRCODE='40001';
 END IF;
 UPDATE public.nfe_establishment_sequences SET last_number=v_number,updated_at=clock_timestamp()
  WHERE issuer_cnpj=p_issuer_cnpj AND model=p_model AND environment=p_environment AND series=p_series;
 IF v_is_legacy THEN
  UPDATE public.nfe_sequences SET ultimo_numero=v_number,updated_at=clock_timestamp()
   WHERE modelo=p_model AND serie=p_series AND ambiente=p_environment;
 END IF;
 RETURN v_number;
END; $fn$;

CREATE OR REPLACE FUNCTION public.prepare_nfe_outbound_attempt(
 p_snapshot jsonb,p_signed_xml text,p_access_key text,p_request_command jsonb,
 p_attempt_token uuid,p_actor_id uuid,p_minimum_number integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE
 v_request jsonb := p_snapshot->'emissionRequest'; v_inputs jsonb := p_snapshot->'fiscalInputs';
 v_order public.orders%ROWTYPE; v_app jsonb; v_profile jsonb; v_products jsonb; v_customer jsonb; v_contribution jsonb;
 v_prior public.nfe_outbound_attempts%ROWTYPE; v_request_id uuid; v_order_id text;
 v_issuer text; v_model text; v_env integer; v_series text; v_number integer;
 v_snapshot_id uuid; v_document_id uuid; v_hash text; v_xml_hash text; v_trace jsonb; v_fingerprint text;
 v_field record;
BEGIN
 v_request_id := (v_request->>'id')::uuid; v_order_id := p_snapshot#>>'{order,id}';
 v_issuer := regexp_replace(p_snapshot#>>'{issuerProfile,companyCnpj}','[^0-9]','','g');
 v_model := v_request->>'requestedModel'; v_env := (v_request->>'environment')::integer;
 v_series := v_request->>'series'; v_number := (v_request->>'number')::integer;
 IF p_attempt_token IS NULL OR v_request_id IS NULL OR coalesce(v_order_id,'')='' OR
    jsonb_typeof(p_request_command) IS DISTINCT FROM 'object' OR
    p_request_command->>'orderId' IS DISTINCT FROM v_order_id OR
    p_request_command->>'emissionRequestId' IS DISTINCT FROM v_request_id::text OR
    p_request_command->>'environment' IS DISTINCT FROM v_env::text OR
    p_access_key IS NULL OR p_access_key !~ '^[0-9]{44}$' OR p_signed_xml IS NULL OR
    v_model IS NULL OR v_model NOT IN ('55','65') OR v_env IS NULL OR v_env NOT IN (1,2) OR
    v_issuer IS NULL OR v_issuer !~ '^[0-9]{14}$' OR v_series IS NULL OR v_number IS NULL OR
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
   modelo IN ('55','65') AND document_type='outbound' AND status IN ('processando','pendente','autorizada','homologada')) OR
    EXISTS(SELECT 1 FROM public.nfe_outbound_attempts WHERE order_id=v_order_id AND environment=v_env AND
      issuer_cnpj=v_issuer AND state<>'rejected') THEN
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
 SELECT data INTO v_contribution FROM public.settings WHERE id=CASE v_model
  WHEN '55' THEN 'fiscal_decision_simples_nfe55_normal_sale_v1' ELSE 'fiscal_decision_simples_nfce65_normal_sale_v1' END FOR SHARE;
 IF v_contribution IS NULL OR v_contribution#>>'{scope,model}' IS DISTINCT FROM v_model OR
    v_contribution#>>'{scope,issuerCrt}' IS DISTINCT FROM '1' OR
    v_contribution#>>'{scope,operation}' IS DISTINCT FROM 'normal_sale' THEN
  RAISE EXCEPTION 'CONTRIBUTION_MODEL_SCOPE_REQUIRED' USING ERRCODE='23514';
 END IF;
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
END; $fn$;

CREATE OR REPLACE FUNCTION public.claim_nfe_outbound_attempt(p_document_id uuid,p_attempt_token uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF p_attempt_token IS NULL THEN RAISE EXCEPTION 'INVALID_FISCAL_ATTEMPT_TOKEN' USING ERRCODE='22023'; END IF;
 UPDATE public.nfe_outbound_attempts SET attempt_token=p_attempt_token,
  attempt_expires_at=clock_timestamp()+interval '2 minutes',updated_at=clock_timestamp()
 WHERE document_id=p_document_id AND state IN ('prepared','transmitting','reconciling','confirmed_not_found') AND
  (attempt_token IS NULL OR attempt_expires_at<=clock_timestamp());
 RETURN FOUND;
END; $fn$;
CREATE OR REPLACE FUNCTION public.release_nfe_outbound_attempt(p_document_id uuid,p_attempt_token uuid)
 RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 UPDATE public.nfe_outbound_attempts SET attempt_token=NULL,attempt_expires_at=NULL
 WHERE document_id=p_document_id AND attempt_token=p_attempt_token;
$fn$;
CREATE OR REPLACE FUNCTION public.start_nfe_outbound_transmission(p_document_id uuid,p_attempt_token uuid)
 RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 UPDATE public.nfe_outbound_attempts SET state='transmitting',transmission_started_at=clock_timestamp(),updated_at=clock_timestamp()
 WHERE document_id=p_document_id AND attempt_token=p_attempt_token AND attempt_expires_at>clock_timestamp()
  AND state IN ('prepared','confirmed_not_found');
 IF NOT FOUND THEN RAISE EXCEPTION 'FISCAL_ATTEMPT_STATE_CHANGED' USING ERRCODE='23514'; END IF;
 UPDATE public.nfe_documents SET status='processando',motivo_status='Transmissão iniciada; resultado ainda não confirmado',updated_at=clock_timestamp()
 WHERE id=p_document_id;
END; $fn$;

CREATE OR REPLACE FUNCTION public.persist_nfe_outbound_result(
 p_document_id uuid,p_attempt_token uuid,p_state text,p_reason text,p_response_xml text,p_protocol text,p_items jsonb
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_attempt public.nfe_outbound_attempts%ROWTYPE; v_doc public.nfe_documents%ROWTYPE;
 v_item jsonb; v_protocols xml[]; v_protocol xml; v_total numeric; v_xml xml; v_status text;
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
 v_status := CASE p_state WHEN 'authorized' THEN CASE v_attempt.environment WHEN 1 THEN 'autorizada' ELSE 'homologada' END
  WHEN 'reconciling' THEN 'pendente' ELSE 'erro' END;
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

CREATE OR REPLACE FUNCTION public.guard_normal_outbound_identity() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF OLD.fiscal_ruleset_version IS DISTINCT FROM 'NORMAL_SALE_V1' THEN
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FISCAL_HISTORY_IMMUTABLE' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['status','motivo_status','xml_protocolo','numero_protocolo','valor_total','updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','motivo_status','xml_protocolo','numero_protocolo','valor_total','updated_at']) THEN
  RAISE EXCEPTION 'FISCAL_DOCUMENT_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
 END IF;
 IF OLD.status IN ('autorizada','homologada','cancelada') AND
   (NEW.xml_protocolo IS DISTINCT FROM OLD.xml_protocolo OR NEW.numero_protocolo IS DISTINCT FROM OLD.numero_protocolo OR
    NEW.valor_total IS DISTINCT FROM OLD.valor_total OR NEW.status NOT IN ('autorizada','homologada','cancelada')) THEN
  RAISE EXCEPTION 'AUTHORIZED_FISCAL_IMMUTABLE' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $fn$;
CREATE OR REPLACE FUNCTION public.guard_normal_outbound_history() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF TG_TABLE_NAME='nfe_fiscal_snapshots' THEN
  IF EXISTS(SELECT 1 FROM public.nfe_outbound_attempts WHERE snapshot_id=OLD.id) THEN
   RAISE EXCEPTION 'FISCAL_HISTORY_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FISCAL_HISTORY_IMMUTABLE' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','attempt_token','attempt_expires_at','transmission_started_at','response_history','updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','attempt_token','attempt_expires_at','transmission_started_at','response_history','updated_at']) THEN
  RAISE EXCEPTION 'FISCAL_HISTORY_IMMUTABLE' USING ERRCODE='23514';
 END IF;
 IF OLD.state IN ('authorized','rejected') AND NEW.state IS DISTINCT FROM OLD.state OR
    jsonb_array_length(NEW.response_history)<jsonb_array_length(OLD.response_history) OR
    EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.response_history) WITH ORDINALITY e(value,idx)
      WHERE NEW.response_history->((e.idx-1)::integer) IS DISTINCT FROM e.value) THEN
  RAISE EXCEPTION 'FISCAL_HISTORY_IMMUTABLE' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $fn$;
DO $triggers$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='guard_normal_outbound_identity') THEN
  CREATE TRIGGER guard_normal_outbound_identity BEFORE UPDATE OR DELETE ON public.nfe_documents
   FOR EACH ROW EXECUTE FUNCTION public.guard_normal_outbound_identity();
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='guard_normal_outbound_attempt') THEN
  CREATE TRIGGER guard_normal_outbound_attempt BEFORE UPDATE OR DELETE ON public.nfe_outbound_attempts
   FOR EACH ROW EXECUTE FUNCTION public.guard_normal_outbound_history();
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='guard_normal_outbound_snapshot') THEN
  CREATE TRIGGER guard_normal_outbound_snapshot BEFORE UPDATE OR DELETE ON public.nfe_fiscal_snapshots
   FOR EACH ROW EXECUTE FUNCTION public.guard_normal_outbound_history();
 END IF;
END; $triggers$;
DO $grants$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
  ('peek_nfe_outbound_number','reserve_nfe_outbound_number','prepare_nfe_outbound_attempt','claim_nfe_outbound_attempt',
   'release_nfe_outbound_attempt','start_nfe_outbound_transmission','persist_nfe_outbound_result','guard_normal_outbound_identity','guard_normal_outbound_history')
 LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END; $grants$;
