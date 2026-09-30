CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.nfe_fiscal_snapshots (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  emission_request_id uuid NOT NULL UNIQUE,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_version integer NOT NULL CHECK (order_version >= 0),
  order_updated_at timestamptz NOT NULL,
  requested_model varchar(2) NOT NULL CHECK (requested_model IN ('55', '65')),
  environment integer NOT NULL CHECK (environment IN (1, 2)),
  series varchar(4) NOT NULL CHECK (series ~ '^[0-9]{1,3}$'),
  reserved_number integer NOT NULL CHECK (reserved_number BETWEEN 1 AND 999999999),
  snapshot_data jsonb NOT NULL CHECK (pg_catalog.jsonb_typeof(snapshot_data) = 'object'),
  snapshot_sha256 varchar(64) NOT NULL CHECK (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  captured_at timestamptz NOT NULL,
  CONSTRAINT uq_nfe_fiscal_snapshot_sequence
    UNIQUE (requested_model, series, environment, reserved_number)
);

COMMENT ON TABLE public.nfe_fiscal_snapshots IS
  'Snapshot comercial fiscal capturado no backend; leitura/escrita somente pelo serviço fiscal.';
COMMENT ON COLUMN public.nfe_fiscal_snapshots.requested_model IS
  'Modelo solicitado pelo cliente; não representa determinação fiscal aprovada.';
COMMENT ON COLUMN public.nfe_fiscal_snapshots.snapshot_data IS
  'Fatos comerciais persistidos e perfil seguro do emitente; não contém regras tributárias resolvidas nem segredos.';

CREATE INDEX IF NOT EXISTS idx_nfe_fiscal_snapshots_order_captured
  ON public.nfe_fiscal_snapshots(order_id, captured_at DESC);

ALTER TABLE public.nfe_fiscal_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nfe_fiscal_snapshots FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.nfe_fiscal_snapshots TO service_role;

ALTER TABLE public.nfe_documents
  ADD COLUMN IF NOT EXISTS fiscal_snapshot_id uuid
    REFERENCES public.nfe_fiscal_snapshots(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_nfe_documents_fiscal_snapshot
  ON public.nfe_documents(fiscal_snapshot_id)
  WHERE fiscal_snapshot_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prepare_nfe_fiscal_snapshot(
  p_order_id text,
  p_emission_request_id uuid,
  p_modelo varchar(2),
  p_ambiente integer,
  p_serie varchar(4),
  p_numero_minimo integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.nfe_fiscal_snapshots%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_settings jsonb;
  v_issuer_profile jsonb;
  v_snapshot_data jsonb;
  v_snapshot_hash text;
  v_captured_at timestamptz;
  v_number integer;
  v_snapshot_id uuid;
BEGIN
  IF COALESCE(p_order_id, '') = ''
     OR p_emission_request_id IS NULL
     OR p_modelo IS NULL OR p_modelo NOT IN ('55', '65')
     OR p_ambiente IS NULL OR p_ambiente NOT IN (1, 2)
     OR COALESCE(p_serie, '') !~ '^[0-9]{1,3}$'
     OR COALESCE(p_numero_minimo, 0) NOT BETWEEN 1 AND 999999999 THEN
    RAISE EXCEPTION 'Parâmetros inválidos para snapshot fiscal.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nfe_snapshot:' || p_emission_request_id::text, 0)
  );

  SELECT * INTO v_existing
    FROM public.nfe_fiscal_snapshots
   WHERE emission_request_id = p_emission_request_id;

  IF FOUND THEN
    IF v_existing.order_id IS DISTINCT FROM p_order_id
       OR v_existing.requested_model IS DISTINCT FROM p_modelo
       OR v_existing.environment IS DISTINCT FROM p_ambiente
       OR v_existing.series IS DISTINCT FROM p_serie THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = '23505';
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'snapshotId', v_existing.id,
      'snapshotHash', v_existing.snapshot_sha256,
      'number', v_existing.reserved_number,
      'issuedAt', v_existing.captured_at,
      'orderVersion', v_existing.order_version
    );
  END IF;

  SELECT o.id, o.order_type, o.status, o.order_data, o.version, o.updated_at
    INTO v_order.id, v_order.order_type, v_order.status, v_order.order_data,
         v_order.version, v_order.updated_at
    FROM public.orders AS o
   WHERE o.id = p_order_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF COALESCE(v_order.order_type, '') NOT IN ('sale', 'showroom')
     OR pg_catalog.lower(COALESCE(v_order.status, '')) IN ('cancelled', 'cancelado') THEN
    RAISE EXCEPTION 'ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL' USING ERRCODE = '23514';
  END IF;
  IF v_order.order_data IS NULL OR pg_catalog.jsonb_typeof(v_order.order_data) <> 'object' THEN
    RAISE EXCEPTION 'ORDER_FISCAL_DATA_UNAVAILABLE' USING ERRCODE = '23514';
  END IF;
  IF v_order.version IS NULL OR v_order.updated_at IS NULL THEN
    RAISE EXCEPTION 'ORDER_REVISION_UNAVAILABLE' USING ERRCODE = '23514';
  END IF;

  SELECT s.data INTO v_settings
    FROM public.settings AS s
   WHERE s.id = 'app'
   FOR SHARE;

  IF NOT FOUND OR v_settings IS NULL OR pg_catalog.jsonb_typeof(v_settings) <> 'object' THEN
    RAISE EXCEPTION 'ISSUER_PROFILE_UNAVAILABLE' USING ERRCODE = '23514';
  END IF;

  v_issuer_profile := pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'companyName', v_settings -> 'companyName',
    'companyAddress', v_settings -> 'companyAddress',
    'companyCnpj', v_settings -> 'companyCnpj',
    'companyIE', v_settings -> 'companyIE',
    'companyIM', v_settings -> 'companyIM',
    'companyCRT', v_settings -> 'companyCRT',
    'companyLogradouro', v_settings -> 'companyLogradouro',
    'companyNumero', v_settings -> 'companyNumero',
    'companyBairro', v_settings -> 'companyBairro',
    'companyCEP', v_settings -> 'companyCEP',
    'companyCMun', v_settings -> 'companyCMun',
    'companyXMun', v_settings -> 'companyXMun',
    'companyUF', v_settings -> 'companyUF',
    'companyPhone', v_settings -> 'companyPhone',
    'cscId', v_settings -> 'cscId'
  ));

  IF COALESCE(v_issuer_profile ->> 'companyCMun', '') !~ '^[0-9]{7}$' THEN
    RAISE EXCEPTION 'ISSUER_MUNICIPALITY_UNAVAILABLE' USING ERRCODE = '23514';
  END IF;

  v_captured_at := pg_catalog.date_trunc('second', pg_catalog.clock_timestamp());

  INSERT INTO public.nfe_sequences (modelo, serie, ambiente, ultimo_numero, updated_at)
  VALUES (p_modelo, p_serie, p_ambiente, p_numero_minimo, v_captured_at)
  ON CONFLICT (modelo, serie, ambiente)
  DO UPDATE SET
    ultimo_numero = GREATEST(
      public.nfe_sequences.ultimo_numero + 1,
      EXCLUDED.ultimo_numero
    ),
    updated_at = EXCLUDED.updated_at
  RETURNING ultimo_numero INTO v_number;

  v_snapshot_data := pg_catalog.jsonb_build_object(
    'schemaVersion', 1,
    'capturedAt', v_captured_at,
    'order', pg_catalog.jsonb_build_object(
      'id', v_order.id,
      'type', v_order.order_type,
      'status', v_order.status,
      'version', v_order.version,
      'updatedAt', v_order.updated_at,
      'data', v_order.order_data
    ),
    'issuerProfile', v_issuer_profile,
    'emissionRequest', pg_catalog.jsonb_build_object(
      'id', p_emission_request_id,
      'requestedModel', p_modelo,
      'environment', p_ambiente,
      'series', p_serie,
      'number', v_number
    )
  );
  v_snapshot_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_snapshot_data::text, 'UTF8'), 'sha256'),
    'hex'
  );

  INSERT INTO public.nfe_fiscal_snapshots (
    emission_request_id, order_id, order_version, order_updated_at,
    requested_model, environment, series, reserved_number,
    snapshot_data, snapshot_sha256, captured_at
  ) VALUES (
    p_emission_request_id, v_order.id::text, v_order.version, v_order.updated_at,
    p_modelo, p_ambiente, p_serie, v_number,
    v_snapshot_data, v_snapshot_hash, v_captured_at
  ) RETURNING id INTO v_snapshot_id;

  RETURN pg_catalog.jsonb_build_object(
    'snapshotId', v_snapshot_id,
    'snapshotHash', v_snapshot_hash,
    'number', v_number,
    'issuedAt', v_captured_at,
    'orderVersion', v_order.version
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.prepare_nfe_fiscal_snapshot(
  text, uuid, varchar, integer, varchar, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_fiscal_snapshot(
  text, uuid, varchar, integer, varchar, integer
) TO service_role;

CREATE OR REPLACE FUNCTION public.attach_nfe_fiscal_snapshot_to_outbound()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_snapshot public.nfe_fiscal_snapshots%ROWTYPE;
BEGIN
  IF NEW.document_type <> 'outbound' THEN
    RETURN NEW;
  END IF;

  IF NEW.emission_request_id IS NULL THEN
    RAISE EXCEPTION 'MISSING_FISCAL_SNAPSHOT' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_snapshot
    FROM public.nfe_fiscal_snapshots
   WHERE emission_request_id = NEW.emission_request_id;

  IF NOT FOUND
     OR v_snapshot.order_id IS DISTINCT FROM NEW.order_id
     OR v_snapshot.requested_model IS DISTINCT FROM NEW.modelo
     OR v_snapshot.environment IS DISTINCT FROM NEW.ambiente
     OR v_snapshot.series IS DISTINCT FROM NEW.serie
     OR v_snapshot.reserved_number IS DISTINCT FROM NEW.numero_nfe THEN
    RAISE EXCEPTION 'FISCAL_SNAPSHOT_MISMATCH' USING ERRCODE = '23514';
  END IF;

  NEW.fiscal_snapshot_id := v_snapshot.id;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.attach_nfe_fiscal_snapshot_to_outbound()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_attach_nfe_fiscal_snapshot_to_outbound
  ON public.nfe_documents;

CREATE TRIGGER trg_attach_nfe_fiscal_snapshot_to_outbound
  BEFORE INSERT ON public.nfe_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.attach_nfe_fiscal_snapshot_to_outbound();
