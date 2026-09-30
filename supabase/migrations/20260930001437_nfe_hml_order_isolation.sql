-- Synthetic engineering fixture only. Operational orders retain their existing effects.
CREATE OR REPLACE FUNCTION public.is_nfe_hml_technical_order(
  p_id text, p_status text, p_deleted boolean, p_data jsonb
) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$
  SELECT COALESCE(p_id ~ '^TEST_AUT_[0-9a-f-]{36}$'
    AND p_status = 'draft' AND p_deleted = true
    AND p_data->>'testRunId' = p_id
    AND p_data->>'fiscalScenario' = 'HML_TECHNICAL_V1'
    AND p_data->>'deleted' = 'true'
    AND p_data->'payments' = '[]'::jsonb, false);
$function$;

CREATE OR REPLACE FUNCTION public.refresh_dashboard_metrics_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_old_test boolean := true; v_new_test boolean := true;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_test := public.is_nfe_hml_technical_order(OLD.id, OLD.status, OLD.deleted, OLD.order_data);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_test := public.is_nfe_hml_technical_order(NEW.id, NEW.status, NEW.deleted, NEW.order_data);
  END IF;
  IF v_old_test AND v_new_test THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP <> 'INSERT' THEN
    PERFORM public.refresh_dashboard_metric_day(public.parse_order_metric_date(OLD.order_data->>'date', OLD.created_at));
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM public.refresh_dashboard_metric_day(public.parse_order_metric_date(NEW.order_data->>'date', NEW.created_at));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Transition relations distinguish an entirely synthetic statement from a mixed one.
-- Settings continue to use the original statement trigger and refresh normally.
CREATE OR REPLACE FUNCTION public.enqueue_delivery_summary_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE job_secret text; v_operational boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT EXISTS (SELECT 1 FROM hml_new_rows AS r
        WHERE NOT public.is_nfe_hml_technical_order(r.id, r.status, r.deleted, r.order_data)) INTO v_operational;
    END IF;
    IF TG_OP <> 'INSERT' AND NOT v_operational THEN
      SELECT EXISTS (SELECT 1 FROM hml_old_rows AS r
        WHERE NOT public.is_nfe_hml_technical_order(r.id, r.status, r.deleted, r.order_data)) INTO v_operational;
    END IF;
    IF NOT v_operational THEN RETURN NULL; END IF;
  END IF;
  SELECT decrypted_secret INTO job_secret FROM vault.decrypted_secrets
    WHERE name = 'delivery_summary_job_secret' LIMIT 1;
  IF COALESCE(job_secret, '') = '' THEN RETURN NULL; END IF;
  PERFORM net.http_post(
    url := 'https://hkoxhourxwlddgsfdgws.supabase.co/functions/v1/refresh-delivery-summaries',
    headers := pg_catalog.jsonb_build_object('Content-Type', 'application/json', 'x-delivery-summary-job-secret', job_secret),
    body := pg_catalog.jsonb_build_object('source', TG_TABLE_NAME));
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_from_orders ON public.orders;
DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_orders_insert ON public.orders;
DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_orders_update ON public.orders;
DROP TRIGGER IF EXISTS enqueue_delivery_summary_refresh_orders_delete ON public.orders;
CREATE TRIGGER enqueue_delivery_summary_refresh_orders_insert AFTER INSERT ON public.orders
  REFERENCING NEW TABLE AS hml_new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_delivery_summary_refresh();
CREATE TRIGGER enqueue_delivery_summary_refresh_orders_update AFTER UPDATE ON public.orders
  REFERENCING NEW TABLE AS hml_new_rows OLD TABLE AS hml_old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_delivery_summary_refresh();
CREATE TRIGGER enqueue_delivery_summary_refresh_orders_delete AFTER DELETE ON public.orders
  REFERENCING OLD TABLE AS hml_old_rows FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_delivery_summary_refresh();
