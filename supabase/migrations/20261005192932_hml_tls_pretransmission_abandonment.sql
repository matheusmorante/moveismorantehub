-- End only HML attempts proven to have failed TLS before any HTTP/SOAP request.
-- Snapshots, signed XML, reserved numbers and the original request ID are retained.
ALTER TABLE public.nfe_documents
  ADD COLUMN IF NOT EXISTS supersedes_document_id uuid
    REFERENCES public.nfe_documents(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_document_single_successor
  ON public.nfe_documents(supersedes_document_id)
  WHERE supersedes_document_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_hml_abandonment_and_lineage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF OLD.status = 'abandoned' AND
     pg_catalog.to_jsonb(NEW) IS DISTINCT FROM pg_catalog.to_jsonb(OLD) THEN
    RAISE EXCEPTION 'HML_ABANDONED_DOCUMENT_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'abandoned' THEN
    IF COALESCE(auth.role(), '') <> 'service_role' OR
       COALESCE(pg_catalog.current_setting('morante.nfe_abandonment_write', true), '') <> 'approved' OR
       NEW.id IS DISTINCT FROM OLD.id OR
       NEW.order_id IS DISTINCT FROM OLD.order_id OR
       NEW.numero_nfe IS DISTINCT FROM OLD.numero_nfe OR
       NEW.serie IS DISTINCT FROM OLD.serie OR
       NEW.chave_acesso IS DISTINCT FROM OLD.chave_acesso OR
       NEW.modelo IS DISTINCT FROM OLD.modelo OR
       NEW.ambiente IS DISTINCT FROM OLD.ambiente OR
       NEW.xml_nfe IS DISTINCT FROM OLD.xml_nfe OR
       NEW.xml_protocolo IS DISTINCT FROM OLD.xml_protocolo OR
       NEW.numero_protocolo IS DISTINCT FROM OLD.numero_protocolo OR
       NEW.fiscal_snapshot_id IS DISTINCT FROM OLD.fiscal_snapshot_id OR
       NEW.emission_request_id IS DISTINCT FROM OLD.emission_request_id OR
       NEW.document_type IS DISTINCT FROM OLD.document_type OR
       NEW.finalidade IS DISTINCT FROM OLD.finalidade OR
       NEW.fiscal_ruleset_version IS DISTINCT FROM OLD.fiscal_ruleset_version OR
       NEW.fiscal_decision_trace IS DISTINCT FROM OLD.fiscal_decision_trace OR
       NEW.hml_attempt_token IS DISTINCT FROM OLD.hml_attempt_token OR
       NEW.hml_attempt_expires_at IS DISTINCT FROM OLD.hml_attempt_expires_at OR
       NEW.supersedes_document_id IS DISTINCT FROM OLD.supersedes_document_id OR
       NEW.motivo_status IS DISTINCT FROM 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE' THEN
      RAISE EXCEPTION 'HML_ABANDONMENT_AND_LINEAGE_BACKEND_ONLY' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NEW.supersedes_document_id IS DISTINCT FROM OLD.supersedes_document_id AND
     (COALESCE(auth.role(), '') <> 'service_role' OR
      COALESCE(pg_catalog.current_setting('morante.nfe_replacement_lineage_write', true), '') <> 'approved') THEN
    RAISE EXCEPTION 'HML_ABANDONMENT_AND_LINEAGE_BACKEND_ONLY' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_hml_abandonment_and_lineage()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_hml_abandonment_and_lineage() TO service_role;

DROP TRIGGER IF EXISTS guard_hml_abandonment_and_lineage ON public.nfe_documents;
CREATE TRIGGER guard_hml_abandonment_and_lineage
  BEFORE UPDATE ON public.nfe_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_hml_abandonment_and_lineage();

CREATE OR REPLACE FUNCTION public.has_hml_tls_pretransmission_evidence(
  p_hml_response_history jsonb,
  p_emission_request_id uuid,
  p_model varchar(2)
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_entry jsonb;
  v_reason text;
  v_diagnostic jsonb;
  v_prefix constant text := 'Resposta da transmissão HML desconhecida: ';
  v_model_prefix text;
  v_hostname text;
BEGIN
  IF p_hml_response_history IS NULL OR
     pg_catalog.jsonb_typeof(p_hml_response_history) IS DISTINCT FROM 'array' OR
     p_emission_request_id IS NULL OR p_model IS NULL OR p_model NOT IN ('55', '65') OR
     EXISTS (
       SELECT 1 FROM pg_catalog.jsonb_array_elements(p_hml_response_history) h
        WHERE COALESCE(h->>'responseXml', '') <> '' OR COALESCE(h->>'protocol', '') <> ''
     ) THEN
    RETURN false;
  END IF;

  v_model_prefix := CASE WHEN p_model = '65' THEN 'nfce' ELSE 'nfe' END;
  v_hostname := 'homologacao.' || v_model_prefix || '.sefa.pr.gov.br';

  FOR v_entry IN SELECT value FROM pg_catalog.jsonb_array_elements(p_hml_response_history)
  LOOP
    v_reason := v_entry->>'reason';
    IF v_reason IS NULL OR pg_catalog.left(v_reason, pg_catalog.length(v_prefix)) <> v_prefix THEN
      CONTINUE;
    END IF;

    BEGIN
      v_diagnostic := pg_catalog.substr(v_reason, pg_catalog.length(v_prefix) + 1)::jsonb;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    IF pg_catalog.jsonb_typeof(v_diagnostic) = 'object' AND
       v_diagnostic->>'emissionRequestId' = p_emission_request_id::text AND
       v_diagnostic->>'code' = 'SELF_SIGNED_CERT_IN_CHAIN' AND
       v_diagnostic->>'category' = 'TLS_FAILURE' AND
       v_diagnostic->>'phase' = 'tls' AND
       v_diagnostic->>'environment' = '2' AND
       v_diagnostic->>'model' = p_model AND
       v_diagnostic->>'hostname' = v_hostname AND
       pg_catalog.left(COALESCE(v_diagnostic->>'endpoint', ''),
         pg_catalog.length('https://' || v_hostname || '/' || v_model_prefix || '/')) =
         'https://' || v_hostname || '/' || v_model_prefix || '/' AND
       NOT (v_diagnostic ? 'httpStatus') AND
       COALESCE(v_entry->>'responseXml', '') = '' AND
       COALESCE(v_entry->>'protocol', '') = '' THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.has_hml_tls_pretransmission_evidence(jsonb, uuid, varchar)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_hml_tls_pretransmission_evidence(jsonb, uuid, varchar)
  TO service_role;

CREATE OR REPLACE FUNCTION public.abandon_untransmitted_hml_attempt(
  p_document_id uuid,
  p_order_id text,
  p_emission_request_id uuid,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_doc public.nfe_documents%ROWTYPE;
  v_history jsonb;
  v_recorded_at timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF p_document_id IS NULL OR COALESCE(p_order_id, '') = '' OR
     p_emission_request_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'HML_ABANDONMENT_ARGUMENTS_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_doc FROM public.nfe_documents
   WHERE id = p_document_id FOR UPDATE;
  IF NOT FOUND OR v_doc.order_id IS DISTINCT FROM p_order_id OR
     v_doc.emission_request_id IS DISTINCT FROM p_emission_request_id OR
     v_doc.ambiente IS DISTINCT FROM 2 OR v_doc.modelo NOT IN ('55', '65') OR
     v_doc.document_type IS DISTINCT FROM 'outbound' THEN
    RAISE EXCEPTION 'HML_ABANDONMENT_TARGET_MISMATCH' USING ERRCODE = '23514';
  END IF;

  v_history := COALESCE(v_doc.hml_response_history, '[]'::jsonb);
  IF pg_catalog.jsonb_typeof(v_history) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'HML_ABANDONMENT_TRANSMISSION_NOT_PROVEN' USING ERRCODE = '23514';
  END IF;

  IF v_doc.status = 'abandoned' AND EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(v_history) e
     WHERE e->>'abandonmentCode' = 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE'
       AND e->>'abandonedRequestId' = p_emission_request_id::text
  ) THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', true, 'alreadyAbandoned', true, 'documentId', v_doc.id,
      'orderId', v_doc.order_id, 'requestId', v_doc.emission_request_id,
      'number', v_doc.numero_nfe, 'series', v_doc.serie, 'model', v_doc.modelo,
      'environment', 2, 'status', 'abandoned'
    );
  END IF;

  IF v_doc.status IS DISTINCT FROM 'pendente' OR
     v_doc.hml_attempt_token IS NOT NULL OR
     (v_doc.hml_attempt_expires_at IS NOT NULL AND v_doc.hml_attempt_expires_at > v_recorded_at) OR
     COALESCE(v_doc.numero_protocolo, '') <> '' OR COALESCE(v_doc.xml_protocolo, '') <> '' OR
     NOT public.has_hml_tls_pretransmission_evidence(
       v_history, p_emission_request_id, v_doc.modelo
     ) THEN
    RAISE EXCEPTION 'HML_ABANDONMENT_TRANSMISSION_NOT_PROVEN' USING ERRCODE = '23514';
  END IF;

  PERFORM pg_catalog.set_config('morante.nfe_abandonment_write', 'approved', true);
  UPDATE public.nfe_documents
     SET status = 'abandoned',
         motivo_status = 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE',
         updated_at = v_recorded_at,
         hml_response_history = v_history || pg_catalog.jsonb_build_array(
           pg_catalog.jsonb_build_object(
             'status', 'abandoned',
             'reason', 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE',
             'message', 'Encerrada antes do envio SOAP por falha estrita de TLS; o snapshot fiscal, XML e número reservado foram preservados.',
             'responseXml', '',
             'protocol', NULL,
             'recordedAt', v_recorded_at,
             'abandonmentCode', 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE',
             'abandonedRequestId', p_emission_request_id,
             'actorId', p_actor_id
           )
         )
   WHERE id = v_doc.id;
  PERFORM pg_catalog.set_config('morante.nfe_abandonment_write', '', true);

  RETURN pg_catalog.jsonb_build_object(
    'success', true, 'alreadyAbandoned', false, 'documentId', v_doc.id,
    'orderId', v_doc.order_id, 'requestId', v_doc.emission_request_id,
    'number', v_doc.numero_nfe, 'series', v_doc.serie, 'model', v_doc.modelo,
    'environment', 2, 'status', 'abandoned'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.abandon_untransmitted_hml_attempt(uuid, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_untransmitted_hml_attempt(uuid, text, uuid, uuid)
  TO service_role;

-- The successor link is written in the same transaction as the new document/number
-- reservation. A replacement is accepted only for a formally abandoned, untransmitted
-- attempt from the same order/model/environment and with changed fiscal selections.
CREATE OR REPLACE FUNCTION public.reserve_hml_nfe_outbound_with_replacement(
  p_order_id text,
  p_emission_request_id uuid,
  p_access_key varchar(44),
  p_signed_xml text,
  p_number integer,
  p_series varchar(4),
  p_decision_trace jsonb,
  p_attempt_token uuid,
  p_supersedes_document_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_prior public.nfe_documents%ROWTYPE;
  v_prior_snapshot public.nfe_fiscal_snapshots%ROWTYPE;
  v_new_snapshot public.nfe_fiscal_snapshots%ROWTYPE;
  v_new_document_id uuid;
  v_history jsonb;
BEGIN
  IF p_supersedes_document_id IS NULL THEN
    RETURN public.reserve_hml_nfe_outbound(
      p_order_id, p_emission_request_id, p_access_key, p_signed_xml,
      p_number, p_series, p_decision_trace, p_attempt_token
    );
  END IF;

  IF COALESCE(p_order_id, '') = '' OR p_emission_request_id IS NULL OR
     p_attempt_token IS NULL THEN
    RAISE EXCEPTION 'HML_REPLACEMENT_ARGUMENTS_INVALID' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nfe_emit:' || p_order_id || ':retail:2', 0)
  );
  SELECT * INTO v_prior FROM public.nfe_documents
   WHERE id = p_supersedes_document_id FOR UPDATE;
  IF NOT FOUND OR v_prior.order_id IS DISTINCT FROM p_order_id OR
     v_prior.ambiente IS DISTINCT FROM 2 OR v_prior.modelo NOT IN ('55', '65') OR
     v_prior.status IS DISTINCT FROM 'abandoned' OR
     v_prior.motivo_status IS DISTINCT FROM 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE' OR
     v_prior.document_type IS DISTINCT FROM 'outbound' OR
     v_prior.emission_request_id IS NULL OR v_prior.emission_request_id = p_emission_request_id OR
     v_prior.hml_attempt_token IS NOT NULL OR
     COALESCE(v_prior.numero_protocolo, '') <> '' OR COALESCE(v_prior.xml_protocolo, '') <> '' THEN
    RAISE EXCEPTION 'HML_REPLACEMENT_SOURCE_NOT_ELIGIBLE' USING ERRCODE = '23514';
  END IF;

  v_history := COALESCE(v_prior.hml_response_history, '[]'::jsonb);
  IF pg_catalog.jsonb_typeof(v_history) IS DISTINCT FROM 'array' OR
     NOT EXISTS (
       SELECT 1 FROM pg_catalog.jsonb_array_elements(v_history) e
        WHERE e->>'abandonmentCode' = 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE'
          AND e->>'abandonedRequestId' = v_prior.emission_request_id::text
     ) OR NOT public.has_hml_tls_pretransmission_evidence(
       v_history, v_prior.emission_request_id, v_prior.modelo
     ) THEN
    RAISE EXCEPTION 'HML_REPLACEMENT_SOURCE_TRANSMISSION_UNCERTAIN' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_prior_snapshot FROM public.nfe_fiscal_snapshots
   WHERE id = v_prior.fiscal_snapshot_id;
  SELECT * INTO v_new_snapshot FROM public.nfe_fiscal_snapshots
   WHERE emission_request_id = p_emission_request_id;
  IF NOT FOUND OR v_prior_snapshot.id IS NULL OR
     v_new_snapshot.order_id IS DISTINCT FROM p_order_id OR
     v_new_snapshot.environment IS DISTINCT FROM 2 OR
     v_new_snapshot.requested_model IS DISTINCT FROM v_prior.modelo OR
     v_new_snapshot.reserved_number IS DISTINCT FROM p_number OR
     v_new_snapshot.series IS DISTINCT FROM p_series OR
     v_prior_snapshot.order_id IS DISTINCT FROM p_order_id OR
     v_prior_snapshot.environment IS DISTINCT FROM 2 OR
     v_prior_snapshot.requested_model IS DISTINCT FROM v_prior.modelo OR
     NOT (
       v_prior_snapshot.snapshot_data #> '{emissionRequest,itemFiscalSelections}' IS DISTINCT FROM
         v_new_snapshot.snapshot_data #> '{emissionRequest,itemFiscalSelections}' OR
       v_prior_snapshot.snapshot_data #> '{emissionRequest,itemCsosnOverrides}' IS DISTINCT FROM
         v_new_snapshot.snapshot_data #> '{emissionRequest,itemCsosnOverrides}' OR
       v_prior_snapshot.snapshot_data #> '{emissionRequest,recipientTaxId}' IS DISTINCT FROM
         v_new_snapshot.snapshot_data #> '{emissionRequest,recipientTaxId}' OR
       v_prior_snapshot.snapshot_data #> '{emissionRequest,finalConsumer}' IS DISTINCT FROM
         v_new_snapshot.snapshot_data #> '{emissionRequest,finalConsumer}' OR
       v_prior_snapshot.snapshot_data #> '{emissionRequest,deliveryByIssuer}' IS DISTINCT FROM
         v_new_snapshot.snapshot_data #> '{emissionRequest,deliveryByIssuer}' OR
       v_prior_snapshot.snapshot_data #> '{emissionRequest,cardNotIntegrated}' IS DISTINCT FROM
         v_new_snapshot.snapshot_data #> '{emissionRequest,cardNotIntegrated}'
     ) THEN
    RAISE EXCEPTION 'HML_REPLACEMENT_FISCAL_SNAPSHOT_NOT_CHANGED' USING ERRCODE = '23514';
  END IF;

  v_new_document_id := public.reserve_hml_nfe_outbound(
    p_order_id, p_emission_request_id, p_access_key, p_signed_xml,
    p_number, p_series, p_decision_trace, p_attempt_token
  );
  PERFORM pg_catalog.set_config('morante.nfe_replacement_lineage_write', 'approved', true);
  UPDATE public.nfe_documents SET supersedes_document_id = v_prior.id
   WHERE id = v_new_document_id AND order_id = p_order_id
     AND emission_request_id = p_emission_request_id AND ambiente = 2;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HML_REPLACEMENT_LINEAGE_PERSIST_FAILED' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_catalog.set_config('morante.nfe_replacement_lineage_write', '', true);

  RETURN v_new_document_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_hml_nfe_outbound_with_replacement(
  text, uuid, varchar, text, integer, varchar, jsonb, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_hml_nfe_outbound_with_replacement(
  text, uuid, varchar, text, integer, varchar, jsonb, uuid, uuid
) TO service_role;
