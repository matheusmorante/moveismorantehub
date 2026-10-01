-- A new number is an explicit user choice. Reserve it and freeze it in the fiscal
-- snapshot in one transaction; no order, stock, payment or financial rows are touched.
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

-- Extend only the confirmed, immutable correction path. A 539 must identify a
-- different access key for this same issuer/model/series/number.
CREATE OR REPLACE FUNCTION public.is_nfe_hml_correction_allowed(
 p_prior_id uuid,p_new_series text,p_new_snapshot jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_prior public.nfe_documents%ROWTYPE; v_old_ie text; v_new_ie text; v_new_number integer;
BEGIN
 SELECT * INTO v_prior FROM public.nfe_documents WHERE id=p_prior_id;
 IF NOT FOUND OR v_prior.ambiente IS DISTINCT FROM 2 OR v_prior.modelo IS DISTINCT FROM '55' OR
    v_prior.fiscal_ruleset_version IS DISTINCT FROM 'HML_NORMAL_SALE_V1' OR
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
 RETURN false;
END;
$function$;
REVOKE ALL ON FUNCTION public.is_nfe_hml_correction_allowed(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_nfe_hml_correction_allowed(uuid,text,jsonb) TO service_role;

-- Preserve the rejected XML/key and SEFAZ response as the immutable reason
-- for allowing a linked attempt with another number.
CREATE OR REPLACE FUNCTION public.guard_nfe_hml_number_conflict_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
BEGIN
 IF TG_OP='UPDATE' AND OLD.fiscal_ruleset_version='HML_NORMAL_SALE_V1' AND OLD.status='erro' AND
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

CREATE OR REPLACE FUNCTION public.prepare_numbered_nfe_fiscal_snapshot(
 p_order_id text,p_emission_request_id uuid,p_modelo varchar(2),p_ambiente integer,
 p_serie varchar(4),p_numero_minimo integer,p_item_csosn_overrides jsonb,
 p_item_fiscal_selections jsonb,p_requested_number integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_existing public.nfe_fiscal_snapshots%ROWTYPE;
        v_sequence_before integer; v_now timestamptz; v_result jsonb;
BEGIN
 IF p_requested_number IS NULL THEN
  RETURN public.prepare_nfe_fiscal_snapshot(p_order_id,p_emission_request_id,p_modelo,
    p_ambiente,p_serie,p_numero_minimo,p_item_csosn_overrides,p_item_fiscal_selections);
 END IF;
 IF p_requested_number NOT BETWEEN 1 AND 999999999 OR
    COALESCE(p_order_id,'')='' OR p_emission_request_id IS NULL OR
    p_modelo NOT IN ('55','65') OR p_ambiente NOT IN (1,2) OR
    COALESCE(p_serie,'') !~ '^[0-9]{1,3}$' OR
    COALESCE(p_numero_minimo,0) NOT BETWEEN 1 AND 999999999 THEN
  RAISE EXCEPTION 'Parâmetros inválidos para número fiscal manual.' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('nfe_snapshot:'||p_emission_request_id::text,0));
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('nfe_emit:'||p_order_id||':'||p_modelo||':'||p_ambiente::text,0));

 SELECT * INTO v_existing FROM public.nfe_fiscal_snapshots
  WHERE emission_request_id=p_emission_request_id FOR UPDATE;
 IF FOUND THEN
  IF v_existing.order_id IS DISTINCT FROM p_order_id OR
     v_existing.requested_model IS DISTINCT FROM p_modelo OR
     v_existing.environment IS DISTINCT FROM p_ambiente OR v_existing.series IS DISTINCT FROM p_serie OR
     v_existing.reserved_number IS DISTINCT FROM p_requested_number OR
     COALESCE(v_existing.snapshot_data#>'{emissionRequest,itemCsosnOverrides}','{}'::jsonb)
       IS DISTINCT FROM COALESCE(p_item_csosn_overrides,'{}'::jsonb) OR
     COALESCE(v_existing.snapshot_data#>'{emissionRequest,itemFiscalSelections}','{}'::jsonb)
       IS DISTINCT FROM COALESCE(p_item_fiscal_selections,'{}'::jsonb) THEN
   RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='23505';
  END IF;
  RETURN pg_catalog.jsonb_build_object('snapshotId',v_existing.id,
    'snapshotHash',v_existing.snapshot_sha256,'number',v_existing.reserved_number,
    'issuedAt',v_existing.captured_at,'orderVersion',v_existing.order_version);
 END IF;

 INSERT INTO public.nfe_sequences(modelo,serie,ambiente,ultimo_numero,updated_at)
  VALUES(p_modelo,p_serie,p_ambiente,0,pg_catalog.clock_timestamp())
  ON CONFLICT(modelo,serie,ambiente) DO NOTHING;
 SELECT ultimo_numero INTO v_sequence_before FROM public.nfe_sequences
  WHERE modelo=p_modelo AND serie=p_serie AND ambiente=p_ambiente FOR UPDATE;

 IF EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots
    WHERE requested_model=p_modelo AND series=p_serie AND environment=p_ambiente
      AND reserved_number=p_requested_number) OR
    EXISTS(SELECT 1 FROM public.nfe_documents
    WHERE modelo=p_modelo AND serie=p_serie AND ambiente=p_ambiente
      AND numero_nfe=p_requested_number) THEN
  RAISE EXCEPTION 'NFE_NUMBER_ALREADY_USED' USING ERRCODE='23505',
    DETAIL='number='||p_requested_number::text;
 END IF;

 -- Temporarily position the canonical allocator immediately before the selected
 -- number. Restore its high-water mark before commit, even for a lower manual gap.
 UPDATE public.nfe_sequences SET ultimo_numero=p_requested_number-1,
  updated_at=pg_catalog.clock_timestamp()
  WHERE modelo=p_modelo AND serie=p_serie AND ambiente=p_ambiente;
 v_result := public.prepare_nfe_fiscal_snapshot(p_order_id,p_emission_request_id,
  p_modelo,p_ambiente,p_serie,p_requested_number,p_item_csosn_overrides,p_item_fiscal_selections);
 UPDATE public.nfe_sequences SET ultimo_numero=GREATEST(v_sequence_before,p_requested_number),
  updated_at=pg_catalog.clock_timestamp()
  WHERE modelo=p_modelo AND serie=p_serie AND ambiente=p_ambiente;
 RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot(
 text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,integer
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot(
 text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,integer
) TO service_role;
