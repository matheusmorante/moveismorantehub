-- Computed field for list projections: return only the number of attached paths.
-- This avoids rewriting/backfilling stock_unavailabilities while keeping photos
-- available to the ERP when the user opens the preview.
CREATE FUNCTION public.stock_unavailability_photo_count(public.stock_unavailabilities)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT COALESCE(pg_catalog.cardinality(($1).photos), 0);
$function$;

-- Keep the helper available only to authenticated list consumers. It receives
-- the already-authorized row from PostgREST and does not read other records.
REVOKE ALL ON FUNCTION public.stock_unavailability_photo_count(public.stock_unavailabilities) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.stock_unavailability_photo_count(public.stock_unavailabilities) FROM anon;
GRANT EXECUTE ON FUNCTION public.stock_unavailability_photo_count(public.stock_unavailabilities) TO authenticated;

NOTIFY pgrst, 'reload schema';
