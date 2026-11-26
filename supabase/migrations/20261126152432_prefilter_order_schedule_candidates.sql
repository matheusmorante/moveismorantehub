BEGIN;

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
BEGIN
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.list_order_schedule_ids(text,jsonb,integer,integer)'::pg_catalog.regprocedure)
     IS DISTINCT FROM '087f4b3cbf7552cd8162febea3604cbb' THEN
    RAISE EXCEPTION 'list_order_schedule_ids changed since the reviewed definition';
  END IF;
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.order_schedule_appointment_date(jsonb,jsonb,boolean,boolean,timestamptz)'::pg_catalog.regprocedure)
     IS DISTINCT FROM '762693fc5922963e7866faa1f54da818' THEN
    RAISE EXCEPTION 'order_schedule_appointment_date changed since the reviewed definition';
  END IF;
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.order_operational_schedule_date(jsonb,boolean,boolean,timestamptz)'::pg_catalog.regprocedure)
     IS DISTINCT FROM '637c8880e6d2e43b18c688abc796beab' THEN
    RAISE EXCEPTION 'order_operational_schedule_date changed since the reviewed definition';
  END IF;
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.order_schedule_matches(jsonb,text,jsonb,jsonb)'::pg_catalog.regprocedure)
     IS DISTINCT FROM '0c7f23a266d3c79e2fa8aca3ef53e029' THEN
    RAISE EXCEPTION 'order_schedule_matches changed since the reviewed definition';
  END IF;
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.order_schedule_appointment_matches(jsonb,text,jsonb,jsonb,jsonb)'::pg_catalog.regprocedure)
     IS DISTINCT FROM '0a6677c8db9ea7caeb97fbc1177ac5ef' THEN
    RAISE EXCEPTION 'order_schedule_appointment_matches changed since the reviewed definition';
  END IF;
  IF (SELECT pg_catalog.md5(prosrc) FROM pg_catalog.pg_proc
      WHERE oid = 'public.order_list_is_test(jsonb)'::pg_catalog.regprocedure)
     IS DISTINCT FROM '8b22d8e9d2832681ca268f1b8e9e29c6' THEN
    RAISE EXCEPTION 'order_list_is_test changed since the reviewed definition';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.order_schedule_appointment_date(
  p_row jsonb, p_appointment jsonb, p_normalized boolean DEFAULT false,
  p_mobile boolean DEFAULT false, p_reference timestamptz DEFAULT CURRENT_TIMESTAMP
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_data jsonb := CASE WHEN pg_catalog.jsonb_typeof(p_row->'order_data') = 'object'
    THEN p_row->'order_data' ELSE '{}'::jsonb END;
  v_shipping jsonb;
  v_schedule jsonb := CASE WHEN pg_catalog.jsonb_typeof(p_appointment->'scheduling') = 'object'
    THEN p_appointment->'scheduling' ELSE '{}'::jsonb END;
BEGIN
  IF pg_catalog.jsonb_typeof(p_row) IS DISTINCT FROM 'object' THEN
    RETURN public.order_operational_schedule_date(p_row - 'schedule', p_normalized, p_mobile, p_reference);
  END IF;

  v_shipping := CASE
    WHEN pg_catalog.jsonb_typeof(v_data->'shipping') = 'object' THEN v_data->'shipping'
    WHEN pg_catalog.jsonb_typeof(p_row->'shipping') = 'object' THEN p_row->'shipping'
    ELSE '{}'::jsonb END;

  -- Resolve this appointment with its own schedule and the order's completion signals.
  RETURN public.order_operational_schedule_date(pg_catalog.jsonb_build_object(
    'status', p_row->'status',
    'delivery_status', p_row->'delivery_status',
    'order_data', pg_catalog.jsonb_build_object(
      'status', v_data->'status',
      'deliveryStatus', v_data->'deliveryStatus',
      'handling', pg_catalog.jsonb_build_object('status', v_data #> '{handling,status}'),
      'shipping', pg_catalog.jsonb_build_object(
        'deliveryStatus', v_shipping->'deliveryStatus',
        'scheduling', v_schedule - 'appointments'
      )
    )
  ), p_normalized, p_mobile, p_reference);
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_order_schedule_ids(p_scope text, p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1, p_page_size integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
 SET statement_timeout TO '20s'
AS $function$
DECLARE v_options jsonb; v_result jsonb;
BEGIN
  IF p_scope NOT IN ('erp_schedule','logistics','route','agenda','assembly_web','assembly_mobile') THEN
    RAISE EXCEPTION 'Escopo de consulta inválido' USING ERRCODE = '22023'; END IF;
  SELECT COALESCE(data->'deliveryHandlingOptions', '[]'::jsonb) || COALESCE(data->'pickupHandlingOptions', '[]'::jsonb)
    INTO v_options FROM public.settings WHERE id = 'app';
  v_options := COALESCE(v_options, '[]'::jsonb);
  WITH candidates AS MATERIALIZED (
    SELECT o.id, o.created_at,
      CASE WHEN p_scope IN ('route', 'assembly_web', 'assembly_mobile') THEN payload.value END AS row
    FROM public.orders AS o
    CROSS JOIN LATERAL (
      SELECT pg_catalog.lower(COALESCE(NULLIF(o.status, ''), o.order_data->>'status', '')) AS status_key,
        COALESCE(NULLIF(o.order_type, ''), o.order_data->>'orderType', 'sale') AS type_key,
        o.order_data #> '{shipping,scheduling}' AS scheduling,
        pg_catalog.to_jsonb(o.scheduled_date) #>> '{}' AS scheduled_date_key
    ) AS base
    CROSS JOIN LATERAL (
      SELECT pg_catalog.jsonb_build_object(
        'id', o.id, 'order_number', o.order_number, 'order_index', o.order_index,
        'customer_name', o.customer_name, 'notes', o.notes,
        'order_type', o.order_type, 'status', o.status, 'deleted', o.deleted,
        'delivery_method', o.delivery_method, 'delivery_status', o.delivery_status,
        'scheduled_date', o.scheduled_date, 'scheduled_start_time', o.scheduled_start_time,
        'scheduled_end_time', o.scheduled_end_time, 'items', o.items, 'order_data', o.order_data
      ) AS value
    ) AS payload
    WHERE o.deleted IS NOT TRUE AND (o.order_data->>'deleted') IS DISTINCT FROM 'true'
      AND CASE
        WHEN base.status_key LIKE '%cancel%' THEN false
        WHEN p_scope = 'erp_schedule' AND (
          base.type_key = 'budget' OR base.status_key NOT IN ('scheduled','draft','agendado','rascunho','fulfilled','atendido')
        ) THEN false
        WHEN p_scope = 'agenda' AND (
          base.status_key NOT IN ('scheduled','draft','agendado','rascunho') OR p_filters->>'kind' = 'events'
        ) THEN false
        -- The ERP date resolver prefers the normalized column for a single schedule.
        -- Leave appointments, pending dates, alternatives and legacy formats to the matcher.
        WHEN p_scope = 'erp_schedule'
          AND ((COALESCE(p_filters->>'startDate', '') <> '' AND base.scheduled_date_key < p_filters->>'startDate')
            OR (COALESCE(p_filters->>'endDate', '') <> '' AND base.scheduled_date_key > p_filters->>'endDate'))
          AND base.scheduled_date_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND pg_catalog.jsonb_typeof(base.scheduling) = 'object'
          AND COALESCE(base.scheduling->>'pendingScheduling', 'false') <> 'true'
          AND pg_catalog.jsonb_typeof(base.scheduling->'appointments') IS DISTINCT FROM 'array'
          AND (pg_catalog.jsonb_typeof(base.scheduling->'alternatives') IS DISTINCT FROM 'array'
            OR base.scheduling->'alternatives' = '[]'::jsonb)
        THEN false
        ELSE public.order_schedule_matches(payload.value, p_scope,
          CASE WHEN p_scope = 'route' THEN COALESCE(p_filters, '{}'::jsonb) - 'dateScope'
            WHEN p_scope IN ('assembly_web','assembly_mobile') THEN COALESCE(p_filters, '{}'::jsonb) - 'location' - 'dateScope'
            ELSE COALESCE(p_filters, '{}'::jsonb) END, v_options)
      END
  ), matched AS MATERIALIZED (
    SELECT id, created_at FROM candidates c
    WHERE CASE WHEN p_scope IN ('route','assembly_web','assembly_mobile') THEN public.order_schedule_matches(c.row, p_scope, COALESCE(p_filters, '{}'::jsonb), v_options) ELSE true END
  ), selected AS (
    SELECT id, created_at FROM matched ORDER BY created_at DESC, id ASC
    LIMIT LEAST(100, GREATEST(1, COALESCE(p_page_size, 100)))
    OFFSET (GREATEST(1, COALESCE(p_page, 1))::bigint - 1) * LEAST(100, GREATEST(1, COALESCE(p_page_size, 100)))
  ), assembly_sources AS (
    SELECT c.id, c.row,
      CASE WHEN pg_catalog.jsonb_typeof(c.row#>'{order_data,shipping,scheduling,appointments}') = 'array'
        THEN c.row#>'{order_data,shipping,scheduling,appointments}'
        WHEN pg_catalog.jsonb_typeof(c.row#>'{shipping,scheduling,appointments}') = 'array'
        THEN c.row#>'{shipping,scheduling,appointments}' ELSE NULL END AS appointments
    FROM candidates c WHERE p_scope IN ('assembly_web', 'assembly_mobile')
  ), assembly_items AS (
    SELECT c.id, c.row, i.value AS item, NULL::jsonb AS appointment
    FROM assembly_sources c CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(
      CASE WHEN pg_catalog.jsonb_typeof(c.row#>'{order_data,items}') = 'array' THEN c.row#>'{order_data,items}'
        WHEN pg_catalog.jsonb_typeof(c.row->'items') = 'array' THEN c.row->'items' ELSE '[]'::jsonb END) i(value)
    WHERE c.appointments IS NULL
    UNION ALL
    SELECT c.id, c.row, i.value, a.value
    FROM assembly_sources c
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(COALESCE(c.appointments, '[]'::jsonb)) a(value)
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(
      CASE WHEN pg_catalog.jsonb_typeof(c.row#>'{order_data,items}') = 'array' THEN c.row#>'{order_data,items}'
        WHEN pg_catalog.jsonb_typeof(c.row->'items') = 'array' THEN c.row->'items' ELSE '[]'::jsonb END) i(value)
    WHERE public.order_schedule_appointment_matches(c.row, p_scope, COALESCE(p_filters, '{}'::jsonb) - 'location' - 'dateScope', v_options, a.value)
      AND (COALESCE(a.value->'itemIds', '[]'::jsonb) ? COALESCE(NULLIF(i.value->>'orderItemId', ''), i.value->>'id', '')
        OR COALESCE(a.value->'itemQuantities', '{}'::jsonb) ? COALESCE(NULLIF(i.value->>'orderItemId', ''), i.value->>'id', ''))
  ), assembly_kinds AS (
    SELECT public.order_assembly_kind(CASE
      WHEN c.appointment->'itemHandlings' ? COALESCE(NULLIF(c.item->>'orderItemId', ''), c.item->>'id', '')
        THEN COALESCE(c.appointment->'itemHandlings'->COALESCE(NULLIF(c.item->>'orderItemId', ''), c.item->>'id', '')->>'handlingType', '')
      ELSE COALESCE(NULLIF(c.item->>'handlingType', ''), NULLIF(c.item->>'handling', ''),
        NULLIF(c.row#>>'{order_data,handlingType}', ''), NULLIF(c.row#>>'{order_data,handling}', ''), NULLIF(c.row#>>'{order_data,deliveryType}', ''),
        c.row#>>'{order_data,shipping,handlingType}', c.row#>>'{order_data,shipping,handling}', '') END, v_options) AS kind,
      CASE WHEN c.appointment IS NOT NULL THEN public.order_schedule_appointment_date(c.row, c.appointment, false, p_scope = 'assembly_mobile')
        WHEN p_scope = 'assembly_mobile' THEN public.order_schedule_date_value(COALESCE(NULLIF(c.row#>>'{order_data,shipping,scheduling,date}', ''),
          NULLIF(c.row#>>'{order_data,shipping,scheduling,startDate}', ''), c.row->>'scheduled_date', c.row->>'date', c.row#>>'{order_data,shipping,scheduledDate}'))
        ELSE public.order_operational_schedule_date(c.row, false, false) END AS date
    FROM assembly_items c
    WHERE public.order_list_matches_words(pg_catalog.concat_ws(' ',
      c.id, c.row->>'customer_name', c.row#>>'{order_data,customerData,fullName}', c.row#>>'{order_data,customerData,name}', c.row#>>'{order_data,customerName}',
      c.row->>'order_number', pg_catalog.lpad(c.row->>'order_index', 6, '0'), 'PEDIDO', c.item->>'description', c.item->>'name', c.item->>'observation', c.item->>'observations'), p_filters->>'search')
  ), route_candidates AS MATERIALIZED (
    SELECT c.row,
      CASE
        WHEN pg_catalog.jsonb_typeof(c.row#>'{order_data,shipping,scheduling,appointments}') = 'array'
          THEN c.row#>'{order_data,shipping,scheduling,appointments}'
        WHEN pg_catalog.jsonb_typeof(c.row#>'{shipping,scheduling,appointments}') = 'array'
          THEN c.row#>'{shipping,scheduling,appointments}'
        ELSE NULL END AS appointments
    FROM candidates c WHERE p_scope = 'route'
  ), route_dates AS MATERIALIZED (
    SELECT public.order_schedule_appointment_date(rc.row, a.value, false, true) AS date
    FROM route_candidates rc
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(COALESCE(rc.appointments, '[]'::jsonb)) a(value)
    WHERE rc.appointments IS NOT NULL AND public.order_schedule_appointment_matches(
      rc.row, 'route', COALESCE(p_filters, '{}'::jsonb) - 'dateScope', v_options, a.value)
    UNION ALL
    SELECT public.order_operational_schedule_date(rc.row, false, true) AS date
    FROM route_candidates rc
    WHERE rc.appointments IS NULL AND public.order_schedule_matches(
      rc.row, 'route', COALESCE(p_filters, '{}'::jsonb) - 'dateScope', v_options)
  )
  SELECT pg_catalog.jsonb_build_object('ids', COALESCE((SELECT pg_catalog.jsonb_agg(id ORDER BY created_at DESC, id) FROM selected), '[]'::jsonb),
    'total', (SELECT pg_catalog.count(*) FROM matched),
    'counts', CASE WHEN p_scope IN ('assembly_web','assembly_mobile') THEN
      (SELECT pg_catalog.jsonb_build_object(
        'all', pg_catalog.count(*) FILTER (WHERE kind <> '' AND (COALESCE(p_filters->>'dateScope', '') = '' OR
          (p_filters->>'dateScope' = 'today' AND date = pg_catalog.to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')) OR
          (p_filters->>'dateScope' = 'tomorrow' AND date = pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD')) OR
          (p_filters->>'dateScope' = 'next_days' AND date > pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD')))),
        'internal', pg_catalog.count(*) FILTER (WHERE kind = 'internal' AND (COALESCE(p_filters->>'dateScope', '') = '' OR
          (p_filters->>'dateScope' = 'today' AND date = pg_catalog.to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')) OR
          (p_filters->>'dateScope' = 'tomorrow' AND date = pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD')) OR
          (p_filters->>'dateScope' = 'next_days' AND date > pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD')))),
        'outside', pg_catalog.count(*) FILTER (WHERE kind = 'outside' AND (COALESCE(p_filters->>'dateScope', '') = '' OR
          (p_filters->>'dateScope' = 'today' AND date = pg_catalog.to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')) OR
          (p_filters->>'dateScope' = 'tomorrow' AND date = pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD')) OR
          (p_filters->>'dateScope' = 'next_days' AND date > pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD')))),
        'today', pg_catalog.count(*) FILTER (WHERE kind <> '' AND date = pg_catalog.to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')),
        'tomorrow', pg_catalog.count(*) FILTER (WHERE kind <> '' AND date = pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD')),
        'next_days', pg_catalog.count(*) FILTER (WHERE kind <> '' AND date > pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD'))
      ) FROM assembly_kinds)
      WHEN p_scope = 'route' THEN (SELECT pg_catalog.jsonb_build_object(
        'today', pg_catalog.count(*) FILTER (WHERE date = pg_catalog.to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')),
        'tomorrow', pg_catalog.count(*) FILTER (WHERE date = pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD')),
        'next_days', pg_catalog.count(*) FILTER (WHERE date > pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD'))
      ) FROM route_dates) ELSE '{}'::jsonb END) INTO v_result;
  RETURN v_result;
END;
$function$;

COMMIT;
