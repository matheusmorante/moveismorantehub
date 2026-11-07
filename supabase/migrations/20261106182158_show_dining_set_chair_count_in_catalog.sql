-- The product-detail response needs only a boolean category marker so the
-- digital catalog can display legacy places-count values under the new label.
-- This reuses the existing detail request and adds no Supabase round trip.
CREATE OR REPLACE FUNCTION public.public_catalog_product_detail(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
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
    'product_images', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object('id', i.id, 'image_url', i.image_url, 'is_main', i.is_main)
        ORDER BY i.is_main DESC NULLS LAST, i.created_at, i.id
      )
      FROM public.product_images AS i
      WHERE i.product_id = p.id
    ), '[]'::jsonb),
    'opportunities', (
      SELECT jsonb_build_object(
        'id', o.id, 'name', o.name, 'slug', o.slug,
        'badge_color', o.badge_color, 'border_color', o.border_color,
        'border_style', o.border_style, 'badge_animation', o.badge_animation,
        'title_color', o.title_color
      )
      FROM public.opportunities AS o
      WHERE o.id = p.opportunity_id
    ),
    'product_variations', coalesce((
      SELECT jsonb_agg(to_jsonb(v) - 'cost_price' - 'opening_cost_price' - 'combo_items' ORDER BY v.created_at, v.id)
      FROM public.product_variations AS v
      WHERE v.product_id = p.id AND v.status = 'published'
    ), '[]'::jsonb)
  )
  FROM public.products AS p
  WHERE p.slug = p_slug
    AND p.status = 'published'
    AND p.deleted_at IS NULL
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.product_variations AS v WHERE v.product_id = p.id
      )
      OR EXISTS (
        SELECT 1 FROM public.product_variations AS v
        WHERE v.product_id = p.id AND v.status = 'published'
      )
    )
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.public_catalog_product_detail(text) IS
  'Returns public product details by slug, including a minimal category marker for displaying legacy chair-count values under the current label.';
