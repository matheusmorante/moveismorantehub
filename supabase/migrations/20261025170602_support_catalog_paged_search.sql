-- Paginação enxuta para a Central e para links públicos de seleção de produtos.
-- A função não contorna RLS e só retorna produtos publicados, ativos e não excluídos.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_catalog_page(
  p_category_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
  p_excluded_product_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_include_product_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_include_only boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public, pg_temp
AS $function$
  WITH RECURSIVE
  params AS (
    SELECT
      p_category_id AS category_id,
      NULLIF(btrim(p_search), '') AS search,
      NULLIF(btrim(p_brand), '') AS brand,
      least(greatest(coalesce(p_page, 1), 1), 100000)::bigint AS page,
      least(greatest(coalesce(p_page_size, 20), 1), 50)::bigint AS page_size,
      coalesce(p_excluded_product_ids, ARRAY[]::uuid[]) AS excluded_product_ids,
      coalesce(p_include_product_ids, ARRAY[]::uuid[]) AS include_product_ids,
      coalesce(p_include_only, false) AS include_only
  ),
  category_edges AS (
    SELECT parent_id, child_id FROM public.category_relationships
    UNION
    SELECT parent_id, id FROM public.categories WHERE parent_id IS NOT NULL
  ),
  category_tree(id, name) AS (
    SELECT category.id, category.name
    FROM public.categories AS category
    CROSS JOIN params
    WHERE category.id = params.category_id AND category.type = 'category'

    UNION

    SELECT child.id, child.name
    FROM category_edges AS edge
    JOIN category_tree AS parent ON parent.id = edge.parent_id
    JOIN public.categories AS child ON child.id = edge.child_id AND child.type = 'category'
  ),
  matched AS (
    SELECT product.id, product.marketplace_title AS title, product.name
    FROM public.products AS product
    CROSS JOIN params
    WHERE product.active IS TRUE
      AND product.status = 'published'
      AND coalesce(product.is_draft, false) IS FALSE
      AND coalesce(product.deleted, false) IS FALSE
      AND product.deleted_at IS NULL
      AND product.item_type IS DISTINCT FROM 'service'
      AND coalesce(lower(product.technical_specs ->> 'is_test'), 'false') <> 'true'
      AND coalesce(lower(product.technical_specs ->> 'isTest'), 'false') <> 'true'
      AND coalesce(lower(product.technical_specs #>> '{testArtifact,is_test}'), 'false') <> 'true'
      AND coalesce(lower(product.technical_specs #>> '{testArtifact,isTest}'), 'false') <> 'true'
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.product_variations AS any_variation
          WHERE any_variation.product_id = product.id
        )
        OR EXISTS (
          SELECT 1 FROM public.product_variations AS public_variation
          WHERE public_variation.product_id = product.id
            AND public_variation.active IS TRUE
            AND coalesce(public_variation.status, product.status, 'hidden') = 'published'
        )
      )
      AND (
        (
          NOT params.include_only
          AND (
          (params.brand IS NULL OR product.brand = params.brand)
          AND (
            params.search IS NULL
            OR product.name ILIKE '%' || params.search || '%'
            OR coalesce(product.marketplace_title, '') ILIKE '%' || params.search || '%'
            OR coalesce(product.code, '') ILIKE '%' || params.search || '%'
            OR EXISTS (
              SELECT 1
              FROM public.product_variations AS matching_variation
              WHERE matching_variation.product_id = product.id
                AND matching_variation.active IS TRUE
                AND coalesce(matching_variation.status, product.status, 'hidden') = 'published'
                AND (
                  coalesce(matching_variation.name, '') ILIKE '%' || params.search || '%'
                  OR coalesce(matching_variation.sku, '') ILIKE '%' || params.search || '%'
                )
            )
          )
          AND (
            params.category_id IS NULL
            OR EXISTS (
              SELECT 1 FROM category_tree AS tree
              WHERE tree.id = product.category_id OR tree.name = product.category
            )
            OR EXISTS (
              SELECT 1
              FROM public.product_categories AS product_category
              JOIN category_tree AS tree ON tree.id = product_category.category_id
              WHERE product_category.product_id = product.id
            )
          )
            AND NOT (product.id = ANY(params.excluded_product_ids))
          )
        )
        OR product.id = ANY(params.include_product_ids)
      )
  ),
  page_ids AS (
    SELECT matched.id
    FROM matched
    CROSS JOIN params
    ORDER BY (matched.id = ANY(params.include_product_ids)) DESC,
      matched.title NULLS LAST, matched.name, matched.id
    OFFSET ((SELECT page FROM params) - 1) * (SELECT page_size FROM params)
    LIMIT (SELECT page_size FROM params)
  ),
  page_rows AS (
    SELECT
      product.id,
      product.name,
      product.marketplace_title AS title,
      product.code AS sku,
      product.slug,
      product.brand,
      coalesce(nullif(product.category, ''), primary_category.name, '') AS category,
      coalesce(product.unit_price, product.price, 0) AS price,
      product.promo_price,
      coalesce(
        (SELECT image.image_url
         FROM public.product_images AS image
         WHERE image.product_id = product.id
         ORDER BY image.is_main DESC NULLS LAST, image.created_at ASC NULLS LAST
         LIMIT 1),
        CASE
          WHEN jsonb_typeof(product.images -> 0) = 'string' THEN product.images ->> 0
          WHEN jsonb_typeof(product.images -> 0) = 'object' THEN product.images -> 0 ->> 'url'
          ELSE NULL
        END,
        ''
      ) AS image_url,
      variation_data.public_variation_count > 1 AS has_variations,
      variation_data.public_variations AS variations
    FROM page_ids
    JOIN public.products AS product ON product.id = page_ids.id
    LEFT JOIN public.categories AS primary_category ON primary_category.id = product.category_id
    CROSS JOIN LATERAL (
      SELECT
        count(*)::integer AS public_variation_count,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', variation.id,
              'name', variation.name,
              'sku', variation.sku,
              'price', CASE
                WHEN coalesce(variation.use_parent_price, true)
                  THEN coalesce(product.unit_price, product.price, 0)
                ELSE coalesce(variation.price, 0)
              END,
              'promoPrice', CASE
                WHEN coalesce(variation.use_parent_promo_price, true)
                  THEN coalesce(product.promo_price, 0)
                ELSE coalesce(variation.promo_price, 0)
              END,
              'imageUrl', variation.image_url,
              'attributes', variation.attributes
            ) ORDER BY variation.name, variation.id
          ),
          '[]'::jsonb
        ) AS public_variations
      FROM public.product_variations AS variation
      WHERE variation.product_id = product.id
        AND variation.active IS TRUE
        AND coalesce(variation.status, product.status, 'hidden') = 'published'
    ) AS variation_data
  ),
  product_json AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', page_rows.id,
          'name', page_rows.name,
          'title', page_rows.title,
          'sku', page_rows.sku,
          'slug', page_rows.slug,
          'brand', page_rows.brand,
          'category', page_rows.category,
          'price', page_rows.price,
          'promoPrice', page_rows.promo_price,
          'imageUrl', page_rows.image_url,
          'hasVariations', page_rows.has_variations,
          'variations', page_rows.variations
        ) ORDER BY (page_rows.id = ANY(params.include_product_ids)) DESC,
          page_rows.title NULLS LAST, page_rows.name, page_rows.id
      ),
      '[]'::jsonb
    ) AS products
    FROM page_rows
    CROSS JOIN params
  )
  SELECT jsonb_build_object(
    'page', (SELECT page FROM params),
    'pageSize', (SELECT page_size FROM params),
    'totalCount', (SELECT count(*) FROM matched),
    'categoryName', (
      SELECT category.name FROM public.categories AS category
      CROSS JOIN params
      WHERE category.id = params.category_id AND category.type = 'category'
    ),
    'products', product_json.products
  )
  FROM product_json;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_catalog_metadata()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public, pg_temp
AS $function$
  SELECT jsonb_build_object(
    'categories', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', category.id, 'name', category.name, 'slug', category.slug)
        ORDER BY category.name, category.id)
      FROM public.categories AS category
      WHERE category.type = 'category'
    ), '[]'::jsonb),
    'relations', coalesce((
      SELECT jsonb_agg(jsonb_build_object('parent_id', relation.parent_id, 'child_id', relation.child_id)
        ORDER BY relation.parent_id, relation.child_id)
      FROM public.category_relationships AS relation
    ), '[]'::jsonb),
    'brands', coalesce((
      SELECT jsonb_agg(brands.brand ORDER BY brands.brand)
      FROM (
        SELECT DISTINCT btrim(product.brand) AS brand
        FROM public.products AS product
        WHERE nullif(btrim(product.brand), '') IS NOT NULL
          AND product.active IS TRUE
          AND product.status = 'published'
          AND coalesce(product.is_draft, false) IS FALSE
          AND coalesce(product.deleted, false) IS FALSE
          AND product.deleted_at IS NULL
          AND product.item_type IS DISTINCT FROM 'service'
          AND coalesce(lower(product.technical_specs ->> 'is_test'), 'false') <> 'true'
          AND coalesce(lower(product.technical_specs ->> 'isTest'), 'false') <> 'true'
          AND coalesce(lower(product.technical_specs #>> '{testArtifact,is_test}'), 'false') <> 'true'
          AND coalesce(lower(product.technical_specs #>> '{testArtifact,isTest}'), 'false') <> 'true'
          AND (
            NOT EXISTS (
              SELECT 1 FROM public.product_variations AS any_variation
              WHERE any_variation.product_id = product.id
            )
            OR EXISTS (
              SELECT 1 FROM public.product_variations AS public_variation
              WHERE public_variation.product_id = product.id
                AND public_variation.active IS TRUE
                AND coalesce(public_variation.status, product.status, 'hidden') = 'published'
            )
          )
      ) AS brands
    ), '[]'::jsonb)
  );
$function$;

REVOKE ALL ON FUNCTION public.customer_support_catalog_page(uuid, text, text, integer, integer, uuid[], uuid[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_support_catalog_page(uuid, text, text, integer, integer, uuid[], uuid[], boolean) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_catalog_metadata() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_support_catalog_metadata() TO authenticated;

COMMIT;
