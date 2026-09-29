ALTER TABLE public.nfe_document_events
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_nfe_document_events_request_id
  ON public.nfe_document_events(document_id, event_type, request_id)
  WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reserve_nfe_cce_event(
  p_document_id uuid,
  p_environment integer,
  p_event_sequence integer,
  p_correction text,
  p_signed_xml text,
  p_user_id uuid,
  p_request_id uuid
)
RETURNS TABLE(event_id uuid, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing_id uuid;
  v_modelo text;
  v_environment integer;
  v_document_status text;
  v_last_sequence integer;
  v_last_status text;
  v_expected_sequence integer;
  v_attempt_number integer;
  v_new_id uuid;
BEGIN
  IF p_document_id IS NULL OR p_request_id IS NULL OR p_user_id IS NULL
     OR p_environment IS NULL OR p_event_sequence IS NULL
     OR p_environment NOT IN (1, 2)
     OR p_event_sequence NOT BETWEEN 1 AND 20
     OR char_length(btrim(COALESCE(p_correction, ''))) NOT BETWEEN 15 AND 1000
     OR btrim(COALESCE(p_signed_xml, '')) = '' THEN
    RAISE EXCEPTION 'INVALID_CCE_REQUEST';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('nfe_cce:' || p_document_id::text, 0)
  );

  SELECT id INTO v_existing_id
    FROM public.nfe_document_events
   WHERE document_id = p_document_id
     AND event_type = '110110'
     AND request_id = p_request_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing_id, false;
    RETURN;
  END IF;

  SELECT modelo, ambiente, status
    INTO v_modelo, v_environment, v_document_status
    FROM public.nfe_documents
   WHERE id = p_document_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NFE_DOCUMENT_NOT_FOUND'; END IF;
  IF v_modelo <> '55' THEN RAISE EXCEPTION 'CCE_REQUIRES_MODEL_55'; END IF;
  IF v_environment <> p_environment THEN RAISE EXCEPTION 'CCE_ENVIRONMENT_MISMATCH'; END IF;
  IF v_document_status NOT IN ('autorizada', 'homologada') THEN
    RAISE EXCEPTION 'CCE_REQUIRES_AUTHORIZED_NFE';
  END IF;

  SELECT event_sequence, status
    INTO v_last_sequence, v_last_status
    FROM public.nfe_document_events
   WHERE document_id = p_document_id AND event_type = '110110'
   ORDER BY attempt_number DESC
   LIMIT 1;

  IF v_last_status IN ('transmitting', 'unknown') THEN
    RAISE EXCEPTION 'CCE_PREVIOUS_EVENT_PENDING';
  ELSIF v_last_status = 'registered' THEN
    v_expected_sequence := v_last_sequence + 1;
  ELSIF v_last_status = 'rejected' THEN
    v_expected_sequence := v_last_sequence;
  ELSE
    v_expected_sequence := 1;
  END IF;

  IF v_expected_sequence > 20 THEN RAISE EXCEPTION 'CCE_SEQUENCE_LIMIT'; END IF;
  IF p_event_sequence <> v_expected_sequence THEN
    RAISE EXCEPTION 'CCE_SEQUENCE_CHANGED:%', v_expected_sequence;
  END IF;

  SELECT COALESCE(max(attempt_number), 0) + 1
    INTO v_attempt_number
    FROM public.nfe_document_events
   WHERE document_id = p_document_id AND event_type = '110110';

  INSERT INTO public.nfe_document_events (
    document_id, event_type, event_sequence, attempt_number, environment,
    status, justification, signed_xml, requested_by, request_id
  ) VALUES (
    p_document_id, '110110', p_event_sequence, v_attempt_number, p_environment,
    'transmitting', btrim(p_correction), p_signed_xml, p_user_id, p_request_id
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, true;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_nfe_cce_event(uuid, integer, integer, text, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_nfe_cce_event(uuid, integer, integer, text, text, uuid, uuid)
  TO service_role;
