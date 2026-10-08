ALTER TABLE public.inbound_invoices
  ADD COLUMN IF NOT EXISTS ambiente smallint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'inbound_invoices_ambiente_check'
       AND conrelid = 'public.inbound_invoices'::regclass
  ) THEN
    ALTER TABLE public.inbound_invoices
      ADD CONSTRAINT inbound_invoices_ambiente_check CHECK (ambiente IN (1, 2));
  END IF;
END;
$$;

COMMENT ON COLUMN public.inbound_invoices.ambiente IS
  'tpAmb de origem (1=Produção, 2=Homologação); não inferir para registros antigos sem evidência.';

CREATE TABLE IF NOT EXISTS public.inbound_manifestation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_invoice_id uuid REFERENCES public.inbound_invoices(id) ON DELETE SET NULL,
  access_key varchar(44) NOT NULL CHECK (access_key ~ '^[0-9]{44}$'),
  event_type varchar(6) NOT NULL CHECK (event_type = '210210'),
  event_sequence integer NOT NULL DEFAULT 1 CHECK (event_sequence = 1),
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  environment smallint NOT NULL CHECK (environment IN (1, 2)),
  recipient_cnpj varchar(14) NOT NULL CHECK (recipient_cnpj ~ '^[0-9]{14}$'),
  status varchar(24) NOT NULL CHECK (status IN ('transmitting', 'registered', 'rejected', 'unknown')),
  signed_xml text NOT NULL,
  response_xml text,
  cstat varchar(4),
  xmotivo text,
  protocol_number varchar(30),
  protocol_date timestamptz,
  request_id uuid NOT NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE (access_key, event_type, environment, attempt_number),
  UNIQUE (access_key, event_type, environment, request_id)
);

CREATE INDEX IF NOT EXISTS idx_inbound_manifestation_events_latest
  ON public.inbound_manifestation_events(access_key, event_type, environment, attempt_number DESC);

ALTER TABLE public.inbound_manifestation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inbound_manifestation_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.inbound_manifestation_events TO service_role;

COMMENT ON TABLE public.inbound_manifestation_events IS
  'Histórico durável da Ciência da Emissão (210210) para NF-e de entrada; eventos incertos não podem ser retransmitidos automaticamente.';

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
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_invoice public.inbound_invoices%ROWTYPE;
  v_latest_id uuid;
  v_latest_status text;
  v_attempt_number integer;
  v_new_id uuid;
BEGIN
  IF p_access_key IS NULL OR p_access_key !~ '^[0-9]{44}$'
     OR p_environment IS NULL OR p_environment NOT IN (1, 2)
     OR p_recipient_cnpj IS NULL OR p_recipient_cnpj !~ '^[0-9]{14}$'
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
  IF regexp_replace(COALESCE(v_invoice.destinatario_cnpj, ''), '[^0-9]', '', 'g') <> p_recipient_cnpj
     OR substring(p_access_key from 7 for 14) <> p_recipient_cnpj THEN
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
$$;

REVOKE ALL ON FUNCTION public.reserve_inbound_manifestation_event(text, integer, text, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_inbound_manifestation_event(text, integer, text, text, uuid, uuid)
  TO service_role;
