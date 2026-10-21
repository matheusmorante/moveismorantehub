-- Complete the support inbox with shared saved filters and permission-aware reads.
-- The webhook continues to use the service role; browser clients only read support
-- data and write internal notes/status changes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE SCHEMA IF NOT EXISTS private;

-- Some installations added multi-role profiles outside the original migration
-- history; keep the permission check compatible with both deployed shapes.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles text[];

CREATE OR REPLACE FUNCTION private.customer_support_role_has_permission(
  p_permission text,
  p_roles text[],
  p_legacy_role text,
  p_settings jsonb,
  p_default_roles text[]
)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_roles text[] := pg_catalog.array_remove(pg_catalog.array_remove(COALESCE(p_roles, ARRAY[]::text[]), 'pending'), NULL);
  v_allowed text[];
  v_permission jsonb;
BEGIN
  IF pg_catalog.cardinality(v_roles) = 0 AND p_legacy_role IS NOT NULL AND p_legacy_role <> 'pending' THEN
    v_roles := ARRAY[p_legacy_role];
  END IF;
  IF 'administrator' = ANY(v_roles) THEN RETURN true; END IF;
  IF pg_catalog.cardinality(v_roles) = 0 THEN RETURN false; END IF;

  v_permission := p_settings -> 'rolePermissions' -> p_permission;
  IF v_permission IS NULL THEN
    RETURN v_roles && p_default_roles;
  END IF;
  IF pg_catalog.jsonb_typeof(v_permission) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  SELECT COALESCE(pg_catalog.array_agg(role_name), ARRAY[]::text[])
    INTO v_allowed
    FROM pg_catalog.jsonb_array_elements_text(v_permission) AS roles(role_name);
  RETURN v_roles && v_allowed;
END;
$function$;

CREATE OR REPLACE FUNCTION private.customer_support_profile_has_permission(
  p_profile_id uuid,
  p_permission text,
  p_default_roles text[]
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_roles text[];
  v_role text;
  v_settings jsonb;
BEGIN
  SELECT profile.roles, profile.role INTO v_roles, v_role
    FROM public.profiles AS profile WHERE profile.id = p_profile_id;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT settings.data INTO v_settings FROM public.settings AS settings WHERE settings.id = 'app';
  RETURN private.customer_support_role_has_permission(
    p_permission, v_roles, v_role, COALESCE(v_settings, '{}'::jsonb), p_default_roles
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_can_view()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT private.customer_support_profile_has_permission(
    auth.uid(), 'viewCustomerSupport', ARRAY['manager', 'seller', 'deliverer']::text[]
  );
$function$;

-- Restrict these internal helpers without changing privileges on unrelated
-- objects that may already live in the private schema.
REVOKE ALL ON FUNCTION private.customer_support_role_has_permission(text, text[], text, jsonb, text[])
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.customer_support_profile_has_permission(uuid, text, text[])
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.customer_support_can_view_commercial_info()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT private.customer_support_profile_has_permission(
    auth.uid(), 'viewCustomerCommercialInfo', ARRAY['manager', 'seller']::text[]
  );
$function$;

REVOKE ALL ON FUNCTION public.customer_support_can_view() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_can_view_commercial_info() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_can_view() TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_can_view_commercial_info() TO authenticated;

-- Shared folders contain filters only; all authorized attendants can read them,
-- while only their creator can rename or remove them.
CREATE TABLE IF NOT EXISTS public.customer_support_inboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 50),
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(criteria) = 'object'),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_support_inboxes_name_unique
  ON public.customer_support_inboxes (lower(btrim(name)));
CREATE INDEX IF NOT EXISTS customer_support_inboxes_creator_idx
  ON public.customer_support_inboxes (created_by, created_at DESC);
ALTER TABLE public.customer_support_inboxes ENABLE ROW LEVEL SECURITY;
DO $policies$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'customer_support_inboxes' AND policyname = 'customer_support_inboxes_select') THEN
    CREATE POLICY customer_support_inboxes_select ON public.customer_support_inboxes FOR SELECT TO authenticated USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'customer_support_inboxes' AND policyname = 'customer_support_inboxes_insert') THEN
    CREATE POLICY customer_support_inboxes_insert ON public.customer_support_inboxes FOR INSERT TO authenticated WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'customer_support_inboxes' AND policyname = 'customer_support_inboxes_update') THEN
    CREATE POLICY customer_support_inboxes_update ON public.customer_support_inboxes FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'customer_support_inboxes' AND policyname = 'customer_support_inboxes_delete') THEN
    CREATE POLICY customer_support_inboxes_delete ON public.customer_support_inboxes FOR DELETE TO authenticated USING (false);
  END IF;
END;
$policies$;
ALTER POLICY customer_support_inboxes_select ON public.customer_support_inboxes
  TO authenticated USING ((SELECT public.customer_support_can_view()));
ALTER POLICY customer_support_inboxes_insert ON public.customer_support_inboxes
  TO authenticated WITH CHECK (
    (SELECT public.customer_support_can_view()) AND created_by = (SELECT auth.uid())
  );
ALTER POLICY customer_support_inboxes_update ON public.customer_support_inboxes
  TO authenticated USING (
    (SELECT public.customer_support_can_view()) AND created_by = (SELECT auth.uid())
  ) WITH CHECK (
    (SELECT public.customer_support_can_view()) AND created_by = (SELECT auth.uid())
  );
ALTER POLICY customer_support_inboxes_delete ON public.customer_support_inboxes
  TO authenticated USING (
    (SELECT public.customer_support_can_view()) AND created_by = (SELECT auth.uid())
  );
REVOKE ALL ON TABLE public.customer_support_inboxes FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_support_inboxes TO authenticated;

-- Remove the historical public/anonymous Central policies and scope all browser
-- access to users with the same permission that opens the module in the ERP.
ALTER POLICY whatsapp_conversations_select ON public.whatsapp_conversations
  TO authenticated USING ((SELECT public.customer_support_can_view()));
ALTER POLICY whatsapp_conversations_insert ON public.whatsapp_conversations
  TO authenticated WITH CHECK (false);
ALTER POLICY whatsapp_conversations_update ON public.whatsapp_conversations
  TO authenticated USING ((SELECT public.customer_support_can_view()))
  WITH CHECK ((SELECT public.customer_support_can_view()));
ALTER POLICY whatsapp_messages_select ON public.whatsapp_messages
  TO authenticated USING ((SELECT public.customer_support_can_view()));
ALTER POLICY whatsapp_messages_insert ON public.whatsapp_messages
  TO authenticated WITH CHECK (
    (SELECT public.customer_support_can_view())
    AND direction = 'outbound'
    AND message_type IN ('internal_note', 'system_event')
  );
ALTER POLICY whatsapp_messages_update ON public.whatsapp_messages
  TO authenticated USING (false) WITH CHECK (false);
ALTER POLICY whatsapp_usage_monthly_select ON public.whatsapp_usage_monthly
  TO authenticated USING ((SELECT public.customer_support_can_view()));
ALTER POLICY whatsapp_usage_monthly_insert ON public.whatsapp_usage_monthly
  TO authenticated WITH CHECK (false);
ALTER POLICY whatsapp_usage_monthly_update ON public.whatsapp_usage_monthly
  TO authenticated USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.whatsapp_conversations FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.whatsapp_messages FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.whatsapp_usage_monthly FROM anon, PUBLIC;
REVOKE INSERT, DELETE, UPDATE ON TABLE public.whatsapp_conversations FROM authenticated;
REVOKE UPDATE, DELETE ON TABLE public.whatsapp_messages FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.whatsapp_usage_monthly FROM authenticated;
GRANT SELECT ON TABLE public.whatsapp_conversations TO authenticated;
GRANT UPDATE (assigned_to, unread_count, is_archived, internal_notes, tags, updated_at)
  ON TABLE public.whatsapp_conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.whatsapp_messages TO authenticated;
GRANT SELECT ON TABLE public.whatsapp_usage_monthly TO authenticated;

-- This function applies all inbox/folder criteria before calculating the count
-- and slicing each 50-row page. Commercial order predicates require the separate
-- commercial-information permission.
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
  v_folder_phone_digits := regexp_replace(v_folder_search, '[^0-9]', '', 'g');
  v_phone_digits := regexp_replace(v_search, '[^0-9]', '', 'g');

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

CREATE OR REPLACE FUNCTION public.customer_support_conversation_counts()
RETURNS TABLE (all_count bigint, mine_count bigint, unassigned_count bigint, unread_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
BEGIN
  IF NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT
    count(*) FILTER (WHERE NOT conversation.is_archived AND NOT (conversation.tags @> ARRAY['status:closed']::text[])),
    count(*) FILTER (WHERE NOT conversation.is_archived AND NOT (conversation.tags @> ARRAY['status:closed']::text[]) AND conversation.assigned_to = auth.uid()),
    count(*) FILTER (WHERE NOT conversation.is_archived AND NOT (conversation.tags @> ARRAY['status:closed']::text[]) AND conversation.assigned_to IS NULL),
    count(*) FILTER (WHERE NOT conversation.is_archived AND NOT (conversation.tags @> ARRAY['status:closed']::text[]) AND conversation.unread_count > 0)
  FROM public.whatsapp_conversations AS conversation;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_list_agents()
RETURNS TABLE (id uuid, full_name text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
BEGIN
  IF NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT profile.id, COALESCE(NULLIF(profile.full_name, ''), 'Atendente'), profile.role
  FROM public.profiles AS profile
  WHERE private.customer_support_role_has_permission(
    'viewCustomerSupport', profile.roles, profile.role, COALESCE(
      (SELECT settings.data FROM public.settings AS settings WHERE settings.id = 'app'), '{}'::jsonb
    ), ARRAY['manager', 'seller', 'deliverer']::text[]
  )
  ORDER BY COALESCE(NULLIF(profile.full_name, ''), 'Atendente');
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_list_customer_summaries(p_customer_ids text[])
RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
BEGIN
  IF NOT public.customer_support_can_view() OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
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
  WHERE person.id = ANY(COALESCE(p_customer_ids, ARRAY[]::text[]))
    AND (person.deleted IS NULL OR person.deleted = false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_list_customer_orders(p_customer_id text)
RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
BEGIN
  IF NOT public.customer_support_can_view() OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF p_customer_id IS NULL OR btrim(p_customer_id) = '' THEN RETURN; END IF;
  RETURN QUERY SELECT jsonb_build_object(
    'id', order_row.id,
    'order_number', order_row.order_number,
    'status', order_row.status,
    'total_amount', order_row.total_amount,
    'payment_method', order_row.payment_method,
    'delivery_status', order_row.delivery_status,
    'scheduled_date', order_row.scheduled_date,
    'delivery_finished_at', order_row.delivery_finished_at,
    'items', order_row.items,
    'created_at', order_row.created_at
  )
  FROM public.orders AS order_row
  WHERE order_row.customer_id = p_customer_id
    AND (order_row.deleted IS NULL OR order_row.deleted = false)
  ORDER BY order_row.created_at DESC
  LIMIT 20;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_count_customer_orders(p_customer_ids text[])
RETURNS TABLE (customer_id text, order_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
BEGIN
  IF NOT public.customer_support_can_view() OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT order_row.customer_id, count(*)
  FROM public.orders AS order_row
  WHERE order_row.customer_id = ANY(COALESCE(p_customer_ids, ARRAY[]::text[]))
    AND (order_row.deleted IS NULL OR order_row.deleted = false)
  GROUP BY order_row.customer_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_search_customers(p_search text)
RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
DECLARE
  v_search text := btrim(COALESCE(p_search, ''));
  v_digits text := regexp_replace(COALESCE(p_search, ''), '[^0-9]', '', 'g');
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

CREATE OR REPLACE FUNCTION public.customer_support_link_customer(p_conversation_id uuid, p_customer_id text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
BEGIN
  IF NOT public.customer_support_can_view() OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF p_conversation_id IS NULL OR p_customer_id IS NULL OR btrim(p_customer_id) = '' THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_CUSTOMER_LINK_INVALID' USING ERRCODE = '22023';
  END IF;
  UPDATE public.whatsapp_conversations
  SET customer_id = p_customer_id, customer_link_status = 'manually_linked', updated_at = now()
  WHERE id = p_conversation_id;
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_unlink_customer(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
BEGIN
  IF NOT public.customer_support_can_view() OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF p_conversation_id IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_CUSTOMER_LINK_INVALID' USING ERRCODE = '22023';
  END IF;
  UPDATE public.whatsapp_conversations
  SET customer_id = NULL, customer_link_status = 'unlinked', updated_at = now()
  WHERE id = p_conversation_id;
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_list_conversations(text, text, uuid, jsonb, integer, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_conversation_counts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_list_agents() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_list_customer_summaries(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_list_customer_orders(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_count_customer_orders(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_search_customers(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_link_customer(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_support_unlink_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_list_conversations(text, text, uuid, jsonb, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_conversation_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_list_agents() TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_list_customer_summaries(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_list_customer_orders(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_count_customer_orders(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_search_customers(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_link_customer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_support_unlink_customer(uuid) TO authenticated;

COMMIT;
