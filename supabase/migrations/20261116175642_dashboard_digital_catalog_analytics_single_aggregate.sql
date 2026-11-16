-- SCE-137: combine the two catalog analytics counts while preserving their filter and JSON contract.
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
  ), analytics_metrics AS (
    SELECT COUNT(*) AS views, COUNT(DISTINCT a.visitor_id) AS unique_visitors
    FROM public.product_analytics a
    WHERE NOT EXISTS (
      SELECT 1 FROM test_products t WHERE t.id = a.product_id
    )
  )
  SELECT pg_catalog.jsonb_build_object(
    'products', (SELECT COUNT(*) FROM catalog_items),
    'published', (SELECT COUNT(*) FROM catalog_items WHERE status = 'published'),
    'draft', (SELECT COUNT(*) FROM catalog_items WHERE status IS DISTINCT FROM 'published'),
    'categories', (SELECT COUNT(*) FROM public.categories),
     'views', analytics_metrics.views,
    'uniqueVisitors', analytics_metrics.unique_visitors
  ) INTO v_result
  FROM analytics_metrics;
  RETURN v_result;
END;
$$;
