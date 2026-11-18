ALTER TABLE public.product_analytics
  ADD COLUMN event_type text NOT NULL DEFAULT 'product_view'
  CONSTRAINT product_analytics_event_type_check
  CHECK (event_type IN ('catalog_visit', 'product_view', 'product_click'));

CREATE INDEX IF NOT EXISTS product_analytics_event_type_created_at_idx
  ON public.product_analytics (event_type, created_at);

CREATE INDEX IF NOT EXISTS product_analytics_product_id_idx
  ON public.product_analytics (product_id);

CREATE OR REPLACE FUNCTION public.get_dashboard_digital_catalog_metrics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_allowed boolean; v_result jsonb;
BEGIN
  SELECT CASE WHEN COALESCE(pg_catalog.cardinality(p.roles), 0) > 0
    THEN p.roles && ARRAY['administrator', 'manager']::text[]
    ELSE p.role IN ('administrator', 'manager') END INTO v_allowed
  FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_allowed, false) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid IN ('public.products'::pg_catalog.regclass, 'public.product_variations'::pg_catalog.regclass,
      'public.categories'::pg_catalog.regclass, 'public.product_analytics'::pg_catalog.regclass)
      AND NOT a.attisdropped
      AND a.attname IN ('company_id', 'tenant_id', 'organization_id', 'establishment_id', 'unit_id')
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('products', 'product_variations', 'categories', 'product_analytics')
      AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'RESTRICTIVE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'products' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'public' = ANY(p.roles) AND p.qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'product_variations' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'public' = ANY(p.roles) AND p.qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'categories' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'public' = ANY(p.roles) AND p.qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'product_analytics' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE'
      AND ('authenticated' = ANY(p.roles) OR 'public' = ANY(p.roles))
      AND (p.qual = 'true' OR p.qual = '(auth.role() = ''authenticated''::text)')
  ) THEN
    RAISE EXCEPTION 'Escopo do catálogo mudou; revisar isolamento do Dashboard' USING ERRCODE = '55000';
  END IF;

  WITH today AS (
    SELECT pg_catalog.timezone('UTC', pg_catalog.now())::date AS utc_today
  ), test_products AS (
    SELECT p.id
    FROM public.products p
    WHERE COALESCE(pg_catalog.lower(p.technical_specs ->> 'is_test'), 'false') = 'true'
      OR COALESCE(pg_catalog.lower(p.technical_specs ->> 'isTest'), 'false') = 'true'
      OR COALESCE(pg_catalog.lower(p.technical_specs #>> '{testArtifact,is_test}'), 'false') = 'true'
      OR COALESCE(pg_catalog.lower(p.technical_specs #>> '{testArtifact,isTest}'), 'false') = 'true'
      OR COALESCE(p.observations, '') ~* '(HMLNFTEST|NFE_HML_MATRIX_2026_10)'
      OR COALESCE(p.code, '') ~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
      OR COALESCE(p.name, '') ~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
  ), eligible_products AS (
    SELECT p.id, p.name, p.slug, p.status
    FROM public.products p
    WHERE p.deleted_at IS NULL AND NOT COALESCE(p.deleted, false)
      AND COALESCE(pg_catalog.lower(p.technical_specs ->> 'is_test'), 'false') <> 'true'
      AND COALESCE(pg_catalog.lower(p.technical_specs ->> 'isTest'), 'false') <> 'true'
      AND COALESCE(pg_catalog.lower(p.technical_specs #>> '{testArtifact,is_test}'), 'false') <> 'true'
      AND COALESCE(pg_catalog.lower(p.technical_specs #>> '{testArtifact,isTest}'), 'false') <> 'true'
      AND COALESCE(p.observations, '') !~* '(HMLNFTEST|NFE_HML_MATRIX_2026_10)'
      AND COALESCE(p.code, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
      AND COALESCE(p.name, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
      AND NOT EXISTS (
        SELECT 1 FROM public.product_variations v
        WHERE v.product_id = p.id AND (
          COALESCE(pg_catalog.lower(v.attributes ->> 'is_test'), 'false') = 'true'
          OR COALESCE(pg_catalog.lower(v.attributes ->> 'isTest'), 'false') = 'true'
          OR COALESCE(pg_catalog.lower(v.attributes #>> '{testArtifact,is_test}'), 'false') = 'true'
          OR COALESCE(pg_catalog.lower(v.attributes #>> '{testArtifact,isTest}'), 'false') = 'true'
          OR COALESCE(v.sku, '') ~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
          OR COALESCE(v.name, '') ~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
        )
      )
  ), catalog_items AS (
    SELECT p.status FROM eligible_products p
    WHERE NOT EXISTS (SELECT 1 FROM public.product_variations v WHERE v.product_id = p.id)
    UNION ALL
    SELECT v.status FROM eligible_products p
    JOIN public.product_variations v ON v.product_id = p.id
  ), analytics_events AS MATERIALIZED (
    SELECT a.product_id, a.visitor_id, a.event_type, a.created_at
    FROM public.product_analytics a
    WHERE (a.event_type = 'catalog_visit' AND a.product_id IS NULL)
       OR (a.event_type IN ('product_view', 'product_click') AND a.product_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM test_products t WHERE t.id = a.product_id))
  ), analytics_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE a.event_type = 'product_view') AS views,
      COUNT(DISTINCT a.visitor_id) FILTER (WHERE a.event_type = 'product_view') AS unique_product_viewers,
      COUNT(*) FILTER (WHERE a.event_type = 'catalog_visit'
        AND a.created_at >= ((d.utc_today - 29)::timestamp AT TIME ZONE 'UTC')
        AND a.created_at < ((d.utc_today + 1)::timestamp AT TIME ZONE 'UTC')) AS catalog_visits_30d,
      COUNT(DISTINCT a.visitor_id) FILTER (WHERE a.event_type IN ('catalog_visit', 'product_view', 'product_click')
        AND a.created_at >= ((d.utc_today - 29)::timestamp AT TIME ZONE 'UTC')
        AND a.created_at < ((d.utc_today + 1)::timestamp AT TIME ZONE 'UTC')) AS unique_visitors_30d,
      COUNT(*) FILTER (WHERE a.event_type = 'product_view'
        AND a.created_at >= ((d.utc_today - 29)::timestamp AT TIME ZONE 'UTC')
        AND a.created_at < ((d.utc_today + 1)::timestamp AT TIME ZONE 'UTC')) AS product_views_30d,
      COUNT(*) FILTER (WHERE a.event_type = 'product_click'
        AND a.created_at >= ((d.utc_today - 29)::timestamp AT TIME ZONE 'UTC')
        AND a.created_at < ((d.utc_today + 1)::timestamp AT TIME ZONE 'UTC')) AS product_clicks_30d
    FROM analytics_events a
    CROSS JOIN today d
  ), daily_counts AS (
    SELECT (a.created_at AT TIME ZONE 'UTC')::date AS event_day,
      COUNT(*) FILTER (WHERE a.event_type = 'catalog_visit') AS catalog_visits,
      COUNT(*) FILTER (WHERE a.event_type = 'product_view') AS product_views,
      COUNT(*) FILTER (WHERE a.event_type = 'product_click') AS product_clicks
    FROM analytics_events a
    CROSS JOIN today d
    WHERE a.created_at >= ((d.utc_today - 29)::timestamp AT TIME ZONE 'UTC')
      AND a.created_at < ((d.utc_today + 1)::timestamp AT TIME ZONE 'UTC')
    GROUP BY (a.created_at AT TIME ZONE 'UTC')::date
  ), daily_series AS (
    SELECT g.event_day::date AS event_day,
      COALESCE(d.catalog_visits, 0) AS catalog_visits,
      COALESCE(d.product_views, 0) AS product_views,
      COALESCE(d.product_clicks, 0) AS product_clicks
    FROM today t
    CROSS JOIN LATERAL pg_catalog.generate_series(
      (t.utc_today - 29)::timestamp,
      t.utc_today::timestamp,
      INTERVAL '1 day'
    ) AS g(event_day)
    LEFT JOIN daily_counts d ON d.event_day = g.event_day::date
  ), product_rankings AS (
    SELECT a.product_id,
      COUNT(*) FILTER (WHERE a.event_type = 'product_view') AS views,
      COUNT(*) FILTER (WHERE a.event_type = 'product_click') AS clicks
    FROM analytics_events a
    CROSS JOIN today d
    WHERE a.product_id IS NOT NULL
      AND a.event_type IN ('product_view', 'product_click')
      AND a.created_at >= ((d.utc_today - 29)::timestamp AT TIME ZONE 'UTC')
      AND a.created_at < ((d.utc_today + 1)::timestamp AT TIME ZONE 'UTC')
    GROUP BY a.product_id
  ), published_product_rankings AS (
    SELECT r.product_id, p.name, p.slug, r.views, r.clicks
    FROM product_rankings r
    JOIN eligible_products p ON p.id = r.product_id AND p.status = 'published'
  )
  SELECT pg_catalog.jsonb_build_object(
    'products', (SELECT COUNT(*) FROM catalog_items),
    'published', (SELECT COUNT(*) FROM catalog_items WHERE status = 'published'),
    'draft', (SELECT COUNT(*) FROM catalog_items WHERE status IS DISTINCT FROM 'published'),
    'categories', (SELECT COUNT(*) FROM public.categories),
    'views', analytics_totals.views,
    'uniqueVisitors', analytics_totals.unique_product_viewers,
    'catalogVisits30Days', analytics_totals.catalog_visits_30d,
    'uniqueVisitors30Days', analytics_totals.unique_visitors_30d,
    'productViews30Days', analytics_totals.product_views_30d,
    'productClicks30Days', analytics_totals.product_clicks_30d,
    'daily', (
      SELECT COALESCE(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'date', pg_catalog.to_char(d.event_day, 'YYYY-MM-DD'),
          'catalogVisits', d.catalog_visits,
          'productViews', d.product_views,
          'productClicks', d.product_clicks
        ) ORDER BY d.event_day
      ), '[]'::jsonb)
      FROM daily_series d
    ),
    'topViewedProducts', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('id', r.product_id, 'name', r.name, 'slug', r.slug, 'count', r.views)
        ORDER BY r.views DESC, r.name ASC
      )
      FROM (
        SELECT p.product_id, p.name, p.slug, p.views
        FROM published_product_rankings p
        WHERE p.views > 0
        ORDER BY p.views DESC, p.name ASC
        LIMIT 5
      ) r
    ), '[]'::jsonb),
    'topClickedProducts', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('id', r.product_id, 'name', r.name, 'slug', r.slug, 'count', r.clicks)
        ORDER BY r.clicks DESC, r.name ASC
      )
      FROM (
        SELECT p.product_id, p.name, p.slug, p.clicks
        FROM published_product_rankings p
        WHERE p.clicks > 0
        ORDER BY p.clicks DESC, p.name ASC
        LIMIT 5
      ) r
    ), '[]'::jsonb)
  ) INTO v_result
  FROM analytics_totals;
  RETURN v_result;
END;
$$;
