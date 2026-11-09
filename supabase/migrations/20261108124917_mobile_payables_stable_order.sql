BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- Give offset pages a stable order when multiple payable rows share a date.
CREATE OR REPLACE FUNCTION public.get_mobile_pending_payables_page(
  p_supplier text DEFAULT NULL,
  p_due_date_start date DEFAULT NULL,
  p_due_date_end date DEFAULT NULL,
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0,
  p_include_summary boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_supplier text := nullif(
    public.immutable_unaccent(pg_catalog.lower(pg_catalog.btrim(coalesce(p_supplier, '')))),
    ''
  );
  v_limit integer := least(greatest(coalesce(p_limit, 15), 1), 30);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb := '[]'::jsonb;
  v_total_count bigint;
  v_total_amount numeric;
BEGIN
  IF p_include_summary THEN
    WITH filtered AS MATERIALIZED (
      SELECT
        transaction_row.id,
        transaction_row.type,
        transaction_row.amount,
        transaction_row.date,
        transaction_row.transaction_time,
        transaction_row.description,
        transaction_row.payment_method,
        transaction_row.category_id,
        coalesce(category.name, transaction_row.category_name, 'Despesa não classificada') AS category_name,
        transaction_row.result_nature,
        transaction_row.counterparty,
        transaction_row.due_date,
        transaction_row.origin,
        transaction_row.created_by,
        transaction_row.status,
        transaction_row.created_at,
        transaction_row.updated_at
      FROM public.financial_transactions AS transaction_row
      LEFT JOIN public.financial_categories AS category
        ON category.id::text = transaction_row.category_id
      WHERE transaction_row.status::text = 'PENDING'
        AND (p_due_date_start IS NULL OR coalesce(transaction_row.due_date, transaction_row.date) >= p_due_date_start)
        AND (p_due_date_end IS NULL OR coalesce(transaction_row.due_date, transaction_row.date) <= p_due_date_end)
        AND (
          v_supplier IS NULL
          OR pg_catalog.strpos(public.immutable_unaccent(pg_catalog.lower(coalesce(transaction_row.description, ''))), v_supplier) > 0
          OR pg_catalog.strpos(public.immutable_unaccent(pg_catalog.lower(coalesce(transaction_row.counterparty, ''))), v_supplier) > 0
          OR pg_catalog.strpos(public.immutable_unaccent(pg_catalog.lower(coalesce(category.name, transaction_row.category_name, 'Despesa não classificada'))), v_supplier) > 0
        )
    ), summary AS (
      SELECT count(*)::bigint AS total_count, coalesce(sum(amount), 0) AS total_amount
      FROM filtered
    ), page AS (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'type', type,
            'amount', amount,
            'date', date,
            'transaction_time', transaction_time,
            'description', description,
            'payment_method', payment_method,
            'category_id', category_id,
            'category_name', category_name,
            'result_nature', result_nature,
            'counterparty', counterparty,
            'due_date', due_date,
            'origin', origin,
            'created_by', created_by,
            'status', status,
            'created_at', created_at,
            'updated_at', updated_at
          ) ORDER BY date ASC, created_at ASC NULLS LAST, id ASC
        ),
        '[]'::jsonb
      ) AS rows
      FROM (
        SELECT * FROM filtered
        ORDER BY date ASC, created_at ASC NULLS LAST, id ASC
        LIMIT v_limit OFFSET v_offset
      ) AS selected_rows
    )
    SELECT page.rows, summary.total_count, summary.total_amount
    INTO v_rows, v_total_count, v_total_amount
    FROM page CROSS JOIN summary;

    RETURN jsonb_build_object(
      'rows', v_rows,
      'total_count', v_total_count,
      'total_amount', v_total_amount
    );
  END IF;

  WITH page AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'type', type,
          'amount', amount,
          'date', date,
          'transaction_time', transaction_time,
          'description', description,
          'payment_method', payment_method,
          'category_id', category_id,
          'category_name', category_name,
          'result_nature', result_nature,
          'counterparty', counterparty,
          'due_date', due_date,
          'origin', origin,
          'created_by', created_by,
          'status', status,
          'created_at', created_at,
          'updated_at', updated_at
        ) ORDER BY date ASC, created_at ASC NULLS LAST, id ASC
      ),
      '[]'::jsonb
    ) AS rows
    FROM (
      SELECT
        transaction_row.id,
        transaction_row.type,
        transaction_row.amount,
        transaction_row.date,
        transaction_row.transaction_time,
        transaction_row.description,
        transaction_row.payment_method,
        transaction_row.category_id,
        coalesce(category.name, transaction_row.category_name, 'Despesa não classificada') AS category_name,
        transaction_row.result_nature,
        transaction_row.counterparty,
        transaction_row.due_date,
        transaction_row.origin,
        transaction_row.created_by,
        transaction_row.status,
        transaction_row.created_at,
        transaction_row.updated_at
      FROM public.financial_transactions AS transaction_row
      LEFT JOIN public.financial_categories AS category
        ON category.id::text = transaction_row.category_id
      WHERE transaction_row.status::text = 'PENDING'
        AND (p_due_date_start IS NULL OR coalesce(transaction_row.due_date, transaction_row.date) >= p_due_date_start)
        AND (p_due_date_end IS NULL OR coalesce(transaction_row.due_date, transaction_row.date) <= p_due_date_end)
        AND (
          v_supplier IS NULL
          OR pg_catalog.strpos(public.immutable_unaccent(pg_catalog.lower(coalesce(transaction_row.description, ''))), v_supplier) > 0
          OR pg_catalog.strpos(public.immutable_unaccent(pg_catalog.lower(coalesce(transaction_row.counterparty, ''))), v_supplier) > 0
          OR pg_catalog.strpos(public.immutable_unaccent(pg_catalog.lower(coalesce(category.name, transaction_row.category_name, 'Despesa não classificada'))), v_supplier) > 0
        )
      ORDER BY transaction_row.date ASC, transaction_row.created_at ASC NULLS LAST, transaction_row.id ASC
      LIMIT v_limit OFFSET v_offset
    ) AS selected_rows
  )
  SELECT rows INTO v_rows FROM page;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', NULL,
    'total_amount', NULL
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_mobile_pending_payables_page(text, date, date, integer, integer, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_pending_payables_page(text, date, date, integer, integer, boolean)
  TO authenticated, service_role;

COMMIT;
