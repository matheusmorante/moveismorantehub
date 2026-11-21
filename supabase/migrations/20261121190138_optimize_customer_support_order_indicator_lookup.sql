BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
DECLARE
  v_function oid := to_regprocedure('public.customer_support_list_customer_order_indicators(text[])');
BEGIN
  IF to_regclass('public.orders') IS NULL OR to_regnamespace('private') IS NULL THEN
    RAISE EXCEPTION 'Expected public.orders table or private schema is missing';
  END IF;

  IF v_function IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc
    WHERE oid = v_function
      AND prosecdef
      AND provolatile = 's'
      AND proconfig @> ARRAY['search_path=""', 'statement_timeout=10s']::text[]
  ) THEN
    RAISE EXCEPTION 'Customer support indicators RPC changed; review its security and timeout before indexing';
  END IF;

  IF to_regclass('public.idx_orders_customer_id') IS NULL THEN
    RAISE EXCEPTION 'Expected customer_id lookup index is missing';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.orders'::regclass
      AND attname IN ('id', 'customer_id', 'deleted', 'order_data', 'order_type', 'status', 'delivery_method')
      AND attnum > 0
      AND NOT attisdropped
  ) <> 7 THEN
    RAISE EXCEPTION 'Expected order lookup columns are missing';
  END IF;

  IF to_regprocedure('private.order_additional_contact_phone_suffixes(jsonb)') IS NOT NULL
     OR to_regclass('public.idx_orders_customer_phone_suffix') IS NOT NULL
     OR to_regclass('public.idx_orders_additional_phone_suffixes_gin') IS NOT NULL THEN
    RAISE EXCEPTION 'A customer phone lookup helper or index already exists; inspect before applying';
  END IF;
END;
$preflight$;

CREATE FUNCTION private.order_additional_contact_phone_suffixes(p_order_data jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT COALESCE(
    pg_catalog.array_agg(phone_suffix ORDER BY phone_suffix),
    ARRAY[]::text[]
  )
  FROM (
    SELECT DISTINCT
      pg_catalog.right(
        pg_catalog.regexp_replace(COALESCE(contact.value ->> 'phone', ''), '[^0-9]', '', 'g'),
        8
      ) AS phone_suffix
    FROM pg_catalog.jsonb_array_elements(
      CASE
        WHEN pg_catalog.jsonb_typeof(p_order_data #> '{customerData,additionalContacts}') = 'array'
          THEN p_order_data #> '{customerData,additionalContacts}'
        ELSE '[]'::pg_catalog.jsonb
      END
    ) AS contact(value)
  ) AS suffixes
  WHERE phone_suffix <> '';
$function$;

REVOKE ALL ON FUNCTION private.order_additional_contact_phone_suffixes(jsonb)
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.order_additional_contact_phone_suffixes(jsonb) IS
  'Returns normalized last-eight-digit suffixes from additional contact phones in an order snapshot.';

CREATE INDEX idx_orders_customer_phone_suffix
  ON public.orders (
    pg_catalog.right(
      pg_catalog.regexp_replace(COALESCE(order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'),
      8
    )
  )
  WHERE (deleted IS NULL OR deleted = false);

CREATE INDEX idx_orders_additional_phone_suffixes_gin
  ON public.orders USING gin (private.order_additional_contact_phone_suffixes(order_data))
  WHERE (deleted IS NULL OR deleted = false);

COMMENT ON INDEX public.idx_orders_customer_phone_suffix IS
  'Supports normalized phone matching for the customer support order indicators RPC.';

COMMENT ON INDEX public.idx_orders_additional_phone_suffixes_gin IS
  'Supports last-eight-digit matching against additional contact phones in order snapshots.';

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
  WITH input_targets AS MATERIALIZED (
    SELECT DISTINCT
      pg_catalog.btrim(target.target_key) AS target_key,
      CASE
        WHEN pg_catalog.length(pg_catalog.regexp_replace(pg_catalog.btrim(target.target_key), '[^0-9]', '', 'g')) >= 8
          THEN pg_catalog.right(pg_catalog.regexp_replace(pg_catalog.btrim(target.target_key), '[^0-9]', '', 'g'), 8)
        ELSE NULL
      END AS phone_suffix
    FROM pg_catalog.unnest(COALESCE(p_customer_ids, ARRAY[]::text[])) AS target(target_key)
    WHERE pg_catalog.btrim(target.target_key) <> ''
  ),
  matched_order_ids AS (
    SELECT input_target.target_key, order_row.id AS order_id
    FROM input_targets AS input_target
    JOIN public.orders AS order_row
      ON order_row.customer_id = input_target.target_key
     AND (order_row.deleted IS NULL OR order_row.deleted = false)

    UNION

    SELECT input_target.target_key, order_row.id AS order_id
    FROM input_targets AS input_target
    JOIN public.orders AS order_row
      ON (order_row.deleted IS NULL OR order_row.deleted = false)
     AND input_target.phone_suffix IS NOT NULL
     AND pg_catalog.right(
       pg_catalog.regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'),
       8
     ) = input_target.phone_suffix

    UNION

    SELECT input_target.target_key, order_row.id AS order_id
    FROM input_targets AS input_target
    JOIN public.orders AS order_row
      ON (order_row.deleted IS NULL OR order_row.deleted = false)
     AND input_target.phone_suffix IS NOT NULL
     AND private.order_additional_contact_phone_suffixes(order_row.order_data)
       @> ARRAY[input_target.phone_suffix]::text[]
  ),
  matched_orders AS (
    SELECT
      matched.target_key,
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
    FROM matched_order_ids AS matched
    JOIN public.orders AS order_row ON order_row.id = matched.order_id
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

COMMIT;
