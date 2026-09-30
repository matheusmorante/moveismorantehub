-- NF-e 55 HML only. MOC 7 Anexo I B07/B26-10, confirmed rejection 244.
-- Preserve rejected XML/key/number/history. A correction is a new linked intention.
-- No writes to orders, stock, reservations, payments, receivables or finance.
ALTER TABLE public.nfe_fiscal_snapshots
  ADD COLUMN IF NOT EXISTS hml_correction_of_document_id uuid
    REFERENCES public.nfe_documents(id) ON DELETE RESTRICT;
ALTER TABLE public.nfe_documents
  ADD COLUMN IF NOT EXISTS hml_correction_of_document_id uuid
    REFERENCES public.nfe_documents(id) ON DELETE RESTRICT;

DO $migration$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
   WHERE conname='nfe_hml_correction_scope_check'
     AND conrelid='public.nfe_documents'::regclass) THEN
  ALTER TABLE public.nfe_documents ADD CONSTRAINT nfe_hml_correction_scope_check
    CHECK (hml_correction_of_document_id IS NULL OR
      (ambiente IS NOT DISTINCT FROM 2 AND modelo IS NOT DISTINCT FROM '55'
       AND fiscal_ruleset_version IS NOT DISTINCT FROM 'HML_NORMAL_SALE_V1'
       AND hml_correction_of_document_id <> id));
 END IF;
END $migration$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_hml_correction_snapshot
  ON public.nfe_fiscal_snapshots(hml_correction_of_document_id)
  WHERE hml_correction_of_document_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_hml_correction_document
  ON public.nfe_documents(hml_correction_of_document_id)
  WHERE hml_correction_of_document_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_nfe_hml_series_rejection(p_response_xml text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_code text;
BEGIN
 IF COALESCE(p_response_xml,'')='' OR
    NOT pg_catalog.xml_is_well_formed_document(p_response_xml) THEN RETURN false; END IF;
 v_code := (pg_catalog.xpath(
   'string((//*[local-name()="retEnviNFe"]/*[local-name()="cStat"] | //*[local-name()="retEnviNFe"]/*[local-name()="protNFe"]/*[local-name()="infProt"]/*[local-name()="cStat"])[last()])',
   p_response_xml::xml))[1]::text;
 RETURN COALESCE(v_code='244',false);
END;
$function$;
REVOKE ALL ON FUNCTION public.is_nfe_hml_series_rejection(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_nfe_hml_series_rejection(text) TO service_role;

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
     NOT public.is_nfe_hml_series_rejection(v_prior.xml_protocolo) OR
     v_prior.serie=NEW.series OR
     (v_prior.hml_attempt_token IS NOT NULL AND
      v_prior.hml_attempt_expires_at>pg_catalog.clock_timestamp()) THEN
   RAISE EXCEPTION 'HML_CORRECTION_REQUIRES_CONFIRMED_SERIES_REJECTION' USING ERRCODE='23514';
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
     public.is_nfe_hml_series_rejection(OLD.xml_protocolo) AND
     (NEW.status IS DISTINCT FROM OLD.status OR NEW.xml_nfe IS DISTINCT FROM OLD.xml_nfe OR
      NEW.chave_acesso IS DISTINCT FROM OLD.chave_acesso OR NEW.serie IS DISTINCT FROM OLD.serie OR
      NEW.numero_nfe IS DISTINCT FROM OLD.numero_nfe OR NEW.xml_protocolo IS DISTINCT FROM OLD.xml_protocolo OR
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
 IF NOT FOUND OR v_snapshot.order_id<>NEW.order_id OR v_snapshot.environment<>2 OR
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
     NOT public.is_nfe_hml_series_rejection(v_prior.xml_protocolo) OR v_prior.serie=NEW.serie THEN
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

-- One root and one child per rejected intention; rows remain permanently linked.
-- The snapshot trigger blocks pending, authorized, 217 and unrelated rejections
-- in the same transaction as numbering, so failures do not consume another number.
CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_hml_real_one_root_per_order
 ON public.nfe_documents(order_id,modelo,ambiente)
 WHERE fiscal_ruleset_version='HML_NORMAL_SALE_V1' AND hml_correction_of_document_id IS NULL;
DROP INDEX IF EXISTS public.uq_nfe_hml_real_one_document_per_order;
