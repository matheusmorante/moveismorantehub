CREATE TABLE public.meta_catalog_sync_deletions (
  run_id uuid NOT NULL,
  catalog_id text NOT NULL CHECK (catalog_id ~ '^[0-9]{1,32}$'),
  retailer_id text NOT NULL CHECK (length(retailer_id) BETWEEN 1 AND 100),
  trigger text NOT NULL CHECK (trigger IN ('manual', 'hourly', 'product', 'legacy')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  confirmed_at timestamptz,
  PRIMARY KEY (run_id, catalog_id, retailer_id)
);

CREATE INDEX meta_catalog_sync_deletions_catalog_time_idx
  ON public.meta_catalog_sync_deletions (catalog_id, recorded_at DESC);

ALTER TABLE public.meta_catalog_sync_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.meta_catalog_sync_deletions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.meta_catalog_sync_deletions TO service_role;

COMMENT ON TABLE public.meta_catalog_sync_deletions IS 'Exclusões planejadas e enviadas pela reconciliação do Catálogo Meta.';
COMMENT ON COLUMN public.meta_catalog_sync_deletions.confirmed_at IS 'Momento em que a Graph API confirmou a ausência do SKU. Nulo enquanto a ausência não foi confirmada.';

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
        AND parent.active IS NOT FALSE
        AND parent.is_draft IS NOT TRUE
        AND (
          variation.id IS NULL
          OR (
            variation.active IS NOT FALSE
            AND variation.merged_to_variation_id IS NULL
            AND coalesce(nullif(variation.status, ''), 'published') = 'published'
          )
        ) AS eligible
    FROM public.products AS parent
    LEFT JOIN public.product_variations AS variation ON variation.product_id = parent.id
    WHERE parent.deleted IS NOT TRUE AND parent.deleted_at IS NULL
  )
  SELECT count(*) FILTER (WHERE eligible AND variation_id IS NULL),
    count(*) FILTER (WHERE eligible AND variation_id IS NOT NULL),
    count(*) FILTER (WHERE NOT eligible)
  FROM items;
$function$;

REVOKE ALL ON FUNCTION public.get_meta_catalog_stats() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_meta_catalog_stats() TO authenticated;
