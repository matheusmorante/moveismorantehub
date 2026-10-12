-- Behavioral readiness was reviewed on 2026-10-11 after controlled proofs of
-- owner/link guards, rollback/idempotency, notification suppression and the
-- five operational destination filters. See docs/audits/fiscal-2026-10-11/evidence.
-- This opens the remote synthetic-artifact E2E harness; fiscal transmission
-- remains UI-only and requires its separate HML authorization.
BEGIN;

CREATE OR REPLACE FUNCTION public.test_artifact_policy_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_record_guards integer;
  v_notification_guard integer;
  v_receipt_delete_guard integer;
  v_dashboard text;
  v_metrics text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_STATUS_SERVICE_ROLE_REQUIRED';
  END IF;

  SELECT count(*) INTO v_record_guards
  FROM pg_trigger t
  JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND t.tgname='test_artifact_record_guard'
    AND c.relname=ANY(ARRAY['orders','people','products','product_variations','inventory_moves',
      'accounts_receivable','accounts_payable','financial_transactions','purchases','goods_receipts',
      'goods_receipt_items'])
    AND NOT t.tgisinternal AND t.tgenabled<>'D';

  SELECT count(*) INTO v_notification_guard
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='app_notifications'
    AND t.tgname='suppress_test_artifact_notification' AND NOT t.tgisinternal AND t.tgenabled<>'D';

  SELECT count(*) INTO v_receipt_delete_guard
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='goods_receipts'
    AND t.tgname='test_goods_receipt_delete_guard' AND NOT t.tgisinternal AND t.tgenabled<>'D';

  SELECT pg_get_functiondef(to_regprocedure('public.get_dashboard_aggregates(timestamptz,timestamptz,text)'))
    INTO v_dashboard;
  SELECT pg_get_functiondef(to_regprocedure('public.refresh_dashboard_metric_day(date)'))
    INTO v_metrics;

  RETURN jsonb_build_object(
    'ready', v_record_guards=11 AND v_notification_guard=1 AND v_receipt_delete_guard=1
      AND to_regprocedure('public.get_report_financial_transactions(date,date,boolean)') IS NOT NULL
      AND to_regprocedure('public.get_report_accounts_payable(text)') IS NOT NULL
      AND to_regprocedure('public.get_report_accounts_receivable(text)') IS NOT NULL
      AND coalesce(position('test_artifact_is_test' IN v_dashboard),0)>0
      AND coalesce(position('test_artifact_is_test' IN v_metrics),0)>0,
    'policyVersion', 'json-artifacts-v1',
    'behavioralProofRequired', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.test_artifact_policy_status() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.test_artifact_policy_status() TO service_role;

COMMIT;
