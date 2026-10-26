-- Mantém a grade leve e carrega variações detalhadas somente quando são abertas.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.customer_support_catalog_summary_page(
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
  WITH page_payload AS (
    SELECT public.customer_support_catalog_page(
      p_category_id,
      p_search,
      p_brand,
      p_page,
      p_page_size,
      p_excluded_product_ids,
      p_include_product_ids,
      p_include_only
    ) AS payload
  )
  SELECT jsonb_set(
    page_payload.payload,
    '{products}',
    coalesce((
      SELECT jsonb_agg(
        (product.value - 'variations') || jsonb_build_object(
          'variations', CASE
            WHEN coalesce((product.value ->> 'hasVariations')::boolean, false)
              THEN '[]'::jsonb
            ELSE coalesce(product.value -> 'variations', '[]'::jsonb)
          END
        ) ORDER BY product.ordinality
      )
      FROM jsonb_array_elements(coalesce(page_payload.payload -> 'products', '[]'::jsonb))
        WITH ORDINALITY AS product(value, ordinality)
    ), '[]'::jsonb),
    true
  )
  FROM page_payload;
$function$;

CREATE OR REPLACE FUNCTION public.customer_support_catalog_product_details(
  p_product_ids uuid[],
  p_variation_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public, pg_temp
AS $function$
  WITH params AS (
    SELECT
      coalesce(p_product_ids, ARRAY[]::uuid[]) AS product_ids,
      coalesce(p_variation_ids, ARRAY[]::uuid[]) AS variation_ids
  ),
  eligible_products AS (
    SELECT product.id, product.name, product.unit_price, product.price, product.promo_price, product.status, product.technical_specs
    FROM public.products AS product
    CROSS JOIN params
    WHERE cardinality(params.product_ids) BETWEEN 1 AND 50
      AND cardinality(params.variation_ids) <= 50
      AND product.id = ANY(params.product_ids)
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
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'productId', product.id,
      'variations', variation_data.variations
    ) ORDER BY product.id
  ), '[]'::jsonb)
  FROM eligible_products AS product
  CROSS JOIN params
  CROSS JOIN LATERAL (
    SELECT coalesce(jsonb_agg(
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
    ), '[]'::jsonb) AS variations
    FROM public.product_variations AS variation
    WHERE variation.product_id = product.id
      AND variation.active IS TRUE
      AND coalesce(variation.status, product.status, 'hidden') = 'published'
      AND (
        cardinality(params.variation_ids) = 0
        OR variation.id = ANY(params.variation_ids)
      )
  ) AS variation_data;
$function$;

REVOKE ALL ON FUNCTION public.customer_support_catalog_summary_page(uuid, text, text, integer, integer, uuid[], uuid[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_support_catalog_summary_page(uuid, text, text, integer, integer, uuid[], uuid[], boolean) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_support_catalog_product_details(uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_support_catalog_product_details(uuid[], uuid[]) TO anon, authenticated;

COMMIT;
