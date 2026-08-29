-- Copia todas as imagens do produto-pai quando ele possui uma única variação.
UPDATE public.product_variations v
SET image_url = COALESCE(
    NULLIF((SELECT string_agg(pi.image_url, ',' ORDER BY pi.is_main DESC, pi.created_at) FROM public.product_images pi WHERE pi.product_id = p.id), ''),
    NULLIF((SELECT string_agg(image_url, ',') FROM jsonb_array_elements_text(COALESCE(p.images, '[]'::jsonb)) AS image_url), '')
)
FROM public.products p
WHERE p.id = v.product_id
  AND 1 = (SELECT count(*) FROM public.product_variations only_variation WHERE only_variation.product_id = p.id);
