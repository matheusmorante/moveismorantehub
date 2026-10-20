-- Permite editar o pedido depois da reversão confirmada e antes da nova emissão.
-- A substituição continua vinculada à NF original e a emissão segue protegida pelo trigger.
CREATE OR REPLACE FUNCTION public.guard_order_fiscal_edit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_changed boolean;
BEGIN
 v_changed:=public.fiscal_order_edit_projection(OLD.order_data) IS DISTINCT FROM public.fiscal_order_edit_projection(NEW.order_data);
 IF current_setting('morante.fiscal_order_edit',true)=NEW.id THEN RETURN NEW; END IF;

 IF EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r WHERE r.order_id=OLD.id AND r.status<>'completed')
 AND (NEW.status IS DISTINCT FROM 'scheduled'
   OR public.order_has_fiscal_circulation(to_jsonb(NEW))
   OR public.order_has_delivery_in_progress(to_jsonb(NEW))
   OR EXISTS (SELECT 1 FROM public.nfe_outbound_attempts a
     WHERE a.order_id=OLD.id AND a.state NOT IN ('authorized','rejected'))
   OR EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r
     WHERE r.order_id=OLD.id AND r.status<>'completed'
       AND (r.status<>'ready_to_reissue' OR r.replacement_document_id IS NOT NULL
         OR NOT public.is_order_edit_reversal_confirmed(r.original_document_id)))) THEN
   RAISE EXCEPTION 'FISCAL_ORDER_EDIT_PENDING: a reversão ou a tentativa de emissão ainda precisa ser concluída';
 END IF;

 IF v_changed AND EXISTS (SELECT 1 FROM public.nfe_documents d
    WHERE d.order_id=OLD.id AND d.document_type='outbound' AND d.status IN ('autorizada','homologada')
    AND NOT public.is_order_edit_reversal_confirmed(d.id)) THEN
   RAISE EXCEPTION 'FISCAL_ORDER_EDIT_CONFIRMATION_REQUIRED';
 END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_ready_fiscal_reissue_order_edit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.fiscal_order_edit_projection(OLD.order_data) IS DISTINCT FROM public.fiscal_order_edit_projection(NEW.order_data)
   AND current_setting('morante.fiscal_order_edit',true) IS DISTINCT FROM NEW.id THEN
   UPDATE public.nfe_order_edit_replacements r
   SET edited_order_data=NEW.order_data
   WHERE r.order_id=NEW.id AND r.status='ready_to_reissue'
     AND r.replacement_document_id IS NULL
     AND public.is_order_edit_reversal_confirmed(r.original_document_id);
 END IF;
 RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_ready_fiscal_reissue_order_edit ON public.orders;
CREATE TRIGGER sync_ready_fiscal_reissue_order_edit AFTER UPDATE OF order_data ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_ready_fiscal_reissue_order_edit();

REVOKE ALL ON FUNCTION public.sync_ready_fiscal_reissue_order_edit() FROM PUBLIC,anon,authenticated;
