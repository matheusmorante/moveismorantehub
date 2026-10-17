-- Target: MoranteHub hkoxhourxwlddgsfdgws, primary branch, public.
-- 1. Complete NT 2026.004 v1.01 alphanumeric CNPJ & 44-char access key support in inbound_manifestation_events and reserve_inbound_manifestation_event.
-- 2. Enable fiscal cancellation (tpEvento = 110111) for authorized return (finNFe = 4) and estorno (finNFe = 3) NF-e model 55 documents in reserve_nfe_cancellation_event and persist_nfe_cancellation_result, releasing nfe_return_item_allocations and transitioning nfe_operation_drafts to 'cancelled' atomically.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 1. Inbound manifestation alphanumeric CNPJ & access key constraints
ALTER TABLE public.inbound_manifestation_events
  DROP CONSTRAINT inbound_manifestation_events_access_key_check,
  ADD CONSTRAINT inbound_manifestation_events_access_key_check
    CHECK (((access_key)::text ~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'::text));

ALTER TABLE public.inbound_manifestation_events
  DROP CONSTRAINT inbound_manifestation_events_recipient_cnpj_check,
  ADD CONSTRAINT inbound_manifestation_events_recipient_cnpj_check
    CHECK (((recipient_cnpj)::text ~ '^[A-Z0-9]{12}[0-9]{2}$'::text));

CREATE OR REPLACE FUNCTION public.reserve_inbound_manifestation_event(
  p_access_key text,
  p_environment integer,
  p_recipient_cnpj text,
  p_signed_xml text,
  p_user_id uuid,
  p_request_id uuid
)
RETURNS TABLE(event_id uuid, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_invoice public.inbound_invoices%ROWTYPE;
  v_latest_id uuid;
  v_latest_status text;
  v_attempt_number integer;
  v_new_id uuid;
BEGIN
  IF p_access_key IS NULL OR p_access_key !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
     OR p_environment IS NULL OR p_environment NOT IN (1, 2)
     OR p_recipient_cnpj IS NULL OR p_recipient_cnpj !~ '^[A-Z0-9]{12}[0-9]{2}$'
     OR p_user_id IS NULL OR p_request_id IS NULL
     OR btrim(COALESCE(p_signed_xml, '')) = '' THEN
    RAISE EXCEPTION 'INVALID_INBOUND_MANIFESTATION_REQUEST';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('inbound_manifestation:' || p_environment::text || ':' || p_access_key, 0)
  );

  SELECT * INTO v_invoice
    FROM public.inbound_invoices
   WHERE chave_acesso = p_access_key
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INBOUND_INVOICE_NOT_FOUND'; END IF;
  IF v_invoice.ambiente IS DISTINCT FROM p_environment THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_ENVIRONMENT_MISMATCH';
  END IF;
  IF regexp_replace(upper(COALESCE(v_invoice.destinatario_cnpj, '')), '[^A-Z0-9]', '', 'g') <> p_recipient_cnpj
     OR substring(p_access_key from 7 for 14) <> p_recipient_cnpj THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_RECIPIENT_MISMATCH';
  END IF;
  IF substring(p_access_key from 21 for 2) <> '55' THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_REQUIRES_MODEL_55';
  END IF;
  IF v_invoice.status_sefaz <> 'autorizada' THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_REQUIRES_AUTHORIZED_NFE';
  END IF;
  IF COALESCE(v_invoice.xml_conteudo, '') !~ '<([[:alnum:]_.-]+:)?resNFe([[:space:]>])' THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_REQUIRES_SUMMARY';
  END IF;

  SELECT id INTO v_latest_id
    FROM public.inbound_manifestation_events
   WHERE access_key = p_access_key
     AND event_type = '210210'
     AND environment = p_environment
     AND request_id = p_request_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_latest_id, false;
    RETURN;
  END IF;

  SELECT id, status INTO v_latest_id, v_latest_status
    FROM public.inbound_manifestation_events
   WHERE access_key = p_access_key
     AND event_type = '210210'
     AND environment = p_environment
   ORDER BY attempt_number DESC
   LIMIT 1;

  IF v_latest_status IN ('transmitting', 'unknown') THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_PREVIOUS_EVENT_PENDING';
  ELSIF v_latest_status = 'registered' THEN
    RETURN QUERY SELECT v_latest_id, false;
    RETURN;
  END IF;

  SELECT COALESCE(max(attempt_number), 0) + 1
    INTO v_attempt_number
    FROM public.inbound_manifestation_events
   WHERE access_key = p_access_key
     AND event_type = '210210'
     AND environment = p_environment;

  INSERT INTO public.inbound_manifestation_events (
    inbound_invoice_id, access_key, event_type, event_sequence, attempt_number,
    environment, recipient_cnpj, status, signed_xml, request_id, requested_by
  ) VALUES (
    v_invoice.id, p_access_key, '210210', 1, v_attempt_number,
    p_environment, p_recipient_cnpj, 'transmitting', p_signed_xml, p_request_id, p_user_id
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, true;
END;
$function$;

-- 2. Operation drafts status 'cancelled' and partial unique indexes
ALTER TABLE public.nfe_operation_drafts
  DROP CONSTRAINT nfe_operation_drafts_status_check,
  ADD CONSTRAINT nfe_operation_drafts_status_check
    CHECK ((status = ANY (ARRAY['draft'::text, 'ready'::text, 'transmitting'::text, 'authorized'::text, 'rejected'::text, 'unknown'::text, 'cancelled'::text])));

DROP INDEX IF EXISTS public.uq_nfe_estorno_draft_source;
CREATE UNIQUE INDEX uq_nfe_estorno_draft_source
  ON public.nfe_operation_drafts USING btree (original_document_id, environment)
  WHERE ((operation_kind = 'estorno'::text) AND (status <> ALL (ARRAY['rejected'::text, 'cancelled'::text])));

DROP INDEX IF EXISTS public.uq_nfe_return_draft_source_order;
CREATE UNIQUE INDEX uq_nfe_return_draft_source_order
  ON public.nfe_operation_drafts USING btree (original_document_id, return_order_id, environment)
  WHERE ((operation_kind = 'return'::text) AND (status <> ALL (ARRAY['rejected'::text, 'cancelled'::text])));

CREATE OR REPLACE FUNCTION public.prepare_nfe_operation_draft(
  p_kind text,
  p_original_document_id uuid,
  p_return_order_id text,
  p_environment smallint,
  p_reason text,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_source public.nfe_documents%ROWTYPE;
  v_sale public.orders%ROWTYPE;
  v_return public.orders%ROWTYPE;
  v_existing_id uuid;
  v_draft_id uuid;
  v_source_line record;
  v_quantity numeric;
  v_item_number integer := 0;
  v_delivery_status text;
BEGIN
  IF p_kind NOT IN ('estorno', 'return') OR p_environment NOT IN (1, 2) THEN
    RAISE EXCEPTION 'Tipo ou ambiente fiscal inválido';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_original_document_id::text));
  SELECT * INTO v_source FROM public.nfe_documents
   WHERE id = p_original_document_id FOR UPDATE;
  IF NOT FOUND OR v_source.document_type <> 'outbound'
     OR v_source.ambiente <> p_environment
     OR v_source.status <> (CASE WHEN p_environment = 1 THEN 'autorizada' ELSE 'homologada' END)
     OR NOT (
       (p_kind = 'estorno' AND v_source.modelo IN ('55', '65'))
       OR (p_kind = 'return' AND v_source.modelo = '55')
     )
     OR COALESCE(v_source.numero_protocolo, '') !~ '^[0-9]{15}$'
     OR COALESCE(v_source.chave_acesso, '') !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
     OR substring(COALESCE(v_source.chave_acesso, '') FROM 21 FOR 2) <> v_source.modelo THEN
    RAISE EXCEPTION 'Documento fiscal original não autorizado no ambiente selecionado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.nfe_document_items WHERE document_id = v_source.id) THEN
    RAISE EXCEPTION 'Documento fiscal original sem linhas conferidas; reconciliação necessária';
  END IF;
  SELECT * INTO v_sale FROM public.orders WHERE id = v_source.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda original não encontrada'; END IF;

  SELECT id INTO v_existing_id FROM public.nfe_operation_drafts
   WHERE operation_kind = p_kind AND original_document_id = p_original_document_id
     AND environment = p_environment
     AND return_order_id IS NOT DISTINCT FROM p_return_order_id
     AND status NOT IN ('rejected', 'cancelled')
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN v_existing_id; END IF;

  IF p_kind = 'estorno' THEN
    IF p_return_order_id IS NOT NULL OR length(btrim(COALESCE(p_reason, ''))) < 15 THEN
      RAISE EXCEPTION 'Estorno exige justificativa e não pode apontar uma devolução';
    END IF;
    IF lower(btrim(COALESCE(v_sale.status, ''))) NOT IN ('cancelled', 'cancelado')
       AND NOT EXISTS (
         SELECT 1 FROM public.nfe_order_edit_replacements r
          WHERE r.original_document_id = v_source.id
            AND r.order_id = v_sale.id
            AND r.environment = p_environment
            AND r.reversal_kind = 'estorno'
            AND r.status = 'awaiting_reversal'
            AND v_sale.status = 'scheduled'
            AND NOT public.order_has_fiscal_circulation(to_jsonb(v_sale))
            AND NOT public.order_has_delivery_in_progress(to_jsonb(v_sale))
       ) THEN
      RAISE EXCEPTION 'Venda comercial precisa estar cancelada antes de preparar estorno';
    END IF;
    v_delivery_status := lower(btrim(COALESCE(
      NULLIF(v_sale.delivery_status, ''),
      NULLIF(v_sale.order_data ->> 'deliveryStatus', ''),
      NULLIF(v_sale.order_data #>> '{shipping,deliveryStatus}', ''),
      ''
    )));
    IF lower(btrim(COALESCE(v_sale.status, ''))) IN (
         'fulfilled', 'atendido', 'completed', 'delivered', 'entregue', 'retirado', 'collected'
       )
       OR v_delivery_status IN (
         'in_transit', 'in-transit', 'delivered', 'completed', 'finished',
         'out_for_delivery', 'out-for-delivery', 'em_rota', 'em rota', 'em_entrega', 'em entrega',
         'collected', 'em_transito', 'entregue', 'concluido', 'coletado', 'retirado',
         'returned', 'returned_to_store', 'returning', 'refused', 'recusado', 'devolvido'
       )
       OR v_sale.delivery_started_at IS NOT NULL
       OR v_sale.delivery_arrived_at IS NOT NULL
       OR v_sale.delivery_finished_at IS NOT NULL
       OR COALESCE(v_sale.order_data #>> '{shipping,deliveryStartedAt}', '') <> ''
       OR COALESCE(v_sale.order_data #>> '{shipping,deliveryArrivedAt}', '') <> ''
       OR COALESCE(v_sale.order_data #>> '{shipping,deliveryFinishedAt}', '') <> ''
       OR COALESCE(v_sale.order_data #>> '{shipping,unattendedAt}', '') <> ''
       OR COALESCE(v_sale.order_data #>> '{shipping,pickupConfirmedAt}', '') <> ''
       OR COALESCE(v_sale.order_data ->> 'deliveryFinishedAt', '') <> ''
       OR COALESCE(v_sale.order_data ->> 'pickupConfirmedAt', '') <> '' THEN
      RAISE EXCEPTION 'Venda com evidência de circulação não é elegível a estorno; verifique devolução ou retorno';
    END IF;
  ELSE
    IF p_return_order_id IS NULL THEN RAISE EXCEPTION 'Devolução comercial obrigatória'; END IF;
    SELECT * INTO v_return FROM public.orders WHERE id = p_return_order_id FOR UPDATE;
    IF NOT FOUND OR v_return.order_type <> 'return' OR v_return.status <> 'fulfilled'
       OR (v_return.linked_order_id IS DISTINCT FROM v_source.order_id::text
           AND v_return.order_data->>'linkedOrderId' IS DISTINCT FROM v_source.order_id::text) THEN
      RAISE EXCEPTION 'A devolução precisa estar atendida e vinculada à venda faturada';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.nfe_return_item_allocations
       WHERE return_order_id = p_return_order_id AND original_document_id = p_original_document_id
         AND fiscal_return_document_id IS NULL
    ) THEN RAISE EXCEPTION 'Devolução sem itens fiscais ainda disponíveis para vincular à NF-e'; END IF;
  END IF;

  INSERT INTO public.nfe_operation_drafts(
    operation_kind, finalidade, original_document_id, original_access_key,
    return_order_id, environment, reason, created_by
  ) VALUES (
    p_kind, CASE WHEN p_kind = 'estorno' THEN 3 ELSE 4 END,
    v_source.id, v_source.chave_acesso, p_return_order_id, p_environment,
    NULLIF(btrim(p_reason), ''), p_user_id
  ) RETURNING id INTO v_draft_id;

  FOR v_source_line IN SELECT * FROM public.nfe_document_items
                         WHERE document_id = v_source.id ORDER BY item_number LOOP
    IF p_kind = 'estorno' THEN
      v_quantity := v_source_line.billed_quantity;
    ELSE
      SELECT COALESCE(sum(quantity), 0) INTO v_quantity
        FROM public.nfe_return_item_allocations
       WHERE return_order_id = p_return_order_id
         AND original_document_id = v_source.id
         AND original_item_number = v_source_line.item_number
         AND fiscal_return_document_id IS NULL;
    END IF;
    IF v_quantity = 0 THEN CONTINUE; END IF;
    IF v_quantity > v_source_line.billed_quantity THEN
      RAISE EXCEPTION 'Quantidade da devolução acima da linha faturada';
    END IF;
    v_item_number := v_item_number + 1;
    INSERT INTO public.nfe_operation_draft_lines(
      draft_id, original_document_item_id, fiscal_item_number, quantity,
      gross_value, discount_value
    ) VALUES (
      v_draft_id, v_source_line.id, v_item_number, v_quantity,
      round(v_source_line.gross_value * v_quantity / v_source_line.billed_quantity, 2),
      round(v_source_line.discount_value * v_quantity / v_source_line.billed_quantity, 2)
    );
  END LOOP;
  IF v_item_number = 0 THEN RAISE EXCEPTION 'Rascunho fiscal sem itens devolvidos'; END IF;

  IF p_kind = 'return' THEN
    INSERT INTO public.nfe_operation_draft_allocations(draft_line_id, allocation_id)
    SELECT line.id, allocation.id
      FROM public.nfe_operation_draft_lines AS line
      JOIN public.nfe_document_items AS source_line ON source_line.id = line.original_document_item_id
      JOIN public.nfe_return_item_allocations AS allocation
        ON allocation.original_document_id = source_line.document_id
       AND allocation.original_item_number = source_line.item_number
     WHERE line.draft_id = v_draft_id AND allocation.return_order_id = p_return_order_id
       AND allocation.fiscal_return_document_id IS NULL;
  END IF;
  RETURN v_draft_id;
END;
$function$;

-- 3. Cancellation reservation & confirmation for outbound, return, and estorno NF-e
CREATE OR REPLACE FUNCTION public.reserve_nfe_cancellation_event(
  p_document_id uuid,
  p_environment integer,
  p_signed_xml text,
  p_reason text,
  p_user_id uuid,
  p_previous_event_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  d public.nfe_documents%ROWTYPE;
  e public.nfe_document_events%ROWTYPE;
  event_id uuid;
BEGIN
  IF current_user NOT IN ('service_role','postgres','supabase_admin') THEN
    RAISE EXCEPTION 'FISCAL_SERVER_WRITE_REQUIRED' USING ERRCODE='42501';
  END IF;
  SELECT * INTO STRICT d FROM public.nfe_documents WHERE id=p_document_id FOR UPDATE;
  IF d.ambiente IS DISTINCT FROM p_environment OR p_environment NOT IN (1,2) OR
     d.status IS DISTINCT FROM (CASE WHEN p_environment=1 THEN 'autorizada' ELSE 'homologada' END) OR
     d.document_type NOT IN ('outbound','return','estorno') OR d.modelo NOT IN ('55','65') OR
     (d.document_type IN ('return','estorno') AND (d.modelo <> '55' OR d.original_document_id IS NULL)) OR
     (d.document_type = 'return' AND d.related_return_order_id IS NULL) OR
     nullif(d.numero_protocolo,'') IS NULL OR nullif(p_signed_xml,'') IS NULL OR
     p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 15 AND 255 OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'CANCELLATION_DOCUMENT_INVALID' USING ERRCODE='23514';
  END IF;
  IF d.document_type = 'estorno' AND EXISTS (
    SELECT 1 FROM public.nfe_order_edit_replacements r
     WHERE r.original_document_id = d.original_document_id
       AND r.environment = d.ambiente
       AND r.reversal_kind = 'estorno'
       AND r.status IN ('ready_to_reissue','replacement_prepared','completed')
  ) THEN
    RAISE EXCEPTION 'CANCELLATION_DOCUMENT_INVALID' USING ERRCODE='23514';
  END IF;
  SELECT * INTO e FROM public.nfe_document_events
    WHERE document_id=d.id AND event_type='110111'
    ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE;
  IF e.id IS DISTINCT FROM p_previous_event_id OR
     (e.id IS NOT NULL AND (e.status<>'rejected' OR e.environment<>p_environment)) THEN
    RAISE EXCEPTION 'CANCELLATION_ATTEMPT_CHANGED' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.nfe_document_events(document_id,event_type,event_sequence,attempt_number,
    environment,status,justification,signed_xml,requested_by)
  VALUES(d.id,'110111',1,coalesce(e.attempt_number,0)+1,p_environment,'transmitting',
    p_reason,p_signed_xml,p_user_id) RETURNING id INTO event_id;
  RETURN jsonb_build_object('eventId',event_id,'status','transmitting');
END;
$function$;

CREATE OR REPLACE FUNCTION public.persist_nfe_cancellation_result(
  p_document_id uuid,
  p_event_id uuid,
  p_environment integer,
  p_status text,
  p_response_xml text,
  p_cstat text,
  p_reason text,
  p_protocol text DEFAULT NULL::text,
  p_protocol_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_consultation_started_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  d public.nfe_documents%ROWTYPE;
  e public.nfe_document_events%ROWTYPE;
  response xml;
  matches xml[];
  ns text[][] := ARRAY[ARRAY['n','http://www.portalfiscal.inf.br/nfe']];
BEGIN
  IF current_user NOT IN ('service_role','postgres','supabase_admin') THEN
    RAISE EXCEPTION 'FISCAL_SERVER_WRITE_REQUIRED' USING ERRCODE='42501';
  END IF;
  -- Same lock order in reservation and confirmation prevents duplicate attempts/deadlocks.
  SELECT * INTO STRICT d FROM public.nfe_documents WHERE id=p_document_id FOR UPDATE;
  SELECT * INTO STRICT e FROM public.nfe_document_events WHERE id=p_event_id FOR UPDATE;
  IF e.document_id IS DISTINCT FROM d.id OR e.environment IS DISTINCT FROM d.ambiente OR
     d.ambiente IS DISTINCT FROM p_environment OR p_environment NOT IN (1,2) OR
     e.event_type<>'110111' OR e.event_sequence<>1 OR
     p_status IS NULL OR p_status NOT IN ('registered','rejected','unknown') THEN
    RAISE EXCEPTION 'CANCELLATION_EVENT_IDENTITY_MISMATCH' USING ERRCODE='23514';
  END IF;
  IF e.status='registered' THEN
    IF p_status<>'registered' OR e.protocol_number IS DISTINCT FROM p_protocol THEN
      RAISE EXCEPTION 'REGISTERED_CANCELLATION_IMMUTABLE' USING ERRCODE='23514';
    END IF;
    IF d.status='cancelada' THEN
      IF d.document_type IN ('return','estorno') THEN
        UPDATE public.nfe_operation_drafts SET status='cancelled', updated_at=now()
          WHERE document_id=d.id AND status='authorized';
        IF d.document_type='return' THEN
          UPDATE public.nfe_return_item_allocations SET fiscal_return_document_id=NULL
            WHERE fiscal_return_document_id=d.id;
        END IF;
      END IF;
      RETURN jsonb_build_object('eventId',e.id,'status','registered','idempotent',true);
    END IF;
    -- Repair a legacy partial commit only after validating the same proof below.
  END IF;
  IF d.status NOT IN ('autorizada','homologada','cancelada') OR
     (d.status<>'cancelada' AND d.status IS DISTINCT FROM
       (CASE WHEN p_environment=1 THEN 'autorizada' ELSE 'homologada' END)) THEN
    RAISE EXCEPTION 'CANCELLATION_DOCUMENT_STATE_MISMATCH' USING ERRCODE='23514';
  END IF;
  IF p_status='registered' THEN
    IF p_cstat IS NULL OR p_cstat NOT IN ('135','155') OR p_protocol IS NULL OR
       p_protocol !~ '^[0-9]{15}$' OR p_protocol_date IS NULL OR
       nullif(p_response_xml,'') IS NULL OR p_response_xml ~* '<!(DOCTYPE|ENTITY)' THEN
      RAISE EXCEPTION 'CANCELLATION_PROOF_REQUIRED' USING ERRCODE='23514';
    END IF;
    response := xmlparse(document p_response_xml);
    matches := xpath('//n:retEvento/n:infEvento[n:tpEvento="110111"]',response,ns);
    IF cardinality(matches)<>1 OR
       (xpath('string(//n:chNFe)',matches[1],ns))[1]::text IS DISTINCT FROM d.chave_acesso OR
       (xpath('string(//n:tpAmb)',matches[1],ns))[1]::text IS DISTINCT FROM p_environment::text OR
       (xpath('string(//n:nSeqEvento)',matches[1],ns))[1]::text IS DISTINCT FROM '1' OR
       (xpath('string(//n:cStat)',matches[1],ns))[1]::text IS DISTINCT FROM p_cstat OR
       (xpath('string(//n:nProt)',matches[1],ns))[1]::text IS DISTINCT FROM p_protocol OR
       (xpath('string(//n:dhRegEvento)',matches[1],ns))[1]::text::timestamptz IS DISTINCT FROM p_protocol_date THEN
      RAISE EXCEPTION 'CANCELLATION_RESPONSE_MISMATCH' USING ERRCODE='23514';
    END IF;
  ELSIF d.status='cancelada' OR EXISTS (
    SELECT 1 FROM public.nfe_document_events newer
    WHERE newer.document_id=d.id AND newer.event_type='110111'
      AND newer.attempt_number>e.attempt_number
  ) THEN
    RAISE EXCEPTION 'CANCELLATION_ATTEMPT_CHANGED' USING ERRCODE='40001';
  END IF;
  -- A consultation started before/during an in-flight send cannot release it.
  -- The transport deadline is 25 seconds; use the same 30-second floor as the API.
  IF p_status='rejected' AND p_cstat='100' AND e.status IN ('transmitting','unknown') AND
     (p_consultation_started_at IS NULL OR p_consultation_started_at>clock_timestamp() OR
      p_consultation_started_at<e.requested_at + interval '30 seconds') THEN
    RAISE EXCEPTION 'CANCELLATION_CONSULTATION_TOO_EARLY' USING ERRCODE='40001';
  END IF;
  UPDATE public.nfe_document_events SET status=p_status,response_xml=p_response_xml,
    cstat=p_cstat,xmotivo=p_reason,protocol_number=p_protocol,protocol_date=p_protocol_date,
    confirmed_at=CASE WHEN p_status='registered' THEN coalesce(e.confirmed_at,now()) ELSE NULL END
    WHERE id=e.id;
  IF p_status='registered' THEN
    UPDATE public.nfe_documents SET status='cancelada',motivo_status=p_reason,updated_at=now()
      WHERE id=d.id;
    IF d.document_type IN ('return','estorno') THEN
      UPDATE public.nfe_operation_drafts SET status='cancelled', updated_at=now()
        WHERE document_id=d.id AND status='authorized';
      IF d.document_type='return' THEN
        UPDATE public.nfe_return_item_allocations SET fiscal_return_document_id=NULL
          WHERE fiscal_return_document_id=d.id;
      END IF;
    END IF;
  END IF;
  -- Any trigger/constraint failure rolls back ALL statements. No exception fallback.
  RETURN jsonb_build_object('eventId',e.id,'status',p_status,'idempotent',false);
END;
$function$;

COMMIT;
