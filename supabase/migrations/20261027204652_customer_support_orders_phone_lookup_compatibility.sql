CREATE OR REPLACE FUNCTION public.customer_support_list_customer_records_page(
  p_customer_id text,
  p_order_group text,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '10s'
AS $function$
DECLARE
  v_order_group text := lower(btrim(COALESCE(p_order_group, '')));
  v_contact_phone_digits text := regexp_replace(COALESCE(p_customer_id, ''), '[^0-9]', '', 'g');
  v_use_contact_phone boolean := COALESCE(p_customer_id ~ '^[+0-9() .-]+$', false) AND length(regexp_replace(COALESCE(p_customer_id, ''), '[^0-9]', '', 'g')) >= 7;
  v_local_contact_phone text;
  v_phone_without_ninth text;
  v_contact_phone_candidates text[] := ARRAY[]::text[];
  v_status text := nullif(lower(btrim(COALESCE(p_status, ''))), '');
  v_search text := nullif(btrim(COALESCE(p_search, '')), '');
  v_search_pattern text;
  v_page integer := greatest(COALESCE(p_page, 1), 1);
  v_page_size integer := greatest(1, least(COALESCE(p_page_size, 20), 50));
  v_offset bigint;
  v_total bigint := 0;
  v_records jsonb := '[]'::jsonb;
  v_can_view_schedule boolean := private.customer_support_profile_has_permission(
    auth.uid(), 'viewDeliverySchedule', ARRAY['manager', 'seller', 'deliverer']::text[]
  );
  v_can_view_assembly boolean := private.customer_support_profile_has_permission(
    auth.uid(), 'viewAssemblyList', ARRAY['manager', 'seller', 'deliverer']::text[]
  );
BEGIN
  IF NOT public.customer_support_can_view()
    OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  IF p_customer_id IS NULL OR btrim(p_customer_id) = '' THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_CUSTOMER_RECORDS_INVALID' USING ERRCODE = '22023';
  END IF;

  -- p_customer_id mantém o nome legado do RPC: telefone para clientes novos e ID de cliente para bundles antigos.
  v_local_contact_phone := v_contact_phone_digits;
  IF length(v_local_contact_phone) IN (12, 13) AND left(v_local_contact_phone, 2) = '55' THEN
    v_local_contact_phone := substring(v_local_contact_phone from 3);
  END IF;
  v_local_contact_phone := regexp_replace(v_local_contact_phone, '^0+', '');

  IF v_contact_phone_digits <> '' THEN
    v_contact_phone_candidates := array_append(v_contact_phone_candidates, v_contact_phone_digits);
  END IF;
  IF v_local_contact_phone <> '' THEN
    v_contact_phone_candidates := array_append(v_contact_phone_candidates, v_local_contact_phone);
  END IF;
  IF length(v_local_contact_phone) IN (10, 11) THEN
    v_contact_phone_candidates := array_append(v_contact_phone_candidates, '55' || v_local_contact_phone);
    IF length(v_local_contact_phone) = 11 AND substring(v_local_contact_phone from 3 for 1) = '9' THEN
      v_phone_without_ninth := left(v_local_contact_phone, 2) || substring(v_local_contact_phone from 4);
    ELSIF length(v_local_contact_phone) = 10 THEN
      v_phone_without_ninth := left(v_local_contact_phone, 2) || '9' || substring(v_local_contact_phone from 3);
    END IF;
    IF v_phone_without_ninth IS NOT NULL THEN
      v_contact_phone_candidates := array_append(v_contact_phone_candidates, v_phone_without_ninth);
      v_contact_phone_candidates := array_append(v_contact_phone_candidates, '55' || v_phone_without_ninth);
    END IF;
  END IF;

  IF v_order_group NOT IN ('sales', 'budgets', 'delivery', 'assistance', 'returns') THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_CUSTOMER_RECORDS_INVALID' USING ERRCODE = '22023';
  END IF;
  IF length(COALESCE(v_search, '')) > 100 OR length(COALESCE(v_status, '')) > 80 THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_CUSTOMER_RECORDS_FILTER_INVALID' USING ERRCODE = '22023';
  END IF;

  IF (v_order_group = 'sales' AND NOT private.customer_support_profile_has_permission(
        auth.uid(), 'viewOrders', ARRAY['manager']::text[]
      ))
    OR (v_order_group = 'budgets' AND NOT private.customer_support_profile_has_permission(
        auth.uid(), 'viewBudgets', ARRAY['manager']::text[]
      ))
    OR (v_order_group = 'assistance' AND NOT private.customer_support_profile_has_permission(
        auth.uid(), 'viewAssistanceOrders', ARRAY['manager']::text[]
      ))
    OR (v_order_group = 'returns' AND NOT private.customer_support_profile_has_permission(
        auth.uid(), 'viewReturns', ARRAY['manager']::text[]
      ))
    OR (v_order_group = 'delivery' AND NOT (v_can_view_schedule OR v_can_view_assembly)) THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_RECORD_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_offset := (v_page::bigint - 1) * v_page_size;
  IF v_search IS NOT NULL THEN
    v_search_pattern := '%' || replace(replace(replace(v_search, '!', '!!'), '%', '!%'), '_', '!_') || '%';
  END IF;

  SELECT count(*)
  INTO v_total
  FROM public.orders AS order_row
  WHERE (
      (v_use_contact_phone AND regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g') = ANY(v_contact_phone_candidates))
      OR (NOT v_use_contact_phone AND order_row.customer_id = p_customer_id)
    )
    AND (order_row.deleted IS NULL OR order_row.deleted = false)
    AND (
      (v_order_group = 'sales' AND lower(COALESCE(
        nullif(btrim(order_row.order_type), ''),
        nullif(btrim(order_row.order_data ->> 'orderType'), ''),
        nullif(btrim(order_row.order_data ->> 'order_type'), ''),
        'sale'
      )) IN ('sale', 'showroom'))
      OR (v_order_group = 'budgets' AND lower(COALESCE(
        nullif(btrim(order_row.order_type), ''),
        nullif(btrim(order_row.order_data ->> 'orderType'), ''),
        nullif(btrim(order_row.order_data ->> 'order_type'), ''),
        ''
      )) = 'budget')
      OR (v_order_group = 'assistance' AND lower(COALESCE(
        nullif(btrim(order_row.order_type), ''),
        nullif(btrim(order_row.order_data ->> 'orderType'), ''),
        nullif(btrim(order_row.order_data ->> 'order_type'), ''),
        'sale'
      )) = 'assistance')
      OR (v_order_group = 'returns' AND lower(COALESCE(
        nullif(btrim(order_row.order_type), ''),
        nullif(btrim(order_row.order_data ->> 'orderType'), ''),
        nullif(btrim(order_row.order_data ->> 'order_type'), ''),
        'sale'
      )) = 'return')
      OR (v_order_group = 'delivery'
        AND lower(COALESCE(
          nullif(btrim(order_row.order_type), ''),
          nullif(btrim(order_row.order_data ->> 'orderType'), ''),
          nullif(btrim(order_row.order_data ->> 'order_type'), ''),
          'sale'
        )) IN ('sale', 'showroom', 'assistance')
        AND (
          (v_can_view_schedule AND (
            order_row.scheduled_date IS NOT NULL
            OR order_row.scheduled_start_time IS NOT NULL
            OR order_row.scheduled_end_time IS NOT NULL
            OR order_row.delivery_status IS NOT NULL
            OR order_row.order_data #>> '{shipping,scheduling,pendingScheduling}' = 'true'
          ))
          OR (v_can_view_assembly AND EXISTS (
            SELECT 1 FROM public.assemblies AS assembly
            WHERE assembly.order_id = order_row.id
          ))
        ))
    )
    AND (v_status IS NULL OR CASE lower(COALESCE(
      CASE WHEN v_order_group = 'delivery'
        THEN nullif(order_row.delivery_status, '')
        ELSE null
      END,
      order_row.status
    ))
      WHEN 'draft' THEN 'draft'
      WHEN 'rascunho' THEN 'draft'
      WHEN 'quoted' THEN 'quoted'
      WHEN 'orçamento cadastrado' THEN 'quoted'
      WHEN 'orcamento cadastrado' THEN 'quoted'
      WHEN 'aguardando aprovação' THEN 'quoted'
      WHEN 'aguardando aprovacao' THEN 'quoted'
      WHEN 'approved' THEN 'approved'
      WHEN 'aprovado' THEN 'approved'
      WHEN 'accepted' THEN 'approved'
      WHEN 'aceito' THEN 'approved'
      WHEN 'expired' THEN 'expired'
      WHEN 'vencido' THEN 'expired'
      WHEN 'scheduled' THEN 'scheduled'
      WHEN 'agendado' THEN 'scheduled'
      WHEN 'in transit' THEN 'in_transit'
      WHEN 'in_transit' THEN 'in_transit'
      WHEN 'em rota' THEN 'in_transit'
      WHEN 'arrived' THEN 'arrived'
      WHEN 'no local' THEN 'arrived'
      WHEN 'fulfilled' THEN 'fulfilled'
      WHEN 'completed' THEN 'fulfilled'
      WHEN 'delivered' THEN 'fulfilled'
      WHEN 'entregue' THEN 'fulfilled'
      WHEN 'atendido' THEN 'fulfilled'
      WHEN 'concluído' THEN 'fulfilled'
      WHEN 'concluido' THEN 'fulfilled'
      WHEN 'retirado' THEN 'fulfilled'
      WHEN 'canceled' THEN 'cancelled'
      WHEN 'cancelled' THEN 'cancelled'
      WHEN 'cancelado' THEN 'cancelled'
      ELSE lower(COALESCE(order_row.status, ''))
    END = v_status)
    AND (
      v_search_pattern IS NULL
      OR COALESCE(order_row.order_number, '') ILIKE v_search_pattern ESCAPE '!'
      OR order_row.id ILIKE v_search_pattern ESCAPE '!'
      OR COALESCE(order_row.status, '') ILIKE v_search_pattern ESCAPE '!'
      OR COALESCE(order_row.items, '[]'::jsonb)::text ILIKE v_search_pattern ESCAPE '!'
      OR COALESCE(order_row.order_data -> 'assistanceItems', order_row.order_data -> 'assistance_items', '[]'::jsonb)::text ILIKE v_search_pattern ESCAPE '!'
      OR (v_order_group = 'delivery' AND v_can_view_assembly AND EXISTS (
        SELECT 1 FROM public.assemblies AS assembly
        WHERE assembly.order_id = order_row.id AND assembly.item ILIKE v_search_pattern ESCAPE '!'
      ))
    );

  SELECT COALESCE(jsonb_agg(page_row.record ORDER BY
    page_row.budget_priority,
    page_row.upcoming_schedule ASC NULLS LAST,
    page_row.created_at DESC,
    page_row.id ASC
  ), '[]'::jsonb)
  INTO v_records
  FROM (
    SELECT
      order_row.id,
      order_row.created_at,
      CASE WHEN v_order_group = 'budgets' AND lower(order_row.status) IN ('quoted', 'orçamento cadastrado', 'orcamento cadastrado', 'aguardando aprovação', 'aguardando aprovacao') THEN 0 ELSE 1 END AS budget_priority,
      CASE WHEN v_order_group = 'delivery' AND order_row.scheduled_date >= CURRENT_DATE THEN order_row.scheduled_date ELSE NULL END AS upcoming_schedule,
      jsonb_build_object(
        'id', order_row.id,
        'order_number', order_row.order_number,
        'order_type', COALESCE(
          nullif(btrim(order_row.order_type), ''),
          nullif(btrim(order_row.order_data ->> 'orderType'), ''),
          nullif(btrim(order_row.order_data ->> 'order_type'), ''),
          'sale'
        ),
        'status', order_row.status,
        'total_amount', order_row.total_amount,
        'payment_method', order_row.payment_method,
        'delivery_status', CASE WHEN v_can_view_schedule THEN order_row.delivery_status ELSE NULL END,
        'scheduled_date', CASE WHEN v_can_view_schedule THEN order_row.scheduled_date ELSE NULL END,
        'scheduled_start_time', CASE WHEN v_can_view_schedule THEN order_row.scheduled_start_time ELSE NULL END,
        'scheduled_end_time', CASE WHEN v_can_view_schedule THEN order_row.scheduled_end_time ELSE NULL END,
        'delivery_method', CASE WHEN v_can_view_schedule THEN order_row.delivery_method ELSE NULL END,
        'delivery_finished_at', order_row.delivery_finished_at,
        'items', COALESCE(order_row.items, '[]'::jsonb),
        'assistance_items', COALESCE(order_row.order_data -> 'assistanceItems', order_row.order_data -> 'assistance_items', '[]'::jsonb),
        'assistance_description', COALESCE(order_row.order_data ->> 'assistanceDescription', order_row.order_data ->> 'assistance_description'),
        'assembly_records', CASE WHEN v_can_view_assembly THEN COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'item', assembly.item,
            'date', assembly.date,
            'time', assembly.time,
            'type', assembly.type,
            'status', assembly.status
          ) ORDER BY assembly.date, assembly.time, assembly.id)
          FROM public.assemblies AS assembly
          WHERE assembly.order_id = order_row.id
        ), '[]'::jsonb) ELSE '[]'::jsonb END,
        'created_at', order_row.created_at
      ) AS record
    FROM public.orders AS order_row
    WHERE (
      (v_use_contact_phone AND regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g') = ANY(v_contact_phone_candidates))
      OR (NOT v_use_contact_phone AND order_row.customer_id = p_customer_id)
    )
      AND (order_row.deleted IS NULL OR order_row.deleted = false)
      AND (
        (v_order_group = 'sales' AND lower(COALESCE(
          nullif(btrim(order_row.order_type), ''),
          nullif(btrim(order_row.order_data ->> 'orderType'), ''),
          nullif(btrim(order_row.order_data ->> 'order_type'), ''),
          'sale'
        )) IN ('sale', 'showroom'))
        OR (v_order_group = 'budgets' AND lower(COALESCE(
          nullif(btrim(order_row.order_type), ''),
          nullif(btrim(order_row.order_data ->> 'orderType'), ''),
          nullif(btrim(order_row.order_data ->> 'order_type'), ''),
          ''
        )) = 'budget')
        OR (v_order_group = 'assistance' AND lower(COALESCE(
          nullif(btrim(order_row.order_type), ''),
          nullif(btrim(order_row.order_data ->> 'orderType'), ''),
          nullif(btrim(order_row.order_data ->> 'order_type'), ''),
          'sale'
        )) = 'assistance')
        OR (v_order_group = 'returns' AND lower(COALESCE(
          nullif(btrim(order_row.order_type), ''),
          nullif(btrim(order_row.order_data ->> 'orderType'), ''),
          nullif(btrim(order_row.order_data ->> 'order_type'), ''),
          'sale'
        )) = 'return')
        OR (v_order_group = 'delivery'
          AND lower(COALESCE(
            nullif(btrim(order_row.order_type), ''),
            nullif(btrim(order_row.order_data ->> 'orderType'), ''),
            nullif(btrim(order_row.order_data ->> 'order_type'), ''),
            'sale'
          )) IN ('sale', 'showroom', 'assistance')
          AND (
            (v_can_view_schedule AND (
              order_row.scheduled_date IS NOT NULL
              OR order_row.scheduled_start_time IS NOT NULL
              OR order_row.scheduled_end_time IS NOT NULL
              OR order_row.delivery_status IS NOT NULL
              OR order_row.order_data #>> '{shipping,scheduling,pendingScheduling}' = 'true'
            ))
            OR (v_can_view_assembly AND EXISTS (
              SELECT 1 FROM public.assemblies AS assembly
              WHERE assembly.order_id = order_row.id
            ))
          ))
      )
      AND (v_status IS NULL OR CASE lower(COALESCE(
        CASE WHEN v_order_group = 'delivery'
          THEN nullif(order_row.delivery_status, '')
          ELSE null
        END,
        order_row.status
      ))
        WHEN 'draft' THEN 'draft'
        WHEN 'rascunho' THEN 'draft'
        WHEN 'quoted' THEN 'quoted'
        WHEN 'orçamento cadastrado' THEN 'quoted'
        WHEN 'orcamento cadastrado' THEN 'quoted'
        WHEN 'aguardando aprovação' THEN 'quoted'
        WHEN 'aguardando aprovacao' THEN 'quoted'
        WHEN 'approved' THEN 'approved'
        WHEN 'aprovado' THEN 'approved'
        WHEN 'accepted' THEN 'approved'
        WHEN 'aceito' THEN 'approved'
        WHEN 'expired' THEN 'expired'
        WHEN 'vencido' THEN 'expired'
        WHEN 'scheduled' THEN 'scheduled'
        WHEN 'agendado' THEN 'scheduled'
        WHEN 'in transit' THEN 'in_transit'
        WHEN 'in_transit' THEN 'in_transit'
        WHEN 'em rota' THEN 'in_transit'
        WHEN 'arrived' THEN 'arrived'
        WHEN 'no local' THEN 'arrived'
        WHEN 'fulfilled' THEN 'fulfilled'
        WHEN 'completed' THEN 'fulfilled'
        WHEN 'delivered' THEN 'fulfilled'
        WHEN 'entregue' THEN 'fulfilled'
        WHEN 'atendido' THEN 'fulfilled'
        WHEN 'concluído' THEN 'fulfilled'
        WHEN 'concluido' THEN 'fulfilled'
        WHEN 'retirado' THEN 'fulfilled'
        WHEN 'canceled' THEN 'cancelled'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'cancelado' THEN 'cancelled'
        ELSE lower(COALESCE(order_row.status, ''))
      END = v_status)
      AND (
        v_search_pattern IS NULL
        OR COALESCE(order_row.order_number, '') ILIKE v_search_pattern ESCAPE '!'
        OR order_row.id ILIKE v_search_pattern ESCAPE '!'
        OR COALESCE(order_row.status, '') ILIKE v_search_pattern ESCAPE '!'
        OR COALESCE(order_row.items, '[]'::jsonb)::text ILIKE v_search_pattern ESCAPE '!'
        OR COALESCE(order_row.order_data -> 'assistanceItems', order_row.order_data -> 'assistance_items', '[]'::jsonb)::text ILIKE v_search_pattern ESCAPE '!'
        OR (v_order_group = 'delivery' AND v_can_view_assembly AND EXISTS (
          SELECT 1 FROM public.assemblies AS assembly
          WHERE assembly.order_id = order_row.id AND assembly.item ILIKE v_search_pattern ESCAPE '!'
        ))
      )
    ORDER BY
      CASE WHEN v_order_group = 'budgets' AND lower(order_row.status) IN ('quoted', 'orçamento cadastrado', 'orcamento cadastrado', 'aguardando aprovação', 'aguardando aprovacao') THEN 0 ELSE 1 END,
      CASE WHEN v_order_group = 'delivery' AND order_row.scheduled_date >= CURRENT_DATE THEN order_row.scheduled_date ELSE NULL END ASC NULLS LAST,
      order_row.created_at DESC,
      order_row.id ASC
    LIMIT v_page_size
    OFFSET v_offset
  ) AS page_row;

  RETURN jsonb_build_object(
    'records', v_records,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_list_customer_records_page(text, text, integer, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_list_customer_records_page(text, text, integer, integer, text, text) TO authenticated;
