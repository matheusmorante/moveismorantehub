BEGIN;

CREATE TABLE public.nfe_document_export_history (
  id uuid PRIMARY KEY,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  purpose text NOT NULL CHECK (purpose IN ('accounting', 'custom')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  environment smallint NOT NULL CHECK (environment IN (1, 2)),
  models text[] NOT NULL CHECK (cardinality(models) > 0 AND models <@ ARRAY['55', '65']::text[]),
  document_types text[] NOT NULL CHECK (
    cardinality(document_types) > 0 AND document_types <@ ARRAY['outbound', 'estorno', 'return', 'inbound']::text[]
  ),
  statuses text[] NOT NULL CHECK (
    cardinality(statuses) > 0 AND statuses <@ ARRAY['autorizada', 'homologada', 'cancelada', 'denegada', 'rejeitada']::text[]
  ),
  includes_events boolean NOT NULL,
  includes_report boolean NOT NULL,
  document_count integer NOT NULL CHECK (document_count >= 0),
  event_count integer NOT NULL CHECK (event_count >= 0),
  total_value numeric(14, 2) NOT NULL CHECK (total_value >= 0),
  archive_name text NOT NULL CHECK (archive_name ~ '^[A-Za-z0-9._-]{1,120}\.zip$')
);

COMMENT ON TABLE public.nfe_document_export_history IS
  'Auditoria de pacotes fiscais gerados; guarda apenas filtros e contagens, nunca XMLs nem dados de destinatários.';

ALTER TABLE public.nfe_document_export_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nfe_document_export_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.nfe_document_export_history TO service_role;

CREATE INDEX nfe_document_export_history_user_created_idx
  ON public.nfe_document_export_history (requested_by, created_at DESC);

COMMIT;
