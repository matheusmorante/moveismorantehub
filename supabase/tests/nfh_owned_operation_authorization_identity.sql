-- Requires explicit approval for migration 20261019044835 and this owned replay proof.
-- Uses the original signed XML/SEFAZ reply of the already authorized NFD726.
-- Changes only scalar negative-test arguments; never fabricates a SEFAZ reply.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='2s';
DO $installed$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261019044835') THEN
    RAISE EXCEPTION 'REVIEWED_MIGRATION_REQUIRED';
  END IF;
END;
$installed$;
SET LOCAL ROLE service_role;
DO $proof$
DECLARE
  v_doc public.nfe_documents%ROWTYPE;
  v_draft public.nfe_operation_drafts%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_items jsonb;
  v_date timestamptz;
  v_case text;
  v_protocol text;
  v_status text;
  v_argument_date timestamptz;
  v_result uuid;
  v_blocked boolean;
  v_results jsonb:='[]'::jsonb;
  v_before jsonb;
  v_after jsonb;
  v_ns text[]:=ARRAY[ARRAY['n','http://www.portalfiscal.inf.br/nfe']];
BEGIN
  SELECT * INTO STRICT v_doc FROM public.nfe_documents WHERE id='5e49bcee-cce1-4da4-82a6-93362ed5b546';
  SELECT * INTO STRICT v_draft FROM public.nfe_operation_drafts WHERE id=v_doc.id;
  SELECT * INTO STRICT v_order FROM public.orders WHERE id=v_draft.return_order_id;
  IF v_doc.ambiente IS DISTINCT FROM 2 OR v_doc.status IS DISTINCT FROM 'homologada'
     OR v_doc.numero_nfe IS DISTINCT FROM 726 OR v_doc.document_type IS DISTINCT FROM 'return'
     OR v_draft.status IS DISTINCT FROM 'authorized' OR v_draft.environment IS DISTINCT FROM 2
     OR v_draft.document_id IS DISTINCT FROM v_doc.id
     OR v_draft.original_document_id IS DISTINCT FROM '550a9975-5b63-4dd3-bc6c-befd8da32820'::uuid
     OR v_order.id IS DISTINCT FROM 'a23d279e-8554-4aa8-a001-3c7825321fa7'
     OR v_order.status IS DISTINCT FROM 'fulfilled'
     OR v_order.order_data->>'is_test' IS DISTINCT FROM 'true'
     OR v_order.order_data#>>'{testArtifact,is_test}' IS DISTINCT FROM 'true'
     OR v_order.order_data#>>'{testArtifact,runId}' IS DISTINCT FROM '702b921e-fd31-488d-925e-560602a65510'
     OR v_order.order_data#>>'{testArtifact,ownerId}' IS DISTINCT FROM 'eccde09e-72d8-4efe-a387-eb34114dea39' THEN
    RAISE EXCEPTION 'OWNED_AUTHORIZED_HML_726_REQUIRED';
  END IF;
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'draft_line_id',l.id,'item_number',i.item_number,'product_code',i.product_code,
    'description',i.description,'quantity',i.billed_quantity,'unit_value',i.unit_value,
    'gross_value',i.gross_value,'discount_value',i.discount_value,
    'product_xml',i.product_xml,'taxes_xml',i.taxes_xml) ORDER BY i.item_number)
    INTO v_items FROM public.nfe_document_items i
    JOIN public.nfe_operation_draft_lines l ON l.draft_id=v_draft.id AND l.fiscal_item_number=i.item_number
    WHERE i.document_id=v_doc.id;
  IF v_items IS NULL OR pg_catalog.jsonb_array_length(v_items)<>1 THEN RAISE EXCEPTION 'OWNED_ITEM_REQUIRED'; END IF;
  v_date:=((pg_catalog.xpath('string(//n:infProt/n:dhRecbto)',v_doc.xml_protocolo::xml,v_ns))[1]::text)::timestamptz;

  SELECT pg_catalog.jsonb_build_object(
    'documents',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.id) FROM public.nfe_documents d WHERE d.order_id=v_doc.order_id),
    'drafts',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.id) FROM public.nfe_operation_drafts d WHERE d.original_document_id=v_draft.original_document_id),
    'items',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i) ORDER BY i.id) FROM public.nfe_document_items i WHERE i.document_id IN(SELECT id FROM public.nfe_documents WHERE order_id=v_doc.order_id)),
    'allocations',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.id) FROM public.nfe_return_item_allocations a WHERE a.original_document_id=v_draft.original_document_id),
    'orders',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(o) ORDER BY o.id) FROM public.orders o WHERE o.id IN(v_doc.order_id,v_draft.return_order_id)),
    'moves',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.id) FROM public.inventory_moves m WHERE m.order_id IN(v_doc.order_id,v_draft.return_order_id)),
    'legacySequence',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.id) FROM public.nfe_sequences s WHERE modelo='55' AND serie='1' AND ambiente=2),
    'establishmentSequence',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.series) FROM public.nfe_establishment_sequences s WHERE issuer_cnpj='44512248000107' AND model='55' AND environment=2 AND series='1')) INTO v_before;

  FOREACH v_case IN ARRAY ARRAY['matching','protocol-argument','status-argument','date-argument','missing-date','missing-protocol'] LOOP
    v_protocol:=CASE WHEN v_case='protocol-argument' THEN '111111111111111' WHEN v_case='missing-protocol' THEN NULL ELSE v_doc.numero_protocolo END;
    v_status:=CASE WHEN v_case='status-argument' THEN 'autorizada' ELSE 'homologada' END;
    v_argument_date:=CASE WHEN v_case='missing-date' THEN NULL WHEN v_case='date-argument' THEN v_date+interval '1 second' ELSE v_date END;
    v_blocked:=false; v_result:=NULL;
    BEGIN
      v_result:=public.persist_authorized_nfe_operation_draft(v_draft.id,v_doc.id,v_doc.numero_nfe,
        v_doc.serie,v_doc.chave_acesso,v_doc.xml_nfe,v_doc.xml_protocolo,v_protocol,v_argument_date,
        v_status,v_doc.motivo_status,v_items);
    EXCEPTION WHEN SQLSTATE '23514' OR SQLSTATE '22023' THEN v_blocked:=true;
    END;
    IF (v_case='matching' AND (v_blocked OR v_result IS DISTINCT FROM v_doc.id))
       OR (v_case<>'matching' AND NOT v_blocked) THEN RAISE EXCEPTION 'OWNED_AUTHORIZATION_CASE_FAILED: %',v_case; END IF;
    v_results:=v_results||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('case',v_case,'blocked',v_blocked));
  END LOOP;

  SELECT pg_catalog.jsonb_build_object(
    'documents',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.id) FROM public.nfe_documents d WHERE d.order_id=v_doc.order_id),
    'drafts',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.id) FROM public.nfe_operation_drafts d WHERE d.original_document_id=v_draft.original_document_id),
    'items',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i) ORDER BY i.id) FROM public.nfe_document_items i WHERE i.document_id IN(SELECT id FROM public.nfe_documents WHERE order_id=v_doc.order_id)),
    'allocations',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.id) FROM public.nfe_return_item_allocations a WHERE a.original_document_id=v_draft.original_document_id),
    'orders',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(o) ORDER BY o.id) FROM public.orders o WHERE o.id IN(v_doc.order_id,v_draft.return_order_id)),
    'moves',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.id) FROM public.inventory_moves m WHERE m.order_id IN(v_doc.order_id,v_draft.return_order_id)),
    'legacySequence',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.id) FROM public.nfe_sequences s WHERE modelo='55' AND serie='1' AND ambiente=2),
    'establishmentSequence',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.series) FROM public.nfe_establishment_sequences s WHERE issuer_cnpj='44512248000107' AND model='55' AND environment=2 AND series='1')) INTO v_after;
  IF v_after IS DISTINCT FROM v_before THEN RAISE EXCEPTION 'OWNED_AUTHORIZATION_STATE_CHANGED'; END IF;
  PERFORM pg_catalog.set_config('test.nfh_owned_authorization_identity_proof',pg_catalog.jsonb_build_object(
    'documentId',v_doc.id,'environment',2,'cases',v_results,'originalXmlAndReplyUsed',true,
    'beforeHash',pg_catalog.md5(v_before::text),'afterHash',pg_catalog.md5(v_after::text),
    'stateUnchanged',true,'verified',true)::text,true);
END;
$proof$;
SELECT pg_catalog.current_setting('test.nfh_owned_authorization_identity_proof')::jsonb AS proof;
ROLLBACK;
