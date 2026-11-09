BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.get_finance_assistant_receivables(
  p_search text DEFAULT NULL,
  p_start_due_date date DEFAULT NULL,
  p_end_due_date date DEFAULT NULL,
  p_only_pending boolean DEFAULT true,
  p_limit integer DEFAULT 15
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
  ), candidates AS (
    SELECT
      receivable.id,
      receivable.description,
      receivable.amount,
      receivable.due_date,
      receivable.customer_name,
      CASE
        WHEN receivable.category_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          THEN category.name
        ELSE nullif(receivable.category_id, '')
      END AS category_name,
      receivable.category_id,
      receivable.status,
      receivable.notes
    FROM public.accounts_receivable AS receivable
    LEFT JOIN public.financial_categories AS category
      ON category.id = CASE
        WHEN receivable.category_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          THEN receivable.category_id::uuid
        ELSE NULL::uuid
      END
    WHERE (NOT coalesce(p_only_pending, true) OR receivable.status = 'pending')
      AND (p_start_due_date IS NULL OR receivable.due_date >= p_start_due_date)
      AND (p_end_due_date IS NULL OR receivable.due_date <= p_end_due_date)
  ), filtered AS (
    SELECT
      candidate.*,
      count(*) OVER () AS total_count
    FROM candidates AS candidate
    CROSS JOIN search_terms
    WHERE p_search IS NULL
      OR pg_catalog.btrim(p_search) = ''
      OR (
        pg_catalog.cardinality(search_terms.tokens) > 0
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.unnest(search_terms.tokens) AS token(value)
          WHERE pg_catalog.strpos(
            public.immutable_unaccent(
              pg_catalog.lower(
                pg_catalog.concat_ws(
                  ' ',
                  coalesce(candidate.description, ''),
                  coalesce(candidate.customer_name, ''),
                  coalesce(candidate.category_name, '')
                )
              )
            ),
            token.value
          ) = 0
        )
      )
  ), limited AS (
    SELECT *
    FROM filtered
    ORDER BY due_date ASC, id ASC
    LIMIT least(greatest(coalesce(p_limit, 15), 1), 30)
  )
  SELECT pg_catalog.jsonb_build_object(
    'total_count', coalesce(max(total_count), 0),
    'items', coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', id,
          'description', description,
          'amount', amount,
          'due_date', due_date,
          'customer_name', customer_name,
          'category_name', category_name,
          'category_id', category_id,
          'payment_method', NULL::text,
          'status', status,
          'notes', notes
        ) ORDER BY due_date ASC, id ASC
      ),
      '[]'::jsonb
    )
  )
  FROM limited;
$function$;

REVOKE ALL ON FUNCTION public.get_finance_assistant_receivables(text, date, date, boolean, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_finance_assistant_receivables(text, date, date, boolean, integer)
  TO authenticated;

COMMIT;
