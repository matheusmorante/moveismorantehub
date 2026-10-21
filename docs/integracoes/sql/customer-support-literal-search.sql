-- Literal text remains text; only phone-like searches receive digit normalization.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_list_conversations(
  p_filter text DEFAULT 'all',
  p_search text DEFAULT '',
  p_agent_id uuid DEFAULT NULL,
  p_criteria jsonb DEFAULT '{}'::jsonb,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50,
  p_sort_order text DEFAULT 'newest'
)
RETURNS TABLE (
  id uuid,
  business_phone_number_id text,
  contact_phone text,
  contact_wa_id text,
  contact_name text,
  customer_id text,
  customer_link_status text,
  last_message_text text,
  last_message_at timestamptz,
  last_customer_message_at timestamptz,
  unread_count integer,
  is_archived boolean,
  internal_notes text,
  tags text[],
  assigned_to uuid,
  created_at timestamptz,
  updated_at timestamptz,
  assigned_profile_name text,
  assigned_profile_role text,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
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
        -- A saved folder owns its status scope, including closed/all. Applying
        -- the default open-only queue scope first would make closed folders empty.
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
        WHERE order_row.customer_id = conversation.customer_id
          AND (order_row.deleted IS NULL OR order_row.deleted = false)
      ))
      AND (v_filter <> 'without_orders' OR NOT EXISTS (
        SELECT 1 FROM public.orders AS order_row
        WHERE order_row.customer_id = conversation.customer_id
          AND (order_row.deleted IS NULL OR order_row.deleted = false)
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
          WHERE order_row.customer_id = conversation.customer_id
            AND (order_row.deleted IS NULL OR order_row.deleted = false)
        )
        WHEN 'without_orders' THEN NOT EXISTS (
          SELECT 1 FROM public.orders AS order_row
          WHERE order_row.customer_id = conversation.customer_id
            AND (order_row.deleted IS NULL OR order_row.deleted = false)
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

CREATE OR REPLACE FUNCTION public.customer_support_search_customers(p_search text)
RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
DECLARE
  v_search text := btrim(COALESCE(p_search, ''));
  v_digits text := CASE WHEN btrim(COALESCE(p_search, '')) ~ '^[+0-9[:space:]().-]+$' THEN regexp_replace(COALESCE(p_search, ''), '[^0-9]', '', 'g') ELSE '' END;
BEGIN
  IF NOT public.customer_support_can_view() OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF length(v_search) < 2 OR length(v_search) > 100 THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_CUSTOMER_SEARCH_INVALID' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT jsonb_build_object(
    'id', person.id,
    'full_name', person.full_name,
    'phone', person.phone,
    'cpf_cnpj', person.cpf_cnpj,
    'email', person.email,
    'address', person.address,
    'created_at', person.created_at,
    'active', person.active
  )
  FROM public.people AS person
  WHERE (person.deleted IS NULL OR person.deleted = false)
    AND (
      person.full_name ILIKE '%' || v_search || '%'
      OR (length(v_digits) >= 3 AND (
        regexp_replace(COALESCE(person.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_digits || '%'
        OR regexp_replace(COALESCE(person.phone, ''), '[^0-9]', '', 'g') LIKE '%' || v_digits || '%'
      ))
    )
  ORDER BY person.full_name
  LIMIT 15;
END;
$function$;
COMMIT;
