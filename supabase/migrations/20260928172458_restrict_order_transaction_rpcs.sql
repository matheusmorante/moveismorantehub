-- The ERP calls create_order_with_inventory_transaction directly. Its internal
-- helper save_order_transaction must not be available as a separate Data API RPC.
begin;

revoke all on function public.create_order_with_inventory_transaction(
  text, jsonb, jsonb, jsonb, boolean
) from public, anon;

revoke all on function public.save_order_transaction(
  text, jsonb, jsonb, jsonb, boolean
) from public, anon, authenticated;

grant execute on function public.create_order_with_inventory_transaction(
  text, jsonb, jsonb, jsonb, boolean
) to authenticated, service_role;
grant execute on function public.save_order_transaction(
  text, jsonb, jsonb, jsonb, boolean
) to service_role;

commit;
