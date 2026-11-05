-- Filter the operational order set before counting and returning a page.
-- SECURITY INVOKER keeps the existing orders and order_items RLS/privileges.
CREATE OR REPLACE FUNCTION public.order_list_matches_words(p_value text, p_query text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM pg_catalog.regexp_split_to_table(
      pg_catalog.btrim(COALESCE(public.immutable_unaccent(pg_catalog.lower(p_query)), '')),
      '\s+'
    ) AS word(value)
    WHERE word.value <> ''
      AND pg_catalog.strpos(COALESCE(public.immutable_unaccent(pg_catalog.lower(p_value)), ''), word.value) = 0
  );
$function$;

CREATE OR REPLACE FUNCTION public.order_list_date_key(p_raw text, p_created timestamptz)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT CASE
    WHEN pg_catalog.btrim(COALESCE(p_raw, '')) ~ '^\d{1,2}/\d{1,2}/\d{4}' THEN
      pg_catalog.split_part(pg_catalog.split_part(p_raw, ', ', 1), '/', 3) || '-' ||
      pg_catalog.lpad(pg_catalog.split_part(p_raw, '/', 2), 2, '0') || '-' ||
      pg_catalog.lpad(pg_catalog.split_part(p_raw, '/', 1), 2, '0') ||
      CASE WHEN pg_catalog.strpos(p_raw, ', ') > 0
        THEN 'T' || pg_catalog.split_part(p_raw, ', ', 2) ELSE '' END
    ELSE COALESCE(NULLIF(pg_catalog.btrim(p_raw), ''), pg_catalog.replace(p_created::text, ' ', 'T'), '')
  END;
$function$;

CREATE OR REPLACE FUNCTION public.order_list_is_test(p_row jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT public.test_artifact_is_test(p_row) OR EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(ARRAY[
      p_row->>'id', p_row->>'order_number', p_row->>'customer_name', p_row->>'notes',
      p_row#>>'{order_data,id}', p_row#>>'{order_data,orderNumber}',
      p_row#>>'{order_data,customerName}', p_row#>>'{order_data,notes}',
      p_row#>>'{order_data,observation}', p_row#>>'{order_data,customerData,fullName}',
      p_row#>>'{order_data,customerData,name}'
    ]) AS candidate(value)
    WHERE candidate.value ~* '(^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*))|(\[?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$))'
  );
$function$;

CREATE OR REPLACE FUNCTION public.list_order_page_ids(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 15,
  p_mode text DEFAULT 'erp'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_filters jsonb := COALESCE(p_filters, '{}'::jsonb);
  v_rules jsonb;
  v_rule jsonb;
  v_column text;
  v_order text := '';
  v_limit integer := LEAST(15, GREATEST(1, COALESCE(p_page_size, 15)));
  v_offset bigint := (GREATEST(1, COALESCE(p_page, 1))::bigint - 1) * LEAST(15, GREATEST(1, COALESCE(p_page_size, 15)));
  v_result jsonb;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('erp', 'mobile') THEN
    RAISE EXCEPTION 'Modo de listagem de pedidos inválido' USING ERRCODE = '22023';
  END IF;

  IF p_mode = 'mobile' THEN
    v_order := 'r.created_at DESC, r.id ASC';
  ELSE
    v_rules := v_filters->'multiSort';
    IF pg_catalog.jsonb_typeof(v_rules) IS DISTINCT FROM 'array' OR v_rules = '[]'::jsonb THEN
      v_rules := pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'key', COALESCE(NULLIF(v_filters->>'sortBy', ''), 'date'),
        'order', COALESCE(NULLIF(v_filters->>'sortOrder', ''), 'desc')
      ));
    END IF;
    FOR v_rule IN
      SELECT value FROM pg_catalog.jsonb_array_elements(v_rules) WITH ORDINALITY AS rules(value, ordinal)
      WHERE ordinal <= 6 ORDER BY ordinal
    LOOP
      v_column := CASE v_rule->>'key'
        WHEN 'customer' THEN 'r.x_customer'
        WHEN 'totalValue' THEN 'r.x_total'
        WHEN 'status' THEN 'r.x_status'
        WHEN 'deliveryDate' THEN 'r.x_delivery_date'
        WHEN 'id' THEN 'r.x_number'
        ELSE 'r.x_date'
      END;
      v_order := v_order || v_column || CASE WHEN v_rule->>'order' = 'asc' THEN ' ASC, ' ELSE ' DESC, ' END;
    END LOOP;
    v_order := v_order || 'r.created_at DESC, r.id ASC';
  END IF;

  EXECUTE pg_catalog.format($query$
    WITH normalized AS NOT MATERIALIZED (
      SELECT o.*,
        COALESCE(NULLIF(o.customer_name, ''), o.order_data#>>'{customerData,fullName}', '') AS x_customer,
        COALESCE(NULLIF(o.seller_name, ''), o.order_data->>'seller', '') AS x_seller,
        COALESCE(NULLIF(pg_catalog.btrim(o.status), ''), NULLIF(o.order_data->>'status', ''), 'draft') AS x_status,
        COALESCE(NULLIF(o.order_type, ''), NULLIF(o.order_data->>'orderType', ''), 'sale') AS x_type,
        COALESCE(NULLIF(o.order_data->>'orderType', ''), NULLIF(o.order_data->>'order_type', ''), NULLIF(o.order_type, ''), 'sale') AS x_mobile_type,
        COALESCE(o.deleted, pg_catalog.lower(COALESCE(o.order_data->>'deleted', 'false')) = 'true') AS x_deleted,
        COALESCE(o.total_amount,
          CASE WHEN COALESCE(o.order_data->>'totalAmount', o.order_data->>'total', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN COALESCE(o.order_data->>'totalAmount', o.order_data->>'total')::numeric ELSE 0 END) AS x_total,
        public.order_list_date_key(o.order_data->>'date', o.created_at) AS x_date,
        COALESCE(o.scheduled_date::text, o.order_data#>>'{shipping,scheduling,date}', '') AS x_delivery_date,
        COALESCE(NULLIF(o.delivery_method, ''), o.order_data#>>'{shipping,deliveryMethod}', o.order_data#>>'{shipping,deliveryType}', '') AS x_delivery_method,
        COALESCE(o.order_index::text, o.order_number, o.id, '') AS x_number
      FROM public.orders AS o
      WHERE o.id IS NOT NULL
        AND (o.order_number IS NOT NULL OR o.status IS NOT NULL OR
          (pg_catalog.jsonb_typeof(o.order_data) = 'object' AND o.order_data <> '{}'::jsonb))
    ), filtered AS MATERIALIZED (
      SELECT n.id, n.created_at, n.x_customer, n.x_total, n.x_status, n.x_delivery_date, n.x_date, n.x_number
      FROM normalized AS n
      WHERE
        CASE WHEN $4 = 'mobile' THEN NOT n.x_deleted AND pg_catalog.lower(COALESCE(n.order_data->>'deleted', 'false')) <> 'true'
             WHEN $1->>'showTrash' = 'true' THEN n.x_deleted
             ELSE NOT n.x_deleted AND ($1->>'isDraft' IS DISTINCT FROM 'true' OR n.x_status = 'draft') END
        AND ($1->>'showTestOrders' = 'true' OR NOT public.order_list_is_test(pg_catalog.to_jsonb(n)))
        AND CASE
          WHEN $4 = 'mobile' AND $1->>'mobileStatus' = 'assistencias' THEN n.x_mobile_type = 'assistance'
          WHEN $4 = 'mobile' AND COALESCE(NULLIF($1->>'orderType', ''), 'sale') = 'sale'
            THEN n.x_mobile_type NOT IN ('budget', 'assistance', 'return')
          WHEN $4 = 'mobile' THEN n.x_mobile_type = $1->>'orderType'
          WHEN $1->>'isBudgetView' = 'true' THEN n.x_type = 'budget'
          WHEN $1->>'isAssistanceView' = 'true' THEN n.x_type = 'assistance'
          WHEN $1->>'isReturnView' = 'true' THEN n.x_type = 'return'
          WHEN COALESCE($1->>'orderType', '') <> '' THEN n.x_type = $1->>'orderType'
          ELSE n.x_type NOT IN ('budget', 'assistance', 'return') END
        AND CASE WHEN $4 = 'mobile' THEN
          CASE COALESCE($1->>'mobileStatus', 'all')
            WHEN 'agendados' THEN pg_catalog.lower(n.x_status) LIKE ANY (ARRAY['%%scheduled%%','%%agendad%%'])
            WHEN 'concluidos' THEN pg_catalog.lower(n.x_status) LIKE ANY (ARRAY['%%fulfilled%%','%%atendid%%','%%concluid%%','%%entreg%%','%%finaliz%%'])
            WHEN 'cancelados' THEN pg_catalog.lower(n.x_status) LIKE ANY (ARRAY['%%cancelled%%','%%cancelad%%'])
            WHEN 'rascunhos' THEN pg_catalog.lower(n.x_status) LIKE ANY (ARRAY['%%draft%%','%%rascunh%%'])
            WHEN 'retiradas' THEN pg_catalog.lower(n.x_delivery_method) LIKE ANY (ARRAY['%%pickup%%','%%retirada%%'])
            ELSE true END
          ELSE CASE WHEN pg_catalog.jsonb_typeof($1->'statuses') = 'array'
              AND $1->'statuses' <> '[]'::jsonb THEN
                n.x_status IN (SELECT pg_catalog.jsonb_array_elements_text($1->'statuses'))
              ELSE COALESCE($1->>'status', '') = '' OR n.x_status = $1->>'status' END END
        AND (COALESCE($1->>'searchId', '') = '' OR n.id = $1->>'searchId')
        AND ($4 = 'mobile' OR public.order_list_matches_words(n.x_customer, $1->>'customerName'))
        AND ($4 = 'mobile' OR public.order_list_matches_words(n.x_seller, $1->>'seller'))
        AND ($4 = 'mobile' OR public.order_list_matches_words(
          pg_catalog.concat_ws(' ', n.x_customer, n.order_number, n.order_index::text, n.id), $1->>'generalSearch'))
        AND ($4 <> 'mobile' OR public.order_list_matches_words(
          pg_catalog.concat_ws(' ', n.x_customer, n.order_number, n.order_index::text, n.id), $1->>'mobileSearch'))
        AND ($4 = 'mobile' OR COALESCE($1#>>'{dateRange,start}', '') = '' OR COALESCE($1#>>'{dateRange,end}', '') = ''
          OR pg_catalog.left(n.x_date, 10) BETWEEN $1#>>'{dateRange,start}' AND $1#>>'{dateRange,end}')
        AND CASE WHEN $4 <> 'mobile' AND COALESCE($1#>>'{valueRange,min}', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          THEN n.x_total >= ($1#>>'{valueRange,min}')::numeric ELSE true END
        AND CASE WHEN $4 <> 'mobile' AND COALESCE($1#>>'{valueRange,max}', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          THEN n.x_total <= ($1#>>'{valueRange,max}')::numeric ELSE true END
        AND ($4 = 'mobile' OR COALESCE($1->>'productName', '') = ''
          OR public.order_list_matches_words(n.order_data->>'assistanceDescription', $1->>'productName')
          OR EXISTS (SELECT 1 FROM public.order_items AS i WHERE i.order_id = n.id
            AND public.order_list_matches_words(COALESCE(NULLIF(i.description, ''), i.item_snapshot->>'description', ''), $1->>'productName'))
          OR (NOT EXISTS (SELECT 1 FROM public.order_items AS i WHERE i.order_id = n.id)
            AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(
              CASE WHEN pg_catalog.jsonb_typeof(n.items) = 'array' AND n.items <> '[]'::jsonb THEN n.items
                   WHEN pg_catalog.jsonb_typeof(n.order_data->'items') = 'array' THEN n.order_data->'items'
                   ELSE '[]'::jsonb END) AS item(value)
              WHERE public.order_list_matches_words(item.value->>'description', $1->>'productName'))))
    ), selected AS (
      SELECT r.id, pg_catalog.row_number() OVER (ORDER BY %1$s) AS ordinal
      FROM filtered AS r ORDER BY %1$s LIMIT $2 OFFSET $3
    )
    SELECT pg_catalog.jsonb_build_object(
      'ids', COALESCE((SELECT pg_catalog.jsonb_agg(id ORDER BY ordinal) FROM selected), '[]'::jsonb),
      'total', (SELECT pg_catalog.count(*) FROM filtered)
    )
  $query$, v_order)
  INTO v_result USING v_filters, v_limit, v_offset, p_mode;

  RETURN v_result;
END;
$function$;

-- The support composer filters the customer's records before its fixed limit.
CREATE OR REPLACE FUNCTION public.customer_support_list_customer_orders_filtered(
  p_customer_id text,
  p_order_filter text DEFAULT 'all'
)
RETURNS SETOF jsonb
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
  IF p_order_filter IS NULL OR p_order_filter NOT IN ('all', 'orders', 'quotes') THEN
    RAISE EXCEPTION 'Filtro de documentos comerciais inválido' USING ERRCODE = '22023';
  END IF;
  IF p_customer_id IS NULL OR pg_catalog.btrim(p_customer_id) = '' THEN RETURN; END IF;

  RETURN QUERY
  SELECT pg_catalog.jsonb_build_object(
    'id', o.id, 'order_number', o.order_number, 'status', o.status,
    'order_type', COALESCE(NULLIF(o.order_type, ''), o.order_data->>'orderType', 'sale'),
    'total_amount', o.total_amount, 'payment_method', o.payment_method,
    'delivery_status', o.delivery_status, 'scheduled_date', o.scheduled_date,
    'delivery_finished_at', o.delivery_finished_at, 'items', o.items, 'created_at', o.created_at
  )
  FROM public.orders AS o
  WHERE o.customer_id = p_customer_id AND (o.deleted IS NULL OR o.deleted = false)
    AND (p_order_filter = 'all' OR
      (p_order_filter = 'quotes') = (
        COALESCE(NULLIF(o.order_type, ''), o.order_data->>'orderType', 'sale') = 'budget'
        OR COALESCE(o.status, '') ~* '(quoted|budget|orçamento|orcamento)'
      ))
  ORDER BY o.created_at DESC, o.id ASC
  LIMIT 15;
END;
$function$;

REVOKE ALL ON FUNCTION public.order_list_matches_words(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.order_list_date_key(text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.order_list_is_test(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_order_page_ids(jsonb, integer, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_list_customer_orders_filtered(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_list_matches_words(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_list_date_key(text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_list_is_test(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_order_page_ids(jsonb, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_list_customer_orders_filtered(text, text) TO authenticated;
