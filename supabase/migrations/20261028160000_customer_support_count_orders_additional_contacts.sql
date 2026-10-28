CREATE OR REPLACE FUNCTION public.customer_support_count_customer_orders(p_customer_ids text[])
RETURNS TABLE (customer_id text, order_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '10s'
AS $function$
BEGIN
  IF NOT public.customer_support_can_view() OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH input_targets AS (
    SELECT DISTINCT unnest(COALESCE(p_customer_ids, ARRAY[]::text[])) AS target_key
  ),
  counted AS (
    SELECT
      input_targets.target_key,
      count(order_row.id) AS cnt
    FROM input_targets
    JOIN public.orders AS order_row ON
      (order_row.deleted IS NULL OR order_row.deleted = false)
      AND (
        order_row.customer_id = input_targets.target_key
        OR (
          length(regexp_replace(input_targets.target_key, '[^0-9]', '', 'g')) >= 8
          AND (
            right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(input_targets.target_key, '[^0-9]', '', 'g'), 8)
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(order_row.order_data #> '{customerData,additionalContacts}') = 'array'
                  THEN order_row.order_data #> '{customerData,additionalContacts}'
                  ELSE '[]'::jsonb
                END
              ) AS ac
              WHERE right(regexp_replace(COALESCE(ac ->> 'phone', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(input_targets.target_key, '[^0-9]', '', 'g'), 8)
            )
          )
        )
      )
    GROUP BY input_targets.target_key
  )
  SELECT counted.target_key AS customer_id, counted.cnt AS order_count
  FROM counted
  WHERE counted.cnt > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_count_customer_orders(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_count_customer_orders(text[]) TO authenticated;
