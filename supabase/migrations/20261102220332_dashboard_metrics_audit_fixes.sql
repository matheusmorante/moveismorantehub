-- Uniformiza a data comercial do pedido, corrige agregações históricas e
-- move rotinas analíticas/limpeza para execução consolidada no servidor.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.dashboard_order_effective_at(
  p_order_data jsonb,
  p_created_at timestamptz
) RETURNS timestamptz
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  v_date text := NULLIF(pg_catalog.btrim(p_order_data ->> 'date'), '');
  v_parts text[];
BEGIN
  IF v_date IS NULL THEN RETURN p_created_at; END IF;

  -- Valores gravados pelo formulário atual preservam o offset original.
  IF v_date ~* '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:?[0-9]{2})$' THEN
    RETURN v_date::timestamptz;
  END IF;
  -- Datas sem fuso e formatos legados seguem o calendário comercial local.
  IF v_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RETURN v_date::date::timestamp AT TIME ZONE 'America/Sao_Paulo';
  END IF;
  IF v_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(:[0-9]{2}([.][0-9]+)?)?$' THEN
    RETURN replace(v_date, 'T', ' ')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  END IF;

  v_parts := pg_catalog.regexp_match(
    v_date,
    '^([0-9]{2})/([0-9]{2})/([0-9]{4})(, ([0-9]{2}):([0-9]{2})(:([0-9]{2}))?)?$'
  );
  IF v_parts IS NOT NULL THEN
    RETURN pg_catalog.make_timestamp(
      v_parts[3]::integer,
      v_parts[2]::integer,
      v_parts[1]::integer,
      COALESCE(v_parts[5], '0')::integer,
      COALESCE(v_parts[6], '0')::integer,
      COALESCE(v_parts[8], '0')::double precision
    ) AT TIME ZONE 'America/Sao_Paulo';
  END IF;

  RETURN p_created_at;
EXCEPTION WHEN OTHERS THEN
  -- Uma data legada inválida não deve tornar o Dashboard indisponível.
  RETURN p_created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_order_effective_at(jsonb, timestamptz)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_sales_contribution(p_order public.orders)
RETURNS TABLE (occurred_at timestamptz, metric_date date, revenue numeric, sale_count bigint, paid_revenue numeric)
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  WITH normalized AS (
    SELECT public.dashboard_order_effective_at((p_order).order_data, (p_order).created_at) AS occurred_at,
      (public.dashboard_order_effective_at((p_order).order_data, (p_order).created_at)
        AT TIME ZONE 'America/Sao_Paulo')::date AS metric_date,
      pg_catalog.lower(pg_catalog.btrim(COALESCE(NULLIF((p_order).status, ''), 'draft'))) AS status,
      COALESCE(NULLIF((p_order).order_type, ''), 'sale') AS order_type,
      CASE WHEN (p_order).total_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN 0
        ELSE COALESCE((p_order).total_amount, 0) END AS amount,
      pg_catalog.lower(pg_catalog.btrim(COALESCE((p_order).marketing_origin, ''))) AS origin,
      NOT COALESCE((p_order).deleted, false)
        AND ((p_order).order_number IS NOT NULL OR (p_order).status IS NOT NULL)
        AND NOT public.test_artifact_is_test(pg_catalog.to_jsonb(p_order))
        AND NOT public.is_nfe_hml_test_order((p_order).id, (p_order).status, (p_order).deleted, (p_order).order_data)
        AND COALESCE((p_order).order_data #>> '{testArtifact,isTest}', 'false') <> 'true'
        AND COALESCE((p_order).id, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
        AND COALESCE((p_order).order_number, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
        AND COALESCE((p_order).customer_name, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)' AS eligible
  ), fact AS (
    SELECT *, CASE
      WHEN eligible AND status IN ('scheduled', 'fulfilled') AND order_type IN ('sale', 'showroom') THEN 1
      WHEN eligible AND status = 'fulfilled' AND order_type = 'return' THEN -1
      ELSE 0 END AS factor
    FROM normalized
  )
  SELECT occurred_at, metric_date, factor * amount,
    CASE WHEN factor = 1 THEN 1::bigint ELSE 0::bigint END,
    CASE WHEN origin = 'paid' OR pg_catalog.strpos(origin, 'trafego') > 0
      OR pg_catalog.strpos(origin, 'tráfego') > 0 OR pg_catalog.strpos(origin, 'ads') > 0
      OR pg_catalog.strpos(origin, 'facebook') > 0 OR pg_catalog.strpos(origin, 'instagram') > 0
      OR pg_catalog.strpos(origin, 'google') > 0 THEN factor * amount ELSE 0 END
  FROM fact;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_sales_range(p_start timestamptz, p_end_exclusive timestamptz)
RETURNS TABLE (revenue numeric, sale_count bigint, paid_revenue numeric)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE v_first date; v_after date;
BEGIN
  IF p_start >= p_end_exclusive THEN
    RETURN QUERY SELECT 0::numeric, 0::bigint, 0::numeric;
    RETURN;
  END IF;
  v_first := (p_start AT TIME ZONE 'America/Sao_Paulo')::date;
  IF p_start > (v_first::timestamp AT TIME ZONE 'America/Sao_Paulo') THEN v_first := v_first + 1; END IF;
  v_after := (p_end_exclusive AT TIME ZONE 'America/Sao_Paulo')::date;
  RETURN QUERY
  SELECT COALESCE(SUM(parts.revenue), 0), COALESCE(SUM(parts.sale_count), 0)::bigint, COALESCE(SUM(parts.paid_revenue), 0)
  FROM (
    SELECT d.revenue, d.sale_count, d.paid_revenue FROM public.dashboard_sales_daily d
      WHERE d.metric_date >= v_first AND d.metric_date < v_after
    UNION ALL
    SELECT f.revenue, f.sale_count, f.paid_revenue FROM public.dashboard_sales_order_facts f
      WHERE f.occurred_at >= p_start AND f.occurred_at < p_end_exclusive
        AND (f.metric_date < v_first OR f.metric_date >= v_after)
  ) parts;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_orders_by_effective_date(
  p_start timestamptz,
  p_end timestamptz
) RETURNS SETOF public.orders
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_allowed boolean;
BEGIN
  SELECT CASE WHEN COALESCE(pg_catalog.cardinality(p.roles), 0) > 0
    THEN p.roles && ARRAY['administrator', 'manager']::text[]
    ELSE p.role IN ('administrator', 'manager') END INTO v_allowed
  FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_allowed, false) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501'; END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_start > p_end THEN RAISE EXCEPTION 'Período inválido'; END IF;

  -- O painel atual não tem escopo por empresa; se o schema/políticas mudarem,
  -- interrompe a função até que o filtro de tenant seja implementado.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid IN ('public.orders'::pg_catalog.regclass, 'public.order_items'::pg_catalog.regclass)
      AND NOT a.attisdropped
      AND a.attname IN ('company_id', 'tenant_id', 'organization_id', 'establishment_id', 'unit_id')
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'orders' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'public' = ANY(p.roles) AND p.qual = 'true'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'orders'
      AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'RESTRICTIVE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'order_items' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'authenticated' = ANY(p.roles) AND p.qual = 'true'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'order_items'
      AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'RESTRICTIVE'
  ) THEN
    RAISE EXCEPTION 'Escopo de pedidos mudou; revisar isolamento do Dashboard' USING ERRCODE = '55000';
  END IF;

  RETURN QUERY SELECT o.* FROM public.orders o
    WHERE public.dashboard_order_effective_at(o.order_data, o.created_at) BETWEEN p_start AND p_end
      AND NOT public.test_artifact_is_test(pg_catalog.to_jsonb(o))
      AND NOT public.is_nfe_hml_test_order(o.id, o.status, o.deleted, o.order_data)
      AND COALESCE(o.order_data #>> '{testArtifact,isTest}', 'false') <> 'true'
      AND COALESCE(o.id, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
      AND COALESCE(o.order_number, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
      AND COALESCE(o.customer_name, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
    ORDER BY public.dashboard_order_effective_at(o.order_data, o.created_at) DESC, o.id;
END;
$$;

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

  WITH test_products AS (
    SELECT p.id
    FROM public.products p
    WHERE COALESCE(lower(p.technical_specs ->> 'is_test'), 'false') = 'true'
      OR COALESCE(lower(p.technical_specs ->> 'isTest'), 'false') = 'true'
      OR COALESCE(lower(p.technical_specs #>> '{testArtifact,is_test}'), 'false') = 'true'
      OR COALESCE(lower(p.technical_specs #>> '{testArtifact,isTest}'), 'false') = 'true'
      OR COALESCE(p.observations, '') ~* '(HMLNFTEST|NFE_HML_MATRIX_2026_10)'
      OR COALESCE(p.code, '') ~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
      OR COALESCE(p.name, '') ~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
  ), eligible_products AS (
    SELECT p.id, p.status
    FROM public.products p
    WHERE p.deleted_at IS NULL AND NOT COALESCE(p.deleted, false)
      AND COALESCE(lower(p.technical_specs ->> 'is_test'), 'false') <> 'true'
      AND COALESCE(lower(p.technical_specs ->> 'isTest'), 'false') <> 'true'
      AND COALESCE(lower(p.technical_specs #>> '{testArtifact,is_test}'), 'false') <> 'true'
      AND COALESCE(lower(p.technical_specs #>> '{testArtifact,isTest}'), 'false') <> 'true'
      AND COALESCE(p.observations, '') !~* '(HMLNFTEST|NFE_HML_MATRIX_2026_10)'
      AND COALESCE(p.code, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
      AND COALESCE(p.name, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
      AND NOT EXISTS (
        SELECT 1 FROM public.product_variations v
        WHERE v.product_id = p.id AND (
          COALESCE(lower(v.attributes ->> 'is_test'), 'false') = 'true'
          OR COALESCE(lower(v.attributes ->> 'isTest'), 'false') = 'true'
          OR COALESCE(lower(v.attributes #>> '{testArtifact,is_test}'), 'false') = 'true'
          OR COALESCE(lower(v.attributes #>> '{testArtifact,isTest}'), 'false') = 'true'
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
  )
  SELECT pg_catalog.jsonb_build_object(
    'products', (SELECT COUNT(*) FROM catalog_items),
    'published', (SELECT COUNT(*) FROM catalog_items WHERE status = 'published'),
    'draft', (SELECT COUNT(*) FROM catalog_items WHERE status IS DISTINCT FROM 'published'),
    'categories', (SELECT COUNT(*) FROM public.categories),
     'views', (SELECT COUNT(*) FROM public.product_analytics a
       WHERE NOT EXISTS (SELECT 1 FROM test_products t WHERE t.id = a.product_id)),
     'uniqueVisitors', (SELECT COUNT(DISTINCT a.visitor_id) FROM public.product_analytics a
       WHERE NOT EXISTS (SELECT 1 FROM test_products t WHERE t.id = a.product_id))
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stalled_products(p_days integer)
RETURNS TABLE (product_id text, variation_id text, product_name text, last_sold_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_allowed boolean; v_cutoff timestamptz;
BEGIN
  SELECT CASE WHEN COALESCE(pg_catalog.cardinality(p.roles), 0) > 0
    THEN p.roles && ARRAY['administrator', 'manager']::text[]
    ELSE p.role IN ('administrator', 'manager') END INTO v_allowed
  FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_allowed, false) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501'; END IF;
  IF p_days IS NULL OR p_days NOT IN (30, 60, 90) THEN RAISE EXCEPTION 'Janela inválida'; END IF;
  v_cutoff := pg_catalog.now() - (p_days * interval '1 day');

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid IN ('public.orders'::pg_catalog.regclass, 'public.order_items'::pg_catalog.regclass,
      'public.products'::pg_catalog.regclass, 'public.product_variations'::pg_catalog.regclass)
      AND NOT a.attisdropped
      AND a.attname IN ('company_id', 'tenant_id', 'organization_id', 'establishment_id', 'unit_id')
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('orders', 'order_items', 'products', 'product_variations')
      AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'RESTRICTIVE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'orders' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'public' = ANY(p.roles) AND p.qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'order_items' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'authenticated' = ANY(p.roles) AND p.qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'products' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'public' = ANY(p.roles) AND p.qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'product_variations' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'public' = ANY(p.roles) AND p.qual = 'true'
  ) THEN
    RAISE EXCEPTION 'Escopo de produtos mudou; revisar isolamento do Dashboard' USING ERRCODE = '55000';
  END IF;

  RETURN QUERY
  WITH eligible_products AS (
    SELECT p.id, p.name, p.description
    FROM public.products p
    WHERE p.active = true AND NOT COALESCE(p.is_draft, false)
      AND p.deleted_at IS NULL AND NOT COALESCE(p.deleted, false)
      AND COALESCE(lower(p.technical_specs ->> 'is_test'), 'false') <> 'true'
      AND COALESCE(lower(p.technical_specs ->> 'isTest'), 'false') <> 'true'
      AND COALESCE(lower(p.technical_specs #>> '{testArtifact,is_test}'), 'false') <> 'true'
      AND COALESCE(lower(p.technical_specs #>> '{testArtifact,isTest}'), 'false') <> 'true'
      AND COALESCE(p.observations, '') !~* '(HMLNFTEST|NFE_HML_MATRIX_2026_10)'
      AND COALESCE(p.code, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
      AND COALESCE(p.name, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
      AND NOT EXISTS (
        SELECT 1 FROM public.product_variations v
        WHERE v.product_id = p.id AND v.active = true AND (
          COALESCE(lower(v.attributes ->> 'is_test'), 'false') = 'true'
          OR COALESCE(lower(v.attributes ->> 'isTest'), 'false') = 'true'
          OR COALESCE(lower(v.attributes #>> '{testArtifact,is_test}'), 'false') = 'true'
          OR COALESCE(lower(v.attributes #>> '{testArtifact,isTest}'), 'false') = 'true'
          OR COALESCE(v.sku, '') ~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
          OR COALESCE(v.name, '') ~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST'
        )
      )
  ), active_variations AS (
    SELECT v.id, v.product_id, v.name
    FROM public.product_variations v
    JOIN eligible_products p ON p.id = v.product_id
    WHERE v.active = true
  ), catalog_items AS (
    SELECT p.id::text AS product_id, NULL::text AS variation_id,
      COALESCE(NULLIF(p.description, ''), p.name) AS product_name
    FROM eligible_products p
    WHERE NOT EXISTS (SELECT 1 FROM public.product_variations v WHERE v.product_id = p.id)
    UNION ALL
    SELECT v.product_id::text, v.id::text,
      pg_catalog.concat_ws(' — ', COALESCE(NULLIF(p.description, ''), p.name), NULLIF(v.name, ''))
    FROM active_variations v JOIN eligible_products p ON p.id = v.product_id
  ), sales AS (
    SELECT oi.product_id, oi.variation_id, MAX(c.occurred_at) AS last_sold_at
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    CROSS JOIN LATERAL public.dashboard_sales_contribution(o) c
    WHERE c.sale_count = 1
      AND c.occurred_at IS NOT NULL
    GROUP BY oi.product_id, oi.variation_id
  )
  SELECT item.product_id, item.variation_id, item.product_name, sale.last_sold_at
  FROM catalog_items item
  LEFT JOIN sales sale ON sale.product_id = item.product_id
    AND sale.variation_id IS NOT DISTINCT FROM item.variation_id
  WHERE sale.last_sold_at IS NULL OR sale.last_sold_at < v_cutoff
  ORDER BY sale.last_sold_at NULLS FIRST, item.product_name
  LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_api_usage_dashboard_aggregates(
  p_start_date date,
  p_end_date date,
  p_environment text DEFAULT 'all'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_allowed boolean;
  v_daily jsonb;
  v_details jsonb;
BEGIN
  SELECT CASE WHEN COALESCE(pg_catalog.cardinality(p.roles), 0) > 0
    THEN p.roles && ARRAY['administrator', 'manager']::text[]
    ELSE p.role IN ('administrator', 'manager') END INTO v_allowed
  FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_allowed, false) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date > p_end_date
    OR p_environment IS NULL OR p_environment NOT IN ('all', 'production', 'development', 'test') THEN
    RAISE EXCEPTION 'Filtros inválidos';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid IN ('public.api_usage_daily'::pg_catalog.regclass, 'public.api_usage_logs'::pg_catalog.regclass)
      AND NOT a.attisdropped
      AND a.attname IN ('company_id', 'tenant_id', 'organization_id', 'establishment_id', 'unit_id')
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('api_usage_daily', 'api_usage_logs')
      AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'RESTRICTIVE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'api_usage_daily' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'authenticated' = ANY(p.roles) AND p.qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'api_usage_logs' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'authenticated' = ANY(p.roles) AND p.qual = 'true'
  ) THEN
    RAISE EXCEPTION 'Escopo de uso de APIs mudou; revisar isolamento do Dashboard' USING ERRCODE = '55000';
  END IF;

  -- Detalhes preservados em api_usage_logs substituem a mesma chave diária;
  -- api_usage_daily completa somente os dias/chaves sem log (retenção legada).
  WITH log_daily AS (
    SELECT (log.created_at AT TIME ZONE 'UTC')::date AS usage_date,
      log.provider, log.service, log.environment, COUNT(*)::bigint AS total_requests,
      COALESCE(SUM(log.cost_estimated), 0) AS estimated_cost,
      COUNT(*) FILTER (WHERE log.cache_hit)::bigint AS cache_hits
    FROM public.api_usage_logs log
    WHERE log.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND log.created_at < ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      AND (p_environment = 'all' OR log.environment = p_environment)
    GROUP BY (log.created_at AT TIME ZONE 'UTC')::date, log.provider, log.service, log.environment
  ), daily_source AS (
    SELECT provider, service, total_requests, estimated_cost, cache_hits FROM log_daily
    UNION ALL
    SELECT d.provider, d.service, d.total_requests::bigint, d.estimated_cost, d.cache_hits::bigint
    FROM public.api_usage_daily d
    WHERE d.usage_date BETWEEN p_start_date AND p_end_date
      AND (p_environment = 'all' OR d.environment = p_environment)
      AND NOT EXISTS (
        SELECT 1 FROM log_daily l
        WHERE l.usage_date = d.usage_date AND l.provider = d.provider
          AND l.service = d.service AND l.environment = d.environment
      )
  )
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'service', daily.service,
    'total_requests', daily.total_requests,
    'estimated_cost', daily.estimated_cost,
    'cache_hits', daily.cache_hits
  ) ORDER BY daily.service), '[]'::jsonb)
  INTO v_daily
  FROM (
    SELECT service, SUM(total_requests)::bigint AS total_requests,
      SUM(estimated_cost) AS estimated_cost, SUM(cache_hits)::bigint AS cache_hits
    FROM daily_source GROUP BY service
  ) daily;

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'service', detail.service,
    'provider', detail.provider,
    'model', detail.model,
    'module_source', detail.module_source,
    'total_requests', detail.total_requests,
    'total_units', detail.total_units,
    'estimated_cost', detail.estimated_cost
  ) ORDER BY detail.service, detail.module_source, detail.model), '[]'::jsonb)
  INTO v_details
  FROM (
    SELECT log.service, log.provider,
      COALESCE(NULLIF(pg_catalog.substring(log.operation, '\[([^]]+)\]'), ''), log.service) AS model,
      COALESCE(NULLIF(pg_catalog.btrim(log.module_source), ''), 'general') AS module_source,
      COUNT(*)::bigint AS total_requests,
      COALESCE(SUM(COALESCE(NULLIF(log.units, 0), 1)), 0) AS total_units,
      COALESCE(SUM(log.cost_estimated), 0) AS estimated_cost
    FROM public.api_usage_logs log
    WHERE log.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND log.created_at < ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      AND (p_environment = 'all' OR log.environment = p_environment)
    GROUP BY log.service, log.provider,
      COALESCE(NULLIF(pg_catalog.substring(log.operation, '\[([^]]+)\]'), ''), log.service),
      COALESCE(NULLIF(pg_catalog.btrim(log.module_source), ''), 'general')
  ) detail;

  RETURN pg_catalog.jsonb_build_object('daily', v_daily, 'details', v_details);
END;
$$;

-- Cada RPC retorna métricas agregadas, sem transferir linhas de eventos ao cliente.
REVOKE ALL ON FUNCTION public.get_dashboard_orders_by_effective_date(timestamptz, timestamptz),
  public.get_dashboard_digital_catalog_metrics(), public.get_dashboard_stalled_products(integer),
  public.get_api_usage_dashboard_aggregates(date, date, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_orders_by_effective_date(timestamptz, timestamptz),
  public.get_dashboard_digital_catalog_metrics(), public.get_dashboard_stalled_products(integer),
  public.get_api_usage_dashboard_aggregates(date, date, text)
  TO authenticated;

CREATE TABLE public.dashboard_draft_cleanup_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  status text NOT NULL CHECK (status IN ('completed', 'failed')),
  product_count integer NOT NULL DEFAULT 0,
  people_count integer NOT NULL DEFAULT 0,
  service_count integer NOT NULL DEFAULT 0,
  error_code text
);
ALTER TABLE public.dashboard_draft_cleanup_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dashboard_draft_cleanup_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.dashboard_draft_cleanup_runs TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_stale_dashboard_drafts()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET row_security = 'off' AS $$
DECLARE
  v_started_at timestamptz := pg_catalog.now();
  v_cutoff timestamptz := pg_catalog.now() - interval '10 days';
  v_products integer := 0;
  v_people integer := 0;
  v_services integer := 0;
  v_error_code text;
BEGIN
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE (
        a.attrelid IN ('public.products'::pg_catalog.regclass, 'public.people'::pg_catalog.regclass)
        OR (pg_catalog.to_regclass('public.services') IS NOT NULL
          AND a.attrelid = pg_catalog.to_regclass('public.services'))
      )
        AND NOT a.attisdropped
        AND a.attname IN ('company_id', 'tenant_id', 'organization_id', 'establishment_id', 'unit_id')
    ) OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename IN ('products', 'people', 'services')
        AND p.cmd IN ('SELECT', 'UPDATE', 'DELETE', 'ALL') AND p.permissive = 'RESTRICTIVE'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = 'products' AND p.cmd IN ('UPDATE', 'ALL')
        AND p.permissive = 'PERMISSIVE'
        AND ('public' = ANY(p.roles) OR 'authenticated' = ANY(p.roles)) AND p.qual = 'true'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = 'people' AND p.cmd IN ('UPDATE', 'ALL')
        AND p.permissive = 'PERMISSIVE' AND 'public' = ANY(p.roles) AND p.qual = 'true'
    ) OR (pg_catalog.to_regclass('public.services') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = 'services' AND p.cmd IN ('DELETE', 'ALL')
        AND p.permissive = 'PERMISSIVE' AND 'authenticated' = ANY(p.roles) AND p.qual = 'true'
    ))
    THEN
      RAISE EXCEPTION 'Escopo de rascunhos mudou; revisar isolamento da limpeza' USING ERRCODE = '55000';
    END IF;

    UPDATE public.products
      SET deleted = true, active = false
      WHERE is_draft = true AND updated_at < v_cutoff
        AND (technical_specs #>> '{testArtifact,is_test}' IS NULL
          OR technical_specs #>> '{testArtifact,is_test}' <> 'true');
    GET DIAGNOSTICS v_products = ROW_COUNT;

    UPDATE public.people
      SET deleted = true, active = false
      WHERE is_draft = true AND updated_at < v_cutoff
        AND (full_address #>> '{testArtifact,is_test}' IS NULL
          OR full_address #>> '{testArtifact,is_test}' <> 'true');
    GET DIAGNOSTICS v_people = ROW_COUNT;

    IF pg_catalog.to_regclass('public.services') IS NOT NULL THEN
      EXECUTE 'DELETE FROM public.services WHERE is_draft = true AND updated_at < $1' USING v_cutoff;
      GET DIAGNOSTICS v_services = ROW_COUNT;
    END IF;

    INSERT INTO public.dashboard_draft_cleanup_runs
      (started_at, status, product_count, people_count, service_count)
    VALUES (v_started_at, 'completed', v_products, v_people, v_services);
    RETURN pg_catalog.jsonb_build_object(
      'status', 'completed', 'products', v_products, 'people', v_people, 'services', v_services
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_code = RETURNED_SQLSTATE;
    INSERT INTO public.dashboard_draft_cleanup_runs (started_at, status, error_code)
    VALUES (v_started_at, 'failed', v_error_code);
    RETURN pg_catalog.jsonb_build_object('status', 'failed', 'error_code', v_error_code);
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_stale_dashboard_drafts() FROM PUBLIC, anon, authenticated, service_role;

DO $$
BEGIN
  IF pg_catalog.to_regnamespace('cron') IS NULL THEN
    RAISE EXCEPTION 'pg_cron está indisponível para agendar a limpeza de rascunhos';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-dashboard-drafts') THEN
    PERFORM cron.unschedule('cleanup-stale-dashboard-drafts');
  END IF;
  PERFORM cron.schedule(
    'cleanup-stale-dashboard-drafts',
    '15 7 * * *',
    'SELECT public.cleanup_stale_dashboard_drafts();'
  );
END;
$$;

-- Ativa as tabelas necessárias para as assinaturas de atualização do estoque.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'Publicação supabase_realtime indisponível';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.products';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_variations') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variations';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inventory_moves') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_moves';
  END IF;
END;
$$;

-- Reconstrói somente os fatos derivados e valida a consistência antes do commit.
LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;
UPDATE public.dashboard_sales_state SET ready = false, last_error_code = NULL WHERE singleton;
DELETE FROM public.dashboard_sales_order_facts;
DELETE FROM public.dashboard_sales_daily;

INSERT INTO public.dashboard_sales_order_facts
  (order_id, occurred_at, metric_date, revenue, sale_count, paid_revenue)
SELECT o.id, c.occurred_at, c.metric_date, c.revenue, c.sale_count, c.paid_revenue
FROM public.orders o
CROSS JOIN LATERAL public.dashboard_sales_contribution(o) c;

INSERT INTO public.dashboard_sales_daily (metric_date, revenue, sale_count, paid_revenue)
SELECT metric_date, SUM(revenue), SUM(sale_count)::bigint, SUM(paid_revenue)
FROM public.dashboard_sales_order_facts
WHERE metric_date IS NOT NULL
GROUP BY metric_date;

DO $$
DECLARE v_result jsonb; v_ready boolean;
BEGIN
  v_result := public.dashboard_sales_verify(true);
  SELECT ready INTO v_ready FROM public.dashboard_sales_state WHERE singleton;
  IF NOT COALESCE(v_ready, false)
    OR COALESCE((v_result ->> 'factDifferences')::bigint, -1) <> 0
    OR COALESCE((v_result ->> 'orphanFacts')::bigint, -1) <> 0
    OR COALESCE((v_result ->> 'dailyDifferences')::bigint, -1) <> 0
    OR COALESCE((v_result ->> 'unsupportedOrders')::bigint, -1) <> 0 THEN
    RAISE EXCEPTION 'Reconciliação do Dashboard falhou: %', v_result;
  END IF;
END;
$$;
