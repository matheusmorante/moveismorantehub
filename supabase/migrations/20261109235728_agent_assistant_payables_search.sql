BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.get_finance_assistant_payables(
  p_supplier text DEFAULT NULL,
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
          pg_catalog.lower(pg_catalog.btrim(coalesce(p_supplier, '')))
        ),
        '\s+'
      ) AS split_tokens(token)
      WHERE token <> ''
    ) AS tokens
  ), candidates AS (
    SELECT
      payable.id,
      payable.description,
      payable.amount,
      payable.due_date,
      payable.supplier_name,
      category.name AS category_name,
      payable.category_id,
      payable.status,
      payable.notes
    FROM public.accounts_payable AS payable
    LEFT JOIN public.financial_categories AS category
      ON category.id = payable.category_id
    WHERE (NOT coalesce(p_only_pending, true) OR payable.status::text = 'pending')
      AND (p_start_due_date IS NULL OR payable.due_date >= p_start_due_date)
      AND (p_end_due_date IS NULL OR payable.due_date <= p_end_due_date)
  ), filtered AS (
    SELECT candidate.*, count(*) OVER () AS total_count
    FROM candidates AS candidate
    CROSS JOIN search_terms
    WHERE p_supplier IS NULL
      OR pg_catalog.btrim(p_supplier) = ''
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
                  coalesce(candidate.supplier_name, ''),
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
    'total_count', coalesce((SELECT max(total_count) FROM filtered), 0),
    'items', coalesce(
      (
        SELECT pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', id,
            'description', description,
            'amount', amount,
            'due_date', due_date,
            'supplier_name', supplier_name,
            'category_name', category_name,
            'category_id', category_id,
            'payment_method', NULL::text,
            'status', status,
            'notes', notes
          ) ORDER BY due_date ASC, id ASC
        )
        FROM limited
      ),
      '[]'::jsonb
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.get_finance_assistant_payables(text, date, date, boolean, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_finance_assistant_payables(text, date, date, boolean, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_mobile_finance_assistant_payables(
  p_supplier text DEFAULT NULL,
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
          pg_catalog.lower(pg_catalog.btrim(coalesce(p_supplier, '')))
        ),
        '\s+'
      ) AS split_tokens(token)
      WHERE token <> ''
    ) AS tokens
  ), candidates AS (
    SELECT
      transaction_row.id,
      transaction_row.type,
      transaction_row.amount,
      transaction_row.date,
      transaction_row.description,
      transaction_row.payment_method,
      transaction_row.category_id,
      coalesce(category.name, transaction_row.category_name, 'Despesa não classificada') AS category_name,
      transaction_row.counterparty,
      coalesce(transaction_row.due_date, transaction_row.date) AS due_date,
      transaction_row.status,
      transaction_row.notes
    FROM public.financial_transactions AS transaction_row
    LEFT JOIN public.financial_categories AS category
      ON category.id::text = transaction_row.category_id
    WHERE transaction_row.type::text = 'expense'
      AND (NOT coalesce(p_only_pending, true) OR transaction_row.status::text = 'PENDING')
      AND (p_start_due_date IS NULL OR coalesce(transaction_row.due_date, transaction_row.date) >= p_start_due_date)
      AND (p_end_due_date IS NULL OR coalesce(transaction_row.due_date, transaction_row.date) <= p_end_due_date)
  ), filtered AS (
    SELECT candidate.*, count(*) OVER () AS total_count
    FROM candidates AS candidate
    CROSS JOIN search_terms
    WHERE p_supplier IS NULL
      OR pg_catalog.btrim(p_supplier) = ''
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
                  coalesce(candidate.counterparty, ''),
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
    'total_count', coalesce((SELECT max(total_count) FROM filtered), 0),
    'items', coalesce(
      (
        SELECT pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', id,
            'type', type,
            'amount', amount,
            'date', date,
            'description', description,
            'payment_method', payment_method,
            'category_id', category_id,
            'category_name', category_name,
            'counterparty', counterparty,
            'due_date', due_date,
            'status', status,
            'notes', notes
          ) ORDER BY due_date ASC, id ASC
        )
        FROM limited
      ),
      '[]'::jsonb
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.get_mobile_finance_assistant_payables(text, date, date, boolean, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_finance_assistant_payables(text, date, date, boolean, integer)
  TO authenticated;

COMMIT;
