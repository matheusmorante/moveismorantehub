-- The access key carries the issuer's CNPJ; the event carries the recipient's CNPJ.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION public.reserve_inbound_manifestation_event(
  p_access_key text,
  p_environment integer,
  p_recipient_cnpj text,
  p_signed_xml text,
  p_user_id uuid,
  p_request_id uuid
)
RETURNS TABLE(event_id uuid, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_invoice public.inbound_invoices%ROWTYPE;
  v_latest_id uuid;
  v_latest_status text;
  v_attempt_number integer;
  v_new_id uuid;
BEGIN
  IF p_access_key IS NULL OR p_access_key !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
     OR p_environment IS NULL OR p_environment NOT IN (1, 2)
     OR p_recipient_cnpj IS NULL OR p_recipient_cnpj !~ '^[A-Z0-9]{12}[0-9]{2}$'
     OR p_user_id IS NULL OR p_request_id IS NULL
     OR btrim(COALESCE(p_signed_xml, '')) = '' THEN
    RAISE EXCEPTION 'INVALID_INBOUND_MANIFESTATION_REQUEST';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('inbound_manifestation:' || p_environment::text || ':' || p_access_key, 0)
  );

  SELECT * INTO v_invoice
    FROM public.inbound_invoices
   WHERE chave_acesso = p_access_key
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INBOUND_INVOICE_NOT_FOUND'; END IF;
  IF v_invoice.ambiente IS DISTINCT FROM p_environment THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_ENVIRONMENT_MISMATCH';
  END IF;
  IF regexp_replace(upper(COALESCE(v_invoice.destinatario_cnpj, '')), '[^A-Z0-9]', '', 'g') <> p_recipient_cnpj THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_RECIPIENT_MISMATCH';
  END IF;
  IF substring(p_access_key from 21 for 2) <> '55' THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_REQUIRES_MODEL_55';
  END IF;
  IF v_invoice.status_sefaz <> 'autorizada' THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_REQUIRES_AUTHORIZED_NFE';
  END IF;
  IF COALESCE(v_invoice.xml_conteudo, '') !~ '<([[:alnum:]_.-]+:)?resNFe([[:space:]>])' THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_REQUIRES_SUMMARY';
  END IF;

  SELECT id INTO v_latest_id
    FROM public.inbound_manifestation_events
   WHERE access_key = p_access_key
     AND event_type = '210210'
     AND environment = p_environment
     AND request_id = p_request_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_latest_id, false;
    RETURN;
  END IF;

  SELECT id, status INTO v_latest_id, v_latest_status
    FROM public.inbound_manifestation_events
   WHERE access_key = p_access_key
     AND event_type = '210210'
     AND environment = p_environment
   ORDER BY attempt_number DESC
   LIMIT 1;

  IF v_latest_status IN ('transmitting', 'unknown') THEN
    RAISE EXCEPTION 'INBOUND_MANIFESTATION_PREVIOUS_EVENT_PENDING';
  ELSIF v_latest_status = 'registered' THEN
    RETURN QUERY SELECT v_latest_id, false;
    RETURN;
  END IF;

  SELECT COALESCE(max(attempt_number), 0) + 1
    INTO v_attempt_number
    FROM public.inbound_manifestation_events
   WHERE access_key = p_access_key
     AND event_type = '210210'
     AND environment = p_environment;

  INSERT INTO public.inbound_manifestation_events (
    inbound_invoice_id, access_key, event_type, event_sequence, attempt_number,
    environment, recipient_cnpj, status, signed_xml, request_id, requested_by
  ) VALUES (
    v_invoice.id, p_access_key, '210210', 1, v_attempt_number,
    p_environment, p_recipient_cnpj, 'transmitting', p_signed_xml, p_request_id, p_user_id
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, true;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_inbound_manifestation_event(text, integer, text, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_inbound_manifestation_event(text, integer, text, text, uuid, uuid)
  TO service_role;

COMMENT ON FUNCTION public.reserve_inbound_manifestation_event(text, integer, text, text, uuid, uuid) IS
  'Reserva Ciência somente para NF-e resumo cujo destinatário salvo corresponde ao CNPJ do evento. O CNPJ da chave identifica o emitente.';

COMMIT;

-- Rollback: restore the prior function body from
-- 20261017150000_nfe_return_estorno_cancellation_and_inbound_alphanumeric.sql.
