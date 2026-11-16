-- Preserva retiradas imediatas atendidas na agenda; entregas atendidas continuam excluídas.
CREATE OR REPLACE FUNCTION public.order_schedule_appointment_matches(
  p_row jsonb,
  p_scope text,
  p_filters jsonb,
  p_options jsonb,
  p_appointment jsonb
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE
  v_data jsonb := CASE WHEN pg_catalog.jsonb_typeof(p_row->'order_data') = 'object' THEN p_row->'order_data' ELSE '{}'::jsonb END;
  v_shipping jsonb;
  v_appointment_schedule jsonb := CASE WHEN pg_catalog.jsonb_typeof(p_appointment->'scheduling') = 'object' THEN p_appointment->'scheduling' ELSE '{}'::jsonb END;
  v_handlings jsonb := CASE WHEN pg_catalog.jsonb_typeof(p_appointment->'itemHandlings') = 'object' THEN p_appointment->'itemHandlings' ELSE '{}'::jsonb END;
  v_status text := pg_catalog.lower(COALESCE(NULLIF(p_row->>'status', ''), v_data->>'status', ''));
  v_type text := COALESCE(NULLIF(p_row->>'order_type', ''), v_data->>'orderType', 'sale');
  v_items jsonb := CASE
    WHEN pg_catalog.jsonb_typeof(v_data->'items') = 'array' THEN v_data->'items'
    WHEN pg_catalog.jsonb_typeof(p_row->'items') = 'array' THEN p_row->'items'
    ELSE '[]'::jsonb END;
  v_item jsonb;
  v_option jsonb;
  v_item_id text;
  v_label text;
  v_kind text;
  v_method text;
  v_pickup boolean;
  v_has_item boolean := false;
  v_assembly boolean := false;
  v_pending boolean := false;
  v_type_matches boolean := false;
  v_date text;
BEGIN
  v_shipping := CASE
    WHEN pg_catalog.jsonb_typeof(v_data->'shipping') = 'object' THEN v_data->'shipping'
    WHEN pg_catalog.jsonb_typeof(p_row->'shipping') = 'object' THEN p_row->'shipping'
    ELSE '{}'::jsonb END;
  v_method := pg_catalog.lower(COALESCE(NULLIF(p_appointment->>'deliveryMethod', ''),
    NULLIF(v_shipping->>'deliveryMethod', ''), NULLIF(p_row->>'delivery_method', ''), 'delivery'));
  v_pickup := v_method IN ('pickup', 'retirada') OR (
    NULLIF(p_appointment->>'deliveryMethod', '') IS NULL AND
    pg_catalog.lower(COALESCE(p_appointment->>'deliveryType', v_shipping->>'deliveryType', '')) LIKE '%retirada%');
  v_method := CASE WHEN v_pickup THEN 'pickup' ELSE 'delivery' END;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(v_items) LOOP
    v_item_id := COALESCE(NULLIF(v_item->>'orderItemId', ''), NULLIF(v_item->>'id', ''));
    IF v_item_id IS NULL OR NOT (
      COALESCE(p_appointment->'itemIds', '[]'::jsonb) ? v_item_id OR
      COALESCE(p_appointment->'itemQuantities', '{}'::jsonb) ? v_item_id
    ) THEN CONTINUE; END IF;

    v_has_item := true;
    IF v_handlings ? v_item_id THEN
      v_label := COALESCE(v_handlings->v_item_id->>'handlingType', '');
    ELSE
      v_label := COALESCE(NULLIF(v_item->>'handlingType', ''), NULLIF(v_item->>'handling', ''),
        NULLIF(v_data->>'handlingType', ''), NULLIF(v_data->>'handling', ''), NULLIF(v_data->>'deliveryType', ''),
        v_shipping->>'handlingType', v_shipping->>'handling', '');
    END IF;

    IF p_scope = 'erp_schedule' THEN
      FOR v_option IN SELECT value FROM pg_catalog.jsonb_array_elements(
        CASE WHEN pg_catalog.jsonb_typeof(p_options) = 'array' THEN p_options ELSE '[]'::jsonb END)
      LOOP
        IF pg_catalog.lower(pg_catalog.btrim(COALESCE(v_option->>'label', ''))) = pg_catalog.lower(pg_catalog.btrim(v_label))
          AND v_option->>'includeInAssemblySchedule' = 'true' THEN
          v_assembly := true;
          EXIT;
        END IF;
      END LOOP;
    ELSIF p_scope = 'agenda' AND pg_catalog.lower(v_label) LIKE '%montagem%' THEN
      v_assembly := true;
    ELSIF p_scope IN ('assembly_web', 'assembly_mobile') THEN
      v_kind := public.order_assembly_kind(v_label, p_options);
      IF v_kind <> '' AND (COALESCE(p_filters->>'location', 'all') = 'all' OR v_kind = p_filters->>'location')
        AND public.order_list_matches_words(pg_catalog.concat_ws(' ', p_row->>'id', p_row->>'customer_name', v_data#>>'{customerData,fullName}', v_data#>>'{customerData,name}', v_data->>'customerName',
          p_row->>'order_number', pg_catalog.lpad(p_row->>'order_index', 6, '0'), 'PEDIDO', v_item->>'description', v_item->>'name', v_item->>'observation', v_item->>'observations'), p_filters->>'search') THEN
        v_assembly := true;
      END IF;
    END IF;
  END LOOP;

  IF NOT v_has_item THEN RETURN false; END IF;

  IF p_scope = 'erp_schedule' THEN
    IF v_type = 'budget' OR (v_status NOT IN ('scheduled', 'draft', 'agendado', 'rascunho') AND NOT (v_status IN ('fulfilled', 'atendido') AND v_pickup AND COALESCE(v_appointment_schedule->>'immediatePickup', 'false') = 'true')) THEN RETURN false; END IF;
    v_type_matches :=
      (COALESCE(p_filters->'types' ? 'assistance', false) AND v_type = 'assistance') OR
      (COALESCE(p_filters->'types' ? 'assembly', false) AND (v_assembly OR v_type = 'showroom')) OR
      (v_type NOT IN ('assistance', 'showroom') AND
        ((COALESCE(p_filters->'types' ? 'pickup', false) AND v_method = 'pickup') OR
         (COALESCE(p_filters->'types' ? 'delivery', false) AND v_method = 'delivery')));
    IF NOT v_type_matches THEN RETURN false; END IF;
    v_pending := COALESCE(v_appointment_schedule->>'pendingScheduling', 'false') = 'true';
    IF v_pending THEN RETURN true; END IF;
    v_date := public.order_schedule_appointment_date(p_row, p_appointment, true, false);
  ELSIF p_scope = 'logistics' THEN
    v_pending := COALESCE(v_appointment_schedule->>'pendingScheduling', 'false') = 'true';
    IF v_pending THEN RETURN true; END IF;
    v_date := public.order_schedule_appointment_date(p_row, p_appointment, false, true);
  ELSIF p_scope = 'route' THEN
    IF v_status IN ('draft', 'rascunho', 'drafts') THEN RETURN false; END IF;
    v_pending := COALESCE(v_appointment_schedule->>'pendingScheduling', 'false') = 'true';
    IF v_pickup OR v_pending THEN RETURN false; END IF;
    v_date := public.order_schedule_appointment_date(p_row, p_appointment, false, true);
  ELSIF p_scope = 'agenda' THEN
    IF v_status NOT IN ('scheduled', 'draft', 'agendado', 'rascunho') OR p_filters->>'kind' = 'events' THEN RETURN false; END IF;
    v_kind := CASE WHEN v_type IN ('return', 'assistance') THEN v_type
      WHEN v_method = 'pickup' THEN 'pickups' ELSE 'deliveries' END;
    RETURN COALESCE(p_filters->>'kind', 'all') IN ('all', v_kind)
      OR (p_filters->>'kind' = 'assemblies' AND v_assembly);
  ELSIF p_scope IN ('assembly_web', 'assembly_mobile') THEN
    IF v_status IN ('draft', 'rascunho') OR NOT v_assembly THEN RETURN false; END IF;
    v_pending := COALESCE(v_appointment_schedule->>'pendingScheduling', 'false') = 'true';
    IF p_scope = 'assembly_mobile' AND (v_pending OR (v_appointment_schedule->>'notInformed' = 'true' AND COALESCE(v_appointment_schedule->>'immediatePickup', 'false') <> 'true')) THEN RETURN false; END IF;
    v_date := public.order_schedule_appointment_date(p_row, p_appointment, false, p_scope = 'assembly_mobile');
    IF p_scope = 'assembly_mobile' AND (COALESCE(v_date, '') = '' OR v_date < pg_catalog.to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')) THEN RETURN false; END IF;
  ELSE
    RETURN false;
  END IF;

  IF COALESCE(v_date, '') = '' THEN RETURN p_scope = 'assembly_web' AND COALESCE(p_filters->>'dateScope', '') = ''; END IF;
  IF COALESCE(p_filters->>'startDate', '') <> '' AND v_date < p_filters->>'startDate' THEN RETURN false; END IF;
  IF COALESCE(p_filters->>'endDate', '') <> '' AND v_date > p_filters->>'endDate' THEN RETURN false; END IF;
  IF p_filters->>'dateScope' = 'today' THEN RETURN v_date = pg_catalog.to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD'); END IF;
  IF p_filters->>'dateScope' = 'tomorrow' THEN RETURN v_date = pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD'); END IF;
  IF p_filters->>'dateScope' = 'next_days' THEN RETURN v_date > pg_catalog.to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date + 1, 'YYYY-MM-DD'); END IF;
  RETURN true;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.order_schedule_matches(p_row jsonb, p_scope text, p_filters jsonb, p_options jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE
  v_data jsonb := COALESCE(p_row->'order_data', '{}'::jsonb);
  v_shipping jsonb := COALESCE(v_data->'shipping', p_row->'shipping', '{}'::jsonb);
  v_schedule jsonb;
  v_appointments jsonb;
  v_appointment jsonb;
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
  v_appointments := CASE WHEN pg_catalog.jsonb_typeof(v_schedule->'appointments') = 'array' THEN v_schedule->'appointments' ELSE NULL END;
  IF p_scope IN ('erp_schedule', 'logistics', 'route', 'agenda', 'assembly_web', 'assembly_mobile') AND v_appointments IS NOT NULL THEN
    FOR v_appointment IN SELECT value FROM pg_catalog.jsonb_array_elements(v_appointments) LOOP
      IF public.order_schedule_appointment_matches(p_row, p_scope, COALESCE(p_filters, '{}'::jsonb), p_options, v_appointment) THEN RETURN true; END IF;
    END LOOP;
    RETURN false;
  END IF;

  v_method := pg_catalog.lower(COALESCE(NULLIF(p_row->>'delivery_method', ''), NULLIF(v_shipping->>'deliveryMethod', ''), 'delivery'));
  v_pickup := v_method = 'pickup' OR pg_catalog.lower(COALESCE(v_shipping->>'deliveryType', '')) LIKE '%retirada%';
  v_pending := COALESCE(v_schedule->>'pendingScheduling', 'false') = 'true';
  v_items := CASE WHEN pg_catalog.jsonb_typeof(v_data->'items') = 'array' THEN v_data->'items'
    WHEN pg_catalog.jsonb_typeof(p_row->'items') = 'array' THEN p_row->'items' ELSE '[]'::jsonb END;
  v_date := public.order_operational_schedule_date(p_row, p_scope = 'erp_schedule', p_scope IN ('logistics','route','agenda'));

  IF p_scope = 'erp_schedule' THEN
    IF v_type = 'budget' OR (v_status NOT IN ('scheduled','draft','agendado','rascunho') AND NOT (v_status IN ('fulfilled','atendido') AND v_pickup AND COALESCE(v_schedule->>'immediatePickup', 'false') = 'true')) OR (v_date = '' AND NOT v_pending) THEN RETURN false; END IF;
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
    v_kind := CASE WHEN v_type IN ('return','assistance') THEN v_type
      WHEN v_pickup THEN 'pickups' ELSE 'deliveries' END;
    IF COALESCE(p_filters->>'kind', 'all') <> 'all' AND p_filters->>'kind' <> v_kind
      AND NOT (p_filters->>'kind' = 'assemblies' AND v_assembly) THEN RETURN false; END IF;
  ELSE
    IF p_scope = 'route' AND v_status IN ('draft','rascunho','drafts') THEN RETURN false; END IF;
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

