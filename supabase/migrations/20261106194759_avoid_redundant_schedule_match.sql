-- Preserve the second pass only for scopes whose candidate pass intentionally omits a filter.
-- Logistics, agenda, and ERP schedule already apply the complete predicate to candidates.
CREATE OR REPLACE FUNCTION public.list_order_schedule_ids(
  p_scope text, p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1, p_page_size integer DEFAULT 100
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE v_options jsonb; v_result jsonb;
BEGIN
  IF p_scope NOT IN ('erp_schedule','logistics','route','agenda','assembly_web','assembly_mobile') THEN
    RAISE EXCEPTION 'Escopo de consulta inválido' USING ERRCODE = '22023'; END IF;
  SELECT COALESCE(data->'deliveryHandlingOptions', '[]'::jsonb) || COALESCE(data->'pickupHandlingOptions', '[]'::jsonb)
    INTO v_options FROM public.settings WHERE id = 'app';
  v_options := COALESCE(v_options, '[]'::jsonb);
  WITH candidates AS MATERIALIZED (
    SELECT o.id, o.created_at, pg_catalog.to_jsonb(o) AS row
    FROM public.orders o
    WHERE public.order_schedule_matches(pg_catalog.to_jsonb(o), p_scope,
      CASE WHEN p_scope = 'route' THEN COALESCE(p_filters, '{}'::jsonb) - 'dateScope'
        WHEN p_scope IN ('assembly_web','assembly_mobile') THEN COALESCE(p_filters, '{}'::jsonb) - 'location'
        ELSE COALESCE(p_filters, '{}'::jsonb) END, v_options)
  ), matched AS MATERIALIZED (
    SELECT id, created_at FROM candidates c
    WHERE CASE WHEN p_scope IN ('route','assembly_web','assembly_mobile') THEN public.order_schedule_matches(c.row, p_scope, COALESCE(p_filters, '{}'::jsonb), v_options) ELSE true END
  ), selected AS (
    SELECT id, created_at FROM matched ORDER BY created_at DESC, id ASC
    LIMIT LEAST(100, GREATEST(1, COALESCE(p_page_size, 100)))
    OFFSET (GREATEST(1, COALESCE(p_page, 1))::bigint - 1) * LEAST(100, GREATEST(1, COALESCE(p_page_size, 100)))
  ), assembly_kinds AS (
    SELECT public.order_assembly_kind(COALESCE(NULLIF(i.value->>'handlingType', ''), NULLIF(i.value->>'handling', ''),
      NULLIF(c.row#>>'{order_data,handlingType}', ''), NULLIF(c.row#>>'{order_data,handling}', ''), NULLIF(c.row#>>'{order_data,deliveryType}', ''),
      c.row#>>'{order_data,shipping,handlingType}', c.row#>>'{order_data,shipping,handling}', ''), v_options) AS kind
    FROM candidates c CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(
      CASE WHEN pg_catalog.jsonb_typeof(c.row#>'{order_data,items}') = 'array' THEN c.row#>'{order_data,items}'
        WHEN pg_catalog.jsonb_typeof(c.row->'items') = 'array' THEN c.row->'items' ELSE '[]'::jsonb END) i(value)
    WHERE p_scope IN ('assembly_web','assembly_mobile') AND public.order_list_matches_words(pg_catalog.concat_ws(' ',
      c.id, c.row->>'customer_name', c.row#>>'{order_data,customerData,fullName}', c.row#>>'{order_data,customerData,name}', c.row#>>'{order_data,customerName}',
      c.row->>'order_number', pg_catalog.lpad(c.row->>'order_index', 6, '0'), 'PEDIDO', i.value->>'description', i.value->>'name', i.value->>'observation', i.value->>'observations'), p_filters->>'search')
  )
  SELECT pg_catalog.jsonb_build_object('ids', COALESCE((SELECT pg_catalog.jsonb_agg(id ORDER BY created_at DESC, id) FROM selected), '[]'::jsonb),
    'total', (SELECT pg_catalog.count(*) FROM matched),
    'counts', CASE WHEN p_scope IN ('assembly_web','assembly_mobile') THEN
      (SELECT pg_catalog.jsonb_build_object('all', pg_catalog.count(*) FILTER (WHERE kind <> ''),
        'internal', pg_catalog.count(*) FILTER (WHERE kind = 'internal'), 'outside', pg_catalog.count(*) FILTER (WHERE kind = 'outside')) FROM assembly_kinds)
      WHEN p_scope = 'route' THEN (SELECT pg_catalog.jsonb_build_object(
        'today', pg_catalog.count(*) FILTER (WHERE public.order_operational_schedule_date(c.row, false, true) = pg_catalog.to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')),
        'tomorrow', pg_catalog.count(*) FILTER (WHERE public.order_operational_schedule_date(c.row, false, true) = pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD')),
        'next_days', pg_catalog.count(*) FILTER (WHERE public.order_operational_schedule_date(c.row, false, true) > pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD'))
      ) FROM candidates c) ELSE '{}'::jsonb END) INTO v_result;
  RETURN v_result;
END;
$fn$;
