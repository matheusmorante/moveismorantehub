BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- A telemetria do ERP e do app é usada por sessões autenticadas; a API e as
-- funções de backend usam service_role. Não há consumidor anônimo no catálogo.
REVOKE ALL ON TABLE public.api_usage_logs, public.api_usage_daily FROM anon;
REVOKE DELETE, TRUNCATE ON TABLE public.api_usage_logs, public.api_usage_daily FROM authenticated;

-- O escritor é SECURITY DEFINER; revogar só as tabelas não bloquearia chamadas
-- anônimas à função. A concessão explícita a authenticated/service_role fica.
REVOKE EXECUTE ON FUNCTION public.record_api_usage_atomic(
  text, text, text, numeric, text, integer, text, text, numeric, boolean, integer, text, text
) FROM PUBLIC, anon;

COMMIT;
