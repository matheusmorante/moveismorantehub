-- Os filtros administrativos do catálogo são carregados apenas por atendentes autenticados.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

REVOKE ALL ON FUNCTION public.customer_support_catalog_metadata() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_support_catalog_metadata() TO authenticated;

COMMIT;
