BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.get_finance_receivables_page(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH search_terms AS MATERIALIZED (
    SELECT array(
      SELECT token
      FROM pg_catalog.regexp_split_to_table(
        public.immutable_unaccent(
          pg_catalog.lower(pg_catalog.btrim(coalesce(p_search, '')))
        ),
        '\s+'
      ) AS split_tokens(token)
      WHERE token <> ''
    ) AS tokens
  ), filtered AS MATERIALIZED (
    SELECT receivable.id, receivable.due_date
    FROM public.accounts_receivable AS receivable
    CROSS JOIN search_terms
    WHERE (p_status IS NULL OR receivable.status = p_status)
      AND (
        pg_catalog.cardinality(search_terms.tokens) = 0
        OR NOT EXISTS (
          SELECT 1
          FROM pg_catalog.unnest(search_terms.tokens) AS token(value)
          WHERE pg_catalog.strpos(
            public.immutable_unaccent(pg_catalog.lower(coalesce(receivable.description, ''))),
            token.value
          ) = 0
        )
        OR NOT EXISTS (
          SELECT 1
          FROM pg_catalog.unnest(search_terms.tokens) AS token(value)
          WHERE pg_catalog.strpos(
            public.immutable_unaccent(pg_catalog.lower(coalesce(receivable.customer_name, ''))),
            token.value
          ) = 0
        )
      )
  ), page_ids AS (
    SELECT id, due_date
    FROM filtered
    ORDER BY due_date ASC, id ASC
    LIMIT 15
    OFFSET ((CASE WHEN p_page IS NULL OR p_page < 1 THEN 1 ELSE p_page END)::bigint - 1) * 15
  ), total AS (
    SELECT pg_catalog.count(*)::bigint AS total_count
    FROM filtered
  )
  SELECT pg_catalog.jsonb_build_object(
    'total_count', total.total_count,
    'items', coalesce(
      (
        SELECT pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', receivable.id,
            'description', receivable.description,
            'amount', receivable.amount,
            'due_date', receivable.due_date,
            'status', receivable.status,
            'category_id', receivable.category_id,
            'customer_name', receivable.customer_name,
            'notes', receivable.notes
          ) ORDER BY page_ids.due_date ASC, page_ids.id ASC
        )
        FROM page_ids
        JOIN public.accounts_receivable AS receivable ON receivable.id = page_ids.id
      ),
      '[]'::jsonb
    )
  )
  FROM total;
$function$;

REVOKE ALL ON FUNCTION public.get_finance_receivables_page(text, text, integer)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_finance_receivables_page(text, text, integer)
  TO authenticated;

COMMIT;
