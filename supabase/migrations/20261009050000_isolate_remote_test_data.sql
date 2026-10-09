-- Isola dados sintéticos por execução sem reclassificar registros operacionais.
-- Apenas o marcador explícito legado de pedidos é copiado; produtos e pessoas existentes
-- nunca são inferidos como teste por nome, código, observação ou vínculo comercial.

CREATE TABLE public.test_run_registry (
  test_run_id text PRIMARY KEY CHECK (
    test_run_id ~ '^TEST_AUT_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  label text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retained_fiscal_history', 'cleaned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.test_run_registry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.test_run_registry FROM PUBLIC, anon, authenticated;

ALTER TABLE public.orders ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN test_run_id text;
ALTER TABLE public.people ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.people ADD COLUMN test_run_id text;
ALTER TABLE public.products ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN test_run_id text;
ALTER TABLE public.product_variations ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.product_variations ADD COLUMN test_run_id text;
ALTER TABLE public.order_items ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.order_items ADD COLUMN test_run_id text;
ALTER TABLE public.order_payments ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.order_payments ADD COLUMN test_run_id text;
ALTER TABLE public.order_status_history ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.order_status_history ADD COLUMN test_run_id text;
ALTER TABLE public.inventory_moves ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.inventory_moves ADD COLUMN test_run_id text;
ALTER TABLE public.accounts_receivable ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.accounts_receivable ADD COLUMN test_run_id text;
ALTER TABLE public.financial_transactions ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.financial_transactions ADD COLUMN test_run_id text;
ALTER TABLE public.nfe_documents ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.nfe_documents ADD COLUMN test_run_id text;
ALTER TABLE public.nfe_document_items ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.nfe_document_items ADD COLUMN test_run_id text;
ALTER TABLE public.nfe_fiscal_snapshots ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.nfe_fiscal_snapshots ADD COLUMN test_run_id text;
ALTER TABLE public.nfe_outbound_attempts ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.nfe_outbound_attempts ADD COLUMN test_run_id text;
ALTER TABLE public.nfe_operation_drafts ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.nfe_operation_drafts ADD COLUMN test_run_id text;

-- Migração somente do sinal explícito já persistido em order_data.
UPDATE public.orders
SET is_test = true,
    test_run_id = COALESCE(NULLIF(order_data->>'test_run_id', ''), NULLIF(order_data->>'testRunId', ''))
WHERE order_data->>'is_test' = 'true';

UPDATE public.order_items oi SET is_test = true, test_run_id = o.test_run_id
FROM public.orders o WHERE o.id = oi.order_id AND o.is_test;
UPDATE public.order_payments op SET is_test = true, test_run_id = o.test_run_id
FROM public.orders o WHERE o.id = op.order_id AND o.is_test;
UPDATE public.order_status_history h SET is_test = true, test_run_id = o.test_run_id
FROM public.orders o WHERE o.id = h.order_id AND o.is_test;
UPDATE public.inventory_moves m SET is_test = true, test_run_id = o.test_run_id
FROM public.orders o WHERE o.is_test AND o.id = COALESCE(m.order_id, m.source_order_id);
UPDATE public.accounts_receivable ar SET is_test = true, test_run_id = o.test_run_id
FROM public.orders o WHERE o.is_test AND o.id = ar.order_id;
UPDATE public.financial_transactions ft SET is_test = true, test_run_id = o.test_run_id
FROM public.orders o WHERE o.is_test AND o.id = ft.reference_id
  AND lower(COALESCE(ft.reference_type, '')) IN ('order','orders','sale','return','pedido','devolucao');
UPDATE public.nfe_documents d SET is_test = true, test_run_id = o.test_run_id
FROM public.orders o WHERE o.is_test AND o.id = d.order_id AND d.ambiente = 2;
UPDATE public.nfe_fiscal_snapshots s SET is_test = true, test_run_id = o.test_run_id
FROM public.orders o WHERE o.is_test AND o.id = s.order_id AND s.environment = 2;
UPDATE public.nfe_outbound_attempts a SET is_test = true, test_run_id = o.test_run_id
FROM public.orders o WHERE o.is_test AND o.id = a.order_id AND a.environment = 2;

CREATE INDEX orders_test_run_idx ON public.orders(test_run_id) WHERE is_test;
CREATE INDEX people_test_run_idx ON public.people(test_run_id) WHERE is_test;
CREATE INDEX products_test_run_idx ON public.products(test_run_id) WHERE is_test;
CREATE INDEX product_variations_test_run_idx ON public.product_variations(test_run_id) WHERE is_test;
CREATE INDEX inventory_moves_test_run_idx ON public.inventory_moves(test_run_id) WHERE is_test;
CREATE INDEX financial_transactions_test_run_idx ON public.financial_transactions(test_run_id) WHERE is_test;
CREATE INDEX nfe_documents_test_run_idx ON public.nfe_documents(test_run_id) WHERE is_test;

CREATE OR REPLACE FUNCTION public.test_run_may_write(p_test_run_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(auth.role() = 'service_role', false)
    OR (auth.uid() IS NOT NULL AND public.is_administrator() AND EXISTS (
      SELECT 1 FROM public.test_run_registry r
      WHERE r.test_run_id = p_test_run_id AND r.created_by = auth.uid() AND r.status = 'active'
    ));
$$;
REVOKE ALL ON FUNCTION public.test_run_may_write(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.test_run_may_write(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_test_data_marker()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_test boolean;
  v_run text;
  v_parent_test boolean;
  v_parent_run text;
  v_order_id text;
  v_product_id text;
  v_variation_id text;
  v_environment integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_test AND current_setting('app.test_cleanup_run_id', true) IS DISTINCT FROM OLD.test_run_id THEN
      RAISE EXCEPTION 'TEST_RECORD_CLEANUP_RPC_REQUIRED' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  v_test := COALESCE(NEW.is_test, false);
  v_run := NEW.test_run_id;
  IF TG_TABLE_NAME = 'orders' THEN
    v_test := v_test OR NEW.order_data->>'is_test' = 'true';
    v_run := COALESCE(v_run, NULLIF(NEW.order_data->>'test_run_id',''), NULLIF(NEW.order_data->>'testRunId',''));
    NEW.is_test := v_test;
    NEW.test_run_id := v_run;
    IF v_test THEN
      NEW.order_data := jsonb_set(jsonb_set(COALESCE(NEW.order_data, '{}'::jsonb), '{is_test}', 'true'::jsonb, true), '{test_run_id}', to_jsonb(v_run), true);
      NEW.order_data := NEW.order_data - 'testRunId';
    END IF;
  ELSIF TG_TABLE_NAME = 'product_variations' THEN
    SELECT p.is_test, p.test_run_id INTO v_parent_test, v_parent_run
    FROM public.products p WHERE p.id::text = NEW.product_id::text;
    IF COALESCE(v_parent_test, false) THEN
      IF v_test AND v_run IS DISTINCT FROM v_parent_run THEN RAISE EXCEPTION 'TEST_VARIATION_RUN_MISMATCH' USING ERRCODE='23514'; END IF;
      v_test := true; v_run := v_parent_run; NEW.is_test := true; NEW.test_run_id := v_run;
    ELSIF v_test THEN RAISE EXCEPTION 'TEST_VARIATION_REQUIRES_TEST_PRODUCT' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME IN ('order_items','order_payments','order_status_history','inventory_moves','accounts_receivable','financial_transactions') THEN
    IF TG_TABLE_NAME IN ('order_items','order_payments','order_status_history') THEN
      v_order_id := NEW.order_id;
    ELSIF TG_TABLE_NAME = 'inventory_moves' THEN
      v_order_id := COALESCE(NEW.order_id, NEW.source_order_id);
    ELSIF TG_TABLE_NAME = 'accounts_receivable' THEN
      v_order_id := NEW.order_id;
    ELSIF lower(COALESCE(NEW.reference_type,'')) IN ('order','orders','sale','return','pedido','devolucao') THEN
      v_order_id := NEW.reference_id;
    END IF;
    IF v_order_id IS NOT NULL THEN
      SELECT o.is_test, o.test_run_id INTO v_parent_test, v_parent_run FROM public.orders o WHERE o.id = v_order_id;
      IF COALESCE(v_parent_test,false) THEN
        IF v_test AND v_run IS DISTINCT FROM v_parent_run THEN RAISE EXCEPTION 'TEST_ORDER_CHILD_RUN_MISMATCH' USING ERRCODE='23514'; END IF;
        v_test := true; v_run := v_parent_run; NEW.is_test := true; NEW.test_run_id := v_run;
    ELSIF v_test THEN RAISE EXCEPTION 'TEST_CHILD_REQUIRES_TEST_ORDER' USING ERRCODE='23514';
    END IF;
    IF v_order_id IS NULL AND v_test THEN RAISE EXCEPTION 'TEST_COMMERCIAL_CHILD_REQUIRES_ORDER' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME IN ('nfe_documents','nfe_fiscal_snapshots','nfe_outbound_attempts','nfe_operation_drafts') THEN
    IF TG_TABLE_NAME = 'nfe_operation_drafts' THEN v_order_id := NEW.return_order_id;
    ELSE v_order_id := NEW.order_id; END IF;
    IF v_order_id IS NOT NULL THEN
      SELECT o.is_test, o.test_run_id INTO v_parent_test, v_parent_run FROM public.orders o WHERE o.id = v_order_id;
      IF COALESCE(v_parent_test,false) THEN
        IF v_test AND v_run IS DISTINCT FROM v_parent_run THEN RAISE EXCEPTION 'TEST_FISCAL_RUN_MISMATCH' USING ERRCODE='23514'; END IF;
        v_test := true; v_run := v_parent_run; NEW.is_test := true; NEW.test_run_id := v_run;
      ELSIF v_test THEN RAISE EXCEPTION 'TEST_FISCAL_REQUIRES_TEST_ORDER' USING ERRCODE='23514';
      END IF;
    END IF;
    IF v_test THEN
      IF TG_TABLE_NAME = 'nfe_documents' THEN v_environment := NEW.ambiente;
      ELSIF TG_TABLE_NAME = 'nfe_fiscal_snapshots' THEN v_environment := NEW.environment;
      ELSIF TG_TABLE_NAME = 'nfe_outbound_attempts' THEN v_environment := NEW.environment;
      ELSE v_environment := NEW.environment; END IF;
      IF v_environment IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'TEST_FISCAL_HOMOLOGATION_ONLY' USING ERRCODE='23514'; END IF;
      NEW.test_run_id := v_run;
    END IF;
  ELSIF TG_TABLE_NAME = 'nfe_document_items' THEN
    SELECT d.is_test, d.test_run_id INTO v_parent_test, v_parent_run FROM public.nfe_documents d WHERE d.id = NEW.document_id;
    IF COALESCE(v_parent_test,false) THEN
      IF v_test AND v_run IS DISTINCT FROM v_parent_run THEN RAISE EXCEPTION 'TEST_FISCAL_ITEM_RUN_MISMATCH' USING ERRCODE='23514'; END IF;
      NEW.is_test := true; NEW.test_run_id := v_parent_run; v_test := true; v_run := v_parent_run;
    ELSIF v_test THEN RAISE EXCEPTION 'TEST_FISCAL_ITEM_REQUIRES_TEST_DOCUMENT' USING ERRCODE='23514';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.is_test IS DISTINCT FROM OLD.is_test OR NEW.test_run_id IS DISTINCT FROM OLD.test_run_id) THEN
    RAISE EXCEPTION 'TEST_MARKER_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF NOT v_test AND v_run IS NOT NULL THEN RAISE EXCEPTION 'TEST_RUN_WITHOUT_TEST_MARKER' USING ERRCODE='23514'; END IF;
  IF v_test AND (v_run IS NULL OR NOT public.test_run_may_write(v_run)) THEN
    -- Registros antigos explicitamente marcados podem continuar sendo lidos e sofrer alterações
    -- não relacionadas; inserir, migrar ou gravar entidades novas exige uma execução ativa.
    IF TG_OP = 'INSERT' OR v_run IS NULL OR v_run IS DISTINCT FROM OLD.test_run_id THEN
      RAISE EXCEPTION 'TEST_RUN_NOT_AUTHORIZED' USING ERRCODE='42501';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'orders' AND v_test THEN
    IF NEW.customer_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.people p WHERE p.id = NEW.customer_id AND p.person_type='customers' AND p.is_test AND p.test_run_id = v_run
    ) THEN RAISE EXCEPTION 'TEST_ORDER_REQUIRES_SAME_RUN_CUSTOMER' USING ERRCODE='23514'; END IF;
    IF NEW.linked_order_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = NEW.linked_order_id AND o.is_test AND o.test_run_id = v_run
    ) THEN RAISE EXCEPTION 'TEST_RETURN_REQUIRES_SAME_RUN_ORDER' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME = 'orders' AND NEW.customer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.people p WHERE p.id=NEW.customer_id AND p.is_test
  ) THEN RAISE EXCEPTION 'OPERATIONAL_ORDER_CANNOT_USE_TEST_CUSTOMER' USING ERRCODE='23514';
  ELSIF TG_TABLE_NAME = 'products' AND v_test THEN
    IF NEW.is_combo THEN RAISE EXCEPTION 'TEST_PRODUCT_COMBO_COMPONENTS_NOT_ISOLATED' USING ERRCODE='23514'; END IF;
    IF NEW.supplier_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.people p WHERE p.id=NEW.supplier_id::text AND p.is_test AND p.test_run_id=v_run
    ) THEN RAISE EXCEPTION 'TEST_PRODUCT_REQUIRES_SAME_RUN_SUPPLIER' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME = 'order_items' THEN
    v_product_id := NEW.product_id; v_variation_id := NEW.variation_id;
    IF NEW.is_temporary_product THEN RAISE EXCEPTION 'TEST_ORDER_REQUIRES_CATALOG_PRODUCT' USING ERRCODE='23514'; END IF;
    IF NEW.is_test THEN
      IF NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id::text=v_product_id AND p.is_test AND p.test_run_id=v_run)
        OR NOT EXISTS (SELECT 1 FROM public.product_variations v WHERE v.id::text=v_variation_id AND v.product_id::text=v_product_id AND v.is_test AND v.test_run_id=v_run)
      THEN RAISE EXCEPTION 'TEST_ORDER_REQUIRES_SAME_RUN_PRODUCT_VARIATION' USING ERRCODE='23514'; END IF;
    ELSIF EXISTS (SELECT 1 FROM public.products p WHERE p.id::text=v_product_id AND p.is_test)
      OR EXISTS (SELECT 1 FROM public.product_variations v WHERE v.id::text=v_variation_id AND v.is_test)
    THEN RAISE EXCEPTION 'OPERATIONAL_ORDER_CANNOT_USE_TEST_PRODUCT' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME = 'inventory_moves' THEN
    v_product_id := NEW.product_id; v_variation_id := NEW.variation_id;
    IF NEW.is_test AND (NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id::text=v_product_id AND p.is_test AND p.test_run_id=v_run)
      OR (v_variation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.product_variations v WHERE v.id::text=v_variation_id AND v.is_test AND v.test_run_id=v_run)))
    THEN RAISE EXCEPTION 'TEST_STOCK_MOVE_REQUIRES_SAME_RUN_PRODUCT' USING ERRCODE='23514'; END IF;
    IF NOT NEW.is_test AND EXISTS (SELECT 1 FROM public.products p WHERE p.id::text=v_product_id AND p.is_test)
    THEN RAISE EXCEPTION 'OPERATIONAL_STOCK_CANNOT_USE_TEST_PRODUCT' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_test_marker_orders BEFORE INSERT OR UPDATE OR DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_people BEFORE INSERT OR UPDATE OR DELETE ON public.people FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_products BEFORE INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_variations BEFORE INSERT OR UPDATE OR DELETE ON public.product_variations FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_order_items BEFORE INSERT OR UPDATE OR DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_order_payments BEFORE INSERT OR UPDATE OR DELETE ON public.order_payments FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_order_history BEFORE INSERT OR UPDATE OR DELETE ON public.order_status_history FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_inventory_moves BEFORE INSERT OR UPDATE OR DELETE ON public.inventory_moves FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_receivables BEFORE INSERT OR UPDATE OR DELETE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_financial_transactions BEFORE INSERT OR UPDATE OR DELETE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_nfe_documents BEFORE INSERT OR UPDATE OR DELETE ON public.nfe_documents FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_nfe_document_items BEFORE INSERT OR UPDATE OR DELETE ON public.nfe_document_items FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_nfe_snapshots BEFORE INSERT OR UPDATE OR DELETE ON public.nfe_fiscal_snapshots FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_nfe_attempts BEFORE INSERT OR UPDATE OR DELETE ON public.nfe_outbound_attempts FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();
CREATE TRIGGER guard_test_marker_nfe_drafts BEFORE INSERT OR UPDATE OR DELETE ON public.nfe_operation_drafts FOR EACH ROW EXECUTE FUNCTION public.guard_test_data_marker();

-- Restrições aditivas: preservam as políticas existentes e restringem dados de teste a administradores.
CREATE POLICY test_registry_admin_select ON public.test_run_registry AS RESTRICTIVE FOR SELECT TO authenticated USING (public.is_administrator());
CREATE POLICY test_registry_admin_read ON public.test_run_registry AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_administrator());
CREATE POLICY test_scope_orders ON public.orders AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_people ON public.people AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_products ON public.products AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_variations ON public.product_variations AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_order_items ON public.order_items AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_order_payments ON public.order_payments AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_order_history ON public.order_status_history AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_inventory_moves ON public.inventory_moves AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_receivables ON public.accounts_receivable AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_financial_transactions ON public.financial_transactions AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_nfe_documents ON public.nfe_documents AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_nfe_document_items ON public.nfe_document_items AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_nfe_snapshots ON public.nfe_fiscal_snapshots AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_nfe_attempts ON public.nfe_outbound_attempts AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());
CREATE POLICY test_scope_nfe_drafts ON public.nfe_operation_drafts AS RESTRICTIVE FOR SELECT TO public USING (NOT is_test OR public.is_administrator());

CREATE OR REPLACE FUNCTION public.is_nfe_hml_test_order(p_id text, p_status text, p_deleted boolean, p_data jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT COALESCE(
    p_data->>'is_test' = 'true'
    OR public.is_nfe_hml_technical_order(p_id, p_status, p_deleted, p_data),
    false
  );
$$;

-- Mantém o contrato JSON da RPC agregada e inclui o marcador tipado no filtro server-side.
DO $$
DECLARE v_oid oid; v_def text; v_anchor text := 'AND o.created_at <= p_end';
BEGIN
  SELECT p.oid INTO v_oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='get_dashboard_aggregates'
    AND pg_get_function_identity_arguments(p.oid)='p_start timestamp with time zone, p_end timestamp with time zone, p_group_by text DEFAULT text';
  IF v_oid IS NULL THEN
    SELECT p.oid INTO v_oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='get_dashboard_aggregates' LIMIT 1;
  END IF;
  IF v_oid IS NULL THEN RAISE EXCEPTION 'DASHBOARD_AGGREGATE_FUNCTION_MISSING'; END IF;
  v_def := pg_get_functiondef(v_oid);
  IF position(v_anchor in v_def)=0 THEN RAISE EXCEPTION 'DASHBOARD_AGGREGATE_SHAPE_CHANGED'; END IF;
  EXECUTE replace(v_def, v_anchor, v_anchor || E'\n          AND NOT COALESCE(o.is_test, false)');
END;
$$;

-- Atualiza apenas os dias afetados pelos pedidos que já tinham marcador explícito.
DO $$ DECLARE v_day date; BEGIN
  FOR v_day IN
    SELECT DISTINCT public.parse_order_metric_date(o.order_data->>'date', o.created_at)
    FROM public.orders o WHERE o.is_test
  LOOP
    PERFORM public.refresh_dashboard_metric_day(v_day);
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.begin_test_run(p_label text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_administrator() THEN RAISE EXCEPTION 'TEST_RUN_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
  v_id := 'TEST_AUT_' || gen_random_uuid()::text;
  INSERT INTO public.test_run_registry(test_run_id, created_by, label) VALUES (v_id, auth.uid(), left(NULLIF(btrim(p_label), ''), 120));
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.begin_test_run(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_test_run(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_test_run(p_test_run_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.test_run_registry
  WHERE test_run_id=p_test_run_id AND (created_by=auth.uid() OR auth.role()='service_role') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST_RUN_NOT_FOUND_OR_NOT_OWNED' USING ERRCODE='42501'; END IF;
  IF v_status='cleaned' THEN RETURN jsonb_build_object('status','cleaned','deleted',false); END IF;
  IF v_status='retained_fiscal_history' THEN RETURN jsonb_build_object('status','retained_fiscal_history','deleted',false); END IF;
  IF NOT public.test_run_may_write(p_test_run_id) THEN RAISE EXCEPTION 'TEST_RUN_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;

  IF EXISTS (SELECT 1 FROM public.nfe_documents WHERE is_test AND test_run_id=p_test_run_id)
    OR EXISTS (SELECT 1 FROM public.nfe_fiscal_snapshots WHERE is_test AND test_run_id=p_test_run_id)
    OR EXISTS (SELECT 1 FROM public.nfe_outbound_attempts WHERE is_test AND test_run_id=p_test_run_id)
    OR EXISTS (SELECT 1 FROM public.nfe_operation_drafts WHERE is_test AND test_run_id=p_test_run_id)
  THEN
    UPDATE public.test_run_registry SET status='retained_fiscal_history', updated_at=now() WHERE test_run_id=p_test_run_id;
    RETURN jsonb_build_object('status','retained_fiscal_history','deleted',false);
  END IF;

  IF EXISTS (SELECT 1 FROM public.orders o JOIN public.people p ON p.id=o.customer_id
      WHERE p.is_test AND p.test_run_id=p_test_run_id AND NOT (o.is_test AND o.test_run_id=p_test_run_id))
    OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.products p ON p.id::text=oi.product_id
      WHERE p.is_test AND p.test_run_id=p_test_run_id AND NOT (oi.is_test AND oi.test_run_id=p_test_run_id))
    OR EXISTS (SELECT 1 FROM public.inventory_moves m JOIN public.products p ON p.id::text=m.product_id
      WHERE p.is_test AND p.test_run_id=p_test_run_id AND NOT (m.is_test AND m.test_run_id=p_test_run_id))
  THEN RAISE EXCEPTION 'TEST_RUN_HAS_CROSS_RUN_REFERENCES' USING ERRCODE='23514'; END IF;

  PERFORM set_config('app.test_cleanup_run_id',p_test_run_id,true);
  DELETE FROM public.financial_transactions WHERE is_test AND test_run_id=p_test_run_id;
  DELETE FROM public.accounts_receivable WHERE is_test AND test_run_id=p_test_run_id;
  DELETE FROM public.inventory_moves WHERE is_test AND test_run_id=p_test_run_id;
  DELETE FROM public.order_status_history WHERE is_test AND test_run_id=p_test_run_id;
  DELETE FROM public.order_payments WHERE is_test AND test_run_id=p_test_run_id;
  DELETE FROM public.order_items WHERE is_test AND test_run_id=p_test_run_id;
  DELETE FROM public.orders WHERE is_test AND test_run_id=p_test_run_id;
  DELETE FROM public.product_variations WHERE is_test AND test_run_id=p_test_run_id;
  DELETE FROM public.products WHERE is_test AND test_run_id=p_test_run_id;
  DELETE FROM public.people WHERE is_test AND test_run_id=p_test_run_id;
  UPDATE public.test_run_registry SET status='cleaned',updated_at=now() WHERE test_run_id=p_test_run_id;
  RETURN jsonb_build_object('status','cleaned','deleted',true);
END; $$;
REVOKE ALL ON FUNCTION public.cleanup_test_run(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_test_run(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.guard_test_data_marker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_test_data_marker() TO service_role;

COMMENT ON TABLE public.test_run_registry IS 'Execuções E2E autorizadas; marcadores de dados são vinculados a uma execução ativa e criada por administrador.';
COMMENT ON COLUMN public.orders.is_test IS 'Marcador persistente de dado sintético; não pode ser adicionado a registro operacional existente.';
COMMENT ON COLUMN public.orders.test_run_id IS 'Identificador TEST_AUT_<uuid> da execução que criou o registro sintético.';
