-- =============================================================================
-- Migration: 20260924154500_safe_dashboard_metrics_date_parsing.sql
-- Objetivo: Garantir parsing seguro de datas no trigger de métricas do dashboard,
--           suportando formatos ISO, pt-BR (DD/MM/YYYY) e evitando erro 22008
--           (date/time field value out of range) ao salvar pedidos ou devoluções.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.parse_order_metric_date(raw_date text, fallback_date timestamptz)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_clean text := TRIM(COALESCE(raw_date, ''));
BEGIN
    IF v_clean = '' THEN
        RETURN COALESCE(fallback_date, now())::date;
    END IF;

    -- 1. Formato ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...
    IF v_clean ~ '^\d{4}-\d{2}-\d{2}' THEN
        BEGIN
            RETURN (SUBSTRING(v_clean FROM 1 FOR 10))::date;
        EXCEPTION WHEN OTHERS THEN
            RETURN COALESCE(fallback_date, now())::date;
        END;
    END IF;

    -- 2. Formato Brasileiro: DD/MM/YYYY
    IF v_clean ~ '^\d{2}/\d{2}/\d{4}' THEN
        BEGIN
            RETURN to_date(SUBSTRING(v_clean FROM 1 FOR 10), 'DD/MM/YYYY');
        EXCEPTION WHEN OTHERS THEN
            RETURN COALESCE(fallback_date, now())::date;
        END;
    END IF;

    -- 3. Tentativa genérica de conversão timestamptz protegida contra erro 22008
    BEGIN
        RETURN (v_clean::timestamptz)::date;
    EXCEPTION WHEN OTHERS THEN
        RETURN COALESCE(fallback_date, now())::date;
    END;
END;
$$;

-- Atualizar refresh_dashboard_metric_day com parsing seguro
CREATE OR REPLACE FUNCTION public.refresh_dashboard_metric_day(p_day date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue numeric(14,2) := 0;
  v_cost numeric(14,2) := 0;
  v_orders integer := 0;
  v_without_cost integer := 0;
BEGIN
  WITH normalized AS (
    SELECT
      o.id,
      LOWER(COALESCE(o.status, o.order_data->>'status', '')) AS status,
      LOWER(COALESCE(o.order_data->>'orderType', 'sale')) AS order_type,
      public.parse_order_metric_date(o.order_data->>'date', o.created_at) AS metric_date,
      COALESCE(
        NULLIF(o.order_data #>> '{paymentsSummary,totalOrderValue}', '')::numeric,
        COALESCE(o.total_amount, 0)
      ) AS order_value,
      COALESCE(o.order_data->'items', '[]'::jsonb) AS items,
      COALESCE(o.deleted, false) AS deleted
    FROM public.orders o
  ), eligible AS (
    SELECT *,
      CASE
        WHEN status IN ('scheduled', 'fulfilled') AND order_type IN ('sale', 'showroom') THEN 1
        WHEN status = 'fulfilled' AND order_type = 'return' THEN -1
        ELSE 0
      END AS revenue_factor
    FROM normalized
    WHERE NOT deleted AND metric_date = p_day
  ), item_costs AS (
    SELECT
      e.id,
      e.revenue_factor,
      COALESCE(SUM(
        COALESCE(NULLIF(item->>'quantity', '')::numeric, 0) *
        COALESCE(NULLIF(COALESCE(item->>'unitCost', item->>'costPrice'), '')::numeric, 0)
      ) FILTER (WHERE COALESCE(item->>'isTemporaryProduct', 'false') <> 'true' AND item->>'productId' IS NOT NULL), 0) AS order_cost,
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
$$;

-- Atualizar trigger para invocar o parsing seguro
CREATE OR REPLACE FUNCTION public.refresh_dashboard_metrics_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tg_op <> 'INSERT' THEN
    PERFORM public.refresh_dashboard_metric_day(
      public.parse_order_metric_date(old.order_data->>'date', old.created_at)
    );
  END IF;
  IF tg_op <> 'DELETE' THEN
    PERFORM public.refresh_dashboard_metric_day(
      public.parse_order_metric_date(new.order_data->>'date', new.created_at)
    );
  END IF;
  RETURN COALESCE(new, old);
END;
$$;
