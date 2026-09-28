-- Hardening security advisors: Set immutable search_path on public schema functions
-- Fixes Supabase Advisor lint rule: 0011_function_search_path_mutable

ALTER FUNCTION public.block_product_delete() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_generate_sku_prefix(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.immutable_unaccent(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_order_columns() SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_auto_generate_sku() SET search_path = public, pg_temp;
