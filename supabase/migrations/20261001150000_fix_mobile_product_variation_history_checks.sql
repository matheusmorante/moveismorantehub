-- Corrige a comparação tipada de UUID ao proteger a remoção de variações com composição vinculada.
CREATE OR REPLACE FUNCTION public.save_mobile_product_transaction(
  p_operation_id uuid,
  p_expected_updated_at timestamptz,
  p_is_edit boolean,
  p_product_id uuid,
  p_product jsonb,
  p_images jsonb,
  p_category_ids uuid[],
  p_variations jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_product_id uuid := COALESCE(p_product_id, gen_random_uuid());
  v_request_payload jsonb;
  v_request_variations jsonb;
  v_existing_request jsonb;
  v_existing_product_id uuid;
  v_rows_inserted integer;
  v_product_row public.products;
  v_variation_row public.product_variations;
  v_item jsonb;
  v_image_url text;
  v_category_id uuid;
  v_variation_id uuid;
  v_existing_stock integer;
  v_expected_updated_at timestamptz;
  v_retained_variation_ids uuid[] := ARRAY[]::uuid[];
  v_slug_base text;
  v_slug text;
  v_slug_suffix integer := 2;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para salvar o produto.'
      USING ERRCODE = '28000';
  END IF;
  IF p_operation_id IS NULL THEN
    RAISE EXCEPTION 'A operação de salvamento não possui identificador.';
  END IF;
  IF jsonb_typeof(p_product) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Os dados do produto estão inválidos.';
  END IF;
  IF p_images IS NOT NULL AND jsonb_typeof(p_images) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'A lista de imagens está inválida.';
  END IF;
  IF jsonb_typeof(p_variations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'A lista de variações está inválida.';
  END IF;

  SELECT COALESCE(jsonb_agg(value - 'updated_at' ORDER BY ordinality), '[]'::jsonb)
    INTO v_request_variations
    FROM jsonb_array_elements(COALESCE(p_variations, '[]'::jsonb)) WITH ORDINALITY AS items(value, ordinality);

  v_request_payload := jsonb_build_object(
    'product_id', p_product_id,
    'expected_updated_at', p_expected_updated_at,
    'is_edit', p_is_edit,
    'product', p_product - 'updated_at',
    'images', p_images,
    'category_ids', p_category_ids,
    'variations', v_request_variations
  );

  INSERT INTO public.mobile_product_save_operations (
    user_id, operation_id, request_payload, product_id
  )
  VALUES (v_user_id, p_operation_id, v_request_payload, v_product_id)
  ON CONFLICT (user_id, operation_id) DO NOTHING;
  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  IF v_rows_inserted = 0 THEN
    SELECT request_payload, product_id
      INTO v_existing_request, v_existing_product_id
      FROM public.mobile_product_save_operations
     WHERE user_id = v_user_id AND operation_id = p_operation_id
     FOR UPDATE;

    IF v_existing_request IS DISTINCT FROM v_request_payload THEN
      RAISE EXCEPTION 'Este salvamento já foi concluído com outros dados. Reabra o produto para continuar.'
        USING ERRCODE = '22000';
    END IF;

    RETURN v_existing_product_id;
  END IF;

  v_product_row := jsonb_populate_record(NULL::public.products, p_product);

  v_slug_base := btrim(
    regexp_replace(
      lower(public.immutable_unaccent(
        COALESCE(NULLIF(btrim(v_product_row.slug), ''), NULLIF(btrim(v_product_row.name), ''), 'produto')
      )),
      '[^a-z0-9]+', '-', 'g'
    ),
    '-'
  );
  IF v_slug_base = '' THEN
    v_slug_base := 'produto';
  END IF;

  PERFORM pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mobile-product-slug:' || v_slug_base, 0)
  );
  v_slug := v_slug_base;
  WHILE EXISTS (
    SELECT 1
      FROM public.products AS existing
     WHERE existing.slug = v_slug
       AND (NOT COALESCE(p_is_edit, false) OR existing.id <> v_product_id)
  ) LOOP
    v_slug := v_slug_base || '-' || v_slug_suffix::text;
    v_slug_suffix := v_slug_suffix + 1;
  END LOOP;
  v_product_row.slug := v_slug;

  IF NOT COALESCE(p_is_edit, false) THEN
    IF EXISTS (SELECT 1 FROM public.products WHERE id = v_product_id) THEN
      RAISE EXCEPTION 'Este produto já existe. Reabra o cadastro antes de salvar novamente.'
        USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.products (
      id, name, description, code, category, category_id, product_kind, condition,
      opportunity_id, observations, slug, marketplace_title, brand, environment, include_environment,
      include_brand, title_order, featured, item_type, is_combo, unit_price, price,
      promo_price, cost_price, freight_type, freight_cost, ipi_percent,
      final_purchase_price, initial_stock, stock, min_stock, unit, depth_use_length,
      technical_specs, fiscal, combo_items, images, width, height, depth, active,
      is_draft, status, supplier_id, main_supplier_id, supplier_ids, has_variations,
      updated_at, is_salvado, deleted
    ) VALUES (
      v_product_id, v_product_row.name, v_product_row.description, v_product_row.code,
      v_product_row.category, v_product_row.category_id, v_product_row.product_kind,
      v_product_row.condition, v_product_row.opportunity_id, v_product_row.observations,
      v_product_row.slug, v_product_row.marketplace_title, v_product_row.brand, v_product_row.environment,
      v_product_row.include_environment, v_product_row.include_brand,
      v_product_row.title_order, v_product_row.featured, v_product_row.item_type,
      v_product_row.is_combo, v_product_row.unit_price, v_product_row.price,
      v_product_row.promo_price, v_product_row.cost_price, v_product_row.freight_type,
      v_product_row.freight_cost, v_product_row.ipi_percent,
      v_product_row.final_purchase_price, 0, 0, v_product_row.min_stock,
      v_product_row.unit, v_product_row.depth_use_length, v_product_row.technical_specs,
      v_product_row.fiscal, v_product_row.combo_items, COALESCE(v_product_row.images, '[]'::jsonb),
      v_product_row.width, v_product_row.height, v_product_row.depth,
      COALESCE(v_product_row.active, false), COALESCE(v_product_row.is_draft, false),
      COALESCE(v_product_row.status, 'hidden'), v_product_row.supplier_id,
      v_product_row.main_supplier_id, v_product_row.supplier_ids,
      COALESCE(v_product_row.has_variations, true), COALESCE(v_product_row.updated_at, now()),
      COALESCE(v_product_row.is_salvado, false), false
    );
  ELSE
    IF p_product_id IS NULL THEN
      RAISE EXCEPTION 'A edição precisa informar o produto.';
    END IF;
    SELECT updated_at
      INTO v_expected_updated_at
      FROM public.products
     WHERE id = v_product_id AND COALESCE(deleted, false) = false
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'O produto não existe ou foi removido.'
        USING ERRCODE = 'P0002';
    END IF;
    IF v_expected_updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'O produto foi alterado em outro lugar. Atualize o cadastro antes de salvar.'
        USING ERRCODE = '40001';
    END IF;

    UPDATE public.products AS product SET
      name = v_product_row.name,
      description = v_product_row.description,
      code = v_product_row.code,
      category = v_product_row.category,
      category_id = v_product_row.category_id,
      product_kind = v_product_row.product_kind,
      condition = v_product_row.condition,
      opportunity_id = v_product_row.opportunity_id,
      observations = v_product_row.observations,
      slug = v_product_row.slug,
      marketplace_title = v_product_row.marketplace_title,
      brand = v_product_row.brand,
      environment = v_product_row.environment,
      include_environment = v_product_row.include_environment,
      include_brand = v_product_row.include_brand,
      title_order = v_product_row.title_order,
      featured = v_product_row.featured,
      item_type = v_product_row.item_type,
      is_combo = v_product_row.is_combo,
      unit_price = v_product_row.unit_price,
      price = v_product_row.price,
      promo_price = v_product_row.promo_price,
      cost_price = v_product_row.cost_price,
      freight_type = v_product_row.freight_type,
      freight_cost = v_product_row.freight_cost,
      ipi_percent = v_product_row.ipi_percent,
      final_purchase_price = v_product_row.final_purchase_price,
      min_stock = v_product_row.min_stock,
      unit = v_product_row.unit,
      depth_use_length = v_product_row.depth_use_length,
      technical_specs = v_product_row.technical_specs,
      fiscal = v_product_row.fiscal,
      combo_items = v_product_row.combo_items,
      images = COALESCE(v_product_row.images, '[]'::jsonb),
      width = v_product_row.width,
      height = v_product_row.height,
      depth = v_product_row.depth,
      active = v_product_row.active,
      is_draft = v_product_row.is_draft,
      status = v_product_row.status,
      supplier_id = v_product_row.supplier_id,
      main_supplier_id = v_product_row.main_supplier_id,
      supplier_ids = v_product_row.supplier_ids,
      has_variations = v_product_row.has_variations,
      updated_at = COALESCE(v_product_row.updated_at, now()),
      is_salvado = v_product_row.is_salvado
    WHERE product.id = v_product_id;
  END IF;

  IF p_images IS NOT NULL THEN
    DELETE FROM public.product_images WHERE product_id = v_product_id;
    FOR v_image_url IN SELECT jsonb_array_elements_text(p_images)
    LOOP
      IF NULLIF(btrim(v_image_url), '') IS NOT NULL THEN
        INSERT INTO public.product_images (product_id, image_url, is_main)
        VALUES (v_product_id, v_image_url, NOT EXISTS (
          SELECT 1 FROM public.product_images WHERE product_id = v_product_id
        ));
      END IF;
    END LOOP;
  END IF;

  IF p_category_ids IS NOT NULL THEN
    DELETE FROM public.product_categories WHERE product_id = v_product_id;
    FOR v_category_id IN
      SELECT DISTINCT category_id
        FROM unnest(p_category_ids) AS categories(category_id)
       WHERE category_id IS NOT NULL
    LOOP
      INSERT INTO public.product_categories (product_id, category_id)
      VALUES (v_product_id, v_category_id);
    END LOOP;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_variations, '[]'::jsonb))
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Uma das variações está inválida.';
    END IF;

    v_variation_row := jsonb_populate_record(
      NULL::public.product_variations,
      v_item - 'stock' - 'created_at' - 'opening_cost_price' - 'merged_to_variation_id'
    );
    v_variation_id := NULLIF(v_item->>'id', '')::uuid;

    IF NULLIF(btrim(v_variation_row.sku), '') IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(hashtext(v_variation_row.sku)::bigint);
      IF EXISTS (
        SELECT 1 FROM public.product_variations AS existing
         WHERE existing.sku = v_variation_row.sku
           AND existing.product_id <> v_product_id
      ) THEN
        RAISE EXCEPTION 'O SKU da variação "%" já está em uso por outro produto.', v_variation_row.sku
          USING ERRCODE = '23505';
      END IF;
    END IF;

    IF v_variation_id IS NULL THEN
      INSERT INTO public.product_variations (
        id, product_id, name, sku, price, stock, image_url, attributes, promo_price,
        description, width, depth, height, use_parent_price, use_parent_promo_price,
        use_parent_dimensions, use_parent_description, status, active, updated_at,
        cost_price, combo_items
      ) VALUES (
        gen_random_uuid(), v_product_id, v_variation_row.name, v_variation_row.sku,
        v_variation_row.price, 0, v_variation_row.image_url,
        COALESCE(v_variation_row.attributes, '[]'::jsonb), v_variation_row.promo_price,
        v_variation_row.description, v_variation_row.width, v_variation_row.depth,
        v_variation_row.height, v_variation_row.use_parent_price,
        v_variation_row.use_parent_promo_price, v_variation_row.use_parent_dimensions,
        v_variation_row.use_parent_description, v_variation_row.status,
        COALESCE(v_variation_row.active, false), COALESCE(v_variation_row.updated_at, now()),
        v_variation_row.cost_price, COALESCE(v_variation_row.combo_items, '[]'::jsonb)
      ) RETURNING id INTO v_variation_id;
    ELSE
      SELECT stock
        INTO v_existing_stock
        FROM public.product_variations
       WHERE id = v_variation_id AND product_id = v_product_id
       FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'A variação % não pertence a este produto.', v_variation_id;
      END IF;

      UPDATE public.product_variations SET
        name = v_variation_row.name,
        sku = v_variation_row.sku,
        price = v_variation_row.price,
        stock = v_existing_stock,
        image_url = v_variation_row.image_url,
        attributes = COALESCE(v_variation_row.attributes, '[]'::jsonb),
        promo_price = v_variation_row.promo_price,
        description = v_variation_row.description,
        width = v_variation_row.width,
        depth = v_variation_row.depth,
        height = v_variation_row.height,
        use_parent_price = v_variation_row.use_parent_price,
        use_parent_promo_price = v_variation_row.use_parent_promo_price,
        use_parent_dimensions = v_variation_row.use_parent_dimensions,
        use_parent_description = v_variation_row.use_parent_description,
        status = v_variation_row.status,
        active = v_variation_row.active,
        updated_at = COALESCE(v_variation_row.updated_at, now()),
        cost_price = v_variation_row.cost_price,
        combo_items = COALESCE(v_variation_row.combo_items, '[]'::jsonb)
       WHERE id = v_variation_id;
    END IF;

    v_retained_variation_ids := array_append(v_retained_variation_ids, v_variation_id);
  END LOOP;

  FOR v_variation_id IN
    SELECT id FROM public.product_variations
     WHERE product_id = v_product_id
       AND NOT (id = ANY(v_retained_variation_ids))
     FOR UPDATE
  LOOP
    IF EXISTS (SELECT 1 FROM public.inventory_moves WHERE variation_id = v_variation_id::text)
       OR EXISTS (SELECT 1 FROM public.goods_receipt_items WHERE variation_id = v_variation_id)
       OR EXISTS (SELECT 1 FROM public.inbound_invoice_items WHERE variation_id = v_variation_id)
       OR EXISTS (SELECT 1 FROM public.product_supplier_codes WHERE product_variation_id = v_variation_id)
       OR EXISTS (SELECT 1 FROM public.composition_variation_items WHERE variation_id = v_variation_id)
       OR EXISTS (SELECT 1 FROM public.product_variations WHERE merged_to_variation_id = v_variation_id) THEN
      RAISE EXCEPTION 'A variação % possui histórico ou vínculos e não pode ser removida.', v_variation_id;
    END IF;
    DELETE FROM public.product_variations WHERE id = v_variation_id;
  END LOOP;

  RETURN v_product_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_mobile_product_transaction(uuid, timestamptz, boolean, uuid, jsonb, jsonb, uuid[], jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_mobile_product_transaction(uuid, timestamptz, boolean, uuid, jsonb, jsonb, uuid[], jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';

