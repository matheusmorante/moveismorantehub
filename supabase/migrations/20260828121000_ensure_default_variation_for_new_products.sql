-- Mantém a regra no banco: todo produto possui ao menos a Variação 1.
CREATE OR REPLACE FUNCTION public.create_default_variation_for_product()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF COALESCE(NEW.item_type, 'product') = 'product' THEN
        INSERT INTO public.product_variations (
            id, product_id, name, sku, price, stock, attributes,
            use_parent_price, use_parent_promo_price, use_parent_dimensions,
            use_parent_description, use_parent_name, status
        ) VALUES (
            gen_random_uuid(), NEW.id, COALESCE(NULLIF(NEW.name, ''), NEW.description, 'Produto'),
            CONCAT(COALESCE(NULLIF(NEW.code, ''), REPLACE(NEW.id::text, '-', '')), '-01'),
            COALESCE(NEW.unit_price, NEW.price, 0), COALESCE(NEW.stock, 0), '{}'::jsonb,
            true, true, true, true, true, 'published'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_default_variation_on_product_insert ON public.products;
CREATE TRIGGER create_default_variation_on_product_insert
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.create_default_variation_for_product();
