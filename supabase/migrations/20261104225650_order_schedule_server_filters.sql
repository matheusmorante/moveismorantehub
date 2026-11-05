-- Read-only schedule predicates; orders/children retain their existing RLS.
CREATE OR REPLACE FUNCTION public.order_schedule_date_value(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
  SELECT CASE
    WHEN pg_catalog.btrim(COALESCE(p_value, '')) ~ '^\d{4}-\d{2}-\d{2}' THEN pg_catalog.left(pg_catalog.btrim(p_value), 10)
    WHEN pg_catalog.btrim(COALESCE(p_value, '')) ~ '^\d{2}/\d{2}/\d{4}$' THEN
      pg_catalog.substring(p_value, 7, 4) || '-' || pg_catalog.substring(p_value, 4, 2) || '-' || pg_catalog.substring(p_value, 1, 2)
    ELSE '' END;
$fn$;

CREATE OR REPLACE FUNCTION public.order_schedule_option(p_option jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $fn$
DECLARE
  v_date text := public.order_schedule_date_value(p_option->>'date');
  v_end_date text := public.order_schedule_date_value(p_option->>'endDate');
  v_start text := pg_catalog.left(COALESCE(p_option->>'startTime', ''), 5);
  v_end text := pg_catalog.left(COALESCE(p_option->>'endTime', ''), 5);
  v_raw text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_option->>'time', '')));
  v_cutoff text;
  v_range text[];
BEGIN
  IF v_date = '' THEN RETURN NULL; END IF;
  IF v_start = '' AND v_end = '' THEN
    CASE pg_catalog.lower(COALESCE(p_option->>'period', ''))
      WHEN 'morning' THEN v_start := '09:00'; v_end := '12:00';
      WHEN 'afternoon' THEN v_start := '13:00'; v_end := '18:00';
      ELSE NULL;
    END CASE;
  END IF;
  IF v_start = '' AND v_end = '' AND v_raw <> '' THEN
    v_range := pg_catalog.regexp_match(v_raw, '^(\d{2}:\d{2})\s*(?:às|até|-)\s*(\d{2}:\d{2})$');
    IF v_range IS NOT NULL THEN v_start := v_range[1]; v_end := v_range[2];
    ELSIF p_option->>'type' IS DISTINCT FROM 'range' THEN v_start := v_raw;
    END IF;
  END IF;
  v_cutoff := CASE
    WHEN v_end ~ '^([01]\d|2[0-3]):[0-5]\d$' THEN v_end
    WHEN v_start ~ '^([01]\d|2[0-3]):[0-5]\d$' THEN v_start
    WHEN p_option->>'period' = 'morning' OR v_raw ~ 'manhã|manha' THEN '12:00'
    WHEN p_option->>'period' = 'afternoon' OR v_raw ~ 'tarde|comercial' THEN '18:00'
    WHEN v_raw LIKE '%noite%' THEN '22:00'
    WHEN v_raw ~ '^([01]\d|2[0-3]):[0-5]\d$' THEN v_raw
    ELSE '23:59' END;
  RETURN pg_catalog.jsonb_build_object('date', v_date, 'start', v_start, 'cutoffTime', v_cutoff,
    'cutoffDate', CASE WHEN p_option->>'dateType' = 'range' AND v_end_date >= v_date THEN v_end_date ELSE v_date END);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.order_operational_schedule_date(
  p_row jsonb, p_normalized boolean DEFAULT false, p_mobile boolean DEFAULT false,
  p_reference timestamptz DEFAULT CURRENT_TIMESTAMP
)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = '' AS $fn$
DECLARE
  v_data jsonb := COALESCE(p_row->'order_data', '{}'::jsonb);
  v_shipping jsonb;
  v_schedule jsonb;
  v_primary jsonb;
  v_alternative jsonb;
  v_options jsonb := '[]'::jsonb;
  v_selected jsonb;
  v_status text := pg_catalog.lower(COALESCE(NULLIF(p_row->>'status', ''), v_data->>'status', ''));
  v_delivery_status text;
  v_now text := pg_catalog.to_char(p_reference AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI');
  v_fallback text;
BEGIN
  v_shipping := COALESCE(v_data->'shipping', p_row->'shipping', '{}'::jsonb);
  v_schedule := COALESCE(v_shipping->'scheduling', v_data->'scheduling', p_row->'scheduling', '{}'::jsonb);
  v_fallback := COALESCE(NULLIF(v_schedule->>'date', ''), NULLIF(v_schedule->>'startDate', ''),
    NULLIF(v_schedule->>'scheduledDate', ''), NULLIF(v_schedule->>'scheduled_date', ''),
    NULLIF(p_row->>'scheduled_date', ''), NULLIF(p_row->>'scheduledDate', ''),
    NULLIF(v_data->>'scheduled_date', ''), v_data->>'scheduledDate', '');
  IF p_normalized THEN v_fallback := COALESCE(NULLIF(p_row->>'scheduled_date', ''), v_fallback); END IF;
  v_schedule := v_schedule || pg_catalog.jsonb_build_object('date', public.order_schedule_date_value(v_fallback),
    'startTime', COALESCE(NULLIF(CASE WHEN p_normalized THEN p_row->>'scheduled_start_time' END, ''),
      NULLIF(v_schedule->>'startTime', ''), NULLIF(p_row->>'scheduled_start_time', ''), ''),
    'endTime', COALESCE(NULLIF(CASE WHEN p_normalized THEN p_row->>'scheduled_end_time' END, ''),
      NULLIF(v_schedule->>'endTime', ''), NULLIF(p_row->>'scheduled_end_time', ''), ''),
    'time', COALESCE(NULLIF(v_schedule->>'time', ''), p_row->>'scheduledTime', v_data->>'scheduledTime', ''),
    'period', COALESCE(NULLIF(v_schedule->>'period', ''), p_row->>'scheduledPeriod', v_data->>'scheduledPeriod', ''));
  IF NOT (COALESCE(v_schedule->>'pendingScheduling', 'false') = 'true' AND v_schedule->>'immediatePickup' IS DISTINCT FROM 'true') THEN
    v_primary := public.order_schedule_option(v_schedule);
    FOR v_alternative IN SELECT value FROM pg_catalog.jsonb_array_elements(
      CASE WHEN pg_catalog.jsonb_typeof(v_schedule->'alternatives') = 'array' THEN v_schedule->'alternatives' ELSE '[]'::jsonb END)
    LOOP
      v_selected := public.order_schedule_option(v_alternative);
      IF v_selected IS NOT NULL THEN v_options := v_options || pg_catalog.jsonb_build_array(v_selected); END IF;
    END LOOP;
    v_delivery_status := pg_catalog.lower(COALESCE(NULLIF(p_row->>'delivery_status', ''),
      v_shipping#>>'{deliveryStatus,status}', v_data#>>'{deliveryStatus,status}', v_data->>'deliveryStatus', ''));
    IF v_status IN ('fulfilled','completed','cancelled','canceled','delivered','picked_up','atendido','entregue','retirado','cancelado')
      OR v_delivery_status IN ('delivered','completed','entregue') OR v_data#>>'{handling,status}' = 'completed'
      OR v_options = '[]'::jsonb
      OR (v_primary IS NOT NULL AND v_now <= (v_primary->>'cutoffDate') || 'T' || (v_primary->>'cutoffTime')) THEN
      v_selected := COALESCE(v_primary, v_options->0);
    ELSE
      SELECT value INTO v_selected FROM pg_catalog.jsonb_array_elements(v_options) WITH ORDINALITY a(value, ordinal)
      WHERE v_now <= (value->>'cutoffDate') || 'T' || (value->>'cutoffTime')
      ORDER BY value->>'date', COALESCE(NULLIF(value->>'start', ''), value->>'cutoffTime'), ordinal LIMIT 1;
      IF v_selected IS NULL THEN
        SELECT value INTO v_selected FROM pg_catalog.jsonb_array_elements(v_options) WITH ORDINALITY a(value, ordinal)
        ORDER BY value->>'date' DESC, COALESCE(NULLIF(value->>'start', ''), value->>'cutoffTime') DESC, ordinal DESC LIMIT 1;
      END IF;
    END IF;
    IF COALESCE(v_selected->>'date', '') <> '' THEN RETURN v_selected->>'date'; END IF;
  END IF;
  RETURN public.order_schedule_date_value(COALESCE(NULLIF(p_row->>'scheduled_date', ''), NULLIF(p_row->>'scheduledDate', ''),
    NULLIF(v_schedule->>'date', ''), NULLIF(v_data#>>'{schedule,date}', ''), NULLIF(v_data#>>'{scheduling,date}', ''),
    CASE WHEN p_mobile THEN v_data->>'date' END, CASE WHEN p_mobile THEN p_row->>'date' END, ''));
END;
$fn$;

CREATE OR REPLACE FUNCTION public.order_assembly_kind(p_label text, p_options jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $fn$
DECLARE v_label text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_label, ''))); v_option jsonb;
BEGIN
  IF v_label = '' OR v_label ~ 'sem montagem|sem_montagem|apenas entrega|não necessita|nao necessita' THEN RETURN ''; END IF;
  SELECT value INTO v_option FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(p_options) = 'array' THEN p_options ELSE '[]'::jsonb END)
  WHERE pg_catalog.lower(pg_catalog.btrim(COALESCE(value->>'label', ''))) = v_label LIMIT 1;
  IF v_option IS NOT NULL THEN
    RETURN CASE WHEN v_option->>'isAssemblyOutside' = 'true' THEN 'outside'
      WHEN v_option->>'includeInAssemblySchedule' = 'true' THEN 'internal' ELSE '' END;
  END IF;
  IF v_label ~ 'montagem_fora|montagem fora|montador|montagem externa|montagem no cliente|assembly_outside'
    OR (v_label LIKE '%fora%' AND v_label NOT LIKE '%sem%') THEN RETURN 'outside'; END IF;
  IF v_label ~ 'loja|deposito|depósito|montagem_loja|montagem na loja|interna|montado' THEN RETURN 'internal'; END IF;
  RETURN '';
END;
$fn$;

CREATE OR REPLACE FUNCTION public.order_schedule_matches(p_row jsonb, p_scope text, p_filters jsonb, p_options jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = '' AS $fn$
DECLARE
  v_data jsonb := COALESCE(p_row->'order_data', '{}'::jsonb);
  v_shipping jsonb := COALESCE(v_data->'shipping', '{}'::jsonb);
  v_schedule jsonb;
  v_status text := pg_catalog.lower(COALESCE(NULLIF(p_row->>'status', ''), v_data->>'status', ''));
  v_type text := COALESCE(NULLIF(p_row->>'order_type', ''), v_data->>'orderType', 'sale');
  v_method text;
  v_date text;
  v_pending boolean;
  v_today text := pg_catalog.to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');
  v_tomorrow text := pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD');
  v_item jsonb;
  v_items jsonb;
  v_label text;
  v_kind text;
  v_assembly boolean := false;
  v_pickup boolean;
BEGIN
  IF p_row->>'deleted' = 'true' OR v_data->>'deleted' = 'true' OR v_status LIKE '%cancel%'
    OR public.order_list_is_test(p_row) THEN RETURN false; END IF;
  v_schedule := COALESCE(v_shipping->'scheduling', v_data->'schedule', v_data->'scheduling', p_row->'schedule', '{}'::jsonb);
  v_method := pg_catalog.lower(COALESCE(NULLIF(p_row->>'delivery_method', ''), NULLIF(v_shipping->>'deliveryMethod', ''), 'delivery'));
  v_pickup := v_method = 'pickup' OR pg_catalog.lower(COALESCE(v_shipping->>'deliveryType', '')) LIKE '%retirada%';
  v_pending := COALESCE(v_schedule->>'pendingScheduling', 'false') = 'true';
  v_items := CASE WHEN pg_catalog.jsonb_typeof(v_data->'items') = 'array' THEN v_data->'items'
    WHEN pg_catalog.jsonb_typeof(p_row->'items') = 'array' THEN p_row->'items' ELSE '[]'::jsonb END;
  v_date := public.order_operational_schedule_date(p_row, p_scope = 'erp_schedule', p_scope IN ('logistics','route','agenda'));

  IF p_scope = 'erp_schedule' THEN
    IF v_type = 'budget' OR v_status NOT IN ('scheduled','draft','agendado','rascunho') OR (v_date = '' AND NOT v_pending) THEN RETURN false; END IF;
    SELECT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v_items ||
      CASE WHEN pg_catalog.jsonb_typeof(v_data->'assistanceItems') = 'array' THEN v_data->'assistanceItems' ELSE '[]'::jsonb END) i
      JOIN pg_catalog.jsonb_array_elements(p_options) opt ON pg_catalog.lower(pg_catalog.btrim(i->>'handlingType')) = pg_catalog.lower(pg_catalog.btrim(opt->>'label'))
      WHERE opt->>'includeInAssemblySchedule' = 'true') INTO v_assembly;
    IF NOT (p_filters->'types' ? 'assistance' AND v_type = 'assistance')
      AND NOT (p_filters->'types' ? 'assembly' AND (v_assembly OR v_type = 'showroom'))
      AND NOT (v_type NOT IN ('assistance','showroom') AND (
        (p_filters->'types' ? 'pickup' AND v_method = 'pickup') OR (p_filters->'types' ? 'delivery' AND v_method = 'delivery'))) THEN RETURN false; END IF;
  ELSIF p_scope IN ('assembly_web','assembly_mobile') THEN
    IF v_status IN ('draft','rascunho') THEN RETURN false; END IF;
    IF p_scope = 'assembly_mobile' THEN
      v_date := public.order_schedule_date_value(COALESCE(NULLIF(v_schedule->>'date', ''), NULLIF(v_schedule->>'startDate', ''), p_row->>'scheduled_date', p_row->>'date', v_shipping->>'scheduledDate'));
      IF v_pending OR v_schedule->>'notInformed' = 'true' OR v_data->>'pendingScheduling' = 'true' OR v_date < v_today OR v_date = '' THEN RETURN false; END IF;
    END IF;
    FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(v_items) LOOP
      v_label := COALESCE(NULLIF(v_item->>'handlingType', ''), NULLIF(v_item->>'handling', ''),
        NULLIF(v_data->>'handlingType', ''), NULLIF(v_data->>'handling', ''), NULLIF(v_data->>'deliveryType', ''), v_shipping->>'handlingType', v_shipping->>'handling', '');
      v_kind := public.order_assembly_kind(v_label, p_options);
      IF v_kind <> '' AND (COALESCE(p_filters->>'location', 'all') = 'all' OR v_kind = p_filters->>'location')
        AND public.order_list_matches_words(pg_catalog.concat_ws(' ', p_row->>'id', p_row->>'customer_name', v_data#>>'{customerData,fullName}', v_data#>>'{customerData,name}', v_data->>'customerName',
          p_row->>'order_number', pg_catalog.lpad(p_row->>'order_index', 6, '0'), 'PEDIDO', v_item->>'description', v_item->>'name', v_item->>'observation', v_item->>'observations'), p_filters->>'search') THEN
        v_assembly := true; EXIT;
      END IF;
    END LOOP;
    IF NOT v_assembly THEN RETURN false; END IF;
  ELSIF p_scope = 'agenda' THEN
    IF v_status NOT IN ('scheduled','draft','agendado','rascunho') OR p_filters->>'kind' = 'events' THEN RETURN false; END IF;
    SELECT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v_items) i WHERE i->>'handlingType' LIKE '%montagem%') INTO v_assembly;
    v_kind := CASE WHEN v_assembly THEN 'assemblies' WHEN v_type IN ('return','assistance') THEN v_type
      WHEN pg_catalog.lower(COALESCE(v_shipping->>'deliveryType', v_shipping->>'deliveryMethod', '')) LIKE '%retirada%' THEN 'pickups' ELSE 'deliveries' END;
    IF COALESCE(p_filters->>'kind', 'all') <> 'all' AND p_filters->>'kind' <> v_kind THEN RETURN false; END IF;
  ELSE
    IF v_status IN ('draft','rascunho','drafts') THEN RETURN false; END IF;
    v_pending := v_pending OR v_data->>'pendingScheduling' = 'true' OR p_row->>'pending_scheduling' = 'true' OR v_status IN ('pending_scheduling','agendar_depois');
    v_pending := COALESCE(v_pending, false);
    IF p_scope = 'route' AND (v_pickup OR v_pending) THEN RETURN false; END IF;
    IF v_date = '' AND NOT v_pending THEN RETURN false; END IF;
  END IF;
  IF v_pending AND p_scope IN ('erp_schedule','logistics') THEN RETURN true; END IF;
  IF COALESCE(p_filters->>'startDate', '') <> '' AND v_date <> '' AND v_date < p_filters->>'startDate' THEN RETURN false; END IF;
  IF COALESCE(p_filters->>'endDate', '') <> '' AND v_date <> '' AND v_date > p_filters->>'endDate' THEN RETURN false; END IF;
  IF p_filters->>'dateScope' = 'today' THEN RETURN v_date = v_today; END IF;
  IF p_filters->>'dateScope' = 'tomorrow' THEN RETURN v_date = v_tomorrow; END IF;
  IF p_filters->>'dateScope' = 'next_days' THEN RETURN v_date > v_tomorrow; END IF;
  RETURN true;
END;
$fn$;

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
  WITH matched AS MATERIALIZED (
    SELECT o.id, o.created_at FROM public.orders o
    WHERE public.order_schedule_matches(pg_catalog.to_jsonb(o), p_scope, COALESCE(p_filters, '{}'::jsonb), COALESCE(v_options, '[]'::jsonb))
  ), selected AS (
    SELECT id, created_at FROM matched ORDER BY created_at DESC, id ASC
    LIMIT LEAST(100, GREATEST(1, p_page_size)) OFFSET (GREATEST(1, p_page)::bigint - 1) * LEAST(100, GREATEST(1, p_page_size))
  )
  SELECT pg_catalog.jsonb_build_object('ids', COALESCE((SELECT pg_catalog.jsonb_agg(id ORDER BY created_at DESC, id) FROM selected), '[]'::jsonb),
    'total', (SELECT pg_catalog.count(*) FROM matched)) INTO v_result;
  RETURN v_result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.order_schedule_date_value(text), public.order_schedule_option(jsonb),
  public.order_operational_schedule_date(jsonb, boolean, boolean, timestamptz), public.order_assembly_kind(text,jsonb),
  public.order_schedule_matches(jsonb,text,jsonb,jsonb), public.list_order_schedule_ids(text,jsonb,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_schedule_date_value(text), public.order_schedule_option(jsonb),
  public.order_operational_schedule_date(jsonb, boolean, boolean, timestamptz), public.order_assembly_kind(text,jsonb),
  public.order_schedule_matches(jsonb,text,jsonb,jsonb), public.list_order_schedule_ids(text,jsonb,integer,integer) TO authenticated, service_role;
