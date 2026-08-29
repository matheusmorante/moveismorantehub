-- Mantém a imagem da única variação idêntica a todas as imagens do produto-pai.
CREATE OR REPLACE FUNCTION public.sync_single_variation_images(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.product_variations v
    SET image_url = COALESCE(
        NULLIF((SELECT string_agg(pi.image_url, ',' ORDER BY pi.is_main DESC, pi.created_at) FROM public.product_images pi WHERE pi.product_id = p.id), ''),
        NULLIF((SELECT string_agg(image_url, ',') FROM jsonb_array_elements_text(COALESCE(p.images, '[]'::jsonb)) AS image_url), '')
    )
    FROM public.products p
    WHERE p.id = p_product_id
      AND v.product_id = p.id
      AND 1 = (SELECT count(*) FROM public.product_variations only_variation WHERE only_variation.product_id = p.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_sync_single_variation_images()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.sync_single_variation_images(OLD.product_id);
        RETURN OLD;
    END IF;
    PERFORM public.sync_single_variation_images(NEW.product_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_single_variation_images_on_product_images ON public.product_images;
CREATE TRIGGER sync_single_variation_images_on_product_images
AFTER INSERT OR UPDATE OR DELETE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_single_variation_images();
