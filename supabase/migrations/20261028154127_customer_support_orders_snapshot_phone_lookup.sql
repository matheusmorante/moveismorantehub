BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.customer_support_can_view()') IS NULL
    OR to_regprocedure('public.customer_support_can_view_commercial_info()') IS NULL
    OR to_regclass('public.whatsapp_conversations') IS NULL
    OR to_regclass('public.orders') IS NULL THEN
    RAISE EXCEPTION 'Install Central de Atendimento tables and permission helpers first.';
  END IF;
END;
$preflight$;

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
      (v_use_contact_phone AND (
        regexp_replace(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), '^0+', '') = ANY(v_contact_phone_candidates)
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(order_row.order_data #> '{customerData,additionalContacts}') = 'array'
              THEN order_row.order_data #> '{customerData,additionalContacts}'
              ELSE '[]'::jsonb
            END
          ) AS ac
          WHERE regexp_replace(regexp_replace(COALESCE(ac ->> 'phone', ''), '[^0-9]', '', 'g'), '^0+', '') = ANY(v_contact_phone_candidates)
        )
        OR (order_row.customer_id IS NOT NULL AND order_row.customer_id IN (
          SELECT c.customer_id FROM public.whatsapp_conversations c
          WHERE (c.contact_phone = ANY(v_contact_phone_candidates) OR c.contact_wa_id = ANY(v_contact_phone_candidates))
            AND c.customer_id IS NOT NULL
        ))
      ))
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
        'created_at', order_row.created_at,
        'customer_name', COALESCE(nullif(btrim(order_row.customer_name), ''), nullif(btrim(order_row.order_data #>> '{customerData,fullName}'), ''))
      ) AS record
    FROM public.orders AS order_row
    WHERE (
      (v_use_contact_phone AND (
        regexp_replace(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), '^0+', '') = ANY(v_contact_phone_candidates)
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(order_row.order_data #> '{customerData,additionalContacts}') = 'array'
              THEN order_row.order_data #> '{customerData,additionalContacts}'
              ELSE '[]'::jsonb
            END
          ) AS ac
          WHERE regexp_replace(regexp_replace(COALESCE(ac ->> 'phone', ''), '[^0-9]', '', 'g'), '^0+', '') = ANY(v_contact_phone_candidates)
        )
        OR (order_row.customer_id IS NOT NULL AND order_row.customer_id IN (
          SELECT c.customer_id FROM public.whatsapp_conversations c
          WHERE (c.contact_phone = ANY(v_contact_phone_candidates) OR c.contact_wa_id = ANY(v_contact_phone_candidates))
            AND c.customer_id IS NOT NULL
        ))
      ))
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
          AND right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(input_targets.target_key, '[^0-9]', '', 'g'), 8)
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

CREATE OR REPLACE FUNCTION public.customer_support_list_conversations(
  p_filter text DEFAULT 'all'::text,
  p_search text DEFAULT ''::text,
  p_agent_id uuid DEFAULT NULL::uuid,
  p_criteria jsonb DEFAULT '{}'::jsonb,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50,
  p_sort_order text DEFAULT 'newest'::text
)
RETURNS TABLE(
  id uuid,
  business_phone_number_id text,
  contact_phone text,
  contact_wa_id text,
  contact_name text,
  customer_id text,
  customer_link_status text,
  last_message_text text,
  last_message_at timestamp with time zone,
  last_customer_message_at timestamp with time zone,
  unread_count integer,
  is_archived boolean,
  internal_notes text,
  tags text[],
  assigned_to uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  assigned_profile_name text,
  assigned_profile_role text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '10s'
AS $function$
DECLARE
  v_criteria jsonb := CASE WHEN jsonb_typeof(p_criteria) = 'object' THEN p_criteria ELSE '{}'::jsonb END;
  v_folder_status text;
  v_folder_assignee text;
  v_folder_link text;
  v_folder_orders text;
  v_folder_search text;
  v_folder_phone_digits text;
  v_filter text := COALESCE(NULLIF(p_filter, ''), 'all');
  v_search text := btrim(COALESCE(p_search, ''));
  v_phone_digits text;
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 100);
  v_sort_order text := CASE WHEN p_sort_order IN ('newest', 'oldest', 'unread') THEN p_sort_order ELSE 'newest' END;
  v_needs_orders boolean := false;
BEGIN
  IF NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF v_filter IN ('with_orders', 'without_orders')
    OR (v_criteria ->> 'orders') IN ('with_orders', 'without_orders') THEN
    v_needs_orders := true;
  END IF;
  IF v_needs_orders AND NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_folder_status := NULLIF(v_criteria ->> 'status', 'all');
  v_folder_assignee := NULLIF(v_criteria ->> 'assigneeId', 'all');
  v_folder_link := NULLIF(v_criteria ->> 'customerLink', 'all');
  v_folder_orders := NULLIF(v_criteria ->> 'orders', 'all');
  v_folder_search := btrim(COALESCE(v_criteria ->> 'search', ''));
  v_folder_phone_digits := CASE WHEN v_folder_search ~ '^[+0-9[:space:]().-]+$' THEN regexp_replace(v_folder_search, '[^0-9]', '', 'g') ELSE '' END;
  v_phone_digits := CASE WHEN v_search ~ '^[+0-9[:space:]().-]+$' THEN regexp_replace(v_search, '[^0-9]', '', 'g') ELSE '' END;

  RETURN QUERY
  WITH filtered AS (
    SELECT conversation.*,
      count(*) OVER () AS matched_count
    FROM public.whatsapp_conversations AS conversation
    WHERE
      CASE
        WHEN v_criteria <> '{}'::jsonb THEN true
        WHEN v_filter = 'archived' THEN conversation.is_archived
        WHEN v_filter = 'closed' THEN conversation.is_archived OR conversation.tags @> ARRAY['status:closed']::text[]
        ELSE NOT conversation.is_archived AND NOT (conversation.tags @> ARRAY['status:closed']::text[])
      END
      AND (v_filter <> 'mine' OR conversation.assigned_to = auth.uid())
      AND (v_filter <> 'unassigned' OR conversation.assigned_to IS NULL)
      AND (v_filter <> 'unread' OR conversation.unread_count > 0)
      AND (v_filter <> 'linked' OR conversation.customer_id IS NOT NULL)
      AND (v_filter <> 'unlinked' OR conversation.customer_id IS NULL)
      AND (v_filter <> 'snoozed' OR (NOT conversation.is_archived AND conversation.tags @> ARRAY['status:snoozed']::text[]))
      AND (v_filter <> 'with_orders' OR EXISTS (
        SELECT 1 FROM public.orders AS order_row
        WHERE (order_row.deleted IS NULL OR order_row.deleted = false)
          AND (
            (conversation.customer_id IS NOT NULL AND order_row.customer_id = conversation.customer_id)
            OR (
              length(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g')) >= 8
              AND right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g'), 8)
            )
          )
      ))
      AND (v_filter <> 'without_orders' OR NOT EXISTS (
        SELECT 1 FROM public.orders AS order_row
        WHERE (order_row.deleted IS NULL OR order_row.deleted = false)
          AND (
            (conversation.customer_id IS NOT NULL AND order_row.customer_id = conversation.customer_id)
            OR (
              length(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g')) >= 8
              AND right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g'), 8)
            )
          )
      ))
      AND (p_agent_id IS NULL OR conversation.assigned_to = p_agent_id)
      AND (v_folder_status IS NULL OR CASE v_folder_status
        WHEN 'open' THEN NOT conversation.is_archived
          AND NOT (conversation.tags @> ARRAY['status:closed']::text[])
          AND NOT (conversation.tags @> ARRAY['status:snoozed']::text[])
        WHEN 'closed' THEN conversation.is_archived OR conversation.tags @> ARRAY['status:closed']::text[]
        WHEN 'snoozed' THEN NOT conversation.is_archived AND conversation.tags @> ARRAY['status:snoozed']::text[]
        ELSE true END)
      AND (v_folder_assignee IS NULL OR CASE
        WHEN v_folder_assignee = 'unassigned' THEN conversation.assigned_to IS NULL
        WHEN v_folder_assignee = 'mine' THEN conversation.assigned_to = auth.uid()
        ELSE conversation.assigned_to::text = v_folder_assignee END)
      AND (COALESCE((v_criteria ->> 'unread')::boolean, false) = false OR conversation.unread_count > 0)
      AND (v_folder_link IS NULL OR CASE v_folder_link
        WHEN 'linked' THEN conversation.customer_id IS NOT NULL
        WHEN 'unlinked' THEN conversation.customer_id IS NULL
        ELSE true END)
      AND (v_folder_orders IS NULL OR CASE v_folder_orders
        WHEN 'with_orders' THEN EXISTS (
          SELECT 1 FROM public.orders AS order_row
          WHERE (order_row.deleted IS NULL OR order_row.deleted = false)
            AND (
              (conversation.customer_id IS NOT NULL AND order_row.customer_id = conversation.customer_id)
              OR (
                length(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g')) >= 8
                AND right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g'), 8)
              )
            )
        )
        WHEN 'without_orders' THEN NOT EXISTS (
          SELECT 1 FROM public.orders AS order_row
          WHERE (order_row.deleted IS NULL OR order_row.deleted = false)
            AND (
              (conversation.customer_id IS NOT NULL AND order_row.customer_id = conversation.customer_id)
              OR (
                length(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g')) >= 8
                AND right(regexp_replace(COALESCE(order_row.order_data #>> '{customerData,phone}', ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(COALESCE(conversation.contact_phone, ''), '[^0-9]', '', 'g'), 8)
              )
            )
        )
        ELSE true END)
      AND (v_search = '' OR conversation.contact_name ILIKE '%' || v_search || '%'
        OR conversation.last_message_text ILIKE '%' || v_search || '%'
        OR (length(v_phone_digits) >= 3 AND (
          conversation.contact_phone ILIKE '%' || v_phone_digits || '%'
          OR conversation.contact_wa_id ILIKE '%' || v_phone_digits || '%'
        )))
      AND (v_folder_search = '' OR conversation.contact_name ILIKE '%' || v_folder_search || '%'
        OR conversation.last_message_text ILIKE '%' || v_folder_search || '%'
        OR (length(v_folder_phone_digits) >= 3 AND (
          conversation.contact_phone ILIKE '%' || v_folder_phone_digits || '%'
          OR conversation.contact_wa_id ILIKE '%' || v_folder_phone_digits || '%'
        )))
  )
  SELECT filtered.id, filtered.business_phone_number_id, filtered.contact_phone,
    filtered.contact_wa_id, filtered.contact_name, filtered.customer_id,
    filtered.customer_link_status, filtered.last_message_text, filtered.last_message_at,
    filtered.last_customer_message_at, filtered.unread_count, filtered.is_archived,
    filtered.internal_notes, filtered.tags, filtered.assigned_to, filtered.created_at,
    filtered.updated_at, profile.full_name, profile.role, filtered.matched_count
  FROM filtered
  LEFT JOIN public.profiles AS profile ON profile.id = filtered.assigned_to
  ORDER BY
    CASE WHEN v_sort_order = 'unread' THEN (filtered.unread_count > 0)::integer ELSE 0 END DESC,
    CASE WHEN v_sort_order = 'oldest' THEN filtered.last_message_at END ASC NULLS LAST,
    CASE WHEN v_sort_order <> 'oldest' THEN filtered.last_message_at END DESC NULLS LAST,
    filtered.created_at DESC,
    filtered.id
  LIMIT v_page_size OFFSET (v_page - 1) * v_page_size;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_list_conversations(text, text, uuid, jsonb, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_list_conversations(text, text, uuid, jsonb, integer, integer, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
