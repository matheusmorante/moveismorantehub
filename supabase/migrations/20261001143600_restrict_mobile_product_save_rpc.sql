-- Limita o RPC do formulário mobile ao papel de usuário autenticado.
REVOKE ALL ON FUNCTION public.save_mobile_product_transaction(
  uuid, timestamptz, boolean, uuid, jsonb, jsonb, uuid[], jsonb
) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.save_mobile_product_transaction(
  uuid, timestamptz, boolean, uuid, jsonb, jsonb, uuid[], jsonb
) TO authenticated;
