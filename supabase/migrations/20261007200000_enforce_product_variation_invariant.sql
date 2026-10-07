-- Enforce the product/variation invariant and keep the only variation inherited from its parent.

CREATE OR REPLACE FUNCTION public.ensure_default_variation_for_product()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product public.products%ROWTYPE;
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = NEW.id;
  IF NOT FOUND OR COALESCE(v_product.item_type, 'product') <> 'product' THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.product_variations WHERE product_id = v_product.id) THEN
    INSERT INTO public.product_variations (
      id, product_id, name, sku, price, stock, image_url, attributes,
      use_parent_price, use_parent_promo_price, use_parent_dimensions,
      use_parent_description, use_parent_name, status
    ) VALUES (
      gen_random_uuid(), v_product.id,
      COALESCE(NULLIF(v_product.name, ''), v_product.description, 'Produto'),
      CONCAT('DEFAULT-', REPLACE(v_product.id::text, '-', '')),
      COALESCE(v_product.unit_price, v_product.price, 0), COALESCE(v_product.stock, 0),
      NULLIF((SELECT string_agg(parent_image.image_url, ',' ORDER BY parent_image.ordinality)
              FROM jsonb_array_elements_text(COALESCE(v_product.images, '[]'::jsonb))
                   WITH ORDINALITY AS parent_image(image_url, ordinality)), ''),
      '[]'::jsonb, true, true, true, true, true,
      COALESCE(v_product.status, 'hidden')
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ensure_default_variation_after_product_write ON public.products;
CREATE CONSTRAINT TRIGGER ensure_default_variation_after_product_write
AFTER INSERT OR UPDATE ON public.products
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.ensure_default_variation_for_product();

CREATE OR REPLACE FUNCTION public.lock_product_for_variation_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    FOR v_product_id IN
      SELECT id FROM public.products
       WHERE id IN (OLD.product_id, NEW.product_id)
       ORDER BY id
    LOOP
      PERFORM 1 FROM public.products WHERE id = v_product_id FOR UPDATE;
    END LOOP;
    RETURN NEW;
  END IF;
  v_product_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;
  PERFORM 1 FROM public.products WHERE id = v_product_id FOR UPDATE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_parent_before_variation_write ON public.product_variations;
CREATE TRIGGER lock_parent_before_variation_write
BEFORE INSERT OR UPDATE OR DELETE ON public.product_variations
FOR EACH ROW EXECUTE FUNCTION public.lock_product_for_variation_write();

CREATE OR REPLACE FUNCTION public.enforce_single_variation_inheritance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_type text;
  v_product public.products%ROWTYPE;
  v_existing_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  SELECT * INTO v_product FROM public.products WHERE id = NEW.product_id;
  v_product_type := COALESCE(v_product.item_type, 'product');
  IF v_product_type IS DISTINCT FROM 'product' THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_existing_count
    FROM public.product_variations WHERE product_id = NEW.product_id AND id <> NEW.id;
  -- An insert into an empty product creates its single variation. An insert
  -- when one already exists is the transition to a multi-variation product.
  IF (TG_OP = 'UPDATE' AND v_existing_count = 0)
     OR (TG_OP = 'INSERT' AND v_existing_count = 0) THEN
    NEW.use_parent_price := true;
    NEW.use_parent_promo_price := true;
    NEW.use_parent_dimensions := true;
    NEW.use_parent_description := true;
    NEW.use_parent_name := true;
    NEW.name := COALESCE(NULLIF(v_product.name, ''), v_product.description, NEW.name);
    NEW.price := COALESCE(v_product.unit_price, v_product.price, 0);
    NEW.promo_price := v_product.promo_price;
    NEW.cost_price := COALESCE(v_product.cost_price, 0);
    NEW.description := v_product.description;
    NEW.width := v_product.width::text;
    NEW.depth := v_product.depth::text;
    NEW.height := v_product.height::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_variation_inheritance_before_write ON public.product_variations;
CREATE TRIGGER enforce_single_variation_inheritance_before_write
BEFORE INSERT OR UPDATE ON public.product_variations
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_variation_inheritance();

CREATE OR REPLACE FUNCTION public.sync_single_variation_parent_data(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_image_urls text;
  v_variation_id uuid;
  v_details jsonb;
  v_has_detail boolean;
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF NOT FOUND OR COALESCE(v_product.item_type, 'product') <> 'product' THEN RETURN; END IF;
  IF (SELECT count(*) FROM public.product_variations WHERE product_id = p_product_id) <> 1 THEN RETURN; END IF;

  SELECT COALESCE(
    NULLIF(string_agg(pi.image_url, ',' ORDER BY pi.is_main DESC, pi.created_at), ''),
    NULLIF((SELECT string_agg(parent_image.image_url, ',' ORDER BY parent_image.ordinality)
            FROM jsonb_array_elements_text(COALESCE(v_product.images, '[]'::jsonb))
                 WITH ORDINALITY AS parent_image(image_url, ordinality)), '')
  ) INTO v_image_urls
  FROM public.product_images pi WHERE pi.product_id = p_product_id;

  UPDATE public.product_variations
     SET image_url = v_image_urls,
         name = COALESCE(NULLIF(v_product.name, ''), v_product.description, name),
         price = COALESCE(v_product.unit_price, v_product.price, 0),
         promo_price = v_product.promo_price,
         cost_price = COALESCE(v_product.cost_price, 0),
         description = v_product.description,
         width = v_product.width::text,
         depth = v_product.depth::text,
         height = v_product.height::text,
         use_parent_price = true,
         use_parent_promo_price = true,
         use_parent_dimensions = true,
         use_parent_description = true,
         use_parent_name = true
   WHERE product_id = p_product_id;

  SELECT id INTO v_variation_id
    FROM public.product_variations WHERE product_id = p_product_id;
  SELECT EXISTS (
    SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(v_product.technical_specs->'variationDetails') = 'array'
             THEN v_product.technical_specs->'variationDetails' ELSE '[]'::jsonb END
      ) AS details(detail)
     WHERE detail->>'id' = v_variation_id::text
  ) INTO v_has_detail;
  SELECT COALESCE(jsonb_agg(
    CASE WHEN detail->>'id' = v_variation_id::text THEN detail || jsonb_build_object(
      'syncWithParent', true, 'syncUnitPrice', true, 'syncPromoPrice', true,
      'syncCostPrice', true, 'syncCondition', true, 'syncDescription', true,
      'syncDimensions', true, 'syncFiscal', true, 'syncWidth', true,
      'syncHeight', true, 'syncDepth', true, 'syncWeight', true,
      'syncIpi', true, 'syncFreight', true
    ) ELSE detail END ORDER BY ordinality
  ), '[]'::jsonb) INTO v_details
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(v_product.technical_specs->'variationDetails') = 'array'
         THEN v_product.technical_specs->'variationDetails' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS details(detail, ordinality);
  IF NOT v_has_detail THEN
    v_details := v_details || jsonb_build_array(jsonb_build_object(
      'id', v_variation_id, 'syncWithParent', true, 'syncUnitPrice', true,
      'syncPromoPrice', true, 'syncCostPrice', true, 'syncCondition', true,
      'syncDescription', true, 'syncDimensions', true, 'syncFiscal', true,
      'syncWidth', true, 'syncHeight', true, 'syncDepth', true,
      'syncWeight', true, 'syncIpi', true, 'syncFreight', true
    ));
  END IF;
  UPDATE public.products
     SET technical_specs = jsonb_set(COALESCE(technical_specs, '{}'::jsonb),
                                     '{variationDetails}', v_details, true)
   WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_single_variation_after_image_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.sync_single_variation_parent_data(CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS sync_single_variation_after_product_image_change ON public.product_images;
CREATE TRIGGER sync_single_variation_after_product_image_change
AFTER INSERT OR UPDATE OR DELETE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.sync_single_variation_after_image_change();

CREATE OR REPLACE FUNCTION public.sync_single_variation_after_product_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.sync_single_variation_parent_data(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_single_variation_after_parent_image_change ON public.products;
DROP TRIGGER IF EXISTS sync_single_variation_after_parent_change ON public.products;
CREATE TRIGGER sync_single_variation_after_parent_change
AFTER UPDATE OF images, name, description, unit_price, price, promo_price, cost_price, width, depth, height ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_single_variation_after_product_change();

CREATE OR REPLACE FUNCTION public.sync_single_variation_after_variation_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.sync_single_variation_parent_data(CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS sync_single_variation_after_variation_insert ON public.product_variations;
CREATE TRIGGER sync_single_variation_after_variation_insert
AFTER INSERT ON public.product_variations
FOR EACH ROW EXECUTE FUNCTION public.sync_single_variation_after_variation_change();
DROP TRIGGER IF EXISTS sync_single_variation_after_variation_delete ON public.product_variations;
CREATE TRIGGER sync_single_variation_after_variation_delete
AFTER DELETE ON public.product_variations
FOR EACH ROW EXECUTE FUNCTION public.sync_single_variation_after_variation_change();

CREATE OR REPLACE FUNCTION public.prevent_deleting_last_product_variation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.product_id IS NOT DISTINCT FROM NEW.product_id THEN
    RETURN NULL;
  END IF;
  IF EXISTS (
       SELECT 1 FROM public.products p
        WHERE p.id = OLD.product_id AND COALESCE(p.item_type, 'product') = 'product'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.product_variations v WHERE v.product_id = OLD.product_id
     ) THEN
    RAISE EXCEPTION 'Todo produto precisa manter ao menos uma variação.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prevent_deleting_last_product_variation_deferred ON public.product_variations;
CREATE CONSTRAINT TRIGGER prevent_deleting_last_product_variation_deferred
AFTER DELETE OR UPDATE OF product_id ON public.product_variations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.prevent_deleting_last_product_variation();

-- Backfill only products that violate the new invariant. Services are not products.
INSERT INTO public.product_variations (
  id, product_id, name, sku, price, stock, image_url, attributes,
  use_parent_price, use_parent_promo_price, use_parent_dimensions,
  use_parent_description, use_parent_name, status
)
SELECT gen_random_uuid(), p.id,
       COALESCE(NULLIF(p.name, ''), p.description, 'Produto'),
       CONCAT('DEFAULT-', REPLACE(p.id::text, '-', '')),
       COALESCE(p.unit_price, p.price, 0), COALESCE(p.stock, 0),
       NULLIF((SELECT string_agg(parent_image.image_url, ',' ORDER BY parent_image.ordinality)
               FROM jsonb_array_elements_text(COALESCE(p.images, '[]'::jsonb))
                    WITH ORDINALITY AS parent_image(image_url, ordinality)), ''),
       '[]'::jsonb, true, true, true, true, true, COALESCE(p.status, 'hidden')
  FROM public.products p
 WHERE COALESCE(p.item_type, 'product') = 'product'
   AND NOT EXISTS (SELECT 1 FROM public.product_variations v WHERE v.product_id = p.id);

-- Normalize existing single-variation products and initialize photo URLs from the parent.
DO $$
DECLARE v_product_id uuid;
BEGIN
  FOR v_product_id IN
    SELECT p.id FROM public.products p
     WHERE COALESCE(p.item_type, 'product') = 'product'
       AND (SELECT count(*) FROM public.product_variations v WHERE v.product_id = p.id) = 1
  LOOP
    PERFORM public.sync_single_variation_parent_data(v_product_id);
  END LOOP;
END;
$$;
