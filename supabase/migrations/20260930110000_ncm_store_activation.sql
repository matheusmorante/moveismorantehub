-- NCM.active is the official tariff validity; is_active is the store's
-- operational selection preference. Keep these independent.
DO $$
DECLARE
  v_seed_needed boolean := false;
  v_approved_codes text[] := ARRAY[
    '94034000', '94035000', '94036000', '94032090',
    '94016100', '94016900', '94017100', '94017900',
    '94041000', '94042100', '94042900', '94049000', '73241000'
  ];
  v_valid_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ncms' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.ncms ADD COLUMN is_active boolean NOT NULL DEFAULT false;
    v_seed_needed := true;
  END IF;

  -- Seed the initial store policy only when this field is first introduced.
  -- Re-running the migration never overwrites later administrator choices.
  IF v_seed_needed THEN
    SELECT count(*) INTO v_valid_count
    FROM public.ncms
    WHERE code = ANY(v_approved_codes)
      AND active = true
      AND COALESCE(start_date, '-infinity'::date) <= current_date
      AND COALESCE(end_date, 'infinity'::date) >= current_date;
    IF v_valid_count <> cardinality(v_approved_codes) THEN
      RAISE EXCEPTION 'A lista inicial de NCMs contém código ausente ou não vigente; nenhuma ativação foi aplicada.';
    END IF;
    UPDATE public.ncms SET is_active = true WHERE code = ANY(v_approved_codes);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_ncms(search_term text, max_results integer DEFAULT 20)
RETURNS TABLE (code text, official_description text, alias_match text, rank real)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH matches AS (
    SELECT n.code, n.official_description, NULL::text AS alias_match, 1.0::real AS rank
    FROM public.ncms n
    WHERE n.active = true AND n.is_active = true
      AND COALESCE(n.start_date, '-infinity'::date) <= current_date
      AND COALESCE(n.end_date, 'infinity'::date) >= current_date
      AND n.code LIKE (search_term || '%') AND search_term ~ '^[0-9]+$'
    UNION ALL
    SELECT n.code, n.official_description, a.term AS alias_match,
      (1.0 + COALESCE(a.weight, 1) * 0.1)::real AS rank
    FROM public.ncms n
    LEFT JOIN public.ncm_aliases a ON n.code = a.ncm_code AND a.active = true
    WHERE n.active = true AND n.is_active = true
      AND COALESCE(n.start_date, '-infinity'::date) <= current_date
      AND COALESCE(n.end_date, 'infinity'::date) >= current_date
      AND NOT (search_term ~ '^[0-9]+$')
      AND (
        (SELECT bool_and(public.immutable_unaccent(n.official_description) ILIKE '%' || public.immutable_unaccent(word) || '%')
         FROM unnest(string_to_array(trim(search_term), ' ')) AS word WHERE word <> '')
        OR (a.term IS NOT NULL AND
          (SELECT bool_and(public.immutable_unaccent(a.term) ILIKE '%' || public.immutable_unaccent(word) || '%')
           FROM unnest(string_to_array(trim(search_term), ' ')) AS word WHERE word <> ''))
      )
  )
  SELECT DISTINCT ON (m.code) m.code, m.official_description, m.alias_match, m.rank
  FROM matches m ORDER BY m.code, m.rank DESC LIMIT LEAST(GREATEST(max_results, 1), 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ncm_store_activation(p_code text, p_is_active boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text := regexp_replace(COALESCE(p_code, ''), '[^0-9]', '', 'g');
  v_ncm public.ncms%ROWTYPE;
BEGIN
  IF NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Somente administradores podem alterar o uso operacional de NCMs.';
  END IF;
  SELECT * INTO v_ncm FROM public.ncms WHERE code = v_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NCM não encontrado.'; END IF;
  IF p_is_active AND (NOT v_ncm.active
      OR COALESCE(v_ncm.start_date, '-infinity'::date) > current_date
      OR COALESCE(v_ncm.end_date, 'infinity'::date) < current_date) THEN
    RAISE EXCEPTION 'Somente um NCM oficialmente vigente pode ser ativado para uso da loja.';
  END IF;
  UPDATE public.ncms SET is_active = p_is_active, updated_at = now()
  WHERE code = v_code AND is_active IS DISTINCT FROM p_is_active;
  RETURN jsonb_build_object('code', v_code, 'is_active', p_is_active);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_ncm_catalog_for_admin(
  p_search text DEFAULT '', p_store_filter text DEFAULT 'active',
  p_filter text DEFAULT 'all', p_limit integer DEFAULT 30, p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  WITH catalog AS (
    SELECT n.code, n.official_description, n.active, n.is_active, n.start_date, n.end_date,
      n.legal_act, n.first_seen_at, n.last_seen_at, n.changed_at,
      count(p.id)::integer AS product_count, false AS is_unverified
    FROM public.ncms n
    LEFT JOIN public.products p
      ON regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g') = n.code
      AND COALESCE(p.deleted, false) = false
    GROUP BY n.code
    UNION ALL
    SELECT regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g'),
      'Código ausente da base vigente; consulte o histórico oficial antes de classificar.'::text,
      false, false, NULL::date, NULL::date, NULL::text, NULL::timestamptz, NULL::timestamptz,
      NULL::timestamptz, count(*)::integer, true
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
        OR public.immutable_unaccent(c.official_description) ILIKE '%' || public.immutable_unaccent(trim(p_search)) || '%')
      AND CASE p_store_filter
        WHEN 'active' THEN c.is_active AND NOT c.is_unverified
        WHEN 'inactive' THEN NOT c.is_active AND NOT c.is_unverified
        ELSE true
      END
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
  SELECT jsonb_build_object('items', COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page), '[]'::jsonb),
    'total', (SELECT count(*) FROM filtered)) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ncm_store_activation_summary()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_count', count(*),
    'active_count', count(*) FILTER (WHERE is_active),
    'inactive_count', count(*) FILTER (WHERE NOT is_active)
  ) FROM public.ncms;
$$;

REVOKE ALL ON FUNCTION public.set_ncm_store_activation(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_ncm_catalog_for_admin(text, text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_ncm_store_activation_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ncm_store_activation(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ncm_catalog_for_admin(text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ncm_store_activation_summary() TO authenticated;
