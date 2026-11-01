-- Accent-insensitive search for customer support and fiscal document lists.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

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
    v_search_pattern := public.immutable_unaccent('%' || replace(replace(replace(v_search, '!', '!!'), '%', '!%'), '_', '!_') || '%');
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
      OR public.immutable_unaccent(COALESCE(order_row.status, '')) ILIKE v_search_pattern ESCAPE '!'
      OR public.immutable_unaccent(COALESCE(order_row.items, '[]'::jsonb)::text) ILIKE v_search_pattern ESCAPE '!'
      OR public.immutable_unaccent(COALESCE(order_row.order_data -> 'assistanceItems', order_row.order_data -> 'assistance_items', '[]'::jsonb)::text) ILIKE v_search_pattern ESCAPE '!'
      OR (v_order_group = 'delivery' AND v_can_view_assembly AND EXISTS (
        SELECT 1 FROM public.assemblies AS assembly
        WHERE assembly.order_id = order_row.id AND public.immutable_unaccent(assembly.item) ILIKE v_search_pattern ESCAPE '!'
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
        OR public.immutable_unaccent(COALESCE(order_row.status, '')) ILIKE v_search_pattern ESCAPE '!'
        OR public.immutable_unaccent(COALESCE(order_row.items, '[]'::jsonb)::text) ILIKE v_search_pattern ESCAPE '!'
        OR public.immutable_unaccent(COALESCE(order_row.order_data -> 'assistanceItems', order_row.order_data -> 'assistance_items', '[]'::jsonb)::text) ILIKE v_search_pattern ESCAPE '!'
        OR (v_order_group = 'delivery' AND v_can_view_assembly AND EXISTS (
          SELECT 1 FROM public.assemblies AS assembly
          WHERE assembly.order_id = order_row.id AND public.immutable_unaccent(assembly.item) ILIKE v_search_pattern ESCAPE '!'
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

CREATE OR REPLACE FUNCTION public.customer_support_catalog_page(
  p_category_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
  p_excluded_product_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_include_product_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_include_only boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public, pg_temp
AS $function$
  WITH RECURSIVE
  params AS (
    SELECT
      p_category_id AS category_id,
      NULLIF(btrim(p_search), '') AS search,
      NULLIF(btrim(p_brand), '') AS brand,
      least(greatest(coalesce(p_page, 1), 1), 100000)::bigint AS page,
      least(greatest(coalesce(p_page_size, 20), 1), 50)::bigint AS page_size,
      coalesce(p_excluded_product_ids, ARRAY[]::uuid[]) AS excluded_product_ids,
      coalesce(p_include_product_ids, ARRAY[]::uuid[]) AS include_product_ids,
      coalesce(p_include_only, false) AS include_only
  ),
  category_edges AS (
    SELECT parent_id, child_id FROM public.category_relationships
    UNION
    SELECT parent_id, id FROM public.categories WHERE parent_id IS NOT NULL
  ),
  category_tree(id, name) AS (
    SELECT category.id, category.name
    FROM public.categories AS category
    CROSS JOIN params
    WHERE category.id = params.category_id AND category.type = 'category'

    UNION

    SELECT child.id, child.name
    FROM category_edges AS edge
    JOIN category_tree AS parent ON parent.id = edge.parent_id
    JOIN public.categories AS child ON child.id = edge.child_id AND child.type = 'category'
  ),
  matched AS (
    SELECT product.id, product.marketplace_title AS title, product.name
    FROM public.products AS product
    CROSS JOIN params
    WHERE product.active IS TRUE
      AND product.status = 'published'
      AND coalesce(product.is_draft, false) IS FALSE
      AND coalesce(product.deleted, false) IS FALSE
      AND product.deleted_at IS NULL
      AND product.item_type IS DISTINCT FROM 'service'
      AND coalesce(lower(product.technical_specs ->> 'is_test'), 'false') <> 'true'
      AND coalesce(lower(product.technical_specs ->> 'isTest'), 'false') <> 'true'
      AND coalesce(lower(product.technical_specs #>> '{testArtifact,is_test}'), 'false') <> 'true'
      AND coalesce(lower(product.technical_specs #>> '{testArtifact,isTest}'), 'false') <> 'true'
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.product_variations AS any_variation
          WHERE any_variation.product_id = product.id
        )
        OR EXISTS (
          SELECT 1 FROM public.product_variations AS public_variation
          WHERE public_variation.product_id = product.id
            AND public_variation.active IS TRUE
            AND coalesce(public_variation.status, product.status, 'hidden') = 'published'
        )
      )
      AND (
        (
          NOT params.include_only
          AND (
          (params.brand IS NULL OR product.brand = params.brand)
          AND (
            params.search IS NULL
            OR public.immutable_unaccent(product.name) ILIKE '%' || public.immutable_unaccent(params.search) || '%'
            OR public.immutable_unaccent(coalesce(product.marketplace_title, '')) ILIKE '%' || public.immutable_unaccent(params.search) || '%'
            OR coalesce(product.code, '') ILIKE '%' || params.search || '%'
            OR EXISTS (
              SELECT 1
              FROM public.product_variations AS matching_variation
              WHERE matching_variation.product_id = product.id
                AND matching_variation.active IS TRUE
                AND coalesce(matching_variation.status, product.status, 'hidden') = 'published'
                AND (
                  public.immutable_unaccent(coalesce(matching_variation.name, '')) ILIKE '%' || public.immutable_unaccent(params.search) || '%'
                  OR coalesce(matching_variation.sku, '') ILIKE '%' || params.search || '%'
                )
            )
          )
          AND (
            params.category_id IS NULL
            OR EXISTS (
              SELECT 1 FROM category_tree AS tree
              WHERE tree.id = product.category_id OR tree.name = product.category
            )
            OR EXISTS (
              SELECT 1
              FROM public.product_categories AS product_category
              JOIN category_tree AS tree ON tree.id = product_category.category_id
              WHERE product_category.product_id = product.id
            )
          )
            AND NOT (product.id = ANY(params.excluded_product_ids))
          )
        )
        OR product.id = ANY(params.include_product_ids)
      )
  ),
  page_ids AS (
    SELECT matched.id
    FROM matched
    CROSS JOIN params
    ORDER BY (matched.id = ANY(params.include_product_ids)) DESC,
      matched.title NULLS LAST, matched.name, matched.id
    OFFSET ((SELECT page FROM params) - 1) * (SELECT page_size FROM params)
    LIMIT (SELECT page_size FROM params)
  ),
  page_rows AS (
    SELECT
      product.id,
      product.name,
      product.marketplace_title AS title,
      product.code AS sku,
      product.slug,
      product.brand,
      coalesce(nullif(product.category, ''), primary_category.name, '') AS category,
      coalesce(product.unit_price, product.price, 0) AS price,
      product.promo_price,
      coalesce(
        (SELECT image.image_url
         FROM public.product_images AS image
         WHERE image.product_id = product.id
         ORDER BY image.is_main DESC NULLS LAST, image.created_at ASC NULLS LAST
         LIMIT 1),
        CASE
          WHEN jsonb_typeof(product.images -> 0) = 'string' THEN product.images ->> 0
          WHEN jsonb_typeof(product.images -> 0) = 'object' THEN product.images -> 0 ->> 'url'
          ELSE NULL
        END,
        ''
      ) AS image_url,
      variation_data.public_variation_count > 1 AS has_variations,
      variation_data.public_variations AS variations
    FROM page_ids
    JOIN public.products AS product ON product.id = page_ids.id
    LEFT JOIN public.categories AS primary_category ON primary_category.id = product.category_id
    CROSS JOIN LATERAL (
      SELECT
        count(*)::integer AS public_variation_count,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', variation.id,
              'name', variation.name,
              'sku', variation.sku,
              'price', CASE
                WHEN coalesce(variation.use_parent_price, true)
                  THEN coalesce(product.unit_price, product.price, 0)
                ELSE coalesce(variation.price, 0)
              END,
              'promoPrice', CASE
                WHEN coalesce(variation.use_parent_promo_price, true)
                  THEN coalesce(product.promo_price, 0)
                ELSE coalesce(variation.promo_price, 0)
              END,
              'imageUrl', variation.image_url,
              'attributes', variation.attributes
            ) ORDER BY variation.name, variation.id
          ),
          '[]'::jsonb
        ) AS public_variations
      FROM public.product_variations AS variation
      WHERE variation.product_id = product.id
        AND variation.active IS TRUE
        AND coalesce(variation.status, product.status, 'hidden') = 'published'
    ) AS variation_data
  ),
  product_json AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', page_rows.id,
          'name', page_rows.name,
          'title', page_rows.title,
          'sku', page_rows.sku,
          'slug', page_rows.slug,
          'brand', page_rows.brand,
          'category', page_rows.category,
          'price', page_rows.price,
          'promoPrice', page_rows.promo_price,
          'imageUrl', page_rows.image_url,
          'hasVariations', page_rows.has_variations,
          'variations', page_rows.variations
        ) ORDER BY (page_rows.id = ANY(params.include_product_ids)) DESC,
          page_rows.title NULLS LAST, page_rows.name, page_rows.id
      ),
      '[]'::jsonb
    ) AS products
    FROM page_rows
    CROSS JOIN params
  )
  SELECT jsonb_build_object(
    'page', (SELECT page FROM params),
    'pageSize', (SELECT page_size FROM params),
    'totalCount', (SELECT count(*) FROM matched),
    'categoryName', (
      SELECT category.name FROM public.categories AS category
      CROSS JOIN params
      WHERE category.id = params.category_id AND category.type = 'category'
    ),
    'products', product_json.products
  )
  FROM product_json;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_catalog_page(uuid, text, text, integer, integer, uuid[], uuid[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_support_catalog_page(uuid, text, text, integer, integer, uuid[], uuid[], boolean) TO anon, authenticated;

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
      AND (v_search = '' OR public.immutable_unaccent(conversation.contact_name) ILIKE '%' || public.immutable_unaccent(v_search) || '%'
        OR public.immutable_unaccent(conversation.last_message_text) ILIKE '%' || public.immutable_unaccent(v_search) || '%'
        OR (length(v_phone_digits) >= 3 AND (
          conversation.contact_phone ILIKE '%' || v_phone_digits || '%'
          OR conversation.contact_wa_id ILIKE '%' || v_phone_digits || '%'
        )))
      AND (v_folder_search = '' OR public.immutable_unaccent(conversation.contact_name) ILIKE '%' || public.immutable_unaccent(v_folder_search) || '%'
        OR public.immutable_unaccent(conversation.last_message_text) ILIKE '%' || public.immutable_unaccent(v_folder_search) || '%'
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

CREATE OR REPLACE FUNCTION public.get_fiscal_documents_summary(
  p_search text DEFAULT '',
  p_status text DEFAULT 'all',
  p_model text DEFAULT 'all',
  p_environment integer DEFAULT NULL,
  p_document_type text DEFAULT 'all',
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_target_document_id uuid DEFAULT NULL,
  p_accountant_view boolean DEFAULT false
)
RETURNS TABLE (
  total_count bigint,
  total_value numeric,
  authorized_count bigint,
  authorized_value numeric,
  canceled_count bigint,
  canceled_value numeric,
  estorno_count bigint,
  estorno_value numeric,
  pending_count bigint,
  pending_value numeric,
  rejected_count bigint,
  rejected_value numeric,
  abandoned_count bigint,
  abandoned_value numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '8s'
AS $function$
  WITH sanitized_input AS (
    SELECT
      nullif(btrim(coalesce(p_search, '')), '') IS NOT NULL AS search_requested,
      nullif(
        btrim(
          replace(
            regexp_replace(coalesce(p_search, ''), '[,%*()"]', ' ', 'g'),
            chr(92),
            ' '
          )
        ),
        ''
      ) AS search_text
  ),
  input AS (
    SELECT
      search_requested,
      search_text,
      regexp_replace(coalesce(search_text, ''), '^#', '') AS search_number,
      coalesce(
        nullif(ltrim(regexp_replace(coalesce(search_text, ''), '^#', ''), '0'), ''),
        '0'
      ) AS normalized_search_number
    FROM sanitized_input
  ),
  filtered_documents AS (
    SELECT d.status, d.document_type, d.valor_total
    FROM public.nfe_documents AS d
    CROSS JOIN input AS i
    WHERE (p_target_document_id IS NULL OR d.id = p_target_document_id)
      AND (
        p_target_document_id IS NOT NULL
        OR p_document_type = 'all' AND (
          d.document_type IN ('outbound', 'estorno') OR d.document_type IS NULL
        )
        OR p_document_type = 'outbound' AND (
          d.document_type = 'outbound' OR d.document_type IS NULL
        )
        OR p_document_type = 'estorno' AND d.document_type = 'estorno'
      )
      AND (
        p_status = 'all'
        OR p_accountant_view AND p_status = 'autorizada' AND (
          p_environment = 1 AND d.status = 'autorizada'
          OR p_environment = 2 AND d.status = 'homologada'
          OR p_environment IS NULL AND d.status IN ('autorizada', 'homologada')
        )
        OR d.status = p_status
      )
      AND (p_model = 'all' OR d.modelo = p_model)
      AND (p_environment IS NULL OR d.ambiente = p_environment)
      AND (
        p_target_document_id IS NOT NULL
        OR p_date_from IS NULL
        OR d.created_at >= (p_date_from::text || 'T00:00:00-03:00')::timestamptz
      )
      AND (
        p_target_document_id IS NOT NULL
        OR p_date_to IS NULL
        OR d.created_at < ((p_date_to + 1)::text || 'T00:00:00-03:00')::timestamptz
      )
      AND (
        NOT i.search_requested
        OR i.search_text IS NOT NULL AND (
          i.search_number ~ '^[0-9]{1,9}$'
          AND d.numero_nfe = CASE
            WHEN i.search_number ~ '^[0-9]{1,9}$' THEN i.search_number::integer
          END
          OR d.chave_acesso ILIKE '%' || i.search_text || '%'
          OR public.immutable_unaccent(d.destinatario_nome) ILIKE '%' || public.immutable_unaccent(i.search_text) || '%'
          OR d.destinatario_documento ILIKE '%' || i.search_text || '%'
          OR (
            i.search_number ~ '^[0-9]{1,12}$'
            AND EXISTS (
              SELECT 1
              FROM public.orders AS o
              WHERE o.id = d.order_id
                AND o.order_number::text = i.normalized_search_number
            )
          )
        )
      )
  )
  SELECT
    count(*)::bigint,
    coalesce(sum(valor_total), 0),
    count(*) FILTER (WHERE status IN ('autorizada', 'homologada'))::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status IN ('autorizada', 'homologada')), 0),
    count(*) FILTER (WHERE status = 'cancelada')::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status = 'cancelada'), 0),
    count(*) FILTER (WHERE document_type = 'estorno')::bigint,
    coalesce(sum(valor_total) FILTER (WHERE document_type = 'estorno'), 0),
    count(*) FILTER (WHERE status IN ('pendente', 'processando', 'transmitting', 'unknown', 'erro'))::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status IN ('pendente', 'processando', 'transmitting', 'unknown', 'erro')), 0),
    count(*) FILTER (WHERE status IN ('rejeitada', 'denegada'))::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status IN ('rejeitada', 'denegada')), 0),
    count(*) FILTER (WHERE status = 'abandoned')::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status = 'abandoned'), 0)
  FROM filtered_documents;
$function$;

REVOKE ALL ON FUNCTION public.get_fiscal_documents_summary(text, text, text, integer, text, date, date, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fiscal_documents_summary(text, text, text, integer, text, date, date, uuid, boolean) TO authenticated;
COMMIT;