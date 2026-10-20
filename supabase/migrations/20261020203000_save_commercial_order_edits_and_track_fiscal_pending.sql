-- O pedido comercial pode ser salvo mesmo quando a NF vinculada exige
-- revisão fiscal. A nota/snapshot permanecem imutáveis e a pendência é rastreada.
ALTER TABLE public.nfe_order_edit_replacements
  ADD COLUMN IF NOT EXISTS commercial_saved boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.nfe_order_edit_pending_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  source_document_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  original_order_data jsonb NOT NULL,
  edited_order_data jsonb NOT NULL,
  resolution_kind text NOT NULL CHECK (resolution_kind IN ('reissue', 'legal_review', 'reconciliation')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS nfe_order_edit_pending_reviews_order
  ON public.nfe_order_edit_pending_reviews(order_id, status, created_at DESC);
ALTER TABLE public.nfe_order_edit_pending_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nfe_order_edit_pending_reviews FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.nfe_order_edit_pending_reviews TO service_role;

-- A versioned, validated commercial update is allowed through the existing
-- transaction only when it is part of an explicitly tracked fiscal edit.
CREATE OR REPLACE FUNCTION public.guard_order_fiscal_edit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- Commercial order changes do not rewrite an authorized NF. The AFTER trigger
 -- records the fiscal follow-up and the outbound-document trigger gates reissue.
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.track_commercial_order_edit_fiscal_pending() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_changed boolean; v_sources uuid[]; v_kind text; v_reason text;
BEGIN
 v_changed:=public.fiscal_order_edit_projection(OLD.order_data) IS DISTINCT FROM public.fiscal_order_edit_projection(NEW.order_data);
 IF NOT v_changed THEN
   UPDATE public.nfe_order_edit_replacements r
   SET expected_updated_at=NEW.updated_at
   WHERE r.order_id=NEW.id AND r.status<>'completed' AND r.commercial_saved
     AND r.replacement_document_id IS NULL;
   RETURN NEW;
 END IF;
 IF current_setting('morante.fiscal_order_edit',true)=NEW.id THEN RETURN NEW; END IF;

 SELECT array_agg(DISTINCT source_id) INTO v_sources FROM (
   SELECT d.id AS source_id FROM public.nfe_documents d
   WHERE d.order_id=NEW.id AND d.document_type='outbound' AND d.status IN ('autorizada','homologada')
     AND NOT public.is_order_edit_reversal_confirmed(d.id)
   UNION
   SELECT r.original_document_id FROM public.nfe_order_edit_replacements r
   WHERE r.order_id=NEW.id AND r.status<>'completed'
   UNION
   SELECT a.document_id FROM public.nfe_outbound_attempts a
   WHERE a.order_id=NEW.id AND a.state NOT IN ('authorized','rejected') AND a.document_id IS NOT NULL
 ) sources;

 IF coalesce(cardinality(v_sources),0)=0 AND NOT EXISTS (
   SELECT 1 FROM public.nfe_outbound_attempts a
   WHERE a.order_id=NEW.id AND a.state NOT IN ('authorized','rejected')) THEN RETURN NEW; END IF;
 v_sources:=coalesce(v_sources,ARRAY[]::uuid[]);

 SELECT CASE
   WHEN NEW.status IS DISTINCT FROM 'scheduled'
     OR public.order_has_fiscal_circulation(to_jsonb(NEW))
     OR public.order_has_delivery_in_progress(to_jsonb(NEW))
     THEN 'legal_review'
   WHEN EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r
     WHERE r.order_id=NEW.id AND r.status<>'completed')
     OR EXISTS (SELECT 1 FROM public.nfe_documents d
       WHERE d.order_id=NEW.id AND d.document_type='outbound' AND d.status IN ('autorizada','homologada')
         AND NOT public.is_order_edit_reversal_confirmed(d.id))
     THEN 'reissue'
   ELSE 'reconciliation'
 END INTO v_kind;

 v_reason:=CASE v_kind
   WHEN 'reissue' THEN 'A alteração comercial foi salva. A reversão da NF anterior e a nova emissão continuam pendentes.'
   WHEN 'legal_review' THEN 'A alteração comercial foi salva. A circulação ou entrega exige revisão fiscal; não iniciar cancelamento ou estorno automático.'
   ELSE 'A alteração comercial foi salva. A situação da tentativa fiscal precisa ser reconciliada antes de nova emissão.'
 END;

 INSERT INTO public.nfe_order_edit_pending_reviews(order_id,source_document_ids,original_order_data,edited_order_data,resolution_kind,reason,created_by)
 VALUES(NEW.id,v_sources,OLD.order_data,NEW.order_data,v_kind,v_reason,auth.uid());

 -- Keep the latest saved commercial version attached to any reversal that has
 -- not produced a replacement document. The original fiscal snapshot is untouched.
 UPDATE public.nfe_order_edit_replacements r
 SET edited_order_data=NEW.order_data,
     edited_order_payload=jsonb_set(r.edited_order_payload,'{order_data}',NEW.order_data,true),
     edited_items=coalesce(NEW.order_data->'items','[]'::jsonb),
     edited_payments=coalesce(NEW.order_data->'payments','[]'::jsonb),
     expected_updated_at=NEW.updated_at,
     commercial_saved=true
 WHERE r.order_id=NEW.id AND r.status<>'completed' AND r.replacement_document_id IS NULL;

 RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS track_commercial_order_edit_fiscal_pending ON public.orders;
CREATE TRIGGER track_commercial_order_edit_fiscal_pending
AFTER UPDATE OF order_data ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.track_commercial_order_edit_fiscal_pending();

CREATE OR REPLACE FUNCTION public.guard_outbound_after_fiscal_order_edit_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.document_type='outbound' AND EXISTS (
   SELECT 1 FROM public.nfe_order_edit_pending_reviews r
   WHERE r.order_id=NEW.order_id AND r.status='pending'
     AND (r.resolution_kind<>'reissue' OR EXISTS (
       SELECT 1 FROM unnest(r.source_document_ids) AS source(source_id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.nfe_order_edit_replacements replacement
         WHERE replacement.order_id=NEW.order_id
           AND replacement.original_document_id=source.source_id
           AND replacement.status IN ('ready_to_reissue','replacement_prepared')
           AND public.is_order_edit_reversal_confirmed(source.source_id)
       )
     ))
 ) THEN
   RAISE EXCEPTION 'FISCAL_ORDER_EDIT_REVIEW_PENDING: complete the saved fiscal follow-up before a new outbound note';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_outbound_after_fiscal_order_edit_review ON public.nfe_documents;
CREATE TRIGGER guard_outbound_after_fiscal_order_edit_review
BEFORE INSERT ON public.nfe_documents
FOR EACH ROW EXECUTE FUNCTION public.guard_outbound_after_fiscal_order_edit_review();

CREATE OR REPLACE FUNCTION public.complete_order_edit_pending_review_after_reissue() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.document_type='outbound'
   AND NEW.supersedes_document_id IS NOT NULL
   AND ((NEW.ambiente=1 AND NEW.status='autorizada') OR (NEW.ambiente=2 AND NEW.status='homologada'))
   AND NEW.numero_protocolo IS NOT NULL AND NEW.xml_nfe IS NOT NULL THEN
   UPDATE public.nfe_order_edit_pending_reviews r
   SET status='completed',completed_at=now()
   WHERE r.order_id=NEW.order_id AND r.status='pending'
     AND r.resolution_kind='reissue'
     AND NEW.supersedes_document_id=ANY(r.source_document_ids)
     AND NOT EXISTS (
       SELECT 1 FROM unnest(r.source_document_ids) AS source(source_id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.nfe_order_edit_replacements replacement
         WHERE replacement.order_id=NEW.order_id
           AND replacement.original_document_id=source.source_id
           AND replacement.status='completed'
       )
     );
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS complete_order_edit_pending_review_after_reissue ON public.nfe_documents;
CREATE TRIGGER complete_order_edit_pending_review_after_reissue
AFTER UPDATE ON public.nfe_documents
FOR EACH ROW EXECUTE FUNCTION public.complete_order_edit_pending_review_after_reissue();

CREATE OR REPLACE FUNCTION public.commit_fiscal_order_edit(
 p_request_id uuid,p_order_id text,p_expected_updated_at timestamptz,p_order_payload jsonb,
 p_items jsonb,p_payments jsonb,p_plans jsonb,p_actor_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order public.orders%ROWTYPE; v_doc public.nfe_documents%ROWTYPE; v_plan jsonb;
 v_hash text; v_replacement uuid; v_draft uuid; v_result jsonb; v_authorized_at timestamptz; v_window interval; v_kind text;
 v_expected_doc_status text;
BEGIN
 IF p_request_id IS NULL OR p_actor_id IS NULL OR jsonb_typeof(p_plans) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_plans) < 1 OR jsonb_array_length(p_plans) > 2 THEN RAISE EXCEPTION 'INVALID_FISCAL_EDIT'; END IF;
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
   IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_FISCAL_EDIT_SOURCE'; END IF;
   v_expected_doc_status:=CASE WHEN v_doc.ambiente=1 THEN 'autorizada' ELSE 'homologada' END;
   IF v_doc.order_id IS DISTINCT FROM p_order_id OR v_doc.document_type<>'outbound'
   OR v_doc.ambiente IS DISTINCT FROM (v_plan->>'environment')::smallint OR v_doc.modelo NOT IN ('55','65')
   OR v_doc.status IS DISTINCT FROM v_expected_doc_status
   OR left(v_doc.chave_acesso,2)<>'41' OR v_doc.xml_nfe IS NULL OR v_doc.numero_protocolo IS NULL
   THEN RAISE EXCEPTION 'INVALID_FISCAL_EDIT_SOURCE'; END IF;
   v_authorized_at:=substring(v_doc.xml_protocolo from '<dhRecbto>([^<]+)</dhRecbto>')::timestamptz;
   IF v_authorized_at IS NULL THEN RAISE EXCEPTION 'FISCAL_AUTHORIZATION_DATE_REQUIRED'; END IF;
   v_window:=CASE WHEN v_doc.modelo='55' THEN interval '168 hours' ELSE interval '30 minutes' END;
   v_kind:=CASE WHEN now()<=v_authorized_at+v_window THEN 'cancel' ELSE 'estorno' END;
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

 -- Salva o pedido agora. A reversão e eventual nova emissão são etapas
 -- posteriores; uma falha SEFAZ não desfaz a alteração comercial.
 PERFORM set_config('morante.fiscal_order_edit',p_order_id,true);
 v_result:=public.create_order_with_inventory_transaction(p_order_id,p_order_payload,p_items,p_payments,true);
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
 UPDATE public.nfe_order_edit_replacements
 SET commercial_saved=true,expected_updated_at=v_order.updated_at,edited_order_data=v_order.order_data,
     edited_order_payload=jsonb_set(edited_order_payload,'{order_data}',v_order.order_data,true)
 WHERE request_id=p_request_id;
 PERFORM set_config('morante.fiscal_order_edit','',true);
 RETURN jsonb_build_object('order_data',v_order.order_data,'created',true,'awaiting_reversal',true,'transaction',v_result);
END; $$;

REVOKE ALL ON FUNCTION public.guard_outbound_after_fiscal_order_edit_review(),public.complete_order_edit_pending_review_after_reissue() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_outbound_after_fiscal_order_edit_review(),public.complete_order_edit_pending_review_after_reissue() TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_fiscal_order_edit(p_replacement_id uuid)
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

 IF v_order.status IS DISTINCT FROM 'scheduled'
   OR public.order_has_fiscal_circulation(to_jsonb(v_order))
   OR public.order_has_delivery_in_progress(to_jsonb(v_order))
   OR EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r
     WHERE r.request_id=v_replacement.request_id
       AND NOT public.is_order_edit_reversal_confirmed(r.original_document_id)) THEN
   RAISE EXCEPTION 'FISCAL_EDIT_REVERSAL_OR_ORDER_VERSION_UNCONFIRMED';
 END IF;

 IF v_replacement.commercial_saved THEN
   IF v_order.updated_at IS DISTINCT FROM v_replacement.expected_updated_at
     OR public.fiscal_order_edit_projection(v_order.order_data) IS DISTINCT FROM public.fiscal_order_edit_projection(v_replacement.edited_order_data) THEN
     RAISE EXCEPTION 'FISCAL_EDIT_COMMERCIAL_VERSION_CHANGED';
   END IF;
   v_result:=jsonb_build_object('order_data',v_order.order_data,'created',false);
 ELSE
   IF v_order.updated_at IS DISTINCT FROM v_replacement.expected_updated_at
     OR v_order.order_data IS DISTINCT FROM v_replacement.original_order_data THEN
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
 END IF;

 UPDATE public.nfe_order_edit_replacements SET status='ready_to_reissue'
   WHERE request_id=v_replacement.request_id;
 RETURN v_result||jsonb_build_object('created',false);
END; $$;

REVOKE ALL ON FUNCTION public.guard_order_fiscal_edit(),public.track_commercial_order_edit_fiscal_pending() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_order_fiscal_edit(),public.track_commercial_order_edit_fiscal_pending() TO service_role;
