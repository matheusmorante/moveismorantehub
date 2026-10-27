BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.customer_support_can_view()') IS NULL
    OR to_regprocedure('public.customer_support_can_view_commercial_info()') IS NULL
    OR to_regclass('public.whatsapp_conversations') IS NULL
    OR to_regclass('public.people') IS NULL THEN
    RAISE EXCEPTION 'Install Central de Atendimento tables and permission helpers first.';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.customer_support_auto_link_conversations(p_conversation_ids uuid[])
RETURNS TABLE (
  conversation_id uuid,
  customer_id text,
  customer_link_status text,
  customer_full_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
SET statement_timeout = '10s'
AS $function$
DECLARE
  v_requested_count integer := cardinality(COALESCE(p_conversation_ids, ARRAY[]::uuid[]));
BEGIN
  IF auth.uid() IS NULL OR NOT public.customer_support_can_view() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF v_requested_count > 100 THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_AUTO_LINK_BATCH_INVALID' USING ERRCODE = '22023';
  END IF;
  IF v_requested_count = 0 THEN RETURN; END IF;

  WITH target_numbers AS (
    SELECT conversation.id AS conversation_id,
      regexp_replace(regexp_replace(phone.value, '[^0-9]', '', 'g'), '^0+', '') AS digits
    FROM public.whatsapp_conversations AS conversation
    CROSS JOIN LATERAL (VALUES
      (NULLIF(conversation.contact_wa_id, '')),
      (NULLIF(conversation.contact_phone, ''))
    ) AS phone(value)
    WHERE conversation.id = ANY(COALESCE(p_conversation_ids, ARRAY[]::uuid[]))
      AND conversation.customer_id IS NULL
      AND conversation.customer_link_status <> 'manually_linked'
      AND conversation.business_phone_number_id NOT LIKE 'test-artifact:%'
      AND phone.value IS NOT NULL
  ), target_parsed AS (
    SELECT target.conversation_id, target.digits,
      CASE
        WHEN target.digits LIKE '55%' AND length(target.digits) IN (12, 13) THEN substr(target.digits, 3)
        WHEN length(target.digits) IN (10, 11) THEN target.digits
        ELSE NULL
      END AS brazilian_local
    FROM target_numbers AS target
    WHERE length(target.digits) >= 8
  ), person_numbers AS (
    SELECT person.id, person.phone,
      regexp_replace(regexp_replace(person.phone, '[^0-9]', '', 'g'), '^0+', '') AS digits
    FROM public.people AS person
    WHERE (person.deleted IS NULL OR person.deleted = false)
      AND NULLIF(person.phone, '') IS NOT NULL
  ), person_parsed AS (
    SELECT person.id,
      CASE
        WHEN person.digits LIKE '55%' AND length(person.digits) IN (12, 13) THEN substr(person.digits, 3)
        WHEN length(person.digits) IN (10, 11) THEN person.digits
        ELSE NULL
      END AS brazilian_local,
      person.digits
    FROM person_numbers AS person
    WHERE length(person.digits) >= 8
  ), matches AS (
    SELECT DISTINCT target.conversation_id, person.id AS customer_id
    FROM target_parsed AS target
    JOIN person_parsed AS person ON CASE
      WHEN target.brazilian_local IS NOT NULL AND person.brazilian_local IS NOT NULL THEN
        left(target.brazilian_local, 2) = left(person.brazilian_local, 2)
        AND right(target.brazilian_local, 8) = right(person.brazilian_local, 8)
      ELSE
        right(target.digits, length(person.digits)) = person.digits
        OR right(person.digits, length(target.digits)) = target.digits
    END
  ), unique_matches AS (
    SELECT match.conversation_id, min(match.customer_id) AS customer_id
    FROM matches AS match
    GROUP BY match.conversation_id
    HAVING count(*) = 1
  )
  UPDATE public.whatsapp_conversations AS conversation
  SET customer_id = unique_match.customer_id,
      customer_link_status = 'auto_matched',
      updated_at = now()
  FROM unique_matches AS unique_match
  WHERE conversation.id = unique_match.conversation_id
    AND conversation.customer_id IS NULL
    AND conversation.customer_link_status <> 'manually_linked'
    AND conversation.business_phone_number_id NOT LIKE 'test-artifact:%';

  RETURN QUERY
  SELECT conversation.id, conversation.customer_id, conversation.customer_link_status, person.full_name
  FROM public.whatsapp_conversations AS conversation
  JOIN public.people AS person ON person.id = conversation.customer_id
  WHERE conversation.id = ANY(COALESCE(p_conversation_ids, ARRAY[]::uuid[]))
    AND (person.deleted IS NULL OR person.deleted = false)
    AND conversation.business_phone_number_id NOT LIKE 'test-artifact:%';
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_auto_link_conversations(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_auto_link_conversations(uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
