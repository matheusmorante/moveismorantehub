-- Replace __RUN_UUID__ with a fresh UUID before execution. No SOAP or fiscal issuance.
-- The synthetic XML/protocol exercise PostgreSQL persistence boundaries only.
-- Every fixture, including counters and the temporary own-65 decision, rolls back.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='25s';
SET LOCAL search_path=pg_catalog,public,extensions;
DO $test$
DECLARE
 v_run text := 'TEST_AUT___RUN_UUID__';
 v_order text := 'TEST_AUT___RUN_UUID___55'; v_order65 text := 'TEST_AUT___RUN_UUID___65';
 v_customer text := 'TEST_AUT___RUN_UUID___CUSTOMER';
 v_request uuid := '__RUN_UUID__'; v_request65 uuid := gen_random_uuid();
 v_token uuid := gen_random_uuid(); v_token2 uuid := gen_random_uuid();
 v_app jsonb; v_profile jsonb; v_issuer text; v_data jsonb; v_person jsonb; v_decision jsonb;
 v_snapshot jsonb; v_snapshot65 jsonb; v_command jsonb; v_command65 jsonb; v_bad jsonb;
 v_xml text; v_key text; v_key65 text; v_xml65 text; v_query text; v_response text; v_items jsonb;
 v_saved jsonb; v_saved65 jsonb; v_repeat jsonb; v_doc uuid; v_tap text[] := '{}'; v_finish text;
 v_fake text := '98989898000101'; v_fake2 text := '98989898000201'; v_old_seq jsonb;
BEGIN
 IF EXISTS(SELECT 1 FROM public.nfe_establishment_sequences WHERE issuer_cnpj IN(v_fake,v_fake2)) OR
    EXISTS(SELECT 1 FROM public.nfe_legacy_sequence_scope WHERE issuer_cnpj IN(v_fake,v_fake2)) OR
    EXISTS(SELECT 1 FROM public.nfe_sequences WHERE serie::integer=887) OR
    EXISTS(SELECT 1 FROM public.nfe_documents WHERE serie::integer=887) OR
    EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE series::integer=887) OR
    EXISTS(SELECT 1 FROM auth.users WHERE id='00000000-0000-0000-0000-000000000000') THEN
  RAISE EXCEPTION 'Test requires unused synthetic issuer/series/actor fixtures';
 END IF;
 SELECT jsonb_object_agg(modelo||':'||ambiente||':'||serie,ultimo_numero) INTO v_old_seq FROM public.nfe_sequences;
 PERFORM extensions.plan(35);
 v_tap := array_append(v_tap,extensions.ok(
  public.reserve_nfe_outbound_number(v_fake,'55',1,'887',1,1)=1 AND
  public.reserve_nfe_outbound_number(v_fake,'65',1,'887',1,1)=1,
  'model 55/65 have independent numbers'));
 v_tap := array_append(v_tap,extensions.ok(public.reserve_nfe_outbound_number(v_fake,'55',2,'887',1,1)=1,
  'HML/PROD have independent counters (no Production documents)'));
 v_tap := array_append(v_tap,extensions.ok(public.reserve_nfe_outbound_number(v_fake2,'55',1,'887',1,1)=1,
  'establishments have independent counters'));
 v_tap := array_append(v_tap,extensions.ok(public.reserve_nfe_outbound_number(v_fake,'55',1,'886',1,1)=1,
  'series have independent counters'));
 v_query := format('SELECT public.reserve_nfe_outbound_number(%L,''55'',1,''887'',1,1)',v_fake);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514','FISCAL_SEQUENCE_CHANGED','stale reservation loses CAS'));
 v_tap := array_append(v_tap,extensions.ok(public.peek_nfe_outbound_number(v_fake,'55',1,'887',1)=2,
  'losing CAS does not advance the counter'));

 SELECT data INTO v_app FROM public.settings WHERE id='app';
 SELECT jsonb_object_agg(k,v_app->k) FILTER(WHERE v_app->k IS NOT NULL AND v_app->k<>'null'::jsonb) INTO v_profile
 FROM unnest(ARRAY['companyName','companyAddress','companyCnpj','companyIE','companyIM','companyCRT',
  'companyLogradouro','companyNumero','companyBairro','companyCEP','companyCMun','companyXMun','companyUF','companyPhone','cscId']) k;
 v_issuer := regexp_replace(v_profile->>'companyCnpj','[^0-9]','','g');
 SELECT data INTO v_decision FROM public.settings WHERE id='fiscal_decision_simples_nfe55_normal_sale_v1';
 INSERT INTO public.people(id,full_name,cpf_cnpj,person_type_pf_pj,deleted,address)
 VALUES(v_customer,v_run,'12345678909','PF',false,'{"street":"RUA TESTE","number":"10","neighborhood":"CENTRO","city":"Curitiba","state":"PR","cep":"80010000"}');
 SELECT jsonb_build_object('id',id,'fullName',full_name,'cpfCnpj',cpf_cnpj,'address',address,'ie',rg_ie,'personType',person_type_pf_pj)
 INTO v_person FROM public.people WHERE id=v_customer;
 v_data := jsonb_build_object('testRunId',v_run,'customerData',jsonb_build_object('id',v_customer),
  'shipping','{"value":0,"deliveryMethod":"pickup"}'::jsonb,'payments','[]'::jsonb,
  'items',jsonb_build_array(jsonb_build_object('productId',v_run,'description',v_run,'quantity',1,'unitPrice',100)));
 INSERT INTO public.orders(id,order_type,status,deleted,items,order_data,updated_at)
 SELECT fixture,'sale','approved',false,'[]'::jsonb,v_data,clock_timestamp() FROM unnest(ARRAY[v_order,v_order65]) fixture;
 SELECT jsonb_build_object('schemaVersion',1,'capturedAt',clock_timestamp(),'order',jsonb_build_object(
   'id',id,'type',order_type,'status',status,'deleted',deleted,'version',version,'updatedAt',updated_at,'data',order_data),
   'issuerProfile',v_profile,'fiscalInputs',jsonb_build_object('products','{}'::jsonb,'customer',v_person,'contributionDecision',v_decision,'fiscalDefaults',v_app->'fiscalDefaults'),
   'emissionRequest',jsonb_build_object('id',v_request,'requestedModel','55','environment',2,'series','887','number',1,'finalConsumer',false,
    'itemFiscalSelections','{"1":{"ncm":"94036000","cfop":"5102","origem":"0","cest":"","csosn":"102"}}'::jsonb,
    'modelDecision','{"status":"ready","model":"55","finalConsumer":false,"policyVersion":"PR_RETAIL_2026_10"}'::jsonb),
   'decisionTrace','[{"ruleSetVersion":"NORMAL_SALE_V1","decisionId":"TEST_AUT_DB_BOUNDARY"}]'::jsonb)
 INTO v_snapshot FROM public.orders WHERE id=v_order;
 v_command := jsonb_build_object('orderId',v_order,'environment',2,'emissionRequestId',v_request,'finalConsumer',false,
  'itemFiscalSelections',v_snapshot#>'{emissionRequest,itemFiscalSelections}');
 v_key := '41'||to_char(now(),'YYMM')||v_issuer||'55'||'887'||'000000001'||'1'||'12345678'||'0';
 v_xml := '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe'||v_key||'"><ide><mod>55</mod><serie>887</serie><nNF>1</nNF><tpNF>1</tpNF><tpAmb>2</tpAmb><finNFe>1</finNFe></ide>'||
  '<emit><CNPJ>'||v_issuer||'</CNPJ></emit><det nItem="1"><prod><cProd>TEST_AUT</cProd><xProd>TEST_AUT</xProd><qCom>1.0000</qCom><vUnCom>100.00</vUnCom><vProd>100.00</vProd></prod><imposto/></det>'||
  '<total><ICMSTot><vNF>100.00</vNF></ICMSTot></total></infNFe><Signature>TEST_AUT_NOT_A_REAL_SIGNATURE</Signature></NFe>';
 v_query := format('SELECT public.prepare_nfe_outbound_attempt(%L::jsonb,%L,%L,%L::jsonb,%L::uuid,''00000000-0000-0000-0000-000000000000''::uuid,1)',v_snapshot,v_xml,v_key,v_command,v_token);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23503',NULL,'essential attempt insert fails after number/snapshot/document preparation'));
 v_tap := array_append(v_tap,extensions.ok(
  NOT EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request) AND
  NOT EXISTS(SELECT 1 FROM public.nfe_documents WHERE emission_request_id=v_request) AND
  NOT EXISTS(SELECT 1 FROM public.nfe_establishment_sequences WHERE issuer_cnpj=v_issuer AND series='887') AND
  NOT EXISTS(SELECT 1 FROM public.nfe_sequences WHERE serie='887'),
  'failed attempt rolls back snapshot, document and both counter ledgers'));
 v_saved := public.prepare_nfe_outbound_attempt(v_snapshot,v_xml,v_key,v_command,v_token,NULL,1); v_doc := (v_saved->>'documentId')::uuid;
 v_tap := array_append(v_tap,extensions.ok((SELECT state='prepared' AND transmission_started_at IS NULL AND number=1 AND environment=2 AND model='55'
   FROM public.nfe_outbound_attempts WHERE document_id=v_doc),'prepared attempt is durable before transmission'));
 v_tap := array_append(v_tap,extensions.ok((SELECT d.fiscal_snapshot_id=s.id AND s.snapshot_sha256=encode(extensions.digest(convert_to(s.snapshot_data::text,'UTF8'),'sha256'),'hex')
   FROM public.nfe_documents d JOIN public.nfe_fiscal_snapshots s ON s.id=d.fiscal_snapshot_id WHERE d.id=v_doc),'document is linked to a hashed immutable snapshot'));
 v_repeat := public.prepare_nfe_outbound_attempt(v_snapshot,v_xml,v_key,v_command,v_token2,NULL,1);
 v_tap := array_append(v_tap,extensions.ok(v_repeat->>'documentId'=v_saved->>'documentId' AND v_repeat->>'created'='false' AND
   public.peek_nfe_outbound_number(v_issuer,'55',2,'887',1)=2,'identical retry reuses the same attempt and number'));
 v_bad := jsonb_set(v_snapshot,'{emissionRequest,recipientIe}','"TEST_AUT_CHANGED"');
 v_query := format('SELECT public.prepare_nfe_outbound_attempt(%L::jsonb,%L,%L,%L::jsonb,%L::uuid,NULL,1)',v_bad,v_xml,v_key,v_command||'{"recipientIe":"TEST_AUT_CHANGED"}',v_token2);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23505','IDEMPOTENCY_KEY_REUSED','same intent with changed fiscal payload is rejected'));
 v_tap := array_append(v_tap,extensions.ok(NOT public.claim_nfe_outbound_attempt(v_doc,v_token2),'an active lease excludes a second worker'));
 PERFORM public.release_nfe_outbound_attempt(v_doc,v_token);
 v_tap := array_append(v_tap,extensions.ok(public.claim_nfe_outbound_attempt(v_doc,v_token2),'released attempt can be resumed'));
 PERFORM public.start_nfe_outbound_transmission(v_doc,v_token2);
 PERFORM public.persist_nfe_outbound_result(v_doc,v_token2,'reconciling','TEST_AUT_TIMEOUT','',NULL,'[]');
 v_tap := array_append(v_tap,extensions.ok((SELECT state='reconciling' AND transmission_started_at IS NOT NULL AND jsonb_array_length(response_history)=1
   FROM public.nfe_outbound_attempts WHERE document_id=v_doc),'timeout preserves the reserved identity and records reconciliation'));
 v_query := format('SELECT public.start_nfe_outbound_transmission(%L::uuid,%L::uuid)',v_doc,v_token2);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514','FISCAL_ATTEMPT_STATE_CHANGED','uncertain transmission cannot be started again'));
 v_response := '<retConsSitNFe><tpAmb>2</tpAmb><chNFe>'||v_key||'</chNFe><cStat>217</cStat><xMotivo>TEST_AUT_NOT_FOUND</xMotivo></retConsSitNFe>';
 v_query := format('SELECT public.persist_nfe_outbound_result(%L::uuid,%L::uuid,''confirmed_not_found'',''TEST_AUT'',%L,NULL,''[]'')',v_doc,v_token2,replace(v_response,'<tpAmb>2','<tpAmb>1'));
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514','FISCAL_NOT_FOUND_UNVERIFIED','217 from another environment cannot permit retry'));
 PERFORM public.persist_nfe_outbound_result(v_doc,v_token2,'confirmed_not_found','217 TEST_AUT',v_response,NULL,'[]');
 v_tap := array_append(v_tap,extensions.ok((SELECT state='confirmed_not_found' FROM public.nfe_outbound_attempts WHERE document_id=v_doc),'217 is confirmed against the original key and environment'));
 PERFORM public.start_nfe_outbound_transmission(v_doc,v_token2);
 v_response := '<retConsSitNFe><protNFe><infProt><tpAmb>2</tpAmb><chNFe>'||v_key||'</chNFe><cStat>100</cStat><nProt>141260000000001</nProt><xMotivo>TEST_AUT_AUTHORIZED</xMotivo></infProt></protNFe></retConsSitNFe>';
 v_items := '[{"item_number":1,"product_code":"TEST_AUT","description":"TEST_AUT","billed_quantity":1,"unit_value":100,"gross_value":100,"discount_value":0,"product_xml":"<prod/>","taxes_xml":"<imposto/>"}]';
 v_query := format('SELECT public.persist_nfe_outbound_result(%L::uuid,%L::uuid,''authorized'',''TEST_AUT'',%L,''141260000000001'',%L::jsonb)',v_doc,v_token2,replace(v_response,'<tpAmb>2','<tpAmb>1'),v_items);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514','FISCAL_PROTOCOL_MISMATCH','protocol from another environment cannot authorize'));
 v_query := format('SELECT public.persist_nfe_outbound_result(%L::uuid,%L::uuid,''authorized'',''TEST_AUT'',%L,''141260000000001'',%L::jsonb)',v_doc,v_token2,v_response,jsonb_set(v_items,'{0,billed_quantity}','-1'));
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514',NULL,'invalid authorized item aborts finalization'));
 v_tap := array_append(v_tap,extensions.ok((SELECT state='transmitting' AND jsonb_array_length(response_history)=2 FROM public.nfe_outbound_attempts WHERE document_id=v_doc) AND
  (SELECT status='processando' AND numero_protocolo IS NULL FROM public.nfe_documents WHERE id=v_doc) AND
  NOT EXISTS(SELECT 1 FROM public.nfe_document_items WHERE document_id=v_doc),'failed finalization leaves no partial items, protocol or success status'));
 PERFORM public.persist_nfe_outbound_result(v_doc,v_token2,'authorized','TEST_AUT_AUTHORIZED',v_response,'141260000000001',v_items);
 v_tap := array_append(v_tap,extensions.ok((SELECT a.state='authorized' AND d.status='homologada' AND d.numero_protocolo='141260000000001' AND d.valor_total=100
  FROM public.nfe_outbound_attempts a JOIN public.nfe_documents d ON d.id=a.document_id WHERE d.id=v_doc) AND
  (SELECT count(*)=1 FROM public.nfe_document_items WHERE document_id=v_doc),'reconciliation commits protocol, items and final status together'));
 PERFORM public.persist_nfe_outbound_result(v_doc,v_token2,'authorized','TEST_AUT_AUTHORIZED',v_response,'141260000000001',v_items);
 v_tap := array_append(v_tap,extensions.ok((SELECT count(*)=1 FROM public.nfe_document_items WHERE document_id=v_doc) AND
  (SELECT jsonb_array_length(response_history)=3 FROM public.nfe_outbound_attempts WHERE document_id=v_doc),'replayed authorization is idempotent'));
 v_query := format('UPDATE public.nfe_documents SET xml_nfe=''TEST_AUT_MUTATION'' WHERE id=%L::uuid',v_doc);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514','FISCAL_DOCUMENT_IDENTITY_IMMUTABLE','signed XML cannot be rewritten'));
 v_query := format('UPDATE public.nfe_fiscal_snapshots SET snapshot_data=''{}'' WHERE id=%L::uuid',v_saved->>'snapshotId');
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514','FISCAL_HISTORY_IMMUTABLE','snapshot cannot be rewritten'));
 v_query := format('UPDATE public.nfe_outbound_attempts SET request_command=''{}'' WHERE document_id=%L::uuid',v_doc);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514','FISCAL_HISTORY_IMMUTABLE','idempotency payload cannot be rewritten'));
 v_query := format('SET LOCAL ROLE authenticated; UPDATE public.nfe_documents SET status=''pendente'' WHERE id=%L::uuid',v_doc);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'42501',NULL,'browser cannot bypass the server by writing status directly'));
 v_query := format('UPDATE public.nfe_document_items SET description=''TEST_AUT_CHANGED'' WHERE document_id=%L::uuid',v_doc);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514','FISCAL_HISTORY_IMMUTABLE','authorized items cannot be rewritten'));
 v_query := format('DELETE FROM public.nfe_document_items WHERE document_id=%L::uuid',v_doc);
 v_tap := array_append(v_tap,extensions.throws_ok(v_query,'23514','FISCAL_HISTORY_IMMUTABLE','authorized items cannot be deleted'));

 IF NOT EXISTS(SELECT 1 FROM public.settings WHERE id='fiscal_decision_simples_nfce65_normal_sale_v1') THEN
  INSERT INTO public.settings(id,data) VALUES('fiscal_decision_simples_nfce65_normal_sale_v1',jsonb_build_object(
   'testRunId',v_run,'scope','{"model":"65","operation":"normal_sale","issuerCrt":"1"}'::jsonb,
   'pis','{"cst":"99","base":0,"rate":0,"value":0}'::jsonb,'cofins','{"cst":"99","base":0,"rate":0,"value":0}'::jsonb,'confirmedBy',v_run,'confirmedAt',now()));
 END IF;
 SELECT data INTO v_decision FROM public.settings WHERE id='fiscal_decision_simples_nfce65_normal_sale_v1';
 SELECT v_snapshot || jsonb_build_object('order',jsonb_build_object('id',id,'type',order_type,'status',status,'deleted',deleted,'version',version,'updatedAt',updated_at,'data',order_data))
 INTO v_snapshot65 FROM public.orders WHERE id=v_order65;
 v_snapshot65 := jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(v_snapshot65,'{emissionRequest,id}',to_jsonb(v_request65)),
  '{emissionRequest,requestedModel}','"65"'),'{emissionRequest,finalConsumer}','true'),'{emissionRequest,modelDecision}',
  '{"status":"ready","model":"65","finalConsumer":true,"policyVersion":"PR_RETAIL_2026_10"}'),'{fiscalInputs,contributionDecision}',v_decision);
 v_command65 := v_command||jsonb_build_object('orderId',v_order65,'emissionRequestId',v_request65,'finalConsumer',true);
 v_key65 := overlay(v_key placing '65' from 21 for 2); v_xml65 := replace(replace(v_xml,v_key,v_key65),'<mod>55</mod>','<mod>65</mod>');
 v_saved65 := public.prepare_nfe_outbound_attempt(v_snapshot65,v_xml65,v_key65,v_command65,v_token,NULL,1);
 v_tap := array_append(v_tap,extensions.ok((SELECT number=1 AND model='65' AND environment=2 FROM public.nfe_outbound_attempts WHERE document_id=(v_saved65->>'documentId')::uuid),
  'NFC-e reserves its own number using its own scoped decision'));
 v_tap := array_append(v_tap,extensions.ok((SELECT bool_and(ultimo_numero=1) AND count(*)=2 FROM public.nfe_sequences WHERE serie='887' AND ambiente=2),
  'legacy owner counters mirror the new per-establishment ledger without model collision'));
 v_tap := array_append(v_tap,extensions.ok(
  NOT has_function_privilege('authenticated','public.prepare_nfe_outbound_attempt(jsonb,text,text,jsonb,uuid,uuid,integer)','EXECUTE') AND
  NOT has_function_privilege('anon','public.persist_nfe_outbound_result(uuid,uuid,text,text,text,text,jsonb)','EXECUTE') AND
  NOT has_table_privilege('authenticated','public.nfe_outbound_attempts','SELECT') AND
  has_function_privilege('service_role','public.prepare_nfe_outbound_attempt(jsonb,text,text,jsonb,uuid,uuid,integer)','EXECUTE'),
  'only the authorized server role can prepare or finalize attempts'));
 v_tap := array_append(v_tap,extensions.ok(NOT EXISTS(SELECT 1 FROM public.inventory_moves WHERE order_id IN(v_order,v_order65) OR source_order_id IN(v_order,v_order65)) AND
  NOT EXISTS(SELECT 1 FROM public.accounts_receivable WHERE order_id IN(v_order,v_order65)) AND
  NOT EXISTS(SELECT 1 FROM public.financial_transactions WHERE reference_id IN(v_order,v_order65)) AND
  NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id IN(v_order,v_order65)) AND
  NOT EXISTS(SELECT 1 FROM public.order_payments WHERE order_id IN(v_order,v_order65)), 'emission preparation/finalization has no stock or financial effects'));
 v_tap := array_append(v_tap,extensions.ok((SELECT jsonb_object_agg(modelo||':'||ambiente||':'||serie,ultimo_numero) FROM public.nfe_sequences WHERE serie<>'887')=v_old_seq,
  'existing sequence values and historical reservations remain unchanged'));
 v_tap := array_append(v_tap,extensions.ok(NOT EXISTS(SELECT 1 FROM public.nfe_documents WHERE ambiente=1 AND order_id IN(v_order,v_order65)),
  'no Production invoice was created'));
 IF EXISTS(SELECT 1 FROM unnest(v_tap) line WHERE line LIKE 'not ok%') THEN RAISE EXCEPTION 'pgTAP failed: %',array_to_string(v_tap,E'\n'); END IF;
 FOR v_finish IN SELECT * FROM extensions.finish() LOOP
  IF v_finish LIKE '%failed%' OR v_finish LIKE '%planned%' THEN RAISE EXCEPTION '%',v_finish; END IF;
 END LOOP;
END; $test$;
ROLLBACK;
SELECT '35 pgTAP assertions passed; fixtures rolled back' AS result,
 (SELECT count(*) FROM public.orders WHERE id IN('TEST_AUT___RUN_UUID___55','TEST_AUT___RUN_UUID___65')) AS retained_orders,
 (SELECT count(*) FROM public.nfe_outbound_attempts WHERE emission_request_id='__RUN_UUID__'::uuid) AS retained_attempts,
 (SELECT count(*) FROM public.people WHERE id='TEST_AUT___RUN_UUID___CUSTOMER') AS retained_people,
 (SELECT count(*) FROM public.nfe_establishment_sequences WHERE issuer_cnpj IN('98989898000101','98989898000201')) AS retained_counter_fixtures;
