-- Keep the ERP's authenticated draft deletion path while removing the
-- default PUBLIC/anon EXECUTE grant from this SECURITY DEFINER RPC.
-- service_role remains available for controlled server-side operations.
BEGIN;

ALTER FUNCTION public.delete_goods_receipt_draft_transaction(uuid)
  SET search_path = '';

REVOKE ALL ON FUNCTION public.delete_goods_receipt_draft_transaction(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_goods_receipt_draft_transaction(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_goods_receipt_draft_transaction(uuid)
  TO authenticated, service_role;

COMMIT;
