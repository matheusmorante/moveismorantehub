-- Paraná: edição fiscal sem circulação, reversão integral e nova emissão.
-- Não transmite à SEFAZ. A intenção é persistida antes da reversão externa.
-- Após a confirmação fiscal, pedido/estoque/pagamentos são atualizados juntos.
CREATE TABLE public.nfe_order_edit_replacements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  request_hash text NOT NULL,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  expected_updated_at timestamptz NOT NULL,
  original_document_id uuid NOT NULL UNIQUE REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  environment smallint NOT NULL CHECK (environment IN (1,2)),
  reversal_kind text NOT NULL CHECK (reversal_kind IN ('cancel','estorno')),
  status text NOT NULL DEFAULT 'awaiting_reversal' CHECK (status IN ('awaiting_reversal','ready_to_reissue','replacement_prepared','completed')),
  original_order_data jsonb NOT NULL,
  edited_order_data jsonb NOT NULL,
  edited_order_payload jsonb NOT NULL,
  edited_items jsonb NOT NULL,
  edited_payments jsonb NOT NULL,
  source_document_snapshot jsonb NOT NULL,
  operation_draft_id uuid REFERENCES public.nfe_operation_drafts(id) ON DELETE RESTRICT,
  replacement_document_id uuid REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(request_id,original_document_id)
);
CREATE INDEX nfe_order_edit_replacements_order ON public.nfe_order_edit_replacements(order_id,environment);
CREATE INDEX nfe_order_edit_replacements_request ON public.nfe_order_edit_replacements(request_id);
ALTER TABLE public.nfe_order_edit_replacements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nfe_order_edit_replacements FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.nfe_order_edit_replacements TO service_role;

CREATE FUNCTION public.fiscal_order_edit_projection(p_data jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object(
  'items',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'productId',i->'productId','variationId',i->'variationId','code',i->'code',
    'description',i->'description','quantity',i->'quantity','unitPrice',i->'unitPrice',
    'unitDiscount',i->'unitDiscount','discountType',i->'discountType','itemType',i->'itemType',
    'condition',i->'condition','fiscal',i->'fiscal') ORDER BY n),'[]'::jsonb)
    FROM jsonb_array_elements(coalesce(p_data->'items','[]')) WITH ORDINALITY t(i,n)),
  'customer',(p_data->'customerData') - ARRAY['phone','noPhone','email','additionalContacts','marketingOrigin'],
  'shipping',jsonb_build_object('value',p_data#>'{shipping,value}',
    'deliveryMethod',p_data#>'{shipping,deliveryMethod}',
    'freightMode',p_data#>'{shipping,freightMode}',
    'transporter',p_data#>'{shipping,transporter}',
    'useCustomerAddress',p_data#>'{shipping,useCustomerAddress}',
    'deliveryAddress',p_data#>'{shipping,deliveryAddress}'),
  'payments',(SELECT coalesce(jsonb_agg(p - ARRAY['fee','feeType','observation','id'] ORDER BY n),'[]'::jsonb)
    FROM jsonb_array_elements(coalesce(p_data->'payments','[]')) WITH ORDINALITY t(p,n)),
  'total',p_data#>'{paymentsSummary,totalOrderValue}','fiscalContext',p_data->'fiscalContext');
$$;

CREATE FUNCTION public.order_has_fiscal_circulation(p_order jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM unnest(ARRAY[p_order->>'status',p_order#>>'{order_data,status}',
   p_order->>'delivery_status',p_order#>>'{order_data,deliveryStatus}',
   p_order#>>'{order_data,shipping,deliveryStatus}']) s(value)
   WHERE lower(btrim(value)) IN ('fulfilled','atendido','delivered','entregue','retirado'))
 OR EXISTS (SELECT 1 FROM unnest(ARRAY[p_order->>'delivery_finished_at',p_order#>>'{order_data,deliveryFinishedAt}',
   p_order#>>'{order_data,shipping,deliveryFinishedAt}',p_order#>>'{order_data,pickupConfirmedAt}',
   p_order#>>'{order_data,shipping,pickupConfirmedAt}']) t(value) WHERE nullif(btrim(value),'') IS NOT NULL);
$$;

CREATE FUNCTION public.order_has_delivery_in_progress(p_order jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM unnest(ARRAY[p_order->>'delivery_status',
   p_order#>>'{order_data,deliveryStatus}',p_order#>>'{order_data,shipping,deliveryStatus}']) s(value)
   WHERE lower(btrim(value)) IN
   ('in_transit','in-transit','out_for_delivery','out-for-delivery','em_transito','em_rota','em rota',
    'em_entrega','em entrega','in_progress','in_service','unattended','refused','recusado',
    'returning','returned','returned_to_store','devolvido'))
 OR coalesce(p_order#>>'{order_data,autoFulfilledAfter12h}','false')='true'
 OR EXISTS (SELECT 1 FROM unnest(ARRAY[p_order->>'delivery_started_at',p_order->>'delivery_arrived_at',
   p_order#>>'{order_data,shipping,deliveryStartedAt}',p_order#>>'{order_data,shipping,deliveryArrivedAt}',
   p_order#>>'{order_data,shipping,unattendedAt}']) t(value) WHERE nullif(btrim(value),'') IS NOT NULL);
$$;

CREATE FUNCTION public.is_order_edit_reversal_confirmed(p_original_document_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r
 JOIN public.nfe_documents d ON d.id=r.original_document_id AND d.order_id=r.order_id AND d.ambiente=r.environment
 WHERE r.original_document_id=p_original_document_id AND (
   r.reversal_kind='cancel' AND d.status='cancelada' AND EXISTS (
     SELECT 1 FROM public.nfe_document_events e WHERE e.document_id=d.id AND e.environment=d.ambiente
     AND e.event_type='110111' AND e.status='registered' AND e.protocol_number IS NOT NULL)
   OR r.reversal_kind='estorno' AND EXISTS (
     SELECT 1 FROM public.nfe_operation_drafts draft JOIN public.nfe_documents reverse ON reverse.id=draft.document_id
     WHERE draft.id=r.operation_draft_id AND draft.original_document_id=d.id AND draft.environment=d.ambiente
     AND draft.operation_kind='estorno' AND draft.status='authorized'
     AND reverse.original_document_id=d.id AND reverse.ambiente=d.ambiente AND reverse.modelo='55'
     AND reverse.document_type='estorno' AND reverse.status=CASE WHEN d.ambiente=1 THEN 'autorizada' ELSE 'homologada' END
     AND reverse.numero_protocolo IS NOT NULL AND reverse.xml_nfe IS NOT NULL
   )
 ));
$$;
REVOKE ALL ON FUNCTION public.is_order_edit_reversal_confirmed(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_order_edit_reversal_confirmed(uuid) TO service_role;

CREATE FUNCTION public.guard_order_fiscal_edit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_changed boolean;
BEGIN
 v_changed:=public.fiscal_order_edit_projection(OLD.order_data) IS DISTINCT FROM public.fiscal_order_edit_projection(NEW.order_data);
 IF current_setting('morante.fiscal_order_edit',true)=NEW.id THEN RETURN NEW; END IF;
 IF EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r WHERE r.order_id=OLD.id AND r.status<>'completed') THEN
   RAISE EXCEPTION 'FISCAL_ORDER_EDIT_PENDING: conclua a substituição fiscal antes de editar ou entregar';
 END IF;
 IF v_changed AND EXISTS (SELECT 1 FROM public.nfe_documents d
    WHERE d.order_id=OLD.id AND d.document_type='outbound' AND d.status IN ('autorizada','homologada')
    AND NOT EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r WHERE r.original_document_id=d.id AND r.status='completed')) THEN
   RAISE EXCEPTION 'FISCAL_ORDER_EDIT_CONFIRMATION_REQUIRED';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER zz_guard_order_fiscal_edit BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_fiscal_edit();

-- Extend the existing reviewed draft pipeline; all circulation and original-item checks remain.
DO $$ DECLARE v_source text; v_anchor text; BEGIN
 v_source:=pg_get_functiondef('public.prepare_nfe_operation_draft(text,uuid,text,smallint,text,uuid)'::regprocedure);
 v_anchor:=$anchor$IF lower(btrim(COALESCE(v_sale.status, ''))) NOT IN ('cancelled', 'cancelado') THEN$anchor$;
 IF strpos(v_source,v_anchor)=0 THEN RAISE EXCEPTION 'PREPARE_ESTORNO_PATCH_ANCHOR_MISSING'; END IF;
 v_source:=replace(v_source,v_anchor,$replacement$IF lower(btrim(COALESCE(v_sale.status, ''))) NOT IN ('cancelled', 'cancelado')
 AND NOT EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r
   WHERE r.original_document_id=v_source.id AND r.order_id=v_sale.id AND r.environment=p_environment
   AND r.reversal_kind='estorno' AND r.status='awaiting_reversal' AND v_sale.status='scheduled'
   AND NOT public.order_has_fiscal_circulation(to_jsonb(v_sale))
   AND NOT public.order_has_delivery_in_progress(to_jsonb(v_sale))) THEN$replacement$);
 EXECUTE v_source;
END; $$;

CREATE FUNCTION public.commit_fiscal_order_edit(
 p_request_id uuid,p_order_id text,p_expected_updated_at timestamptz,p_order_payload jsonb,
 p_items jsonb,p_payments jsonb,p_plans jsonb,p_actor_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order public.orders%ROWTYPE; v_doc public.nfe_documents%ROWTYPE; v_plan jsonb;
 v_hash text; v_replacement uuid; v_draft uuid; v_result jsonb; v_authorized_at timestamptz; v_kind text;
BEGIN
 IF p_request_id IS NULL OR p_actor_id IS NULL OR jsonb_typeof(p_plans) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_plans) NOT BETWEEN 1 AND 2 THEN RAISE EXCEPTION 'INVALID_FISCAL_EDIT'; END IF;
 v_hash:=md5((p_order_payload-'updated_at')::text||p_items::text||p_payments::text||p_plans::text);
 PERFORM pg_advisory_xact_lock(hashtext(p_order_id));
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 IF EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements WHERE request_id=p_request_id) THEN
   IF EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements WHERE request_id=p_request_id AND (request_hash<>v_hash OR order_id<>p_order_id))
   THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED'; END IF;
   RETURN jsonb_build_object('order_data',v_order.order_data,'created',false);
 END IF;
 IF v_order.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'FISCAL_ORDER_CHANGED'; END IF;
 IF v_order.order_type NOT IN ('sale','showroom') OR v_order.status<>'scheduled' OR coalesce(v_order.deleted,false)
 OR public.order_has_fiscal_circulation(to_jsonb(v_order)) OR public.order_has_delivery_in_progress(to_jsonb(v_order))
 OR p_order_payload->>'status' IS DISTINCT FROM 'scheduled'
 OR p_order_payload->>'order_type' IS DISTINCT FROM v_order.order_type THEN RAISE EXCEPTION 'FISCAL_EDIT_REQUIRES_SCHEDULED_NO_CIRCULATION'; END IF;
 IF EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements WHERE order_id=p_order_id AND status<>'completed')
 OR EXISTS (SELECT 1 FROM public.nfe_outbound_attempts WHERE order_id=p_order_id AND state NOT IN ('authorized','rejected'))
 OR EXISTS (SELECT 1 FROM public.nfe_documents WHERE order_id=p_order_id AND status IN ('processando','pendente','unknown','transmitting'))
 THEN RAISE EXCEPTION 'FISCAL_ORDER_EDIT_PENDING'; END IF;
 FOR v_plan IN SELECT value FROM jsonb_array_elements(p_plans) LOOP
   SELECT * INTO v_doc FROM public.nfe_documents WHERE id=(v_plan->>'id')::uuid FOR UPDATE;
   IF NOT FOUND OR v_doc.order_id IS DISTINCT FROM p_order_id OR v_doc.document_type<>'outbound'
   OR v_doc.ambiente IS DISTINCT FROM (v_plan->>'environment')::smallint OR v_doc.modelo NOT IN ('55','65')
   OR v_doc.status IS DISTINCT FROM CASE WHEN v_doc.ambiente=1 THEN 'autorizada' ELSE 'homologada' END
   OR left(v_doc.chave_acesso,2)<>'41' OR v_doc.xml_nfe IS NULL OR v_doc.numero_protocolo IS NULL
   THEN RAISE EXCEPTION 'INVALID_FISCAL_EDIT_SOURCE'; END IF;
   v_authorized_at:=substring(v_doc.xml_protocolo from '<dhRecbto>([^<]+)</dhRecbto>')::timestamptz;
   IF v_authorized_at IS NULL THEN RAISE EXCEPTION 'FISCAL_AUTHORIZATION_DATE_REQUIRED'; END IF;
   v_kind:=CASE WHEN now()<=v_authorized_at+CASE WHEN v_doc.modelo='55' THEN interval '168 hours' ELSE interval '30 minutes' END THEN 'cancel' ELSE 'estorno' END;
   IF v_plan->>'action' IS DISTINCT FROM v_kind THEN RAISE EXCEPTION 'FISCAL_DEADLINE_CHANGED_REFRESH_CONFIRMATION'; END IF;
   INSERT INTO public.nfe_order_edit_replacements(request_id,request_hash,order_id,expected_updated_at,original_document_id,
     environment,reversal_kind,original_order_data,edited_order_data,edited_order_payload,edited_items,edited_payments,
      source_document_snapshot,requested_by)
   VALUES(p_request_id,v_hash,p_order_id,v_order.updated_at,v_doc.id,v_doc.ambiente,v_kind,v_order.order_data,
      p_order_payload->'order_data',p_order_payload,p_items,p_payments,to_jsonb(v_doc),p_actor_id)
   RETURNING id INTO v_replacement;
   IF v_kind='estorno' THEN
     v_draft:=public.prepare_nfe_operation_draft('estorno',v_doc.id,NULL,v_doc.ambiente::smallint,
       'Substituição integral por edição confirmada de venda ainda não realizada e sem circulação.',p_actor_id);
     UPDATE public.nfe_order_edit_replacements SET operation_draft_id=v_draft WHERE id=v_replacement;
   END IF;
 END LOOP;
 RETURN jsonb_build_object('order_data',v_order.order_data,'created',true,'awaiting_reversal',true);
END; $$;
REVOKE ALL ON FUNCTION public.commit_fiscal_order_edit(uuid,text,timestamptz,jsonb,jsonb,jsonb,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_fiscal_order_edit(uuid,text,timestamptz,jsonb,jsonb,jsonb,jsonb,uuid) TO service_role;

CREATE FUNCTION public.finalize_fiscal_order_edit(p_replacement_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_replacement public.nfe_order_edit_replacements%ROWTYPE; v_order public.orders%ROWTYPE; v_result jsonb;
BEGIN
 SELECT * INTO v_replacement FROM public.nfe_order_edit_replacements WHERE id=p_replacement_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'FISCAL_EDIT_REPLACEMENT_NOT_FOUND'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(v_replacement.order_id));
 SELECT * INTO v_order FROM public.orders WHERE id=v_replacement.order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
 SELECT * INTO v_replacement FROM public.nfe_order_edit_replacements WHERE id=p_replacement_id FOR UPDATE;
 IF v_replacement.status IN ('ready_to_reissue','replacement_prepared','completed') THEN
   RETURN jsonb_build_object('order_data',v_order.order_data,'created',false);
 END IF;
 IF v_order.updated_at IS DISTINCT FROM v_replacement.expected_updated_at
   OR v_order.order_data IS DISTINCT FROM v_replacement.original_order_data
   OR v_order.status IS DISTINCT FROM 'scheduled'
   OR public.order_has_fiscal_circulation(to_jsonb(v_order))
   OR public.order_has_delivery_in_progress(to_jsonb(v_order))
   OR EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r
     WHERE r.request_id=v_replacement.request_id
       AND NOT public.is_order_edit_reversal_confirmed(r.original_document_id)) THEN
   RAISE EXCEPTION 'FISCAL_EDIT_REVERSAL_OR_ORDER_VERSION_UNCONFIRMED';
 END IF;
 PERFORM set_config('morante.fiscal_order_edit',v_replacement.order_id,true);
 v_result:=public.create_order_with_inventory_transaction(v_replacement.order_id,
   v_replacement.edited_order_payload,v_replacement.edited_items,v_replacement.edited_payments,true);
 UPDATE public.nfe_order_edit_replacements SET status='ready_to_reissue',
   edited_order_data=v_result->'order_data'
   WHERE request_id=v_replacement.request_id;
 PERFORM set_config('morante.fiscal_order_edit','',true);
 RETURN v_result||jsonb_build_object('created',true);
END; $$;
REVOKE ALL ON FUNCTION public.finalize_fiscal_order_edit(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_fiscal_order_edit(uuid) TO service_role;

-- Allow a new normal-sale attempt only after proof of the whole original reversal.
DO $$ DECLARE v_source text; v_anchor text; BEGIN
 v_source:=pg_get_functiondef('public.prepare_nfe_outbound_attempt(jsonb,text,text,jsonb,uuid,uuid,integer)'::regprocedure);
 v_anchor:=$anchor$modelo IN ('55','65') AND document_type='outbound' AND status IN ('processando','pendente','autorizada','homologada'))$anchor$;
 IF strpos(v_source,v_anchor)=0 THEN RAISE EXCEPTION 'OUTBOUND_DOCUMENT_PATCH_ANCHOR_MISSING'; END IF;
 v_source:=replace(v_source,v_anchor,$replacement$modelo IN ('55','65') AND document_type='outbound' AND status IN ('processando','pendente','autorizada','homologada')
   AND NOT public.is_order_edit_reversal_confirmed(id))$replacement$);
 v_anchor:=$anchor$issuer_cnpj=v_issuer AND state<>'rejected')$anchor$;
 IF strpos(v_source,v_anchor)=0 THEN RAISE EXCEPTION 'OUTBOUND_ATTEMPT_PATCH_ANCHOR_MISSING'; END IF;
 v_source:=replace(v_source,v_anchor,$replacement$issuer_cnpj=v_issuer AND state<>'rejected'
   AND NOT public.is_order_edit_reversal_confirmed(document_id))$replacement$);
 EXECUTE v_source;
END; $$;

CREATE FUNCTION public.link_order_edit_replacement_document() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.nfe_order_edit_replacements%ROWTYPE;
BEGIN
 IF NEW.document_type<>'outbound' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
   SELECT * INTO r FROM public.nfe_order_edit_replacements
   WHERE order_id=NEW.order_id AND environment=NEW.ambiente AND status<>'completed' FOR UPDATE;
   IF FOUND THEN
     IF NOT public.is_order_edit_reversal_confirmed(r.original_document_id) THEN RAISE EXCEPTION 'FISCAL_REVERSAL_NOT_CONFIRMED'; END IF;
     IF r.status NOT IN ('ready_to_reissue','replacement_prepared') OR NOT EXISTS (
       SELECT 1 FROM public.orders o WHERE o.id=r.order_id AND o.status='scheduled'
       AND public.fiscal_order_edit_projection(o.order_data)=public.fiscal_order_edit_projection(r.edited_order_data)
       AND NOT public.order_has_fiscal_circulation(to_jsonb(o))
       AND NOT public.order_has_delivery_in_progress(to_jsonb(o))) THEN
       RAISE EXCEPTION 'FISCAL_EDIT_NOT_APPLIED';
     END IF;
     IF r.replacement_document_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.nfe_documents d
       WHERE d.id=r.replacement_document_id AND d.status<>'rejeitada') THEN RAISE EXCEPTION 'FISCAL_REPLACEMENT_ALREADY_PREPARED'; END IF;
     NEW.supersedes_document_id:=r.original_document_id;
   END IF;
 ELSIF NEW.status=CASE WHEN NEW.ambiente=1 THEN 'autorizada' ELSE 'homologada' END
   AND NEW.numero_protocolo IS NOT NULL AND NEW.xml_nfe IS NOT NULL THEN
   UPDATE public.nfe_order_edit_replacements SET status='completed',completed_at=now()
     WHERE replacement_document_id=NEW.id AND environment=NEW.ambiente;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER link_order_edit_replacement_document BEFORE INSERT OR UPDATE ON public.nfe_documents
FOR EACH ROW EXECUTE FUNCTION public.link_order_edit_replacement_document();

CREATE FUNCTION public.track_order_edit_replacement_document() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NEW.document_type='outbound' AND NEW.supersedes_document_id IS NOT NULL THEN
   UPDATE public.nfe_order_edit_replacements SET replacement_document_id=NEW.id,status='replacement_prepared'
   WHERE original_document_id=NEW.supersedes_document_id AND order_id=NEW.order_id AND environment=NEW.ambiente AND status<>'completed';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER track_order_edit_replacement_document AFTER INSERT ON public.nfe_documents
FOR EACH ROW EXECUTE FUNCTION public.track_order_edit_replacement_document();

REVOKE ALL ON FUNCTION public.guard_order_fiscal_edit(),public.link_order_edit_replacement_document(),
 public.track_order_edit_replacement_document() FROM PUBLIC,anon,authenticated;
