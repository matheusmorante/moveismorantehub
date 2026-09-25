-- Migration: 20260925000000_get_dashboard_aggregates.sql
-- Objetivo: Agregação server-side completa da Fonte A do Dashboard (KPIs, Gráficos e Top Produtos).
-- Retorna payload consolidado < 3 KB com 100% de paridade funcional e financeira com o ERP.

CREATE OR REPLACE FUNCTION public.get_dashboard_aggregates(
    p_start timestamptz,
    p_end timestamptz,
    p_group_by text DEFAULT 'month' -- 'hour' | 'day' | 'month'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH eligible_orders AS (
        SELECT
            o.id,
            o.total_amount,
            o.status,
            COALESCE(o.order_type, 'sale') AS order_type,
            o.marketing_origin,
            o.created_at,
            CASE
                WHEN o.status IN ('scheduled', 'fulfilled') AND COALESCE(o.order_type, 'sale') IN ('sale', 'showroom') THEN 1
                WHEN o.status = 'fulfilled' AND o.order_type = 'return' THEN -1
                ELSE 0
            END AS revenue_factor,
            CASE
                WHEN o.status IN ('scheduled', 'fulfilled') AND COALESCE(o.order_type, 'sale') IN ('sale', 'showroom') THEN 1
                ELSE 0
            END AS is_sale
        FROM public.orders o
        WHERE COALESCE(o.deleted, false) = false
          AND o.created_at >= p_start
          AND o.created_at <= p_end
    ),
    order_cmv AS (
        SELECT
            oi.order_id,
            COALESCE(SUM(
                COALESCE(oi.quantity, 1) * COALESCE(oi.cost_price, 0)
            ) FILTER (WHERE COALESCE(oi.is_temporary_product, false) = false AND oi.product_id IS NOT NULL), 0) AS cmv,
            COUNT(*) FILTER (
                WHERE COALESCE(oi.is_temporary_product, false) = false
                  AND oi.product_id IS NOT NULL
                  AND oi.cost_price IS NULL
            ) AS items_without_cost
        FROM public.order_items oi
        WHERE oi.order_id IN (SELECT id FROM eligible_orders WHERE revenue_factor <> 0)
        GROUP BY oi.order_id
    ),
    orders_with_metrics AS (
        SELECT
            eo.*,
            COALESCE(oc.cmv, 0) AS cmv,
            COALESCE(oc.items_without_cost, 0) AS items_without_cost
        FROM eligible_orders eo
        LEFT JOIN order_cmv oc ON oc.order_id = eo.id
    ),
    kpi_aggregates AS (
        SELECT
            COALESCE(SUM(revenue_factor * COALESCE(total_amount, 0)), 0)::numeric(14,2) AS total_sales,
            COALESCE(SUM(is_sale), 0)::integer AS sale_count,
            COUNT(*)::integer AS total_orders_count,
            COALESCE(SUM(revenue_factor * cmv), 0)::numeric(14,2) AS total_cmv,
            COALESCE(SUM(revenue_factor * (COALESCE(total_amount, 0) - cmv)), 0)::numeric(14,2) AS total_profit,
            COALESCE(SUM(items_without_cost), 0)::integer AS items_without_cost,
            COALESCE(SUM(CASE WHEN marketing_origin IS NOT NULL AND revenue_factor = 1 THEN COALESCE(total_amount, 0) ELSE 0 END), 0)::numeric(14,2) AS paid_traffic_sales_value,
            COUNT(*) FILTER (WHERE status IN ('scheduled', 'draft'))::integer AS pending_orders,
            COUNT(*) FILTER (WHERE status = 'scheduled')::integer AS active_schedules
        FROM orders_with_metrics
    ),
    chart_grouped AS (
        SELECT
            CASE
                WHEN p_group_by = 'hour' THEN to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24"h"')
                WHEN p_group_by = 'day' THEN to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
                ELSE to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'TMMon/YY')
            END AS label,
            MIN(created_at) AS sort_date,
            COALESCE(SUM(revenue_factor * COALESCE(total_amount, 0)), 0)::numeric(14,2) AS valor,
            COALESCE(SUM(revenue_factor * (COALESCE(total_amount, 0) - cmv)), 0)::numeric(14,2) AS lucro,
            COALESCE(SUM(is_sale), 0)::integer AS orders
        FROM orders_with_metrics
        GROUP BY 1
        ORDER BY MIN(created_at)
    ),
    products_grouped AS (
        SELECT
            oi.product_id,
            oi.variation_id,
            COALESCE(NULLIF(oi.description, ''), 'Produto sem nome') AS name,
            COALESCE(SUM(eo.revenue_factor * COALESCE(oi.quantity, 0)), 0)::numeric AS quantity,
            COALESCE(SUM(eo.revenue_factor * (COALESCE(oi.unit_price, 0) - COALESCE(oi.unit_discount, 0)) * COALESCE(oi.quantity, 0)), 0)::numeric(14,2) AS revenue,
            COALESCE(SUM(eo.revenue_factor * ((COALESCE(oi.unit_price, 0) - COALESCE(oi.unit_discount, 0) - COALESCE(oi.cost_price, 0)) * COALESCE(oi.quantity, 0))), 0)::numeric(14,2) AS profit
        FROM public.order_items oi
        JOIN eligible_orders eo ON eo.id = oi.order_id
        WHERE eo.revenue_factor <> 0
          AND COALESCE(oi.is_temporary_product, false) = false
          AND oi.product_id IS NOT NULL
        GROUP BY oi.product_id, oi.variation_id, oi.description
    ),
    top_by_quantity AS (
        SELECT jsonb_agg(sub) FROM (
            SELECT product_id AS "productId", variation_id AS "variationId", name, quantity, revenue, profit,
                   CASE WHEN revenue > 0 THEN ROUND((profit / revenue * 100)::numeric, 1) ELSE 0 END AS margin
            FROM products_grouped
            ORDER BY quantity DESC
            LIMIT 5
        ) sub
    ),
    top_by_revenue AS (
        SELECT jsonb_agg(sub) FROM (
            SELECT product_id AS "productId", variation_id AS "variationId", name, quantity, revenue, profit,
                   CASE WHEN revenue > 0 THEN ROUND((profit / revenue * 100)::numeric, 1) ELSE 0 END AS margin
            FROM products_grouped
            ORDER BY revenue DESC
            LIMIT 5
        ) sub
    ),
    top_by_profit AS (
        SELECT jsonb_agg(sub) FROM (
            SELECT product_id AS "productId", variation_id AS "variationId", name, quantity, revenue, profit,
                   CASE WHEN revenue > 0 THEN ROUND((profit / revenue * 100)::numeric, 1) ELSE 0 END AS margin
            FROM products_grouped
            ORDER BY profit DESC
            LIMIT 5
        ) sub
    )
    SELECT jsonb_build_object(
        'kpis', jsonb_build_object(
            'totalSales', k.total_sales,
            'saleCount', k.sale_count,
            'totalOrdersCount', k.total_orders_count,
            'totalCmv', k.total_cmv,
            'totalProfit', k.total_profit,
            'grossMargin', CASE WHEN k.total_sales > 0 THEN ROUND((k.total_profit / k.total_sales * 100)::numeric, 2) ELSE 0 END,
            'avgTicket', CASE WHEN k.sale_count > 0 THEN ROUND((k.total_sales / k.sale_count)::numeric, 2) ELSE 0 END,
            'itemsWithoutCost', k.items_without_cost,
            'cmvPartial', k.items_without_cost > 0,
            'paidTrafficSalesValue', k.paid_traffic_sales_value,
            'pendingOrders', k.pending_orders,
            'activeSchedules', k.active_schedules
        ),
        'chart', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', c.label, 'valor', c.valor, 'lucro', c.lucro, 'orders', c.orders)), '[]'::jsonb) FROM chart_grouped c),
        'topProducts', jsonb_build_object(
            'topByQuantity', COALESCE((SELECT * FROM top_by_quantity), '[]'::jsonb),
            'topByRevenue', COALESCE((SELECT * FROM top_by_revenue), '[]'::jsonb),
            'topByProfit', COALESCE((SELECT * FROM top_by_profit), '[]'::jsonb)
        )
    )
    INTO v_result
    from kpi_aggregates k;

    RETURN v_result;
END;
$$;

-- Permite execução para authenticated e anon
GRANT EXECUTE ON FUNCTION public.get_dashboard_aggregates(timestamptz, timestamptz, text) TO authenticated, anon;
