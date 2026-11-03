-- Consolidado paralelo ao dashboard_daily_metrics legado. A leitura nova fica
-- desativada até o preenchimento e a reconciliação integral terminarem.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
CREATE TABLE public.dashboard_sales_order_facts (
  order_id text PRIMARY KEY,
  occurred_at timestamptz,
  metric_date date,
  revenue numeric NOT NULL,
  sale_count bigint NOT NULL,
  paid_revenue numeric NOT NULL
);

CREATE INDEX dashboard_sales_order_facts_occurred_at_idx
  ON public.dashboard_sales_order_facts (occurred_at)
  INCLUDE (metric_date, revenue, sale_count, paid_revenue);
CREATE INDEX dashboard_sales_order_facts_metric_date_idx
  ON public.dashboard_sales_order_facts (metric_date);
CREATE INDEX dashboard_sales_order_facts_missing_date_idx
  ON public.dashboard_sales_order_facts (order_id)
  WHERE occurred_at IS NULL AND sale_count <> 0;

CREATE TABLE public.dashboard_sales_daily (
  metric_date date PRIMARY KEY,
  revenue numeric NOT NULL DEFAULT 0,
  sale_count bigint NOT NULL DEFAULT 0,
  paid_revenue numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dashboard_sales_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  ready boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  last_error_code text
);
INSERT INTO public.dashboard_sales_state (singleton) VALUES (true);

CREATE TABLE public.dashboard_sales_reconciliation_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checked_at timestamptz NOT NULL DEFAULT now(),
  fact_differences bigint NOT NULL,
  orphan_facts bigint NOT NULL,
  daily_differences bigint NOT NULL,
  unsupported_orders bigint NOT NULL
);

ALTER TABLE public.dashboard_sales_order_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_sales_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_sales_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_sales_reconciliation_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dashboard_sales_order_facts, public.dashboard_sales_daily,
  public.dashboard_sales_state, public.dashboard_sales_reconciliation_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_sales_order_facts, public.dashboard_sales_daily,
  public.dashboard_sales_state, public.dashboard_sales_reconciliation_log TO service_role;

-- Reproduz a projeção de pedidos do Dashboard e exclui os artefatos de teste.
CREATE FUNCTION public.dashboard_sales_contribution(p_order public.orders)
RETURNS TABLE (occurred_at timestamptz, metric_date date, revenue numeric, sale_count bigint, paid_revenue numeric)
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  WITH normalized AS (
    SELECT (p_order).created_at AS occurred_at,
      ((p_order).created_at AT TIME ZONE 'UTC')::date AS metric_date,
      pg_catalog.lower(pg_catalog.btrim(COALESCE(NULLIF((p_order).status, ''), 'draft'))) AS status,
      COALESCE(NULLIF((p_order).order_type, ''), 'sale') AS order_type,
      CASE WHEN (p_order).total_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN 0
        ELSE COALESCE((p_order).total_amount, 0) END AS amount,
      pg_catalog.lower(pg_catalog.btrim(COALESCE((p_order).marketing_origin, ''))) AS origin,
      NOT COALESCE((p_order).deleted, false)
        AND ((p_order).order_number IS NOT NULL OR (p_order).status IS NOT NULL)
        AND NOT public.test_artifact_is_test(pg_catalog.to_jsonb(p_order))
        AND NOT public.is_nfe_hml_test_order((p_order).id, (p_order).status, (p_order).deleted, (p_order).order_data)
        AND COALESCE((p_order).order_data #>> '{testArtifact,isTest}', 'false') <> 'true'
        AND COALESCE((p_order).id, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
        AND COALESCE((p_order).order_number, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)'
        AND COALESCE((p_order).customer_name, '') !~* '^[[:space:]]*(TEST_AUT_|NFEHML26P[0-9]*)|[[]?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)' AS eligible
  ), fact AS (
    SELECT *, CASE
      WHEN eligible AND status IN ('scheduled', 'fulfilled') AND order_type IN ('sale', 'showroom') THEN 1
      WHEN eligible AND status = 'fulfilled' AND order_type = 'return' THEN -1
      ELSE 0 END AS factor
    FROM normalized
  )
  SELECT occurred_at, metric_date, factor * amount,
    CASE WHEN factor = 1 THEN 1::bigint ELSE 0::bigint END,
    CASE WHEN origin = 'paid' OR pg_catalog.strpos(origin, 'trafego') > 0
      OR pg_catalog.strpos(origin, 'tráfego') > 0 OR pg_catalog.strpos(origin, 'ads') > 0
      OR pg_catalog.strpos(origin, 'facebook') > 0 OR pg_catalog.strpos(origin, 'instagram') > 0
      OR pg_catalog.strpos(origin, 'google') > 0 THEN factor * amount ELSE 0 END
  FROM fact;
$$;

CREATE FUNCTION public.dashboard_sales_upsert_fact(p_order public.orders)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_old public.dashboard_sales_order_facts%ROWTYPE;
  v_new record;
  v_exists boolean;
BEGIN
  SELECT * INTO v_old FROM public.dashboard_sales_order_facts WHERE order_id = (p_order).id FOR UPDATE;
  v_exists := FOUND;
  SELECT * INTO v_new FROM public.dashboard_sales_contribution(p_order);
  IF v_exists AND ROW(v_old.occurred_at, v_old.metric_date, v_old.revenue, v_old.sale_count, v_old.paid_revenue)
    IS NOT DISTINCT FROM ROW(v_new.occurred_at, v_new.metric_date, v_new.revenue, v_new.sale_count, v_new.paid_revenue) THEN
    RETURN;
  END IF;

  INSERT INTO public.dashboard_sales_order_facts (order_id, occurred_at, metric_date, revenue, sale_count, paid_revenue)
  VALUES ((p_order).id, v_new.occurred_at, v_new.metric_date, v_new.revenue, v_new.sale_count, v_new.paid_revenue)
  ON CONFLICT (order_id) DO UPDATE SET occurred_at = EXCLUDED.occurred_at, metric_date = EXCLUDED.metric_date,
    revenue = EXCLUDED.revenue, sale_count = EXCLUDED.sale_count, paid_revenue = EXCLUDED.paid_revenue;

  INSERT INTO public.dashboard_sales_daily AS daily (metric_date, revenue, sale_count, paid_revenue)
  SELECT delta.metric_date, SUM(delta.revenue), SUM(delta.sale_count)::bigint, SUM(delta.paid_revenue)
  FROM (
    SELECT v_old.metric_date AS metric_date, -v_old.revenue AS revenue,
      -v_old.sale_count AS sale_count, -v_old.paid_revenue AS paid_revenue WHERE v_exists
    UNION ALL
    SELECT v_new.metric_date, v_new.revenue, v_new.sale_count, v_new.paid_revenue
  ) AS delta
  WHERE delta.metric_date IS NOT NULL
  GROUP BY delta.metric_date
  HAVING SUM(delta.revenue) <> 0 OR SUM(delta.sale_count) <> 0 OR SUM(delta.paid_revenue) <> 0
  ORDER BY delta.metric_date
  ON CONFLICT (metric_date) DO UPDATE SET revenue = daily.revenue + EXCLUDED.revenue,
    sale_count = daily.sale_count + EXCLUDED.sale_count,
    paid_revenue = daily.paid_revenue + EXCLUDED.paid_revenue, updated_at = pg_catalog.now();
END;
$$;

CREATE FUNCTION public.dashboard_sales_remove_fact(p_order_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old public.dashboard_sales_order_facts%ROWTYPE;
BEGIN
  SELECT * INTO v_old FROM public.dashboard_sales_order_facts WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  DELETE FROM public.dashboard_sales_order_facts WHERE order_id = p_order_id;
  IF v_old.metric_date IS NOT NULL AND (v_old.revenue <> 0 OR v_old.sale_count <> 0 OR v_old.paid_revenue <> 0) THEN
    INSERT INTO public.dashboard_sales_daily AS daily (metric_date, revenue, sale_count, paid_revenue)
    VALUES (v_old.metric_date, -v_old.revenue, -v_old.sale_count, -v_old.paid_revenue)
    ON CONFLICT (metric_date) DO UPDATE SET revenue = daily.revenue + EXCLUDED.revenue,
      sale_count = daily.sale_count + EXCLUDED.sale_count,
      paid_revenue = daily.paid_revenue + EXCLUDED.paid_revenue, updated_at = pg_catalog.now();
  END IF;
END;
$$;

CREATE FUNCTION public.dashboard_sales_order_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_ready boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.dashboard_sales_remove_fact(OLD.id);
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.id IS DISTINCT FROM NEW.id THEN
    PERFORM public.dashboard_sales_remove_fact(OLD.id);
  END IF;
  PERFORM public.dashboard_sales_upsert_fact(NEW);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Durante a preparação há fallback; após ativar, pedido e agregado revertem juntos.
  SELECT ready INTO v_ready FROM public.dashboard_sales_state WHERE singleton FOR UPDATE;
  IF COALESCE(v_ready, false) THEN RAISE; END IF;
  UPDATE public.dashboard_sales_state SET last_error_code = SQLSTATE WHERE singleton;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- O trigger é instalado em migration separada, após revisar a contribuição no banco.

CREATE FUNCTION public.dashboard_sales_backfill(p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE; v_count integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger t
    WHERE t.tgrelid = 'public.orders'::pg_catalog.regclass AND t.tgname = 'zz_dashboard_sales_incremental'
      AND NOT t.tgisinternal AND t.tgenabled IN ('O', 'A')) THEN
    RAISE EXCEPTION 'Captura incremental não está ativa';
  END IF;
  FOR v_order IN
    SELECT o.* FROM public.orders o
    WHERE NOT EXISTS (SELECT 1 FROM public.dashboard_sales_order_facts f WHERE f.order_id = o.id)
    ORDER BY o.created_at NULLS LAST, o.id
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500)) FOR UPDATE OF o SKIP LOCKED
  LOOP
    PERFORM public.dashboard_sales_upsert_fact(v_order);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE FUNCTION public.dashboard_sales_verify(p_activate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_fact_differences bigint; v_orphans bigint; v_daily_differences bigint; v_unsupported bigint;
  v_capture_enabled boolean;
BEGIN
  PERFORM 1 FROM public.dashboard_sales_state WHERE singleton FOR UPDATE;
  SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger t
    WHERE t.tgrelid = 'public.orders'::pg_catalog.regclass AND t.tgname = 'zz_dashboard_sales_incremental'
      AND NOT t.tgisinternal AND t.tgenabled IN ('O', 'A')) INTO v_capture_enabled;
  SELECT COUNT(*) INTO v_fact_differences
  FROM public.orders o
  CROSS JOIN LATERAL public.dashboard_sales_contribution(o) c
  LEFT JOIN public.dashboard_sales_order_facts f ON f.order_id = o.id
  WHERE f.order_id IS NULL OR ROW(f.occurred_at, f.metric_date, f.revenue, f.sale_count, f.paid_revenue)
    IS DISTINCT FROM ROW(c.occurred_at, c.metric_date, c.revenue, c.sale_count, c.paid_revenue);
  SELECT COUNT(*) INTO v_orphans FROM public.dashboard_sales_order_facts f
    WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = f.order_id);
  WITH expected AS (
    SELECT metric_date, SUM(revenue) AS revenue, SUM(sale_count) AS sale_count, SUM(paid_revenue) AS paid_revenue
    FROM public.dashboard_sales_order_facts WHERE metric_date IS NOT NULL GROUP BY metric_date
  )
  SELECT COUNT(*) INTO v_daily_differences FROM expected e FULL JOIN public.dashboard_sales_daily d USING (metric_date)
  WHERE COALESCE(e.revenue, 0) IS DISTINCT FROM COALESCE(d.revenue, 0)
     OR COALESCE(e.sale_count, 0) IS DISTINCT FROM COALESCE(d.sale_count, 0)
     OR COALESCE(e.paid_revenue, 0) IS DISTINCT FROM COALESCE(d.paid_revenue, 0);
  SELECT COUNT(*) INTO v_unsupported FROM public.orders o
    JOIN public.dashboard_sales_order_facts f ON f.order_id = o.id
    WHERE o.created_at IS NULL AND o.status = 'scheduled' AND f.sale_count <> 0;
  INSERT INTO public.dashboard_sales_reconciliation_log
    (fact_differences, orphan_facts, daily_differences, unsupported_orders)
    VALUES (v_fact_differences, v_orphans, v_daily_differences, v_unsupported);
  UPDATE public.dashboard_sales_state SET
    ready = CASE WHEN p_activate THEN v_capture_enabled AND v_fact_differences = 0 AND v_orphans = 0 AND v_daily_differences = 0 AND v_unsupported = 0
      WHEN v_fact_differences <> 0 OR v_orphans <> 0 OR v_daily_differences <> 0 OR v_unsupported <> 0 THEN false ELSE ready END,
    last_verified_at = pg_catalog.now(), last_error_code = NULL WHERE singleton;
  RETURN pg_catalog.jsonb_build_object('factDifferences', v_fact_differences, 'orphanFacts', v_orphans,
    'dailyDifferences', v_daily_differences, 'unsupportedOrders', v_unsupported, 'captureEnabled', v_capture_enabled);
END;
$$;

-- Reprocessa apenas fatos divergentes na janela. Repetir até retornar zero.
CREATE FUNCTION public.dashboard_sales_repair_facts(p_from date, p_to date, p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE; v_orphan text; v_count integer := 0; v_limit integer;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN RAISE EXCEPTION 'Período inválido'; END IF;
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 100), 500));
  UPDATE public.dashboard_sales_state SET ready = false WHERE singleton;
  FOR v_order IN
    SELECT o.* FROM public.orders o
    CROSS JOIN LATERAL public.dashboard_sales_contribution(o) c
    LEFT JOIN public.dashboard_sales_order_facts f ON f.order_id = o.id
    WHERE (c.metric_date BETWEEN p_from AND p_to OR f.metric_date BETWEEN p_from AND p_to)
      AND (f.order_id IS NULL OR ROW(f.occurred_at, f.metric_date, f.revenue, f.sale_count, f.paid_revenue)
        IS DISTINCT FROM ROW(c.occurred_at, c.metric_date, c.revenue, c.sale_count, c.paid_revenue))
    ORDER BY o.created_at NULLS LAST, o.id LIMIT v_limit FOR UPDATE OF o SKIP LOCKED
  LOOP
    PERFORM public.dashboard_sales_upsert_fact(v_order);
    v_count := v_count + 1;
  END LOOP;
  FOR v_orphan IN
    SELECT f.order_id FROM public.dashboard_sales_order_facts f
    WHERE f.metric_date BETWEEN p_from AND p_to
      AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = f.order_id)
    ORDER BY f.metric_date, f.order_id LIMIT (v_limit - v_count) FOR UPDATE OF f SKIP LOCKED
  LOOP
    PERFORM public.dashboard_sales_remove_fact(v_orphan);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Corrige totais de dias divergentes a partir dos fatos já reconciliados.
CREATE FUNCTION public.dashboard_sales_repair_days(p_from date, p_to date, p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_day date; v_revenue numeric; v_sales bigint; v_paid numeric; v_count integer := 0;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN RAISE EXCEPTION 'Período inválido'; END IF;
  UPDATE public.dashboard_sales_state SET ready = false WHERE singleton;
  FOR v_day IN
    WITH expected AS (
      SELECT metric_date, SUM(revenue) AS revenue, SUM(sale_count) AS sale_count, SUM(paid_revenue) AS paid_revenue
      FROM public.dashboard_sales_order_facts WHERE metric_date BETWEEN p_from AND p_to GROUP BY metric_date
    )
    SELECT COALESCE(e.metric_date, d.metric_date) FROM expected e
      FULL JOIN (SELECT * FROM public.dashboard_sales_daily WHERE metric_date BETWEEN p_from AND p_to) d USING (metric_date)
    WHERE COALESCE(e.revenue, 0) IS DISTINCT FROM COALESCE(d.revenue, 0)
       OR COALESCE(e.sale_count, 0) IS DISTINCT FROM COALESCE(d.sale_count, 0)
       OR COALESCE(e.paid_revenue, 0) IS DISTINCT FROM COALESCE(d.paid_revenue, 0)
    ORDER BY 1 LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500))
  LOOP
    INSERT INTO public.dashboard_sales_daily (metric_date) VALUES (v_day) ON CONFLICT (metric_date) DO NOTHING;
    PERFORM 1 FROM public.dashboard_sales_daily WHERE metric_date = v_day FOR UPDATE;
    SELECT COALESCE(SUM(revenue), 0), COALESCE(SUM(sale_count), 0), COALESCE(SUM(paid_revenue), 0)
      INTO v_revenue, v_sales, v_paid FROM public.dashboard_sales_order_facts WHERE metric_date = v_day;
    UPDATE public.dashboard_sales_daily SET revenue = v_revenue, sale_count = v_sales,
      paid_revenue = v_paid, updated_at = pg_catalog.now() WHERE metric_date = v_day;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Intervalo semiaberto; os dias UTC completos usam o consolidado e as bordas usam fatos.
CREATE FUNCTION public.dashboard_sales_range(p_start timestamptz, p_end_exclusive timestamptz)
RETURNS TABLE (revenue numeric, sale_count bigint, paid_revenue numeric)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE v_first date; v_after date;
BEGIN
  IF p_start >= p_end_exclusive THEN
    RETURN QUERY SELECT 0::numeric, 0::bigint, 0::numeric;
    RETURN;
  END IF;
  v_first := (p_start AT TIME ZONE 'UTC')::date;
  IF p_start > (v_first::timestamp AT TIME ZONE 'UTC') THEN v_first := v_first + 1; END IF;
  v_after := (p_end_exclusive AT TIME ZONE 'UTC')::date;
  RETURN QUERY
  SELECT COALESCE(SUM(parts.revenue), 0), COALESCE(SUM(parts.sale_count), 0)::bigint, COALESCE(SUM(parts.paid_revenue), 0)
  FROM (
    SELECT d.revenue, d.sale_count, d.paid_revenue FROM public.dashboard_sales_daily d
      WHERE d.metric_date >= v_first AND d.metric_date < v_after
    UNION ALL
    SELECT f.revenue, f.sale_count, f.paid_revenue FROM public.dashboard_sales_order_facts f
      WHERE f.occurred_at >= p_start AND f.occurred_at < p_end_exclusive
        AND (f.metric_date < v_first OR f.metric_date >= v_after)
  ) parts;
END;
$$;

CREATE FUNCTION public.get_dashboard_sales_summary(
  p_current_start timestamptz, p_current_end timestamptz,
  p_previous_start timestamptz, p_previous_end timestamptz
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_allowed boolean; v_ready boolean; v_current record; v_previous record; v_previous_end_exclusive timestamptz;
BEGIN
  SELECT CASE WHEN COALESCE(pg_catalog.cardinality(p.roles), 0) > 0
    THEN p.roles && ARRAY['administrator', 'manager']::text[]
    ELSE p.role IN ('administrator', 'manager') END INTO v_allowed
  FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_allowed, false) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501'; END IF;
  -- O ERP atual usa um único escopo de pedidos. Uma futura segregação deve
  -- desativar esta leitura até o consolidado incorporar a nova dimensão.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = 'public.orders'::pg_catalog.regclass AND NOT a.attisdropped
      AND a.attname IN ('company_id', 'tenant_id', 'organization_id', 'establishment_id', 'unit_id')
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'orders' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'public' = ANY(p.roles) AND p.qual = 'true'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'orders'
      AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'RESTRICTIVE'
  ) THEN
    RETURN pg_catalog.jsonb_build_object('ready', false);
  END IF;
  SELECT ready INTO v_ready FROM public.dashboard_sales_state WHERE singleton;
  IF NOT COALESCE(v_ready, false)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger t
      WHERE t.tgrelid = 'public.orders'::pg_catalog.regclass AND t.tgname = 'zz_dashboard_sales_incremental'
        AND NOT t.tgisinternal AND t.tgenabled IN ('O', 'A'))
    OR EXISTS (SELECT 1 FROM public.dashboard_sales_order_facts WHERE occurred_at IS NULL AND sale_count <> 0)
    OR p_current_start IS NULL OR p_current_end IS NULL
    OR p_previous_start IS NULL OR p_previous_end IS NULL
    OR p_current_start > p_current_end OR p_previous_start > p_previous_end
    OR p_previous_start > p_current_start OR p_previous_end > p_current_end THEN
    RETURN pg_catalog.jsonb_build_object('ready', false);
  END IF;
  -- A consulta original limita o fim corrente no banco; Date do navegador arredonda
  -- timestamps para milissegundos e dá prioridade ao período corrente na sobreposição.
  SELECT * INTO v_current FROM public.dashboard_sales_range(p_current_start, p_current_end + interval '1 microsecond');
  v_previous_end_exclusive := LEAST(p_previous_end + interval '1 millisecond', p_current_start, p_current_end + interval '1 microsecond');
  SELECT * INTO v_previous FROM public.dashboard_sales_range(p_previous_start, v_previous_end_exclusive);
  RETURN pg_catalog.jsonb_build_object('ready', true,
    'current', pg_catalog.jsonb_build_object('totalSales', v_current.revenue, 'saleCount', v_current.sale_count, 'paidTrafficSalesValue', v_current.paid_revenue),
    'previous', pg_catalog.jsonb_build_object('totalSales', v_previous.revenue, 'saleCount', v_previous.sale_count, 'paidTrafficSalesValue', v_previous.paid_revenue));
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_sales_contribution(public.orders), public.dashboard_sales_upsert_fact(public.orders),
  public.dashboard_sales_remove_fact(text), public.dashboard_sales_order_trigger(), public.dashboard_sales_backfill(integer),
  public.dashboard_sales_verify(boolean), public.dashboard_sales_repair_facts(date, date, integer),
  public.dashboard_sales_repair_days(date, date, integer), public.dashboard_sales_range(timestamptz, timestamptz),
  public.get_dashboard_sales_summary(timestamptz, timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_sales_backfill(integer), public.dashboard_sales_verify(boolean),
  public.dashboard_sales_repair_facts(date, date, integer), public.dashboard_sales_repair_days(date, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_sales_summary(timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated;
