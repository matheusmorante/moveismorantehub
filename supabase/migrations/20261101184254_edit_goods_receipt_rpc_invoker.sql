BEGIN;

ALTER FUNCTION public.edit_goods_receipt_checked_transaction(jsonb, jsonb)
  SECURITY INVOKER;
ALTER FUNCTION public.edit_goods_receipt_checked_transaction(jsonb, jsonb)
  SET search_path = '';
REVOKE ALL ON FUNCTION public.edit_goods_receipt_checked_transaction(jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_goods_receipt_checked_transaction(jsonb, jsonb)
  TO authenticated, service_role;

COMMIT;
