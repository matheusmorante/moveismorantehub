-- Consolidate dashboard calculations in PostgreSQL instead of transferring orders/items.
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_current_start timestamptz,
  p_current_end timestamptz,
  p_previous_start timestamptz,
  p_previous_end timestamptz,
  p_bucket text DEFAULT 'day',
  p_timezone text DEFAULT 'America/Sao_Paulo'
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_allowed boolean;
  v_sales jsonb;
  v_result jsonb;
BEGIN
  SELECT CASE WHEN COALESCE(pg_catalog.cardinality(p.roles), 0) > 0
    THEN p.roles && ARRAY['administrator', 'manager']::text[]
    ELSE p.role IN ('administrator', 'manager') END INTO v_allowed
  FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_allowed, false) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501'; END IF;
  IF p_current_start IS NULL OR p_current_end IS NULL OR p_previous_start IS NULL OR p_previous_end IS NULL
    OR NOT pg_catalog.isfinite(p_current_start) OR NOT pg_catalog.isfinite(p_current_end)
    OR NOT pg_catalog.isfinite(p_previous_start) OR NOT pg_catalog.isfinite(p_previous_end)
    OR p_current_start > p_current_end OR p_previous_start > p_previous_end
    OR p_previous_start > p_current_start OR p_previous_end > p_current_end
    OR p_bucket IS NULL OR p_bucket NOT IN ('hour', 'day', 'month')
    OR p_timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = p_timezone)
  THEN RAISE EXCEPTION 'Período ou agrupamento inválido'; END IF;

  -- Preserve the isolation guards of the detailed RPC, including item visibility.
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
    WHERE p.schemaname = 'public' AND p.tablename IN ('orders', 'order_items')
      AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'RESTRICTIVE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'order_items' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'authenticated' = ANY(p.roles) AND p.qual = 'true'
  ) THEN
    RAISE EXCEPTION 'Escopo de pedidos mudou; revisar isolamento do Dashboard' USING ERRCODE = '55000';
  END IF;

  v_sales := public.get_dashboard_sales_summary(p_current_start, p_current_end, p_previous_start, p_previous_end);

  WITH source AS MATERIALIZED (
    SELECT o.id, o.created_at,
      pg_catalog.btrim(COALESCE(NULLIF(o.status, ''), 'draft')) AS status,
      COALESCE(NULLIF(o.order_type, ''), 'sale') AS order_type,
      public.dashboard_order_effective_at(o.order_data, o.created_at) AS occurred_at,
      CASE WHEN o.total_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN 0
        ELSE COALESCE(o.total_amount, 0) END AS amount,
      pg_catalog.lower(pg_catalog.btrim(COALESCE(o.marketing_origin, ''))) AS origin,
      COALESCE(NULLIF(o.scheduled_date::text, ''), o.order_data #>> '{shipping,scheduling,date}', '') AS scheduled_for,
      COALESCE(((pg_catalog.regexp_match(
        pg_catalog.replace(COALESCE(o.order_data #>> '{shipping,distance}', ''), ',', '.'),
        '^[[:space:]]*([+-]?([0-9]+([.][0-9]*)?|[.][0-9]+))'))[1])::numeric, 0) AS distance
    FROM public.orders o
    WHERE NOT COALESCE(o.deleted, false)
      AND (o.order_number IS NOT NULL OR o.status IS NOT NULL
        OR (pg_catalog.jsonb_typeof(o.order_data) = 'object' AND o.order_data <> '{}'::jsonb))
      AND (public.dashboard_order_effective_at(o.order_data, o.created_at) BETWEEN p_previous_start AND p_current_end
        OR o.status IN ('scheduled', 'draft'))
      AND NOT public.test_artifact_is_test(pg_catalog.to_jsonb(o))
      AND NOT public.is_nfe_hml_test_order(o.id, o.status, o.deleted, o.order_data)
      AND COALESCE(o.order_data #>> '{testArtifact,isTest}', 'false') <> 'true'
      AND COALESCE(o.id, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
      AND COALESCE(o.order_number, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
      AND COALESCE(o.customer_name, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
  ), items AS MATERIALIZED (
    SELECT i.order_id, i.id, i.item_index, i.product_id, i.variation_id, i.description,
      COALESCE(i.quantity, 1) AS quantity, COALESCE(i.unit_price, 0) AS unit_price,
      COALESCE(i.unit_discount, 0) AS unit_discount, i.cost_price,
      COALESCE(i.is_temporary_product, false) AS temporary,
      COALESCE(i.handling_type, '') AS handling_type
    FROM public.order_items i JOIN source o ON o.id = i.order_id
  ), item_totals AS (
    SELECT i.order_id,
      COALESCE(SUM(i.quantity * COALESCE(i.cost_price, 0)) FILTER (WHERE NOT i.temporary AND NULLIF(i.product_id, '') IS NOT NULL), 0) AS cmv,
      COUNT(*) FILTER (WHERE NOT i.temporary AND NULLIF(i.product_id, '') IS NOT NULL AND i.cost_price IS NULL) AS items_without_cost,
      pg_catalog.bool_or(i.handling_type = 'montagem') AS assembly
    FROM items i GROUP BY i.order_id
  ), orders AS MATERIALIZED (
    SELECT o.*, COALESCE(i.cmv, 0) AS cmv, COALESCE(i.items_without_cost, 0) AS items_without_cost,
      COALESCE(i.assembly, false) AS assembly,
      CASE WHEN o.scheduled_for ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN (public.dashboard_order_effective_at(pg_catalog.jsonb_build_object('date', o.scheduled_for), NULL)
          AT TIME ZONE 'America/Sao_Paulo')::date END AS schedule_date,
      CASE WHEN pg_catalog.lower(pg_catalog.btrim(o.status)) IN ('scheduled', 'fulfilled') AND o.order_type IN ('sale', 'showroom') THEN 1
        WHEN pg_catalog.lower(pg_catalog.btrim(o.status)) = 'fulfilled' AND o.order_type = 'return' THEN -1 ELSE 0 END AS factor,
      CASE WHEN o.occurred_at BETWEEN p_current_start AND p_current_end THEN 'current'
        WHEN o.occurred_at >= p_previous_start
          AND o.occurred_at < LEAST(p_previous_end + interval '1 millisecond', p_current_start, p_current_end + interval '1 microsecond')
          THEN 'previous' END AS period
    FROM source o LEFT JOIN item_totals i ON i.order_id = o.id
  ), totals AS (
    SELECT r.period,
      COALESCE((v_sales #>> ARRAY[r.period, 'totalSales'])::numeric, SUM(o.factor * o.amount), 0) AS sales,
      COALESCE((v_sales #>> ARRAY[r.period, 'saleCount'])::bigint, COUNT(o.id) FILTER (WHERE o.factor = 1)) AS sales_count,
      COALESCE((v_sales #>> ARRAY[r.period, 'paidTrafficSalesValue'])::numeric,
        SUM(o.factor * o.amount) FILTER (WHERE o.origin = 'paid' OR o.origin ~ '(trafego|tráfego|ads|facebook|instagram|google)'), 0) AS paid_sales,
      COUNT(o.id) AS orders_count, COALESCE(SUM(o.factor * o.cmv), 0) AS cmv,
      COALESCE(SUM(o.items_without_cost) FILTER (WHERE o.factor <> 0), 0) AS items_without_cost,
      COUNT(o.id) FILTER (WHERE o.status IN ('scheduled', 'draft')) AS pending,
      COUNT(o.id) FILTER (WHERE o.status = 'scheduled' AND o.scheduled_for <> '') AS scheduled,
      COALESCE(SUM(o.distance) FILTER (WHERE o.factor = 1), 0) AS km
    FROM (VALUES ('current'), ('previous')) r(period)
    LEFT JOIN orders o ON o.period = r.period GROUP BY r.period
  ), stats AS (
    SELECT pg_catalog.jsonb_object_agg(t.period, pg_catalog.jsonb_build_object(
      'totalSales', t.sales, 'saleCount', t.sales_count, 'totalOrdersCount', t.orders_count,
      'totalCmv', t.cmv, 'totalProfit', t.sales - t.cmv,
      'grossMargin', CASE WHEN t.sales > 0 THEN (t.sales - t.cmv) / t.sales * 100 ELSE 0 END,
      'cmvPartial', t.items_without_cost > 0, 'itemsWithoutCost', t.items_without_cost,
      'avgTicket', CASE WHEN t.sales_count > 0 THEN t.sales / t.sales_count ELSE 0 END,
      'pendingOrders', t.pending, 'activeSchedules', t.scheduled, 'totalKmDriven', t.km,
      'paidTrafficSalesValue', t.paid_sales)) AS data FROM totals t
  ), series AS (
    SELECT pg_catalog.to_char(pg_catalog.date_trunc(p_bucket, o.occurred_at AT TIME ZONE p_timezone),
      'YYYY-MM-DD"T"HH24:MI:SS') AS bucket,
      SUM(o.factor * o.amount) AS valor, SUM(o.factor * (o.amount - o.cmv)) AS lucro,
      COUNT(*) FILTER (WHERE o.factor = 1) AS orders
    FROM orders o WHERE o.period = 'current' AND o.factor <> 0 GROUP BY 1
  ), product_totals AS (
    SELECT COALESCE(NULLIF(i.variation_id, ''), i.product_id) AS key,
      (pg_catalog.array_agg(i.product_id ORDER BY o.created_at DESC, o.id, i.item_index, i.id))[1] AS product_id,
      (pg_catalog.array_agg(i.variation_id ORDER BY o.created_at DESC, o.id, i.item_index, i.id))[1] AS variation_id,
      (pg_catalog.array_agg(COALESCE(i.description, '') ORDER BY o.created_at DESC, o.id, i.item_index, i.id))[1] AS name,
      SUM(o.factor * i.quantity) AS quantity,
      SUM(o.factor * (i.unit_price - i.unit_discount) * i.quantity) AS revenue,
      SUM(o.factor * (i.unit_price - i.unit_discount - COALESCE(i.cost_price, 0)) * i.quantity) AS profit,
      MAX(o.created_at) AS latest_order
    FROM items i JOIN orders o ON o.id = i.order_id
    WHERE o.period = 'current' AND o.factor <> 0 AND NOT i.temporary AND NULLIF(i.product_id, '') IS NOT NULL
    GROUP BY 1
  ), products AS (
    SELECT p.*, pg_catalog.jsonb_build_object('productId', p.product_id, 'variationId', NULLIF(p.variation_id, ''),
      'name', p.name, 'quantity', p.quantity, 'revenue', p.revenue, 'profit', p.profit,
      'margin', CASE WHEN p.revenue > 0 THEN p.profit / p.revenue * 100 ELSE 0 END) AS data
    FROM product_totals p
  )
  SELECT stats.data || pg_catalog.jsonb_build_object(
    'series', COALESCE((SELECT pg_catalog.jsonb_agg(s ORDER BY s.bucket) FROM series s), '[]'::jsonb),
    'products', pg_catalog.jsonb_build_object(
      'topByQuantity', COALESCE((SELECT pg_catalog.jsonb_agg(p.data ORDER BY p.quantity DESC, p.latest_order DESC, p.key)
        FROM (SELECT * FROM products ORDER BY quantity DESC, latest_order DESC, key LIMIT 5) p), '[]'::jsonb),
      'topByRevenue', COALESCE((SELECT pg_catalog.jsonb_agg(p.data ORDER BY p.revenue DESC, p.latest_order DESC, p.key)
        FROM (SELECT * FROM products ORDER BY revenue DESC, latest_order DESC, key LIMIT 5) p), '[]'::jsonb),
      'topByProfit', COALESCE((SELECT pg_catalog.jsonb_agg(p.data ORDER BY p.profit DESC, p.latest_order DESC, p.key)
        FROM (SELECT * FROM products ORDER BY profit DESC, latest_order DESC, key LIMIT 5) p), '[]'::jsonb)),
    'operational', (SELECT pg_catalog.jsonb_build_object(
      'openOrders', COUNT(*) FILTER (WHERE o.status = 'scheduled' AND o.order_type NOT IN ('return', 'assistance')),
      'scheduledOrders', COUNT(*) FILTER (WHERE o.status = 'scheduled' AND o.order_type NOT IN ('return', 'assistance') AND o.scheduled_for <> ''),
      'deliveriesToday', COUNT(*) FILTER (WHERE o.status = 'scheduled' AND o.order_type NOT IN ('return', 'assistance') AND o.schedule_date = (CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date),
      'lateDeliveries', COUNT(*) FILTER (WHERE o.status = 'scheduled' AND o.order_type NOT IN ('return', 'assistance') AND o.schedule_date < (CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date),
      'pendingAssemblies', COUNT(*) FILTER (WHERE o.status = 'scheduled' AND o.assembly)) FROM orders o),
    'logistics', (SELECT pg_catalog.jsonb_build_object(
      'fulfilled', COUNT(*) FILTER (WHERE o.period = 'current' AND o.status = 'fulfilled' AND o.order_type <> 'return'),
      'pending', COUNT(*) FILTER (WHERE o.status = 'scheduled' AND o.order_type <> 'return' AND o.scheduled_for <> ''),
      'late', COUNT(*) FILTER (WHERE o.status = 'scheduled' AND o.schedule_date < (CURRENT_TIMESTAMP AT TIME ZONE p_timezone)::date),
      'totalKm', COALESCE(SUM(o.distance) FILTER (WHERE o.period = 'current' AND o.status IN ('scheduled', 'fulfilled') AND o.order_type <> 'return'), 0)) FROM orders o)
  ) INTO v_result FROM stats;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_metrics(timestamptz, timestamptz, timestamptz, timestamptz, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(timestamptz, timestamptz, timestamptz, timestamptz, text, text) TO authenticated, service_role;
