SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

ALTER TABLE public.dashboard_sales_reconciliation_log ADD COLUMN trigger_error_code text;

-- Se o consolidado falhar, ele deixa de ser consultável na mesma transação
-- que grava o pedido; o Dashboard continua com o cálculo direto.
CREATE OR REPLACE FUNCTION public.dashboard_sales_order_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
  UPDATE public.dashboard_sales_state SET ready = false, last_error_code = SQLSTATE WHERE singleton;
  INSERT INTO public.dashboard_sales_reconciliation_log
    (fact_differences, orphan_facts, daily_differences, unsupported_orders, trigger_error_code)
    VALUES (0, 0, 0, 0, SQLSTATE);
  RETURN COALESCE(NEW, OLD);
END;
$$;
