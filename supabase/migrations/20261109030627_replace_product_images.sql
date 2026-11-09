CREATE OR REPLACE FUNCTION public.replace_product_images(
  p_product_id uuid,
  p_image_urls text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required' USING ERRCODE = '22004';
  END IF;

  IF p_image_urls IS NULL THEN
    RAISE EXCEPTION 'image_urls is required' USING ERRCODE = '22004';
  END IF;

  DELETE FROM public.product_images AS existing_image
  WHERE existing_image.product_id = p_product_id;

  INSERT INTO public.product_images (product_id, image_url, is_main)
  SELECT p_product_id, image.image_url, image.ordinality = 1
  FROM pg_catalog.unnest(p_image_urls) WITH ORDINALITY AS image(image_url, ordinality)
  ORDER BY image.ordinality;
END;
$function$;

REVOKE ALL ON FUNCTION public.replace_product_images(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_product_images(uuid, text[]) TO authenticated;

COMMENT ON FUNCTION public.replace_product_images(uuid, text[]) IS
  'Atomically replaces one product image gallery, preserving input order and marking the first image as main.';
