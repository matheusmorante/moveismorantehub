CREATE OR REPLACE FUNCTION public.public_catalog_product_detail_with_campaign_compact(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
WITH selected_product AS (
  SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.price,
    p.promo_price,
    p.code,
    p.status,
    p.is_salvado,
    p.opportunity_id,
    p.width,
    p.depth,
    p.height,
    p.depth_use_length,
    p.technical_specs,
    COALESCE(p.unit_price, p.price, 0)::numeric AS regular_price
  FROM public.products AS p
  WHERE p.slug = p_slug
    AND p.status = 'published'
    AND p.deleted_at IS NULL
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.product_variations AS v
        WHERE v.product_id = p.id
      )
      OR EXISTS (
        SELECT 1
        FROM public.product_variations AS v
        WHERE v.product_id = p.id
          AND v.status = 'published'
      )
    )
  LIMIT 1
),
detail AS (
  SELECT
    p.id,
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'slug', p.slug,
      'description', p.description,
      'price', p.price,
      'promo_price', p.promo_price,
      'code', p.code,
      'status', p.status,
      'is_salvado', p.is_salvado,
      'opportunity_id', p.opportunity_id,
      'width', p.width,
      'depth', p.depth,
      'height', p.height,
      'depth_use_length', p.depth_use_length,
      'technical_specs', p.technical_specs,
      'has_chair_count_category', EXISTS (
        SELECT 1
        FROM public.product_categories AS pc
        JOIN public.categories AS c ON c.id = pc.category_id
        WHERE pc.product_id = p.id
          AND c.type = 'category'
          AND c.name = 'Conjunto Mesa e Cadeiras'
      ),
      'product_images', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('id', i.id, 'image_url', i.image_url, 'is_main', i.is_main)
          ORDER BY i.is_main DESC NULLS LAST, i.created_at, i.id
        )
        FROM public.product_images AS i
        WHERE i.product_id = p.id
      ), '[]'::jsonb),
      'opportunities', (
        SELECT jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'slug', o.slug,
          'badge_color', o.badge_color,
          'border_color', o.border_color,
          'border_style', o.border_style,
          'badge_animation', o.badge_animation,
          'title_color', o.title_color
        )
        FROM public.opportunities AS o
        WHERE o.id = p.opportunity_id
      ),
      'product_variations', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', v.id,
            'name', v.name,
            'attributes', v.attributes,
            'image_url', v.image_url,
            'price', v.price,
            'promo_price', v.promo_price,
            'description', v.description,
            'width', v.width,
            'depth', v.depth,
            'height', v.height,
            'use_parent_name', v.use_parent_name,
            'use_parent_price', v.use_parent_price,
            'use_parent_promo_price', v.use_parent_promo_price,
            'use_parent_description', v.use_parent_description,
            'use_parent_dimensions', v.use_parent_dimensions,
            'status', v.status
          )
          ORDER BY v.created_at, v.id
        )
        FROM public.product_variations AS v
        WHERE v.product_id = p.id
          AND v.status = 'published'
      ), '[]'::jsonb)
    ) AS payload
  FROM selected_product AS p
)
SELECT detail.payload || jsonb_build_object(
  'price', COALESCE(parent_price.regular_price, selected_product.regular_price),
  'promo_price', CASE
    WHEN parent_price.product_price < parent_price.regular_price THEN parent_price.product_price
    ELSE NULL
  END,
  'promotion', CASE
    WHEN parent_price.promotion_id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id', parent_price.promotion_id,
      'name', parent_price.promotion_name,
      'discount_percent', parent_price.promotion_discount_percent,
      'final_price', NULL,
      'conditions', parent_price.promotion_conditions
    )
  END,
  'product_variations', COALESCE((
    SELECT jsonb_agg(
      variation.value || jsonb_build_object(
        'price', COALESCE(variation_price.regular_price, (variation.value->>'price')::numeric),
        'promo_price', CASE
          WHEN variation_price.product_price < variation_price.regular_price THEN variation_price.product_price
          ELSE NULL
        END,
        'promotion', CASE
          WHEN variation_price.promotion_id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'id', variation_price.promotion_id,
            'name', variation_price.promotion_name,
            'discount_percent', variation_price.promotion_discount_percent,
            'final_price', NULL,
            'conditions', variation_price.promotion_conditions
          )
        END
      )
      ORDER BY variation.ordinality
    )
    FROM jsonb_array_elements(COALESCE(detail.payload->'product_variations', '[]'::jsonb))
      WITH ORDINALITY AS variation(value, ordinality)
    LEFT JOIN public.catalog_current_prices AS variation_price
      ON variation_price.product_id = selected_product.id
      AND variation_price.variation_id = (variation.value->>'id')::uuid
  ), '[]'::jsonb)
)
FROM detail
CROSS JOIN selected_product
LEFT JOIN public.catalog_current_prices AS parent_price
  ON parent_price.product_id = selected_product.id
  AND parent_price.variation_id IS NULL;
$$;

REVOKE ALL ON FUNCTION public.public_catalog_product_detail_with_campaign_compact(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_catalog_product_detail_with_campaign_compact(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.public_catalog_product_detail_with_campaign_compact(text) IS
  'Public product detail with only the variation fields consumed by the digital catalog page; keeps published-item visibility and current catalog pricing.';

NOTIFY pgrst, 'reload schema';
