-- Retorna a contagem distinta por categoria, sem enviar cada vínculo ao cliente.
-- SECURITY INVOKER mantém os grants e as políticas RLS das tabelas de origem.
CREATE OR REPLACE FUNCTION public.get_category_product_counts()
RETURNS TABLE (
  category_id uuid,
  product_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  WITH product_category_pairs AS (
    SELECT product_category.category_id, product_category.product_id
      FROM public.product_categories AS product_category
     WHERE product_category.category_id IS NOT NULL
       AND product_category.product_id IS NOT NULL

    UNION

    SELECT product.category_id, product.id AS product_id
      FROM public.products AS product
     WHERE product.category_id IS NOT NULL
  )
  SELECT pair.category_id,
         pg_catalog.count(*) AS product_count
    FROM product_category_pairs AS pair
   GROUP BY pair.category_id;
$function$;

REVOKE ALL ON FUNCTION public.get_category_product_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_category_product_counts() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_category_product_counts() IS
  'Returns visible, distinct product counts per category from direct and product_categories assignments.';

NOTIFY pgrst, 'reload schema';
