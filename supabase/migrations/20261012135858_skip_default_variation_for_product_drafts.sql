CREATE OR REPLACE FUNCTION public.ensure_default_variation_for_product()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_product public.products%ROWTYPE;
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = NEW.id;
  IF NOT FOUND
     OR COALESCE(v_product.item_type, 'product') <> 'product'
     OR COALESCE(v_product.is_draft, false)
     OR COALESCE(v_product.status, '') = 'draft' THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.product_variations WHERE product_id = v_product.id
  ) THEN
    INSERT INTO public.product_variations (
      id, product_id, name, sku, price, stock, image_url, attributes,
      use_parent_price, use_parent_promo_price, use_parent_dimensions,
      use_parent_description, use_parent_name, status
    ) VALUES (
      gen_random_uuid(), v_product.id,
      COALESCE(NULLIF(v_product.name, ''), v_product.description, 'Produto'),
      CONCAT('DEFAULT-', REPLACE(v_product.id::text, '-', '')),
      COALESCE(v_product.unit_price, v_product.price, 0), COALESCE(v_product.stock, 0),
      NULLIF((
        SELECT string_agg(parent_image.image_url, ',' ORDER BY parent_image.ordinality)
        FROM jsonb_array_elements_text(COALESCE(v_product.images, '[]'::jsonb))
             WITH ORDINALITY AS parent_image(image_url, ordinality)
      ), ''),
      '[]'::jsonb, true, true, true, true, true,
      COALESCE(v_product.status, 'hidden')
    );
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_deleting_last_product_variation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT DISTINCT FROM NEW.product_id THEN
    RETURN NULL;
  END IF;
  IF EXISTS (
       SELECT 1
       FROM public.products p
       WHERE p.id = OLD.product_id
         AND COALESCE(p.item_type, 'product') = 'product'
         AND NOT COALESCE(p.is_draft, false)
         AND COALESCE(p.status, '') <> 'draft'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.product_variations v WHERE v.product_id = OLD.product_id
     ) THEN
    RAISE EXCEPTION 'Todo produto precisa manter ao menos uma variação.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$function$;
