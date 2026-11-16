BEGIN;

-- Keep the finance dashboard's open-account totals in one compact read while
-- reusing the existing authenticated, test-filtered report functions.
CREATE OR REPLACE FUNCTION public.get_finance_dashboard_forecast_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH payable_rows AS (
    SELECT payable.status, payable.amount
    FROM public.get_report_accounts_payable('pending') AS payable
    UNION ALL
    SELECT payable.status, payable.amount
    FROM public.get_report_accounts_payable('overdue') AS payable
  ), payable_summary AS (
    SELECT
      coalesce(sum(amount) FILTER (WHERE status = 'pending'), 0) AS pending_total,
      coalesce(sum(amount) FILTER (WHERE status = 'overdue'), 0) AS overdue_total,
      coalesce(sum(amount), 0) AS total,
      count(*) AS open_count
    FROM payable_rows
  ), receivable_rows AS (
    SELECT receivable.status, receivable.amount
    FROM public.get_report_accounts_receivable('pending') AS receivable
    UNION ALL
    SELECT receivable.status, receivable.amount
    FROM public.get_report_accounts_receivable('overdue') AS receivable
  ), receivable_summary AS (
    SELECT
      coalesce(sum(amount) FILTER (WHERE status = 'pending'), 0) AS pending_total,
      coalesce(sum(amount) FILTER (WHERE status = 'overdue'), 0) AS overdue_total,
      coalesce(sum(amount), 0) AS total,
      count(*) AS open_count
    FROM receivable_rows
  )
  SELECT jsonb_build_object(
    'payables', jsonb_build_object(
      'pending_total', payable_summary.pending_total,
      'overdue_total', payable_summary.overdue_total,
      'total', payable_summary.total,
      'count', payable_summary.open_count
    ),
    'receivables', jsonb_build_object(
      'pending_total', receivable_summary.pending_total,
      'overdue_total', receivable_summary.overdue_total,
      'total', receivable_summary.total,
      'count', receivable_summary.open_count
    )
  )
  FROM payable_summary
  CROSS JOIN receivable_summary;
$function$;

REVOKE ALL ON FUNCTION public.get_finance_dashboard_forecast_summary()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_finance_dashboard_forecast_summary()
  TO authenticated, service_role;

COMMIT;
