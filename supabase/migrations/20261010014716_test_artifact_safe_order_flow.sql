-- Safe, non-commercial test orders for authenticated guard verification.
-- Test orders never receive a commercial sequence and never enter stock,
-- catalog, dashboard metrics, delivery-summary jobs, or push notifications.
BEGIN;

CREATE OR REPLACE FUNCTION public.assign_order_index()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  assigned_index bigint;
  test_identity jsonb;
BEGIN
  IF public.test_artifact_is_test(to_jsonb(NEW)) THEN
    test_identity := public.test_artifact_identity(public.test_artifact_data(to_jsonb(NEW)));
    IF test_identity IS NOT NULL THEN
      NEW.order_index := NULL;
      NEW.order_number := 'T-' || NEW.id::text;
      NEW.order_data := COALESCE(NEW.order_data, '{}'::jsonb) - 'orderIndex' - 'orderNumber';
    END IF;
    -- Invalid test identities are rejected by the following guard trigger.
    -- Return without advancing the commercial sequence in either case.
    RETURN NEW;
  END IF;

  IF NEW.order_data ->> 'orderIndex' !~ '^[1-9][0-9]{0,5}$'
     OR EXISTS (
       SELECT 1
         FROM public.orders
        WHERE order_data ->> 'orderIndex' = NEW.order_data ->> 'orderIndex'
     ) THEN
    assigned_index := nextval('public.order_index_sequence');
    NEW.order_index := assigned_index;
    NEW.order_number := assigned_index::text;
    NEW.order_data := jsonb_set(
      COALESCE(NEW.order_data, '{}'::jsonb),
      '{orderIndex}',
      to_jsonb(assigned_index)
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_dashboard_metrics_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_old_test boolean := true;
  v_new_test boolean := true;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_test := public.is_nfe_hml_test_order(OLD.id, OLD.status, OLD.deleted, OLD.order_data)
      OR public.test_artifact_is_test(to_jsonb(OLD));
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_test := public.is_nfe_hml_test_order(NEW.id, NEW.status, NEW.deleted, NEW.order_data)
      OR public.test_artifact_is_test(to_jsonb(NEW));
  END IF;
  IF v_old_test AND v_new_test THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP <> 'INSERT' AND NOT v_old_test THEN
    PERFORM public.refresh_dashboard_metric_day(
      public.parse_order_metric_date(OLD.order_data->>'date', OLD.created_at));
  END IF;
  IF TG_OP <> 'DELETE' AND NOT v_new_test THEN
    PERFORM public.refresh_dashboard_metric_day(
      public.parse_order_metric_date(NEW.order_data->>'date', NEW.created_at));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_delivery_summary_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  job_secret text;
  v_operational boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT EXISTS (
        SELECT 1 FROM hml_new_rows AS r
        WHERE NOT public.is_nfe_hml_test_order(r.id, r.status, r.deleted, r.order_data)
          AND NOT public.test_artifact_is_test(to_jsonb(r))
      ) INTO v_operational;
    END IF;
    IF TG_OP <> 'INSERT' AND NOT v_operational THEN
      SELECT EXISTS (
        SELECT 1 FROM hml_old_rows AS r
        WHERE NOT public.is_nfe_hml_test_order(r.id, r.status, r.deleted, r.order_data)
          AND NOT public.test_artifact_is_test(to_jsonb(r))
      ) INTO v_operational;
    END IF;
    IF NOT v_operational THEN RETURN NULL; END IF;
  END IF;

  SELECT decrypted_secret INTO job_secret FROM vault.decrypted_secrets
    WHERE name = 'delivery_summary_job_secret' LIMIT 1;
  IF COALESCE(job_secret, '') = '' THEN RETURN NULL; END IF;
  PERFORM net.http_post(
    url := 'https://hkoxhourxwlddgsfdgws.supabase.co/functions/v1/refresh-delivery-summaries',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-delivery-summary-job-secret', job_secret),
    body := jsonb_build_object('source', TG_TABLE_NAME));
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_test_artifact_order(
  p_run_id uuid,
  p_linked_order_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_owner_id uuid;
  v_identity jsonb;
  v_person_id text;
  v_customer_name text;
  v_order_id text;
  v_existing_order public.orders%ROWTYPE;
  v_person_exists boolean;
BEGIN
  v_owner_id := auth.uid();
  IF v_owner_id IS NULL OR NOT COALESCE(public.is_administrator(), false) THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_UNAUTHORIZED';
  END IF;
  IF p_run_id IS NULL THEN
    RAISE EXCEPTION 'TEST_ARTIFACT_INVALID_ARGUMENT';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_owner_id::text || ':' || p_run_id::text, 0));
  v_identity := jsonb_build_object(
    'is_test', true,
    'runId', lower(p_run_id::text),
    'ownerId', lower(v_owner_id::text)
  );

  SELECT o.* INTO v_existing_order
  FROM public.orders o
  WHERE o.order_data#>>'{testArtifact,runId}' = lower(p_run_id::text)
    AND o.order_data#>>'{testArtifact,ownerId}' = lower(v_owner_id::text)
  ORDER BY o.created_at, o.id
  LIMIT 1;
  IF FOUND THEN
    SELECT EXISTS (SELECT 1 FROM public.people p WHERE p.id = v_existing_order.customer_id)
      INTO v_person_exists;
    IF NOT v_person_exists THEN RAISE EXCEPTION 'TEST_ARTIFACT_PARTIAL_RUN'; END IF;
    RETURN jsonb_build_object(
      'runId', lower(p_run_id::text), 'ownerId', lower(v_owner_id::text),
      'personId', v_existing_order.customer_id, 'orderId', v_existing_order.id,
      'orderNumber', v_existing_order.order_number, 'orderIndex', v_existing_order.order_index,
      'idempotentReplay', true
    );
  END IF;

  v_person_id := gen_random_uuid()::text;
  v_order_id := gen_random_uuid()::text;
  v_customer_name := 'Fixture teste ' || left(p_run_id::text, 8);

  INSERT INTO public.people (
    id, person_type, full_name, active, is_draft, full_address
  ) VALUES (
    v_person_id, 'customers', v_customer_name, false, true,
    jsonb_build_object('testArtifact', v_identity)
  );

  INSERT INTO public.orders (
    id, order_number, status, customer_id, customer_name, items,
    total_amount, channel, order_data, order_type, order_index,
    stock_processed, deleted, linked_order_id
  ) VALUES (
    v_order_id, 'T-' || v_order_id, 'cancelled', v_person_id, v_customer_name, '[]'::jsonb,
    0, 'ERP', jsonb_build_object('is_test', true, 'testArtifact', v_identity), 'sale', NULL,
    false, false, p_linked_order_id
  );

  RETURN jsonb_build_object(
    'runId', lower(p_run_id::text), 'ownerId', lower(v_owner_id::text),
    'personId', v_person_id, 'orderId', v_order_id,
    'orderNumber', 'T-' || v_order_id, 'orderIndex', NULL,
    'idempotentReplay', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_test_artifact_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_test_artifact_order(uuid, text) TO authenticated;

COMMIT;
