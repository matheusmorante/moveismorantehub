-- Keep receipt confirmation behind the checked ERP RPC. The lower-level
-- transaction is internal and must not be callable through PostgREST clients.
BEGIN;

ALTER FUNCTION public.confirm_goods_receipt_transaction(jsonb, jsonb)
  SET search_path = '';
REVOKE ALL ON FUNCTION public.confirm_goods_receipt_transaction(jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_goods_receipt_transaction(jsonb, jsonb)
  TO service_role;

-- The ERP invokes this checked entry point after login. Keep that path and
-- server-side access while removing the inherited PUBLIC/anon grant.
ALTER FUNCTION public.confirm_goods_receipt_checked_transaction(jsonb, jsonb)
  SET search_path = '';
REVOKE ALL ON FUNCTION public.confirm_goods_receipt_checked_transaction(jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_goods_receipt_checked_transaction(jsonb, jsonb)
  TO authenticated, service_role;

COMMIT;
