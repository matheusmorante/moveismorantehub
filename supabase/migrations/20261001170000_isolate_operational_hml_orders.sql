BEGIN;

-- Keep real, UUID-backed NF-e HML orders visible as fiscal history without
-- including their temporary commercial activity in operational KPIs/jobs.
CREATE OR REPLACE FUNCTION public.is_nfe_hml_test_order(
  p_id text, p_status text, p_deleted boolean, p_data jsonb
) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$
  SELECT COALESCE(
    public.is_nfe_hml_technical_order(p_id, p_status, p_deleted, p_data)
    OR (
      p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND lower(COALESCE(p_data->>'orderType', '')) IN ('sale', 'return')
      AND p_data->>'is_test' = 'true'
      AND p_data->>'test_environment' = 'homologation'
      AND NULLIF(btrim(p_data->>'testRunId'), '') ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.refresh_dashboard_metric_day(p_day date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_revenue numeric(14,2) := 0;
  v_cost numeric(14,2) := 0;
  v_orders integer := 0;
  v_without_cost integer := 0;
BEGIN
  WITH normalized AS (
    SELECT
      o.id,
      o.status,
      lower(COALESCE(o.order_data->>'orderType', o.order_type, 'sale')) AS order_type,
      public.parse_order_metric_date(o.order_data->>'date', o.created_at) AS metric_date,
      COALESCE(
        NULLIF(o.order_data #>> '{paymentsSummary,totalOrderValue}', '')::numeric,
        COALESCE(o.total_amount, 0)
      ) AS order_value,
      COALESCE(o.order_data->'items', '[]'::jsonb) AS items,
      COALESCE(o.deleted, false) AS deleted,
      o.order_data
    FROM public.orders o
  ), eligible AS (
    SELECT *,
      CASE
        WHEN lower(COALESCE(status, order_data->>'status', '')) IN ('scheduled', 'fulfilled')
          AND order_type IN ('sale', 'showroom') THEN 1
        WHEN lower(COALESCE(status, order_data->>'status', '')) = 'fulfilled'
          AND order_type = 'return' THEN -1
        ELSE 0
      END AS revenue_factor
    FROM normalized
    WHERE NOT deleted
      AND metric_date = p_day
      AND NOT public.is_nfe_hml_test_order(id, status, deleted, order_data)
  ), item_costs AS (
    SELECT
      e.id,
      e.revenue_factor,
      COALESCE(SUM(
        COALESCE(NULLIF(item->>'quantity', '')::numeric, 0) *
        COALESCE(NULLIF(COALESCE(item->>'unitCost', item->>'costPrice'), '')::numeric, 0)
      ) FILTER (WHERE COALESCE(item->>'isTemporaryProduct', 'false') <> 'true'
          AND item->>'productId' IS NOT NULL), 0) AS order_cost,
      COUNT(*) FILTER (
        WHERE COALESCE(item->>'isTemporaryProduct', 'false') <> 'true'
          AND item->>'productId' IS NOT NULL
          AND COALESCE(item->>'unitCost', item->>'costPrice') IS NULL
      ) AS missing_cost
    FROM eligible e
    LEFT JOIN LATERAL jsonb_array_elements(e.items) item ON true
    WHERE e.revenue_factor <> 0
    GROUP BY e.id, e.revenue_factor
  )
  SELECT
    COALESCE(SUM(e.order_value * e.revenue_factor), 0),
    COALESCE(SUM(c.order_cost * e.revenue_factor), 0),
    COUNT(*) FILTER (WHERE e.revenue_factor = 1),
    COALESCE(SUM(c.missing_cost), 0)
  INTO v_revenue, v_cost, v_orders, v_without_cost
  FROM eligible e
  LEFT JOIN item_costs c ON c.id = e.id
  WHERE e.revenue_factor <> 0;

  INSERT INTO public.dashboard_daily_metrics(metric_date, revenue, orders, cost, profit, items_without_cost, updated_at)
  VALUES (p_day, v_revenue, v_orders, v_cost, v_revenue - v_cost, v_without_cost, now())
  ON CONFLICT (metric_date) DO UPDATE SET
    revenue = EXCLUDED.revenue,
    orders = EXCLUDED.orders,
    cost = EXCLUDED.cost,
    profit = EXCLUDED.profit,
    items_without_cost = EXCLUDED.items_without_cost,
    updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_dashboard_metrics_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_old_test boolean := true;
  v_new_test boolean := true;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_test := public.is_nfe_hml_test_order(OLD.id, OLD.status, OLD.deleted, OLD.order_data);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_test := public.is_nfe_hml_test_order(NEW.id, NEW.status, NEW.deleted, NEW.order_data);
  END IF;
  IF v_old_test AND v_new_test THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP <> 'INSERT' AND NOT v_old_test THEN
    PERFORM public.refresh_dashboard_metric_day(
      public.parse_order_metric_date(OLD.order_data->>'date', OLD.created_at));
  END IF;
  IF TG_OP <> 'DELETE' AND NOT v_new_test THEN
    PERFORM public.refresh_dashboard_metric_day(
      public.parse_order_metric_date(NEW.order_data->>'date', NEW.created_at));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_delivery_summary_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  job_secret text;
  v_operational boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT EXISTS (
        SELECT 1 FROM hml_new_rows AS r
        WHERE NOT public.is_nfe_hml_test_order(r.id, r.status, r.deleted, r.order_data)
      ) INTO v_operational;
    END IF;
    IF TG_OP <> 'INSERT' AND NOT v_operational THEN
      SELECT EXISTS (
        SELECT 1 FROM hml_old_rows AS r
        WHERE NOT public.is_nfe_hml_test_order(r.id, r.status, r.deleted, r.order_data)
      ) INTO v_operational;
    END IF;
    IF NOT v_operational THEN RETURN NULL; END IF;
  END IF;

  SELECT decrypted_secret INTO job_secret FROM vault.decrypted_secrets
    WHERE name = 'delivery_summary_job_secret' LIMIT 1;
  IF COALESCE(job_secret, '') = '' THEN RETURN NULL; END IF;
  PERFORM net.http_post(
    url := 'https://hkoxhourxwlddgsfdgws.supabase.co/functions/v1/refresh-delivery-summaries',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-delivery-summary-job-secret', job_secret),
    body := jsonb_build_object('source', TG_TABLE_NAME));
  RETURN NULL;
END;
$function$;

COMMIT;
