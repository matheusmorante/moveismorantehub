BEGIN;

CREATE OR REPLACE FUNCTION public.search_available_promotion_items(
  p_search text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_selected_keys text[] DEFAULT ARRAY[]::text[],
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  product_id uuid,
  variation_id uuid,
  product_name text,
  variation_name text,
  code text,
  sku text,
  category_id uuid,
  category_name text,
  regular_price numeric,
  product_price numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH source AS (
    SELECT
      product.id AS product_id,
      variation.id AS variation_id,
      product.name AS product_name,
      variation.name AS variation_name,
      product.code,
      variation.sku,
      product.category_id,
      category.name AS category_name,
      CASE
        WHEN variation.id IS NOT NULL AND variation.use_parent_price IS FALSE
          THEN COALESCE(variation.price, product.unit_price, product.price, 0)
        ELSE COALESCE(product.unit_price, product.price, variation.price, 0)
      END::numeric AS regular_price,
      CASE
        WHEN COALESCE(base.promo_price, 0) > 0 AND base.promo_price < base.regular_price
          THEN base.promo_price
        ELSE base.regular_price
      END::numeric AS product_price,
      ARRAY[product.name, variation.name, product.code, variation.sku, category.name] AS search_fields,
      product.supplier_id,
      product.main_supplier_id,
      product.supplier_ids
    FROM public.products AS product
    LEFT JOIN public.product_variations AS variation ON variation.product_id = product.id
    LEFT JOIN public.categories AS category ON category.id = product.category_id
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN variation.id IS NOT NULL AND variation.use_parent_promo_price IS FALSE
            THEN COALESCE(variation.promo_price, product.promo_price)
          ELSE product.promo_price
        END::numeric AS promo_price,
        CASE
          WHEN variation.id IS NOT NULL AND variation.use_parent_price IS FALSE
            THEN COALESCE(variation.price, product.unit_price, product.price, 0)
          ELSE COALESCE(product.unit_price, product.price, variation.price, 0)
        END::numeric AS regular_price
    ) AS base
    WHERE product.active IS TRUE
      AND product.deleted IS NOT TRUE
      AND product.deleted_at IS NULL
      AND product.is_draft IS NOT TRUE
      AND product.item_type IS DISTINCT FROM 'service'
      AND product.item_type IS DISTINCT FROM 'composition'
      AND product.is_combo IS NOT TRUE
      AND (variation.id IS NULL OR (variation.active IS TRUE AND variation.merged_to_variation_id IS NULL))
      AND (p_category_id IS NULL OR product.category_id = p_category_id)
      AND (p_supplier_id IS NULL OR product.supplier_id = p_supplier_id
        OR product.main_supplier_id = p_supplier_id
        OR p_supplier_id = ANY(COALESCE(product.supplier_ids, ARRAY[]::uuid[])))
  ), words AS (
    SELECT regexp_split_to_array(public.immutable_unaccent(btrim(COALESCE(p_search, ''))), '\s+') AS parts
  )
  SELECT source.product_id, source.variation_id, source.product_name, source.variation_name,
    source.code, source.sku, source.category_id, source.category_name, source.regular_price, source.product_price
  FROM source, words
  WHERE (
      btrim(COALESCE(p_search, '')) = '' OR NOT EXISTS (
        SELECT 1 FROM unnest(words.parts) AS word(value)
        WHERE word.value <> '' AND NOT EXISTS (
          SELECT 1 FROM unnest(source.search_fields) AS field(value)
          WHERE public.immutable_unaccent(COALESCE(field.value, '')) ILIKE '%' || word.value || '%'
        )
      )
    )
    AND NOT (
      (source.product_id::text || ':' || COALESCE(source.variation_id::text, ''))
      = ANY(COALESCE(p_selected_keys, ARRAY[]::text[]))
    )
  ORDER BY source.product_name, source.variation_name NULLS FIRST, source.sku NULLS FIRST, source.product_id, source.variation_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 15), 1), 15)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

COMMENT ON FUNCTION public.search_available_promotion_items(text, uuid, uuid, text[], integer, integer) IS
  'Pesquisa candidatos ainda não selecionados para campanhas; exclusões do rascunho são aplicadas antes da ordenação e paginação, preservando a busca de itens removidos da seleção.';

REVOKE ALL ON FUNCTION public.search_available_promotion_items(text, uuid, uuid, text[], integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_available_promotion_items(text, uuid, uuid, text[], integer, integer) TO authenticated;

COMMIT;
