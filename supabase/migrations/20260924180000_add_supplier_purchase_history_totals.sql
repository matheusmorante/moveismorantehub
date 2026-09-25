-- Provides the exact supplier purchase-history summary without transferring
-- every matching order row to the mobile client.
-- Rollback: DROP FUNCTION public.get_supplier_purchase_history_totals(text, text, text);

CREATE OR REPLACE FUNCTION public.get_supplier_purchase_history_totals(
  p_supplier_name text,
  p_supplier_phone text DEFAULT NULL,
  p_supplier_email text DEFAULT NULL
)
RETURNS TABLE (order_count bigint, total_spent numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    COUNT(*)::bigint AS order_count,
    COALESCE(
      SUM(
        COALESCE(
          CASE
            WHEN COALESCE(NULLIF(order_row.order_data #>> '{paymentsSummary,totalOrderValue}', ''), '') ~ '^-?[0-9]+(\.[0-9]+)?$'
              THEN (order_row.order_data #>> '{paymentsSummary,totalOrderValue}')::numeric
            ELSE NULL
          END,
          order_row.total_amount,
          0
        )
      ),
      0
    )::numeric AS total_spent
  FROM public.orders AS order_row
  WHERE COALESCE(order_row.deleted, false) = false
    AND LOWER(COALESCE(NULLIF(order_row.customer_name, ''), order_row.order_data #>> '{customerData,fullName}', '')) = LOWER(COALESCE(p_supplier_name, ''))
    AND (
      NULLIF(p_supplier_phone, '') IS NULL
      OR COALESCE(NULLIF(order_row.customer_phone, ''), order_row.order_data #>> '{customerData,phone}', '') = p_supplier_phone
    )
    AND (
      NULLIF(p_supplier_email, '') IS NULL
      OR COALESCE(NULLIF(order_row.customer_email, ''), order_row.order_data #>> '{customerData,email}', '') = p_supplier_email
    );
$$;

REVOKE ALL ON FUNCTION public.get_supplier_purchase_history_totals(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_supplier_purchase_history_totals(text, text, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
