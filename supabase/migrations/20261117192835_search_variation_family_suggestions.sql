CREATE OR REPLACE FUNCTION public.search_variation_family_suggestions(
  p_search text,
  p_source_parent_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  code text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  WITH input AS (
    SELECT public.immutable_unaccent(lower(btrim(coalesce(p_search, '')))) AS query
  ),
  terms AS (
    SELECT token.value AS term
    FROM input
    CROSS JOIN LATERAL regexp_split_to_table(input.query, '[[:space:]]+') AS token(value)
    WHERE token.value <> ''
  ),
  candidates AS (
    SELECT
      product.id,
      product.name,
      product.description,
      product.code,
      public.immutable_unaccent(lower(
        (CASE
          WHEN product.name IS NOT NULL AND product.name <> '' THEN product.name
          ELSE coalesce(product.description, '')
        END) || ' ' || product.code
      )) AS searchable_text
    FROM public.products AS product
    WHERE product.deleted = false
      AND product.code IS NOT NULL
      AND product.code <> ''
      AND product.id <> p_source_parent_id
  )
  SELECT candidate.id, candidate.name, candidate.description, candidate.code
  FROM candidates AS candidate
  CROSS JOIN input
  WHERE char_length(input.query) >= 3
    AND NOT EXISTS (
      SELECT 1
      FROM terms
      WHERE position(terms.term IN candidate.searchable_text) = 0
    )
  ORDER BY candidate.name ASC, candidate.id ASC
  LIMIT 5;
$function$;

REVOKE ALL ON FUNCTION public.search_variation_family_suggestions(text, uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.search_variation_family_suggestions(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.search_variation_family_suggestions(text, uuid)
  IS 'Returns up to five eligible product-family suggestions for an authenticated variation move; filtering, source exclusion, and ordering happen before the limit. SECURITY INVOKER preserves product RLS.';
