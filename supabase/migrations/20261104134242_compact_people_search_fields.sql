-- Computed fields preserve each caller's search scope and run as the caller,
-- so row-level security and column access remain in effect.
CREATE FUNCTION public.search_people_main_text(public.people)
RETURNS text LANGUAGE sql STABLE PARALLEL SAFE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT public.immutable_unaccent(pg_catalog.concat_ws(' ',
    ($1).full_name, ($1).social_name, ($1).cpf_cnpj, ($1).phone, ($1).email));
$$;

CREATE FUNCTION public.search_people_supplier_text(public.people)
RETURNS text LANGUAGE sql STABLE PARALLEL SAFE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT public.immutable_unaccent(pg_catalog.concat_ws(' ',
    ($1).full_name, ($1).nickname, ($1).cpf_cnpj, ($1).email));
$$;

CREATE FUNCTION public.search_people_inbound_text(public.people)
RETURNS text LANGUAGE sql STABLE PARALLEL SAFE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT public.immutable_unaccent(pg_catalog.concat_ws(' ',
    ($1).full_name, ($1).social_name, ($1).nickname, ($1).cpf_cnpj));
$$;

REVOKE ALL ON FUNCTION public.search_people_main_text(public.people) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_people_supplier_text(public.people) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_people_inbound_text(public.people) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_people_main_text(public.people) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_people_supplier_text(public.people) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_people_inbound_text(public.people) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
