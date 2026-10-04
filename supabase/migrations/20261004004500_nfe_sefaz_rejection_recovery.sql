-- Enable retry/recovery for confirmed SEFAZ rejections (e.g. cStat 704, 787, etc.)
-- A rejected attempt remains permanently frozen and immutable; subsequent attempts
-- require a newly generated sequential number and live dhEmi timestamp.

CREATE OR REPLACE FUNCTION public.is_nfe_hml_number_conflict(
  p_response_xml text, p_original_key text
)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=''
AS $function$
DECLARE v_status text; v_reason text; v_other_key text;
BEGIN
  IF COALESCE(p_original_key,'') !~ '^[0-9]{44}$' OR COALESCE(p_response_xml,'')='' OR
     NOT pg_catalog.xml_is_well_formed_document(p_response_xml) THEN RETURN false; END IF;
  v_status := (pg_catalog.xpath(
    'string((//*[local-name()="retEnviNFe"]/*[local-name()="cStat"] | //*[local-name()="retEnviNFe"]/*[local-name()="protNFe"]/*[local-name()="infProt"]/*[local-name()="cStat"])[last()])',
    p_response_xml::xml))[1]::text;
  IF v_status IS DISTINCT FROM '539' THEN RETURN false; END IF;
  v_reason := (pg_catalog.xpath(
    'string((//*[local-name()="retEnviNFe"]/*[local-name()="xMotivo"] | //*[local-name()="retEnviNFe"]/*[local-name()="protNFe"]/*[local-name()="infProt"]/*[local-name()="xMotivo"])[last()])',
    p_response_xml::xml))[1]::text;
  v_other_key := (pg_catalog.regexp_match(v_reason,
    '\[chNFe:[[:space:]]*([0-9]{44})\]'))[1];
  RETURN COALESCE(v_other_key IS NOT NULL AND v_other_key<>p_original_key AND
    pg_catalog.substr(v_other_key,1,2)=pg_catalog.substr(p_original_key,1,2) AND
    pg_catalog.substr(v_other_key,7,28)=pg_catalog.substr(p_original_key,7,28),false);
END;
$function$;
REVOKE ALL ON FUNCTION public.is_nfe_hml_number_conflict(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_nfe_hml_number_conflict(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.is_nfe_hml_number_conflict(
  p_response_xml text, p_original_key character varying
)
RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=''
AS $function$
  SELECT public.is_nfe_hml_number_conflict(p_response_xml, p_original_key::text);
$function$;
REVOKE ALL ON FUNCTION public.is_nfe_hml_number_conflict(text,character varying) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_nfe_hml_number_conflict(text,character varying) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_nfe_hml_number_conflict_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
BEGIN
 IF TG_OP='UPDATE' AND OLD.fiscal_ruleset_version IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') AND OLD.status='erro' AND
    public.is_nfe_hml_number_conflict(OLD.xml_protocolo,OLD.chave_acesso) AND
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
  RAISE EXCEPTION 'REJECTED_HML_NUMBER_ATTEMPT_IMMUTABLE' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_nfe_hml_number_conflict_immutable() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_nfe_hml_number_conflict_immutable() TO service_role;
DROP TRIGGER IF EXISTS guard_nfe_hml_number_conflict_immutable ON public.nfe_documents;
CREATE TRIGGER guard_nfe_hml_number_conflict_immutable BEFORE UPDATE
 ON public.nfe_documents FOR EACH ROW EXECUTE FUNCTION public.guard_nfe_hml_number_conflict_immutable();

CREATE OR REPLACE FUNCTION public.is_nfe_hml_sefaz_rejection(p_response_xml text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_code text;
BEGIN
 IF COALESCE(p_response_xml,'')='' OR
    NOT pg_catalog.xml_is_well_formed_document(p_response_xml) THEN RETURN false; END IF;
 v_code := (pg_catalog.xpath(
   'string((//*[local-name()="retEnviNFe"]/*[local-name()="cStat"] | //*[local-name()="retEnviNFe"]/*[local-name()="protNFe"]/*[local-name()="infProt"]/*[local-name()="cStat"] | //*[local-name()="retConsSitNFe"]/*[local-name()="cStat"])[last()])',
   p_response_xml::xml))[1]::text;
 RETURN COALESCE(v_code IS NOT NULL AND v_code NOT IN ('100','101','105','204'), false);
END;
$function$;
REVOKE ALL ON FUNCTION public.is_nfe_hml_sefaz_rejection(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_nfe_hml_sefaz_rejection(text) TO service_role;

CREATE OR REPLACE FUNCTION public.is_nfe_hml_correction_allowed(
 p_prior_id uuid,p_new_series text,p_new_snapshot jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_prior public.nfe_documents%ROWTYPE; v_old_ie text; v_new_ie text; v_new_number integer;
BEGIN
 SELECT * INTO v_prior FROM public.nfe_documents WHERE id=p_prior_id;
 IF NOT FOUND OR v_prior.ambiente IS DISTINCT FROM 2 OR v_prior.modelo NOT IN ('55','65') OR v_prior.modelo IS DISTINCT FROM p_new_snapshot#>>'{emissionRequest,requestedModel}' OR
    COALESCE(v_prior.fiscal_ruleset_version,'') NOT IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') OR
    v_prior.status IS DISTINCT FROM 'erro' OR v_prior.numero_protocolo IS NOT NULL THEN RETURN false; END IF;
 IF public.is_nfe_hml_series_rejection(v_prior.xml_protocolo) THEN
  RETURN v_prior.serie IS DISTINCT FROM p_new_series;
 END IF;
 IF public.is_nfe_hml_ie_rejection(v_prior.xml_protocolo) THEN
  SELECT snapshot_data#>>'{issuerProfile,companyIE}' INTO v_old_ie
   FROM public.nfe_fiscal_snapshots WHERE id=v_prior.fiscal_snapshot_id;
  v_new_ie := p_new_snapshot#>>'{issuerProfile,companyIE}';
  RETURN COALESCE(v_old_ie IS NOT NULL AND public.is_valid_nfe_hml_parana_ie(v_new_ie) AND
   pg_catalog.regexp_replace(v_old_ie,'[.[:space:]-]','','g')<>
   pg_catalog.regexp_replace(v_new_ie,'[.[:space:]-]','','g'),false);
 END IF;
 IF public.is_nfe_hml_number_conflict(v_prior.xml_protocolo,v_prior.chave_acesso) THEN
  BEGIN v_new_number := (p_new_snapshot#>>'{emissionRequest,number}')::integer;
  EXCEPTION WHEN OTHERS THEN RETURN false; END;
  RETURN v_prior.serie IS NOT DISTINCT FROM p_new_series AND
    v_prior.numero_nfe IS DISTINCT FROM v_new_number;
 END IF;
 IF public.is_nfe_hml_sefaz_rejection(v_prior.xml_protocolo) THEN
  BEGIN v_new_number := (p_new_snapshot#>>'{emissionRequest,number}')::integer;
  EXCEPTION WHEN OTHERS THEN RETURN false; END;
  RETURN (v_prior.serie IS DISTINCT FROM p_new_series) OR
    (v_new_number IS NOT NULL AND v_prior.numero_nfe IS DISTINCT FROM v_new_number);
 END IF;
 RETURN false;
END;
$function$;
REVOKE ALL ON FUNCTION public.is_nfe_hml_correction_allowed(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_nfe_hml_correction_allowed(uuid,text,jsonb) TO service_role;

ALTER FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, text, boolean, boolean, boolean, jsonb, integer
) SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.apply_nfe_snapshot_recipient_tax_id(jsonb, uuid, text)
  SECURITY DEFINER SET search_path = '';
