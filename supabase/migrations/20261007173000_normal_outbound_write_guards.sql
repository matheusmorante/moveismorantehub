-- Existing nfe_documents has a permissive legacy policy. New common attempts
-- may only be written by the fiscal server, even through a direct table request.
CREATE OR REPLACE FUNCTION public.guard_normal_outbound_identity() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.fiscal_ruleset_version='NORMAL_SALE_V1' AND current_user NOT IN ('postgres','service_role','supabase_admin') THEN
   RAISE EXCEPTION 'FISCAL_SERVER_WRITE_REQUIRED' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
 END IF;
 IF OLD.fiscal_ruleset_version IS DISTINCT FROM 'NORMAL_SALE_V1' THEN
  IF NEW.fiscal_ruleset_version='NORMAL_SALE_V1' AND current_user NOT IN ('postgres','service_role','supabase_admin') THEN
   RAISE EXCEPTION 'FISCAL_SERVER_WRITE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
 END IF;
 IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN
  RAISE EXCEPTION 'FISCAL_SERVER_WRITE_REQUIRED' USING ERRCODE='42501';
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
CREATE OR REPLACE TRIGGER guard_normal_outbound_identity BEFORE INSERT OR UPDATE OR DELETE ON public.nfe_documents
 FOR EACH ROW EXECUTE FUNCTION public.guard_normal_outbound_identity();

CREATE OR REPLACE FUNCTION public.guard_normal_outbound_items() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_document uuid; v_version text; v_status text;
BEGIN
 v_document := CASE WHEN TG_OP='DELETE' THEN OLD.document_id ELSE NEW.document_id END;
 SELECT fiscal_ruleset_version,status INTO v_version,v_status FROM public.nfe_documents WHERE id=v_document;
 IF v_version='NORMAL_SALE_V1' THEN
  IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN
   RAISE EXCEPTION 'FISCAL_SERVER_WRITE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF TG_OP<>'INSERT' OR v_status IN ('autorizada','homologada','cancelada') THEN
   RAISE EXCEPTION 'FISCAL_HISTORY_IMMUTABLE' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $fn$;
CREATE OR REPLACE TRIGGER guard_normal_outbound_items BEFORE INSERT OR UPDATE OR DELETE ON public.nfe_document_items
 FOR EACH ROW EXECUTE FUNCTION public.guard_normal_outbound_items();
REVOKE ALL ON FUNCTION public.guard_normal_outbound_identity(),public.guard_normal_outbound_items() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_normal_outbound_identity(),public.guard_normal_outbound_items() TO service_role;
