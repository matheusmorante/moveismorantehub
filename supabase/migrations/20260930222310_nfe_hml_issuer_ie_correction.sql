-- NF-e 55 HML: correction of confirmed SEFAZ 209, MOC Anexo I C17-20.
-- Requires a changed, valid PR IE in the new snapshot. No operational writes.
-- Rejected documents remain immutable; pending/217/authorized facts never permit a new intention.
CREATE OR REPLACE FUNCTION public.is_nfe_hml_ie_rejection(p_response_xml text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_code text;
BEGIN
 IF COALESCE(p_response_xml,'')='' OR
    NOT pg_catalog.xml_is_well_formed_document(p_response_xml) THEN RETURN false; END IF;
 v_code := (pg_catalog.xpath(
   'string((//*[local-name()="retEnviNFe"]/*[local-name()="cStat"] | //*[local-name()="retEnviNFe"]/*[local-name()="protNFe"]/*[local-name()="infProt"]/*[local-name()="cStat"])[last()])',
   p_response_xml::xml))[1]::text;
 RETURN COALESCE(v_code='209',false);
END;
$function$;
REVOKE ALL ON FUNCTION public.is_nfe_hml_ie_rejection(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_nfe_hml_ie_rejection(text) TO service_role;

-- SEFA/PR official algorithm: two modulo-11 digits, weights 2–7 right to left.
CREATE OR REPLACE FUNCTION public.is_valid_nfe_hml_parana_ie(p_ie text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_ie text; v_length integer; v_index integer; v_weight integer; v_sum integer; v_digit integer;
BEGIN
 IF COALESCE(p_ie,'') !~ '^[0-9.[:space:]-]+$' THEN RETURN false; END IF;
 v_ie := pg_catalog.regexp_replace(p_ie,'[.[:space:]-]','','g');
 IF v_ie !~ '^[0-9]{10}$' OR v_ie ~ '^0+$' THEN RETURN false; END IF;
 FOR v_length IN 8..9 LOOP
  v_sum := 0; v_weight := 2;
  FOR v_index IN REVERSE v_length..1 LOOP
   v_sum := v_sum + pg_catalog.substr(v_ie,v_index,1)::integer*v_weight;
   v_weight := CASE WHEN v_weight=7 THEN 2 ELSE v_weight+1 END;
  END LOOP;
  v_digit := 11-(v_sum%11);
  IF v_digit>=10 THEN v_digit := 0; END IF;
  IF pg_catalog.substr(v_ie,v_length+1,1)::integer<>v_digit THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.is_valid_nfe_hml_parana_ie(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_nfe_hml_parana_ie(text) TO service_role;

CREATE OR REPLACE FUNCTION public.is_nfe_hml_correction_allowed(
 p_prior_id uuid,p_new_series text,p_new_snapshot jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_prior public.nfe_documents%ROWTYPE; v_old_ie text; v_new_ie text;
BEGIN
 SELECT * INTO v_prior FROM public.nfe_documents WHERE id=p_prior_id;
 IF NOT FOUND OR v_prior.ambiente IS DISTINCT FROM 2 OR v_prior.modelo IS DISTINCT FROM '55' OR
    v_prior.fiscal_ruleset_version IS DISTINCT FROM 'HML_NORMAL_SALE_V1' OR
    v_prior.status IS DISTINCT FROM 'erro' OR v_prior.numero_protocolo IS NOT NULL THEN RETURN false; END IF;
 IF public.is_nfe_hml_series_rejection(v_prior.xml_protocolo) THEN
  RETURN v_prior.serie IS DISTINCT FROM p_new_series;
 END IF;
 IF NOT public.is_nfe_hml_ie_rejection(v_prior.xml_protocolo) THEN RETURN false; END IF;
 SELECT snapshot_data#>>'{issuerProfile,companyIE}' INTO v_old_ie
  FROM public.nfe_fiscal_snapshots WHERE id=v_prior.fiscal_snapshot_id;
 v_new_ie := p_new_snapshot#>>'{issuerProfile,companyIE}';
 RETURN COALESCE(v_old_ie IS NOT NULL AND public.is_valid_nfe_hml_parana_ie(v_new_ie) AND
  pg_catalog.regexp_replace(v_old_ie,'[.[:space:]-]','','g')<>
  pg_catalog.regexp_replace(v_new_ie,'[.[:space:]-]','','g'),false);
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
 IF NEW.environment<>2 OR NEW.requested_model<>'55' THEN
  IF NEW.hml_correction_of_document_id IS NOT NULL THEN
   RAISE EXCEPTION 'HML_CORRECTION_SCOPE_MISMATCH' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.series !~ '^[0-9]{1,3}$' OR NEW.series::integer NOT BETWEEN 0 AND 889 THEN
  RAISE EXCEPTION 'HML_CONTRIBUTOR_SERIES_INVALID' USING ERRCODE='23514';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('nfe_emit:'||NEW.order_id||':55:2',0));
 SELECT d.* INTO v_prior FROM public.nfe_documents d
  WHERE d.order_id=NEW.order_id AND d.modelo='55' AND d.ambiente=2
    AND d.fiscal_ruleset_version='HML_NORMAL_SALE_V1'
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
  IF OLD.fiscal_ruleset_version='HML_NORMAL_SALE_V1' AND OLD.status='erro' AND
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
 IF NEW.fiscal_ruleset_version IS DISTINCT FROM 'HML_NORMAL_SALE_V1' THEN RETURN NEW; END IF;
 SELECT * INTO v_snapshot FROM public.nfe_fiscal_snapshots WHERE emission_request_id=NEW.emission_request_id;
 IF NOT FOUND OR NEW.ambiente IS DISTINCT FROM 2 OR NEW.modelo IS DISTINCT FROM '55' OR
    v_snapshot.order_id<>NEW.order_id OR v_snapshot.environment<>2 OR
    v_snapshot.requested_model<>'55' OR v_snapshot.series<>NEW.serie OR
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
  IF NOT FOUND OR v_prior.order_id<>NEW.order_id OR v_prior.ambiente<>2 OR v_prior.modelo<>'55' OR
     v_prior.fiscal_ruleset_version IS DISTINCT FROM 'HML_NORMAL_SALE_V1' OR
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
