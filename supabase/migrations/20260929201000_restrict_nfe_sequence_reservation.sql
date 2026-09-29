REVOKE ALL ON FUNCTION public.reserve_next_nfe_number(varchar, varchar, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_next_nfe_number(varchar, varchar, integer, integer)
  TO service_role;
