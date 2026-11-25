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
  WITH items AS (
    SELECT variation.id AS variation_id,
      parent.status IS NOT DISTINCT FROM 'published'
        AND (parent.active IS NOT FALSE OR salvage.is_salvado)
        AND parent.is_draft IS NOT TRUE
        AND (
          variation.id IS NULL
          OR (
            (variation.active IS NOT FALSE OR salvage.is_salvado)
            AND variation.merged_to_variation_id IS NULL
            AND coalesce(nullif(variation.status, ''), 'published') = 'published'
          )
        ) AS eligible
    FROM public.products AS parent
    CROSS JOIN LATERAL (
      SELECT parent.is_salvado IS TRUE OR parent.product_kind IS NOT DISTINCT FROM 'salvado' AS is_salvado
    ) AS salvage
    LEFT JOIN public.product_variations AS variation ON variation.product_id = parent.id
    WHERE parent.deleted IS NOT TRUE AND parent.deleted_at IS NULL
  )
  SELECT count(*) FILTER (WHERE eligible AND variation_id IS NULL),
    count(*) FILTER (WHERE eligible AND variation_id IS NOT NULL),
    count(*) FILTER (WHERE NOT eligible)
  FROM items;
$function$;
