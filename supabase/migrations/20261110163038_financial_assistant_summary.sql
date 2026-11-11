BEGIN;

-- Keep the ERP assistant's existing totals and count in PostgreSQL so the API
-- returns one compact result instead of every financial transaction row.
CREATE OR REPLACE FUNCTION public.get_financial_assistant_summary(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH totals AS (
    SELECT
      coalesce(sum(transaction_row.amount) FILTER (WHERE transaction_row.type = 'income'), 0) AS income,
      coalesce(sum(transaction_row.amount) FILTER (WHERE transaction_row.type = 'expense'), 0) AS expense,
      count(*) AS transaction_count
    FROM public.get_report_financial_transactions(
      p_start_date,
      p_end_date,
      false
    ) AS transaction_row
  )
  SELECT jsonb_build_object(
    'total_income', income,
    'total_expense', expense,
    'balance', income - expense,
    'count', transaction_count
  )
  FROM totals;
$function$;

REVOKE ALL ON FUNCTION public.get_financial_assistant_summary(date, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_financial_assistant_summary(date, date)
  TO authenticated, service_role;

COMMIT;
