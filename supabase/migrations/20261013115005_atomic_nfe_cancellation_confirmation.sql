-- Expand-only. Target: hkoxhourxwlddgsfdgws / primary / public.
-- Apply before the new cancellation API. No historical rows are rewritten.
-- SECURITY INVOKER + service_role-only EXECUTE: the API authorizes the operator.
BEGIN;

CREATE OR REPLACE FUNCTION public.reserve_nfe_cancellation_event(
  p_document_id uuid, p_environment integer, p_signed_xml text,
  p_reason text, p_user_id uuid, p_previous_event_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
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
     d.document_type IS DISTINCT FROM 'outbound' OR d.modelo NOT IN ('55','65') OR
     nullif(d.numero_protocolo,'') IS NULL OR nullif(p_signed_xml,'') IS NULL OR
     p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 15 AND 255 OR p_user_id IS NULL THEN
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
$$;

CREATE OR REPLACE FUNCTION public.persist_nfe_cancellation_result(
  p_document_id uuid, p_event_id uuid, p_environment integer,
  p_status text, p_response_xml text, p_cstat text, p_reason text,
  p_protocol text DEFAULT NULL, p_protocol_date timestamptz DEFAULT NULL,
  p_consultation_started_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
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
  END IF;
  -- Any trigger/constraint failure rolls back BOTH statements. No exception fallback.
  RETURN jsonb_build_object('eventId',e.id,'status',p_status,'idempotent',false);
END;
$$;

-- Legacy consultation: authorization + reconciliation of a pending cancellation
-- commit together. Modern rulesets retain their existing dedicated RPCs.
CREATE OR REPLACE FUNCTION public.persist_nfe_legacy_consultation(
  p_document_id uuid, p_environment integer, p_expected_status text,
  p_response_xml text, p_protocol text, p_consultation_started_at timestamptz,
  p_event_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  d public.nfe_documents%ROWTYPE;
  e public.nfe_document_events%ROWTYPE;
  response xml;
  results xml[];
  protocols xml[];
  ns text[][] := ARRAY[ARRAY['n','http://www.portalfiscal.inf.br/nfe']];
  target_status text;
BEGIN
  IF current_user NOT IN ('service_role','postgres','supabase_admin') THEN
    RAISE EXCEPTION 'FISCAL_SERVER_WRITE_REQUIRED' USING ERRCODE='42501';
  END IF;
  SELECT * INTO STRICT d FROM public.nfe_documents WHERE id=p_document_id FOR UPDATE;
  target_status := CASE WHEN p_environment=1 THEN 'autorizada' ELSE 'homologada' END;
  IF d.ambiente IS DISTINCT FROM p_environment OR p_environment NOT IN (1,2) OR
     d.status IS DISTINCT FROM p_expected_status OR
     d.status NOT IN ('autorizada','homologada','pendente','processando','erro') OR
     (d.status IN ('autorizada','homologada') AND d.status<>target_status) OR
     coalesce(d.fiscal_ruleset_version,'') IN ('NORMAL_SALE_V1','HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2','HML_TECHNICAL_V1') OR
     nullif(d.xml_nfe,'') IS NULL OR p_protocol IS NULL OR p_protocol !~ '^[0-9]{15}$' OR
     (d.numero_protocolo IS NOT NULL AND d.numero_protocolo<>p_protocol) OR
     nullif(p_response_xml,'') IS NULL OR p_response_xml ~* '<!(DOCTYPE|ENTITY)' THEN
    RAISE EXCEPTION 'LEGACY_CONSULT_DOCUMENT_MISMATCH' USING ERRCODE='23514';
  END IF;
  response := xmlparse(document p_response_xml);
  results := xpath('//n:retConsSitNFe',response,ns);
  protocols := xpath('//n:retConsSitNFe/n:protNFe/n:infProt',response,ns);
  IF cardinality(results)<>1 OR cardinality(protocols)<>1 OR
     (xpath('string(/*/n:tpAmb)',results[1],ns))[1]::text IS DISTINCT FROM p_environment::text OR
     (xpath('string(/*/n:chNFe)',results[1],ns))[1]::text IS DISTINCT FROM d.chave_acesso OR
     (xpath('string(/*/n:cStat)',results[1],ns))[1]::text IS DISTINCT FROM '100' OR
     (xpath('string(/*/n:tpAmb)',protocols[1],ns))[1]::text IS DISTINCT FROM p_environment::text OR
     (xpath('string(/*/n:chNFe)',protocols[1],ns))[1]::text IS DISTINCT FROM d.chave_acesso OR
     (xpath('string(/*/n:cStat)',protocols[1],ns))[1]::text IS DISTINCT FROM '100' OR
     (xpath('string(/*/n:nProt)',protocols[1],ns))[1]::text IS DISTINCT FROM p_protocol THEN
    RAISE EXCEPTION 'LEGACY_CONSULT_RESPONSE_MISMATCH' USING ERRCODE='23514';
  END IF;
  SELECT * INTO e FROM public.nfe_document_events WHERE document_id=d.id AND event_type='110111'
    ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE;
  IF e.id IS DISTINCT FROM p_event_id OR (e.id IS NOT NULL AND
    (e.status='registered' OR e.environment<>p_environment)) THEN
    RAISE EXCEPTION 'CANCELLATION_ATTEMPT_CHANGED' USING ERRCODE='40001';
  END IF;
  IF e.status IN ('transmitting','unknown') THEN
    IF p_consultation_started_at IS NULL OR p_consultation_started_at>clock_timestamp() OR
       p_consultation_started_at<e.requested_at + interval '30 seconds' THEN
      RAISE EXCEPTION 'CANCELLATION_CONSULTATION_TOO_EARLY' USING ERRCODE='40001';
    END IF;
    UPDATE public.nfe_document_events SET status='rejected',response_xml=p_response_xml,cstat='100',
      xmotivo='Consulta confirmou NF-e autorizada, sem registro do evento de cancelamento.'
      WHERE id=e.id;
  END IF;
  IF d.status<>target_status THEN
    UPDATE public.nfe_documents SET status=target_status,numero_protocolo=p_protocol,
      xml_protocolo=p_response_xml,motivo_status='Autorização confirmada em consulta à SEFAZ.',updated_at=now()
      WHERE id=d.id;
  END IF;
  RETURN jsonb_build_object('documentId',d.id,'status',target_status);
END;
$$;

REVOKE ALL ON FUNCTION public.persist_nfe_legacy_consultation(uuid,integer,text,text,text,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.persist_nfe_legacy_consultation(uuid,integer,text,text,text,timestamptz,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.reserve_nfe_cancellation_event(uuid,integer,text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.persist_nfe_cancellation_result(uuid,uuid,integer,text,text,text,text,text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_nfe_cancellation_event(uuid,integer,text,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.persist_nfe_cancellation_result(uuid,uuid,integer,text,text,text,text,text,timestamptz,timestamptz) TO service_role;
COMMENT ON FUNCTION public.persist_nfe_cancellation_result(uuid,uuid,integer,text,text,text,text,text,timestamptz,timestamptz)
  IS 'Confirma evento 110111 e estado da nota na mesma transação; preserva autorização/XML e retries idempotentes.';
COMMIT;
