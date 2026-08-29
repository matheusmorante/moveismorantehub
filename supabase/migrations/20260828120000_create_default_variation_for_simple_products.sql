-- Produtos simples também têm uma variação operacional, sem atributos.
-- As imagens permanecem no produto-pai e são herdadas pela variação-padrão.
INSERT INTO public.product_variations (
    id, product_id, name, sku, price, stock, attributes,
    use_parent_price, use_parent_promo_price, use_parent_dimensions,
    use_parent_description, use_parent_name, status
)
SELECT
    gen_random_uuid(), p.id, COALESCE(NULLIF(p.name, ''), p.description, 'Produto'),
    CONCAT(COALESCE(NULLIF(p.code, ''), REPLACE(p.id::text, '-', '')), '-01'),
    COALESCE(p.unit_price, p.price, 0), COALESCE(p.stock, 0), '{}'::jsonb,
    true, true, true, true, true, 'published'
FROM public.products p
WHERE COALESCE(p.item_type, 'product') = 'product'
  AND NOT EXISTS (SELECT 1 FROM public.product_variations v WHERE v.product_id = p.id);

UPDATE public.products
SET has_variations = true
WHERE COALESCE(item_type, 'product') = 'product';
