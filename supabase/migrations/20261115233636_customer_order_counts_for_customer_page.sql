-- Return only per-customer counts for the visible customer page.
-- Keep the target limit aligned with ERP_LIST_PAGE_SIZES, currently [15].
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.customer_order_counts_for_page(p_customers jsonb)
RETURNS TABLE (customer_id text, order_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '10s'
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
BEGIN
  IF v_profile_id IS NULL OR NOT private.customer_support_profile_has_permission(
    v_profile_id,
    'viewCustomers',
    ARRAY['manager']::text[]
  ) THEN
    RAISE EXCEPTION 'CUSTOMER_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  IF p_customers IS NULL OR pg_catalog.jsonb_typeof(p_customers) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'CUSTOMER_ORDER_COUNT_INVALID_INPUT' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.jsonb_array_length(p_customers) > 15 THEN
    RAISE EXCEPTION 'CUSTOMER_ORDER_COUNT_PAGE_TOO_LARGE' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_customers) AS item(value)
    WHERE pg_catalog.jsonb_typeof(item.value) <> 'object'
      OR (
        item.value ? 'id'
        AND pg_catalog.jsonb_typeof(item.value -> 'id') NOT IN ('string', 'null')
      )
      OR (
        item.value ? 'fullName'
        AND pg_catalog.jsonb_typeof(item.value -> 'fullName') NOT IN ('string', 'null')
      )
  ) THEN
    RAISE EXCEPTION 'CUSTOMER_ORDER_COUNT_INVALID_INPUT' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH customer_input AS (
    SELECT
      NULLIF(item.value ->> 'id', '') AS target_customer_id,
      NULLIF(pg_catalog.btrim(item.value ->> 'fullName'), '') AS target_full_name,
      item.ordinality AS input_order
    FROM pg_catalog.jsonb_array_elements(p_customers) WITH ORDINALITY AS item(value, ordinality)
  ),
  target_ids AS (
    SELECT DISTINCT customer_input.target_customer_id
    FROM customer_input
    WHERE customer_input.target_customer_id IS NOT NULL
  ),
  target_names AS (
    SELECT DISTINCT ON (pg_catalog.lower(customer_input.target_full_name))
      pg_catalog.lower(customer_input.target_full_name) AS normalized_name,
      customer_input.target_customer_id
    FROM customer_input
    WHERE customer_input.target_customer_id IS NOT NULL
      AND customer_input.target_full_name IS NOT NULL
    ORDER BY
      pg_catalog.lower(customer_input.target_full_name),
      customer_input.input_order DESC
  ),
  matched_orders AS (
    SELECT COALESCE(id_match.target_customer_id, name_match.target_customer_id) AS target_customer_id
    FROM public.orders AS orders
    LEFT JOIN target_ids AS id_match
      ON id_match.target_customer_id = orders.customer_id
    LEFT JOIN target_names AS name_match
      ON name_match.normalized_name = pg_catalog.lower(pg_catalog.btrim(orders.customer_name))
    WHERE orders.deleted IS DISTINCT FROM true
      AND (id_match.target_customer_id IS NOT NULL OR name_match.target_customer_id IS NOT NULL)
  )
  SELECT target_ids.target_customer_id, pg_catalog.count(matched_orders.target_customer_id)
  FROM target_ids
  LEFT JOIN matched_orders
    ON matched_orders.target_customer_id = target_ids.target_customer_id
  GROUP BY target_ids.target_customer_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_order_counts_for_page(jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.customer_order_counts_for_page(jsonb) TO authenticated;

COMMIT;
