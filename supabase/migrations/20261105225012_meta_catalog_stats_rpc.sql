CREATE OR REPLACE FUNCTION public.get_meta_catalog_stats()
RETURNS TABLE (
  published_simple bigint,
  published_variations bigint,
  not_published bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT
    count(*) FILTER (
      WHERE parent.status = 'published'
        AND variation.id IS NULL
    )::bigint AS published_simple,
    count(variation.id) FILTER (
      WHERE parent.status = 'published'
        AND (
          variation.status = 'published'
          OR variation.status IS NULL
          OR variation.status = ''
        )
    )::bigint AS published_variations,
    (
      count(*) FILTER (
        WHERE parent.status IS DISTINCT FROM 'published'
          AND variation.id IS NULL
      )
      + count(variation.id) FILTER (
        WHERE parent.status IS DISTINCT FROM 'published'
      )
      + count(variation.id) FILTER (
        WHERE parent.status = 'published'
          AND variation.status IS NOT NULL
          AND variation.status <> ''
          AND variation.status <> 'published'
      )
    )::bigint AS not_published
  FROM public.products AS parent
  LEFT JOIN public.product_variations AS variation
    ON variation.product_id = parent.id
  WHERE COALESCE(parent.deleted, false) = false
    AND parent.deleted_at IS NULL;
$function$;

REVOKE ALL ON FUNCTION public.get_meta_catalog_stats() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_meta_catalog_stats() TO authenticated;
