BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_list_customer_order_indicators(p_customer_ids text[])
RETURNS TABLE (
  customer_id text,
  order_count bigint,
  scheduled_delivery boolean,
  scheduled_pickup boolean,
  scheduled_assistance boolean,
  scheduled_return_collection boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '10s'
AS $function$
DECLARE
  v_can_view_commercial boolean;
  v_can_view_schedule boolean;
  v_can_view_assistance boolean;
  v_can_view_returns boolean;
BEGIN
  IF NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_can_view_commercial := public.customer_support_can_view_commercial_info();
  v_can_view_schedule := private.customer_support_profile_has_permission(
    auth.uid(), 'viewDeliverySchedule', ARRAY['manager', 'seller', 'deliverer']::text[]
  );
  v_can_view_assistance := private.customer_support_profile_has_permission(
    auth.uid(), 'viewAssistanceOrders', ARRAY['manager']::text[]
  );
  v_can_view_returns := private.customer_support_profile_has_permission(
    auth.uid(), 'viewReturns', ARRAY['manager']::text[]
  );

  IF NOT (v_can_view_commercial OR v_can_view_schedule OR v_can_view_assistance OR v_can_view_returns) THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH input_targets AS (
    SELECT DISTINCT pg_catalog.btrim(target.target_key) AS target_key
    FROM pg_catalog.unnest(COALESCE(p_customer_ids, ARRAY[]::text[])) AS target(target_key)
    WHERE pg_catalog.btrim(target.target_key) <> ''
  ),
  matched_orders AS (
    SELECT
      input_target.target_key,
      order_row.id,
      pg_catalog.lower(pg_catalog.btrim(COALESCE(
        NULLIF(pg_catalog.btrim(order_row.order_type), ''),
        NULLIF(pg_catalog.btrim(order_row.order_data ->> 'orderType'), ''),
        NULLIF(pg_catalog.btrim(order_row.order_data ->> 'order_type'), ''),
        'sale'
      ))) AS order_type,
      pg_catalog.lower(pg_catalog.btrim(COALESCE(order_row.status, ''))) AS order_status,
      CASE
        WHEN pg_catalog.lower(pg_catalog.btrim(COALESCE(order_row.status, ''))) IN ('scheduled', 'agendado')
          THEN public.order_operational_schedule_date(pg_catalog.to_jsonb(order_row), true, false)
        ELSE ''
      END AS schedule_date,
      pg_catalog.lower(pg_catalog.btrim(COALESCE(
        NULLIF(pg_catalog.btrim(order_row.delivery_method), ''),
        NULLIF(pg_catalog.btrim(order_row.order_data #>> '{shipping,deliveryMethod}'), ''),
        NULLIF(pg_catalog.btrim(order_row.order_data #>> '{shipping,delivery_method}'), ''),
        NULLIF(pg_catalog.btrim(order_row.order_data ->> 'deliveryMethod'), ''),
        NULLIF(pg_catalog.btrim(order_row.order_data ->> 'delivery_method'), ''),
        'delivery'
      ))) AS delivery_method,
      pg_catalog.lower(pg_catalog.btrim(COALESCE(
        NULLIF(pg_catalog.btrim(order_row.order_data ->> 'returnMethod'), ''),
        NULLIF(pg_catalog.btrim(order_row.order_data ->> 'return_method'), ''),
        'store_collection'
      ))) AS return_method,
      pg_catalog.lower(pg_catalog.btrim(COALESCE(
        order_row.order_data #>> '{shipping,scheduling,pendingScheduling}',
        order_row.order_data #>> '{scheduling,pendingScheduling}',
        order_row.order_data ->> 'pendingScheduling',
        'false'
      ))) AS pending_scheduling
    FROM input_targets AS input_target
    JOIN public.orders AS order_row ON
      (order_row.deleted IS NULL OR order_row.deleted = false)
      AND (
        order_row.customer_id = input_target.target_key
        OR (
          pg_catalog.length(pg_catalog.regexp_replace(input_target.target_key, '[^0-9]', '', 'g')) >= 8
          AND (
            pg_catalog.right(pg_catalog.regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8)
              = pg_catalog.right(pg_catalog.regexp_replace(input_target.target_key, '[^0-9]', '', 'g'), 8)
            OR EXISTS (
              SELECT 1
              FROM pg_catalog.jsonb_array_elements(
                CASE WHEN pg_catalog.jsonb_typeof(order_row.order_data #> '{customerData,additionalContacts}') = 'array'
                  THEN order_row.order_data #> '{customerData,additionalContacts}'
                  ELSE '[]'::jsonb
                END
              ) AS additional_contact(value)
              WHERE pg_catalog.right(pg_catalog.regexp_replace(COALESCE(additional_contact.value ->> 'phone', ''), '[^0-9]', '', 'g'), 8)
                = pg_catalog.right(pg_catalog.regexp_replace(input_target.target_key, '[^0-9]', '', 'g'), 8)
            )
          )
        )
      )
  ),
  aggregated AS (
    SELECT
      input_target.target_key,
      pg_catalog.count(matched_order.id) AS order_count,
      COALESCE(pg_catalog.bool_or(
        v_can_view_schedule
        AND matched_order.order_type = 'sale'
        AND matched_order.order_status IN ('scheduled', 'agendado')
        AND matched_order.schedule_date <> ''
        AND matched_order.pending_scheduling <> 'true'
        AND matched_order.delivery_method IN ('delivery', 'entrega', 'deliver')
      ), false) AS scheduled_delivery,
      COALESCE(pg_catalog.bool_or(
        v_can_view_schedule
        AND matched_order.order_type = 'sale'
        AND matched_order.order_status IN ('scheduled', 'agendado')
        AND matched_order.schedule_date <> ''
        AND matched_order.pending_scheduling <> 'true'
        AND matched_order.delivery_method IN ('pickup', 'retirada', 'retirar', 'pick-up')
      ), false) AS scheduled_pickup,
      COALESCE(pg_catalog.bool_or(
        v_can_view_assistance
        AND matched_order.order_type IN ('assistance', 'assistencia', 'assistência')
        AND matched_order.order_status IN ('scheduled', 'agendado')
        AND matched_order.schedule_date <> ''
        AND matched_order.pending_scheduling <> 'true'
      ), false) AS scheduled_assistance,
      COALESCE(pg_catalog.bool_or(
        v_can_view_returns
        AND matched_order.order_type IN ('return', 'devolucao', 'devolução')
        AND matched_order.order_status IN ('scheduled', 'agendado')
        AND matched_order.schedule_date <> ''
        AND matched_order.pending_scheduling <> 'true'
        AND matched_order.return_method = 'store_collection'
      ), false) AS scheduled_return_collection
    FROM input_targets AS input_target
    LEFT JOIN matched_orders AS matched_order ON matched_order.target_key = input_target.target_key
    GROUP BY input_target.target_key
  )
  SELECT
    aggregated.target_key,
    CASE WHEN v_can_view_commercial THEN aggregated.order_count ELSE 0::bigint END,
    aggregated.scheduled_delivery,
    aggregated.scheduled_pickup,
    aggregated.scheduled_assistance,
    aggregated.scheduled_return_collection
  FROM aggregated
  WHERE (v_can_view_commercial AND aggregated.order_count > 0)
    OR aggregated.scheduled_delivery
    OR aggregated.scheduled_pickup
    OR aggregated.scheduled_assistance
    OR aggregated.scheduled_return_collection;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_list_customer_order_indicators(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_list_customer_order_indicators(text[]) TO authenticated;

COMMIT;
