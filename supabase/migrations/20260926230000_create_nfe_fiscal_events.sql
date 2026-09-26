CREATE TABLE IF NOT EXISTS public.nfe_document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  event_type varchar(6) NOT NULL,
  event_sequence integer NOT NULL DEFAULT 1 CHECK (event_sequence > 0),
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  environment integer NOT NULL CHECK (environment IN (1, 2)),
  status varchar(24) NOT NULL CHECK (status IN ('transmitting', 'registered', 'rejected', 'unknown')),
  justification text NOT NULL,
  signed_xml text,
  response_xml text,
  cstat varchar(4),
  xmotivo text,
  protocol_number varchar(30),
  protocol_date timestamptz,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE (document_id, event_type, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_nfe_document_events_document
  ON public.nfe_document_events(document_id, requested_at DESC);

ALTER TABLE public.nfe_document_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nfe_document_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.nfe_document_events TO service_role;

COMMENT ON TABLE public.nfe_document_events IS
  'Eventos fiscais append-only por documento; XML autorizado original permanece em nfe_documents.';
