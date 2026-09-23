-- NCM catalog lifecycle, safe synchronization previews, correlation records,
-- and audited product classification reviews.

ALTER TABLE public.ncms
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_id uuid;

UPDATE public.ncms
SET last_seen_at = COALESCE(last_seen_at, updated_at, created_at, now()),
    changed_at = COALESCE(changed_at, updated_at, created_at, now())
WHERE last_seen_at IS NULL OR changed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ncm_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'fetching' CHECK (status IN ('fetching', 'preview', 'completed', 'failed', 'expired')),
  source_url text NOT NULL,
  source_updated_at text,
  source_total_count integer NOT NULL DEFAULT 0,
  source_valid_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  retired_count integer NOT NULL DEFAULT 0,
  changed_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text
);

CREATE TABLE IF NOT EXISTS public.ncm_sync_staging (
  sync_run_id uuid NOT NULL REFERENCES public.ncm_sync_runs(id) ON DELETE CASCADE,
  code text NOT NULL,
  official_description text NOT NULL,
  start_date date,
  end_date date,
  legal_act text,
  PRIMARY KEY (sync_run_id, code),
  CHECK (code ~ '^[0-9]{8}$')
);

CREATE TABLE IF NOT EXISTS public.ncm_change_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sync_run_id uuid REFERENCES public.ncm_sync_runs(id) ON DELETE SET NULL,
  code text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('inserted', 'retired', 'reactivated', 'description_changed', 'validity_changed', 'legal_act_changed')),
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ncm_correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code text NOT NULL CHECK (source_code ~ '^[0-9]{8}$'),
  destination_code text NOT NULL CHECK (destination_code ~ '^[0-9]{8}$'),
  relation_type text NOT NULL CHECK (relation_type IN ('one_to_one', 'one_to_many', 'many_to_one')),
  effective_from date,
  effective_to date,
  version_label text,
  source_name text NOT NULL,
  source_reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_code, destination_code, source_name, version_label)
);

CREATE TABLE IF NOT EXISTS public.ncm_product_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  old_code text NOT NULL,
  new_code text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ncm_staging_run_id ON public.ncm_sync_staging(sync_run_id);
CREATE INDEX IF NOT EXISTS idx_ncm_events_code_time ON public.ncm_change_events(code, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ncm_events_time ON public.ncm_change_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ncm_correlations_source ON public.ncm_correlations(source_code);
CREATE INDEX IF NOT EXISTS idx_ncm_correlations_destination ON public.ncm_correlations(destination_code);
CREATE INDEX IF NOT EXISTS idx_ncm_reviews_product_time ON public.ncm_product_reviews(product_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_normalized_ncm
  ON public.products ((regexp_replace(COALESCE(fiscal->>'ncm', ''), '[^0-9]', '', 'g')))
  WHERE COALESCE(deleted, false) = false;

ALTER TABLE public.ncm_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncm_sync_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncm_change_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncm_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncm_product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Criação de NCM Aliases permitida para autenticados" ON public.ncm_aliases;
DROP POLICY IF EXISTS "Modificação de NCM Aliases permitida para autenticados" ON public.ncm_aliases;
DROP POLICY IF EXISTS "Deleção de NCM Aliases permitida para autenticados" ON public.ncm_aliases;
DROP POLICY IF EXISTS "Administrators manage NCM aliases" ON public.ncm_aliases;
CREATE POLICY "Administrators manage NCM aliases" ON public.ncm_aliases
  FOR ALL TO authenticated
  USING (public.is_administrator()) WITH CHECK (public.is_administrator());

DROP POLICY IF EXISTS "Authenticated users can read NCM sync runs" ON public.ncm_sync_runs;
CREATE POLICY "Authenticated users can read NCM sync runs"
  ON public.ncm_sync_runs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can read NCM change events" ON public.ncm_change_events;
CREATE POLICY "Authenticated users can read NCM change events"
  ON public.ncm_change_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can read NCM correlations" ON public.ncm_correlations;
CREATE POLICY "Authenticated users can read NCM correlations"
  ON public.ncm_correlations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Administrators manage NCM correlations" ON public.ncm_correlations;
CREATE POLICY "Administrators manage NCM correlations"
  ON public.ncm_correlations FOR ALL TO authenticated
  USING (public.is_administrator()) WITH CHECK (public.is_administrator());
DROP POLICY IF EXISTS "Authenticated users can read NCM product reviews" ON public.ncm_product_reviews;
CREATE POLICY "Authenticated users can read NCM product reviews"
  ON public.ncm_product_reviews FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.preview_ncm_catalog_sync(p_sync_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.ncm_sync_runs%ROWTYPE;
  v_source_count integer;
  v_added integer;
  v_retired integer;
  v_changed integer;
  v_affected_products integer;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Somente administradores podem sincronizar a tabela NCM.';
  END IF;

  SELECT * INTO v_run FROM public.ncm_sync_runs WHERE id = p_sync_run_id FOR UPDATE;
  IF NOT FOUND OR v_run.status <> 'preview' OR v_run.expires_at <= now() THEN
    RAISE EXCEPTION 'Prévia de sincronização inexistente ou expirada.';
  END IF;

  SELECT count(*) INTO v_source_count
  FROM public.ncm_sync_staging WHERE sync_run_id = p_sync_run_id;
  IF v_source_count <> v_run.source_valid_count OR v_source_count < 9000 THEN
    RAISE EXCEPTION 'A amostra não passou pela validação de integridade.';
  END IF;

  SELECT count(*) INTO v_added
  FROM public.ncm_sync_staging s
  LEFT JOIN public.ncms n ON n.code = s.code
  WHERE s.sync_run_id = p_sync_run_id AND n.code IS NULL;

  SELECT count(*) INTO v_retired
  FROM public.ncms n
  WHERE n.active = true
    AND NOT EXISTS (SELECT 1 FROM public.ncm_sync_staging s WHERE s.sync_run_id = p_sync_run_id AND s.code = n.code);

  SELECT count(*) INTO v_changed
  FROM public.ncm_sync_staging s
  JOIN public.ncms n ON n.code = s.code
  WHERE s.sync_run_id = p_sync_run_id
    AND (n.official_description IS DISTINCT FROM s.official_description
      OR n.start_date IS DISTINCT FROM s.start_date
      OR n.end_date IS DISTINCT FROM s.end_date
      OR n.legal_act IS DISTINCT FROM s.legal_act
      OR n.active IS DISTINCT FROM (COALESCE(s.start_date, '-infinity'::date) <= current_date AND COALESCE(s.end_date, 'infinity'::date) >= current_date));

  SELECT count(DISTINCT p.id) INTO v_affected_products
  FROM public.ncms n
  JOIN public.products p
    ON regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g') = n.code
  WHERE n.active = true
    AND NOT EXISTS (SELECT 1 FROM public.ncm_sync_staging s WHERE s.sync_run_id = p_sync_run_id AND s.code = n.code)
    AND COALESCE(p.deleted, false) = false;

  RETURN jsonb_build_object(
    'sync_run_id', p_sync_run_id,
    'source_updated_at', v_run.source_updated_at,
    'source_total_count', v_run.source_total_count,
    'source_valid_count', v_source_count,
    'inserted_count', v_added,
    'retired_count', v_retired,
    'changed_count', v_changed,
    'affected_products_count', v_affected_products,
    'expires_at', v_run.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_ncm_catalog_sync(p_sync_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.ncm_sync_runs%ROWTYPE;
  v_source_count integer;
  v_added integer;
  v_retired integer;
  v_changed integer;
  v_now timestamptz := now();
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Somente administradores podem aplicar a sincronização NCM.';
  END IF;

  SELECT * INTO v_run FROM public.ncm_sync_runs WHERE id = p_sync_run_id FOR UPDATE;
  IF NOT FOUND OR v_run.status <> 'preview' OR v_run.expires_at <= v_now THEN
    RAISE EXCEPTION 'Prévia de sincronização inexistente ou expirada.';
  END IF;

  SELECT count(*) INTO v_source_count FROM public.ncm_sync_staging WHERE sync_run_id = p_sync_run_id;
  IF v_source_count <> v_run.source_valid_count OR v_source_count < 9000 OR v_source_count < (SELECT count(*) FROM public.ncms WHERE active = true) * 0.80 THEN
    RAISE EXCEPTION 'A fonte está incompleta ou diverge da base atual; nenhuma alteração foi aplicada.';
  END IF;

  SELECT count(*) INTO v_added FROM public.ncm_sync_staging s LEFT JOIN public.ncms n ON n.code = s.code
  WHERE s.sync_run_id = p_sync_run_id AND n.code IS NULL;
  SELECT count(*) INTO v_retired FROM public.ncms n WHERE n.active = true
    AND NOT EXISTS (SELECT 1 FROM public.ncm_sync_staging s WHERE s.sync_run_id = p_sync_run_id AND s.code = n.code);
  SELECT count(*) INTO v_changed FROM public.ncm_sync_staging s JOIN public.ncms n ON n.code = s.code
  WHERE s.sync_run_id = p_sync_run_id
    AND (n.official_description IS DISTINCT FROM s.official_description
      OR n.start_date IS DISTINCT FROM s.start_date
      OR n.end_date IS DISTINCT FROM s.end_date
      OR n.legal_act IS DISTINCT FROM s.legal_act
      OR n.active IS DISTINCT FROM (COALESCE(s.start_date, '-infinity'::date) <= current_date AND COALESCE(s.end_date, 'infinity'::date) >= current_date));

  INSERT INTO public.ncm_change_events (sync_run_id, code, event_type, old_data, new_data)
  SELECT p_sync_run_id, s.code, 'inserted', NULL,
    jsonb_build_object('description', s.official_description, 'start_date', s.start_date, 'end_date', s.end_date, 'legal_act', s.legal_act)
  FROM public.ncm_sync_staging s LEFT JOIN public.ncms n ON n.code = s.code
  WHERE s.sync_run_id = p_sync_run_id AND n.code IS NULL;

  INSERT INTO public.ncm_change_events (sync_run_id, code, event_type, old_data, new_data)
  SELECT p_sync_run_id, n.code, 'retired',
    jsonb_build_object('description', n.official_description, 'start_date', n.start_date, 'end_date', n.end_date, 'legal_act', n.legal_act), NULL
  FROM public.ncms n
  WHERE n.active = true
    AND NOT EXISTS (SELECT 1 FROM public.ncm_sync_staging s WHERE s.sync_run_id = p_sync_run_id AND s.code = n.code);

  INSERT INTO public.ncm_change_events (sync_run_id, code, event_type, old_data, new_data)
  SELECT p_sync_run_id, s.code,
    CASE
      WHEN n.active = false AND COALESCE(s.start_date, '-infinity'::date) <= current_date AND COALESCE(s.end_date, 'infinity'::date) >= current_date THEN 'reactivated'
      WHEN n.official_description IS DISTINCT FROM s.official_description THEN 'description_changed'
      WHEN n.start_date IS DISTINCT FROM s.start_date OR n.end_date IS DISTINCT FROM s.end_date THEN 'validity_changed'
      ELSE 'legal_act_changed'
    END,
    jsonb_build_object('description', n.official_description, 'start_date', n.start_date, 'end_date', n.end_date, 'legal_act', n.legal_act, 'active', n.active),
    jsonb_build_object('description', s.official_description, 'start_date', s.start_date, 'end_date', s.end_date, 'legal_act', s.legal_act,
      'active', COALESCE(s.start_date, '-infinity'::date) <= current_date AND COALESCE(s.end_date, 'infinity'::date) >= current_date)
  FROM public.ncm_sync_staging s JOIN public.ncms n ON n.code = s.code
  WHERE s.sync_run_id = p_sync_run_id
    AND (n.official_description IS DISTINCT FROM s.official_description
      OR n.start_date IS DISTINCT FROM s.start_date
      OR n.end_date IS DISTINCT FROM s.end_date
      OR n.legal_act IS DISTINCT FROM s.legal_act
      OR n.active IS DISTINCT FROM (COALESCE(s.start_date, '-infinity'::date) <= current_date AND COALESCE(s.end_date, 'infinity'::date) >= current_date));

  UPDATE public.ncms n SET active = false, changed_at = v_now, updated_at = v_now, last_sync_id = p_sync_run_id
  WHERE n.active = true
    AND NOT EXISTS (SELECT 1 FROM public.ncm_sync_staging s WHERE s.sync_run_id = p_sync_run_id AND s.code = n.code);

  INSERT INTO public.ncms (code, official_description, start_date, end_date, legal_act, active, created_at, updated_at, first_seen_at, last_seen_at, changed_at, last_sync_id)
  SELECT s.code, s.official_description, s.start_date, s.end_date, s.legal_act,
    COALESCE(s.start_date, '-infinity'::date) <= current_date AND COALESCE(s.end_date, 'infinity'::date) >= current_date,
    v_now, v_now, v_now, v_now, v_now, p_sync_run_id
  FROM public.ncm_sync_staging s WHERE s.sync_run_id = p_sync_run_id
  ON CONFLICT (code) DO UPDATE SET
    official_description = EXCLUDED.official_description,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    legal_act = EXCLUDED.legal_act,
    active = EXCLUDED.active,
    updated_at = v_now,
    first_seen_at = COALESCE(public.ncms.first_seen_at, v_now),
    last_seen_at = v_now,
    changed_at = CASE WHEN public.ncms.official_description IS DISTINCT FROM EXCLUDED.official_description
      OR public.ncms.start_date IS DISTINCT FROM EXCLUDED.start_date
      OR public.ncms.end_date IS DISTINCT FROM EXCLUDED.end_date
      OR public.ncms.legal_act IS DISTINCT FROM EXCLUDED.legal_act
      OR public.ncms.active IS DISTINCT FROM EXCLUDED.active THEN v_now ELSE public.ncms.changed_at END,
    last_sync_id = p_sync_run_id;

  UPDATE public.ncm_sync_runs SET status = 'completed', completed_at = v_now,
    inserted_count = v_added, retired_count = v_retired, changed_count = v_changed
  WHERE id = p_sync_run_id;
  DELETE FROM public.ncm_sync_staging WHERE sync_run_id = p_sync_run_id;

  RETURN jsonb_build_object('success', true, 'sync_run_id', p_sync_run_id,
    'source_updated_at', v_run.source_updated_at, 'source_valid_count', v_source_count,
    'inserted_count', v_added, 'retired_count', v_retired, 'changed_count', v_changed);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_ncm_sync_changes(
  p_sync_run_id uuid, p_limit integer DEFAULT 30, p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Somente administradores podem consultar a prévia da sincronização NCM.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ncm_sync_runs
      WHERE id = p_sync_run_id AND status = 'preview' AND expires_at > now()) THEN
    RAISE EXCEPTION 'Prévia de sincronização inexistente ou expirada.';
  END IF;

  WITH changes AS (
    SELECT COALESCE(s.code, n.code) AS code,
      CASE WHEN n.code IS NULL THEN 'inserted'
        WHEN s.code IS NULL AND n.active THEN 'retired'
        WHEN s.code IS NOT NULL AND (n.official_description IS DISTINCT FROM s.official_description
          OR n.start_date IS DISTINCT FROM s.start_date OR n.end_date IS DISTINCT FROM s.end_date
          OR n.legal_act IS DISTINCT FROM s.legal_act
          OR n.active IS DISTINCT FROM (COALESCE(s.start_date, '-infinity'::date) <= current_date
            AND COALESCE(s.end_date, 'infinity'::date) >= current_date)) THEN 'changed'
        ELSE NULL END AS change_type,
      n.official_description AS old_description, s.official_description AS new_description,
      n.start_date AS old_start_date, s.start_date AS new_start_date,
      n.end_date AS old_end_date, s.end_date AS new_end_date,
      n.legal_act AS old_legal_act, s.legal_act AS new_legal_act
    FROM public.ncms n FULL JOIN
      (SELECT * FROM public.ncm_sync_staging WHERE sync_run_id = p_sync_run_id) s
      ON s.code = n.code
  ), filtered AS (SELECT * FROM changes WHERE change_type IS NOT NULL), page AS (
    SELECT * FROM filtered ORDER BY
      CASE change_type WHEN 'retired' THEN 0 WHEN 'changed' THEN 1 ELSE 2 END, code
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT jsonb_build_object(
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page), '[]'::jsonb),
    'total', (SELECT count(*) FROM filtered)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ncm_catalog_summary()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'active_count', (SELECT count(*) FROM public.ncms WHERE active = true),
    'recent_changes_count', (SELECT count(*) FROM public.ncm_change_events WHERE occurred_at >= now() - interval '30 days'),
    'retired_with_products_count', (
      SELECT count(*) FROM public.ncms n
      WHERE n.active = false AND COALESCE(n.start_date, '-infinity'::date) <= current_date
        AND EXISTS (SELECT 1 FROM public.products p
          WHERE regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g') = n.code
            AND COALESCE(p.deleted, false) = false)
    ),
    'products_to_review_count', (
      SELECT count(DISTINCT p.id) FROM public.products p
      LEFT JOIN public.ncms n ON n.code = regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g')
      WHERE length(regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g')) = 8
        AND (n.code IS NULL OR (n.active = false AND COALESCE(n.start_date, '-infinity'::date) <= current_date))
        AND COALESCE(p.deleted, false) = false
    ),
    'last_sync', (SELECT jsonb_build_object('completed_at', completed_at, 'source_updated_at', source_updated_at,
       'status', status, 'source_valid_count', source_valid_count)
      FROM public.ncm_sync_runs WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.list_ncm_catalog(
  p_search text DEFAULT '', p_filter text DEFAULT 'all', p_limit integer DEFAULT 30, p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH catalog AS (
    SELECT n.code, n.official_description, n.active, n.start_date, n.end_date, n.legal_act,
      n.first_seen_at, n.last_seen_at, n.changed_at,
      count(p.id)::integer AS product_count, false AS is_unverified
    FROM public.ncms n
    LEFT JOIN public.products p
      ON regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g') = n.code
      AND COALESCE(p.deleted, false) = false
    GROUP BY n.code
    UNION ALL
    SELECT regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g') AS code,
      'Código ausente da base vigente; consulte o histórico oficial antes de classificar.'::text AS official_description,
      false AS active, NULL::date AS start_date, NULL::date AS end_date, NULL::text AS legal_act,
      NULL::timestamptz AS first_seen_at, NULL::timestamptz AS last_seen_at, NULL::timestamptz AS changed_at,
      count(*)::integer AS product_count, true AS is_unverified
    FROM public.products p
    LEFT JOIN public.ncms n ON n.code = regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g')
    WHERE n.code IS NULL
      AND regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g') ~ '^[0-9]{8}$'
      AND COALESCE(p.deleted, false) = false
    GROUP BY regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g')
  ), filtered AS (
    SELECT c.* FROM catalog c
    WHERE (COALESCE(trim(p_search), '') = ''
      OR c.code LIKE regexp_replace(trim(p_search), '[^0-9]', '', 'g') || '%'
      OR unaccent(c.official_description) ILIKE '%' || unaccent(trim(p_search)) || '%')
      AND CASE p_filter
        WHEN 'vigentes' THEN c.active AND NOT c.is_unverified
        WHEN 'encerrados' THEN c.active = false AND NOT c.is_unverified AND COALESCE(c.start_date, '-infinity'::date) <= current_date
        WHEN 'futuros' THEN COALESCE(c.start_date, '-infinity'::date) > current_date
        WHEN 'alterados' THEN NOT c.is_unverified AND c.changed_at >= now() - interval '30 days'
        WHEN 'com_produtos' THEN c.product_count > 0
        WHEN 'revisar' THEN c.is_unverified OR (c.active = false AND COALESCE(c.start_date, '-infinity'::date) <= current_date AND c.product_count > 0)
        ELSE true
      END
  ), page AS (
    SELECT * FROM filtered ORDER BY
      CASE WHEN is_unverified OR (active = false AND product_count > 0) THEN 0 ELSE 1 END,
      code
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT jsonb_build_object(
    'items', COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page), '[]'::jsonb),
    'total', (SELECT count(*) FROM filtered)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_ncm_products(p_code text, p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
RETURNS TABLE (id uuid, code text, name text, ncm_code text, ncm_description text, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH matching AS (
    SELECT p.id, p.code, p.name,
      COALESCE(p.fiscal->>'ncm', '') AS ncm_code,
      COALESCE(p.fiscal->>'ncmDescription', '') AS ncm_description
    FROM public.products p
    WHERE regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(p_code, ''), '[^0-9]', '', 'g')
      AND COALESCE(p.deleted, false) = false
  )
  SELECT m.*, count(*) OVER() AS total_count FROM matching m
  ORDER BY m.name, m.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.apply_ncm_product_reviews(p_updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_update jsonb;
  v_product_id uuid;
  v_old_code text;
  v_new_code text;
  v_current_code text;
  v_description text;
  v_updated integer := 0;
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Somente administradores podem confirmar a revisão de NCM.';
  END IF;
  IF jsonb_typeof(p_updates) <> 'array' OR jsonb_array_length(p_updates) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um produto para revisar.';
  END IF;

  FOR v_update IN SELECT value FROM jsonb_array_elements(p_updates)
  LOOP
    v_product_id := (v_update->>'product_id')::uuid;
    v_old_code := regexp_replace(COALESCE(v_update->>'old_code', ''), '[^0-9]', '', 'g');
    v_new_code := regexp_replace(COALESCE(v_update->>'new_code', ''), '[^0-9]', '', 'g');
    IF length(v_new_code) <> 8 THEN RAISE EXCEPTION 'NCM de destino inválido.'; END IF;

    SELECT regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g')
      INTO v_current_code FROM public.products p WHERE p.id = v_product_id AND COALESCE(p.deleted, false) = false FOR UPDATE;
    IF NOT FOUND OR v_current_code IS DISTINCT FROM v_old_code THEN
      RAISE EXCEPTION 'O produto % foi alterado desde que a revisão foi aberta; atualize a tela e tente novamente.', v_product_id;
    END IF;

    SELECT n.official_description INTO v_description FROM public.ncms n
      WHERE n.code = v_new_code AND n.active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'O NCM de destino % não está vigente na base local.', v_new_code; END IF;

    UPDATE public.products SET fiscal = COALESCE(fiscal, '{}'::jsonb) || jsonb_build_object('ncm', v_new_code, 'ncmDescription', v_description),
      updated_at = now()
    WHERE id = v_product_id;
    INSERT INTO public.ncm_product_reviews(product_id, old_code, new_code, actor_id)
    VALUES (v_product_id, v_current_code, v_new_code, v_actor);
    v_updated := v_updated + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.preview_ncm_catalog_sync(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_ncm_catalog_sync(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_ncm_sync_changes(uuid, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_ncm_catalog_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_ncm_catalog(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_ncm_products(text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_ncm_product_reviews(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_ncms(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_ncm_catalog_sync(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_ncm_catalog_sync(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ncm_sync_changes(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_ncm_catalog_sync(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_ncm_catalog_sync(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ncm_catalog_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ncm_catalog(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ncm_products(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_ncm_product_reviews(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_ncms(text, integer) TO authenticated;
