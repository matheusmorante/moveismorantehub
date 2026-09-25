-- Returns only the linked-product count for each requested supplier.
-- Rollback: DROP FUNCTION public.get_supplier_product_counts(uuid[]); DROP INDEX
-- idx_products_supplier_count_ids; DROP INDEX idx_products_supplier_count_main;
-- DROP INDEX idx_products_supplier_count_primary;

CREATE INDEX IF NOT EXISTS idx_products_supplier_count_primary
  ON public.products (supplier_id)
  WHERE deleted = false AND item_type = 'product';

CREATE INDEX IF NOT EXISTS idx_products_supplier_count_main
  ON public.products (main_supplier_id)
  WHERE deleted = false AND item_type = 'product';

CREATE INDEX IF NOT EXISTS idx_products_supplier_count_ids
  ON public.products USING GIN ((supplier_ids::text[]))
  WHERE deleted = false AND item_type = 'product';

CREATE OR REPLACE FUNCTION public.get_supplier_product_counts(p_supplier_ids uuid[])
RETURNS TABLE (supplier_id uuid, product_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH requested AS (
    SELECT DISTINCT input.supplier_id
    FROM unnest(COALESCE(p_supplier_ids, '{}'::uuid[])) AS input(supplier_id)
  ),
  matching_products AS MATERIALIZED (
    SELECT product.id, product.supplier_id, product.main_supplier_id, product.supplier_ids
    FROM public.products AS product
    WHERE product.deleted = false
      AND product.item_type = 'product'
      AND (
        product.supplier_id = ANY(COALESCE(p_supplier_ids, '{}'::uuid[]))
        OR product.main_supplier_id = ANY(COALESCE(p_supplier_ids, '{}'::uuid[]))
        OR product.supplier_ids::text[] && COALESCE(p_supplier_ids, '{}'::uuid[])::text[]
      )
  ),
  product_supplier_links AS (
    SELECT DISTINCT matched.id AS product_id, linked.supplier_id
    FROM matching_products AS matched
    CROSS JOIN LATERAL jsonb_array_elements_text(
      COALESCE(to_jsonb(ARRAY[matched.supplier_id, matched.main_supplier_id]), '[]'::jsonb)
      || COALESCE(to_jsonb(matched.supplier_ids::text[]), '[]'::jsonb)
    ) AS linked(supplier_id)
  )
  SELECT requested.supplier_id, COUNT(DISTINCT links.product_id)::bigint
  FROM requested
  LEFT JOIN product_supplier_links AS links ON links.supplier_id::uuid = requested.supplier_id
  GROUP BY requested.supplier_id;
$$;

REVOKE ALL ON FUNCTION public.get_supplier_product_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_supplier_product_counts(uuid[]) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
