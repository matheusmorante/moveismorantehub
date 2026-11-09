BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- Search financial movements for the mobile assistant before limiting results.
-- Invoker rights preserve the authenticated caller's existing RLS visibility.
CREATE OR REPLACE FUNCTION public.get_mobile_finance_assistant_movements(
  p_search text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_category_id text DEFAULT NULL,
  p_limit integer DEFAULT 10
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH search_terms AS (
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
  ), filtered AS (
    SELECT
      transaction_row.id,
      transaction_row.type,
      transaction_row.amount,
      transaction_row.date,
      transaction_row.description,
      transaction_row.payment_method,
      transaction_row.category_id,
      transaction_row.notes,
      transaction_row.counterparty,
      coalesce(category.name, transaction_row.category_name, 'Despesa não classificada') AS category_name
    FROM public.financial_transactions AS transaction_row
    LEFT JOIN public.financial_categories AS category
      ON category.id::text = transaction_row.category_id
    CROSS JOIN search_terms
    WHERE (p_start_date IS NULL OR transaction_row.date >= p_start_date)
      AND (p_end_date IS NULL OR transaction_row.date <= p_end_date)
      AND (p_type IS NULL OR transaction_row.type = p_type)
      AND (p_category_id IS NULL OR transaction_row.category_id = p_category_id)
      AND (
        cardinality(search_terms.tokens) = 0
        OR NOT EXISTS (
          SELECT 1
          FROM pg_catalog.unnest(search_terms.tokens) AS token(value)
          WHERE pg_catalog.strpos(
            public.immutable_unaccent(
              pg_catalog.lower(
                pg_catalog.concat_ws(
                  ' ',
                  coalesce(transaction_row.description, ''),
                  coalesce(transaction_row.notes, ''),
                  coalesce(transaction_row.counterparty, ''),
                  coalesce(category.name, transaction_row.category_name, 'Despesa não classificada')
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
    ORDER BY date DESC
    LIMIT least(greatest(coalesce(p_limit, 10), 1), 30)
  )
  SELECT coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', id,
        'type', type,
        'amount', amount,
        'date', date,
        'description', description,
        'payment_method', payment_method,
        'category_id', category_id,
        'notes', notes
      ) ORDER BY date DESC
    ),
    '[]'::jsonb
  )
  FROM limited;
$function$;

REVOKE ALL ON FUNCTION public.get_mobile_finance_assistant_movements(text, date, date, text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_finance_assistant_movements(text, date, date, text, text, integer)
  TO authenticated;

COMMIT;
