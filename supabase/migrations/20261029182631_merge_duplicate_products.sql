CREATE OR REPLACE FUNCTION app_private.normalized_product_variation_attributes(p_attributes jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  SELECT COALESCE(
    pg_catalog.jsonb_object_agg(attribute_name, attribute_value ORDER BY attribute_name),
    '{}'::jsonb
  )
  FROM (
    SELECT pg_catalog.lower(pg_catalog.btrim(attribute.key)) AS attribute_name,
           pg_catalog.lower(pg_catalog.btrim(attribute.value)) AS attribute_value
    FROM pg_catalog.jsonb_each_text(
      CASE WHEN pg_catalog.jsonb_typeof(p_attributes) = 'object'
        THEN p_attributes ELSE '{}'::jsonb END
    ) AS attribute(key, value)

    UNION ALL

    SELECT pg_catalog.lower(pg_catalog.btrim(attribute.value ->> 'name')) AS attribute_name,
           pg_catalog.lower(pg_catalog.btrim(attribute.value ->> 'value')) AS attribute_value
    FROM pg_catalog.jsonb_array_elements(
      CASE WHEN pg_catalog.jsonb_typeof(p_attributes) = 'array'
        THEN p_attributes ELSE '[]'::jsonb END
    ) AS attribute(value)
  ) AS normalized
  WHERE attribute_name <> ''
    AND attribute_value <> '';
$function$;

CREATE OR REPLACE FUNCTION public.merge_duplicate_product_into_canonical(
  p_source_product_id uuid,
  p_canonical_product_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_source public.products%ROWTYPE;
  v_canonical public.products%ROWTYPE;
  v_variation_map jsonb;
  v_variation_count integer;
  v_target_variation_count integer;
  v_source_variation_stock numeric;
  v_target_variation_stock numeric;
  v_repointed_order_items integer := 0;
  v_repointed_inventory_moves integer := 0;
  v_repointed_images integer := 0;
  v_removed_duplicate_images integer := 0;
  v_repointed_categories integer := 0;
  v_removed_duplicate_categories integer := 0;
  v_repointed_analytics integer := 0;
  v_merged_images jsonb;
  v_previous_state jsonb;
  v_trash_metadata jsonb;
  v_merge_metadata jsonb;
  v_variation_merge_result jsonb;
  v_mapping record;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.has_delete_products_permission() THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'permission_denied',
      'message', 'Seu perfil não possui permissão para mesclar produtos duplicados.'
    );
  END IF;

  IF p_source_product_id IS NULL OR p_canonical_product_id IS NULL
     OR p_source_product_id = p_canonical_product_id THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'invalid_products',
      'message', 'Selecione dois produtos diferentes.'
    );
  END IF;

  PERFORM 1
  FROM public.products AS product
  WHERE product.id IN (p_source_product_id, p_canonical_product_id)
  ORDER BY product.id
  FOR UPDATE;

  SELECT * INTO v_source
  FROM public.products AS product
  WHERE product.id = p_source_product_id;

  SELECT * INTO v_canonical
  FROM public.products AS product
  WHERE product.id = p_canonical_product_id;

  IF v_source.id IS NULL OR v_canonical.id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'product_not_found',
      'message', 'Produto de origem ou canônico não encontrado.'
    );
  END IF;

  IF v_source.deleted IS TRUE
     AND v_source.technical_specs #>> '{duplicate_merge,canonical_product_id}' = p_canonical_product_id::text THEN
    RETURN COALESCE(v_source.technical_specs -> 'duplicate_merge', '{}'::jsonb)
      || pg_catalog.jsonb_build_object(
        'success', true,
        'code', 'products_merged',
        'source_product_id', p_source_product_id,
        'canonical_product_id', p_canonical_product_id,
        'already_merged', true
      );
  END IF;

  IF COALESCE(v_source.deleted, false) OR COALESCE(v_canonical.deleted, false)
     OR COALESCE(v_source.is_draft, false) OR COALESCE(v_canonical.is_draft, false)
     OR COALESCE(v_source.is_combo, false) OR COALESCE(v_canonical.is_combo, false)
     OR COALESCE(v_source.has_variations, false) IS NOT TRUE
     OR COALESCE(v_canonical.has_variations, false) IS NOT TRUE
     OR v_canonical.active IS NOT TRUE
     OR v_source.item_type IS DISTINCT FROM v_canonical.item_type
     OR v_source.product_kind IS DISTINCT FROM v_canonical.product_kind
     OR v_source.unit IS DISTINCT FROM v_canonical.unit
     OR v_source.condition IS DISTINCT FROM v_canonical.condition
     OR v_source.parent_id IS DISTINCT FROM v_canonical.parent_id
     OR v_source.category_id IS DISTINCT FROM v_canonical.category_id
     OR v_source.product_type_id IS DISTINCT FROM v_canonical.product_type_id
     OR v_source.width IS DISTINCT FROM v_canonical.width
     OR v_source.height IS DISTINCT FROM v_canonical.height
     OR v_source.depth IS DISTINCT FROM v_canonical.depth THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'incompatible_products',
      'message', 'A mesclagem exige produtos ativos, do mesmo tipo, categoria, unidade e dimensões.'
    );
  END IF;

  SELECT pg_catalog.count(*)::integer,
         COALESCE(pg_catalog.sum(COALESCE(variation.stock, 0)), 0)
  INTO v_variation_count, v_source_variation_stock
  FROM public.product_variations AS variation
  WHERE variation.product_id = p_source_product_id;

  SELECT pg_catalog.count(*)::integer,
         COALESCE(pg_catalog.sum(COALESCE(variation.stock, 0)), 0)
  INTO v_target_variation_count, v_target_variation_stock
  FROM public.product_variations AS variation
  WHERE variation.product_id = p_canonical_product_id;

  IF v_variation_count = 0 OR v_target_variation_count <> v_variation_count
     OR COALESCE(v_source.stock, 0) <> v_source_variation_stock
     OR COALESCE(v_canonical.stock, 0) <> v_target_variation_stock THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'stock_or_variation_mismatch',
      'message', 'As variações e os saldos dos produtos precisam corresponder antes da mesclagem.'
    );
  END IF;

  SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'source_id', source_variation.id,
      'canonical_id', canonical_variation.id,
      'source_stock', COALESCE(source_variation.stock, 0),
      'canonical_stock', COALESCE(canonical_variation.stock, 0)
    ) ORDER BY source_variation.id
  )
  INTO v_variation_map
  FROM public.product_variations AS source_variation
  JOIN public.product_variations AS canonical_variation
    ON canonical_variation.product_id = p_canonical_product_id
   AND app_private.normalized_product_variation_attributes(canonical_variation.attributes)
       = app_private.normalized_product_variation_attributes(source_variation.attributes)
  WHERE source_variation.product_id = p_source_product_id;

  IF COALESCE(pg_catalog.jsonb_array_length(v_variation_map), 0) <> v_variation_count
     OR (
       SELECT pg_catalog.count(DISTINCT mapping.value ->> 'canonical_id')
       FROM pg_catalog.jsonb_array_elements(COALESCE(v_variation_map, '[]'::jsonb)) AS mapping(value)
     ) <> v_target_variation_count
     OR EXISTS (
       SELECT 1
       FROM public.product_variations AS variation
       WHERE variation.product_id IN (p_source_product_id, p_canonical_product_id)
         AND variation.merged_to_variation_id IS NOT NULL
     ) THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'variation_identity_mismatch',
      'message', 'As variações precisam ter atributos únicos e equivalentes, sem mesclagens anteriores.'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.inventory_moves AS move
    WHERE move.product_id = p_source_product_id::text
      AND move.type IS DISTINCT FROM 'exit'
  ) THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'unsupported_inventory_history',
      'message', 'Há movimentações de estoque que exigem conciliação específica; nenhum dado foi alterado.'
    );
  END IF;

  -- Compras, recebimentos, composição e vínculos fiscais conservam sua identidade histórica.
  IF EXISTS (
    SELECT 1 FROM public.goods_receipt_items AS item
    WHERE item.product_id = p_source_product_id
       OR item.variation_id IN (
         SELECT variation.id FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
  ) OR EXISTS (
    SELECT 1 FROM public.inbound_invoice_items AS item
    WHERE item.product_id = p_source_product_id
       OR item.variation_id IN (
         SELECT variation.id FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
  ) OR EXISTS (
    SELECT 1 FROM public.purchase_items AS item
    WHERE item.product_id = p_source_product_id::text
       OR item.variation_id IN (
         SELECT variation.id::text FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
  ) OR EXISTS (
    SELECT 1 FROM public.composition_variation_items AS item
    WHERE item.product_id = p_source_product_id
       OR item.variation_id IN (
         SELECT variation.id FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
       OR item.composition_variation_id IN (
         SELECT variation.id FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
  ) OR EXISTS (
    SELECT 1 FROM public.inventory_labels AS label
    WHERE label.product_id = p_source_product_id
       OR label.variation_id IN (
         SELECT variation.id FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
  ) OR EXISTS (
    SELECT 1 FROM public.product_supplier_codes AS code
    WHERE code.product_id = p_source_product_id
       OR code.product_variation_id IN (
         SELECT variation.id FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
  ) OR EXISTS (
    SELECT 1 FROM public.stock_unavailabilities AS unavailable
    WHERE unavailable.product_id = p_source_product_id
       OR unavailable.variation_id IN (
         SELECT variation.id FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
  ) OR EXISTS (
    SELECT 1 FROM public.product_price_history AS history
    WHERE history.product_id = p_source_product_id
       OR history.variation_id IN (
         SELECT variation.id::text FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
  ) OR EXISTS (
    SELECT 1 FROM public.desire_matches AS desire_match
    WHERE desire_match.product_id = p_source_product_id
  ) OR EXISTS (
    SELECT 1 FROM public.ncm_product_reviews AS review
    WHERE review.product_id = p_source_product_id
  ) OR EXISTS (
    SELECT 1 FROM public.mobile_product_save_operations AS operation
    WHERE operation.product_id = p_source_product_id
  ) OR EXISTS (
    SELECT 1 FROM public.post_creator_previews AS preview
    WHERE preview.product_id = p_source_product_id
  ) OR EXISTS (
    SELECT 1 FROM public.post_share_tokens AS share
    WHERE share.product_id = p_source_product_id::text
       OR share.variation_id IN (
         SELECT variation.id::text FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
       )
  ) OR EXISTS (
    SELECT 1 FROM public.goods_receipts AS receipt
    WHERE COALESCE(receipt.items::text, '') LIKE '%' || p_source_product_id::text || '%'
       OR EXISTS (
         SELECT 1 FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
           AND COALESCE(receipt.items::text, '') LIKE '%' || variation.id::text || '%'
       )
  ) OR EXISTS (
    SELECT 1 FROM public.inbound_invoices AS invoice
    WHERE COALESCE(invoice.itens::text, '') LIKE '%' || p_source_product_id::text || '%'
       OR EXISTS (
         SELECT 1 FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
           AND COALESCE(invoice.itens::text, '') LIKE '%' || variation.id::text || '%'
       )
  ) OR EXISTS (
    SELECT 1 FROM public.purchases AS purchase
    WHERE COALESCE(purchase.items::text, '') LIKE '%' || p_source_product_id::text || '%'
       OR EXISTS (
         SELECT 1 FROM public.product_variations AS variation
         WHERE variation.product_id = p_source_product_id
           AND COALESCE(purchase.items::text, '') LIKE '%' || variation.id::text || '%'
       )
  ) OR EXISTS (
    SELECT 1 FROM public.products AS child_product
    WHERE child_product.id <> p_source_product_id
      AND child_product.parent_id = p_source_product_id
  ) OR EXISTS (
    SELECT 1 FROM public.products AS product
    WHERE product.id <> p_source_product_id
      AND COALESCE(product.combo_items::text, '') LIKE '%' || p_source_product_id::text || '%'
  ) OR EXISTS (
    SELECT 1 FROM public.product_variations AS variation
    WHERE variation.product_id NOT IN (p_source_product_id, p_canonical_product_id)
      AND COALESCE(variation.combo_items::text, '') LIKE '%' || p_source_product_id::text || '%'
  ) THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'unsupported_references',
      'message', 'Há compras, documentos ou vínculos especiais que precisam de tratamento próprio; nenhum dado foi alterado.'
    );
  END IF;

  v_previous_state := pg_catalog.jsonb_build_object(
    'parent', pg_catalog.jsonb_build_object('active', v_source.active, 'status', v_source.status),
    'variations', (
      SELECT COALESCE(
        pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'id', variation.id, 'active', variation.active, 'status', variation.status
        )),
        '[]'::jsonb
      )
      FROM public.product_variations AS variation
      WHERE variation.product_id = p_source_product_id
    )
  );

  FOR v_mapping IN
    SELECT mapping.value
    FROM pg_catalog.jsonb_array_elements(v_variation_map) AS mapping(value)
    ORDER BY mapping.value ->> 'source_id'
  LOOP
    UPDATE public.product_variations AS canonical_variation
    SET stock = COALESCE(canonical_variation.stock, 0)
                 + COALESCE((v_mapping.value ->> 'source_stock')::integer, 0)
    WHERE canonical_variation.id = (v_mapping.value ->> 'canonical_id')::uuid
      AND COALESCE(canonical_variation.stock, 0)
          = COALESCE((v_mapping.value ->> 'canonical_stock')::integer, 0);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'O saldo da variação canônica mudou durante a mesclagem.';
    END IF;

    v_variation_merge_result := public.merge_product_variation_into_canonical(
      (v_mapping.value ->> 'source_id')::uuid,
      (v_mapping.value ->> 'canonical_id')::uuid
    );

    IF COALESCE(v_variation_merge_result ->> 'success', 'false') <> 'true' THEN
      RAISE EXCEPTION 'Não foi possível mesclar uma variação: %',
        COALESCE(v_variation_merge_result ->> 'message', 'resultado não confirmado');
    END IF;

    UPDATE public.product_variations AS source_variation
    SET stock = 0,
        active = false,
        status = 'hidden',
        updated_at = pg_catalog.now()
    WHERE source_variation.id = (v_mapping.value ->> 'source_id')::uuid
      AND source_variation.merged_to_variation_id = (v_mapping.value ->> 'canonical_id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'A variação de origem não foi confirmada como mesclada.';
    END IF;
  END LOOP;

  UPDATE public.order_items AS item
  SET product_id = p_canonical_product_id::text,
      variation_id = COALESCE((
        SELECT mapping.value ->> 'canonical_id'
        FROM pg_catalog.jsonb_array_elements(v_variation_map) AS mapping(value)
        WHERE mapping.value ->> 'source_id' = item.variation_id
      ), item.variation_id)
  WHERE item.product_id = p_source_product_id::text
     OR item.variation_id IN (
       SELECT mapping.value ->> 'source_id'
       FROM pg_catalog.jsonb_array_elements(v_variation_map) AS mapping(value)
     );
  GET DIAGNOSTICS v_repointed_order_items = ROW_COUNT;

  UPDATE public.inventory_moves AS move
  SET product_id = p_canonical_product_id::text,
      variation_id = COALESCE((
        SELECT mapping.value ->> 'canonical_id'
        FROM pg_catalog.jsonb_array_elements(v_variation_map) AS mapping(value)
        WHERE mapping.value ->> 'source_id' = move.variation_id
      ), move.variation_id)
  WHERE move.product_id = p_source_product_id::text
     OR move.variation_id IN (
       SELECT mapping.value ->> 'source_id'
       FROM pg_catalog.jsonb_array_elements(v_variation_map) AS mapping(value)
     );
  GET DIAGNOSTICS v_repointed_inventory_moves = ROW_COUNT;

  DELETE FROM public.product_images AS source_image
  WHERE source_image.product_id = p_source_product_id
    AND EXISTS (
      SELECT 1 FROM public.product_images AS canonical_image
      WHERE canonical_image.product_id = p_canonical_product_id
        AND canonical_image.image_url = source_image.image_url
    );
  GET DIAGNOSTICS v_removed_duplicate_images = ROW_COUNT;

  UPDATE public.product_images AS image
  SET product_id = p_canonical_product_id
  WHERE image.product_id = p_source_product_id;
  GET DIAGNOSTICS v_repointed_images = ROW_COUNT;

  UPDATE public.product_analytics AS analytics
  SET product_id = p_canonical_product_id
  WHERE analytics.product_id = p_source_product_id;
  GET DIAGNOSTICS v_repointed_analytics = ROW_COUNT;

  DELETE FROM public.product_categories AS source_category
  WHERE source_category.product_id = p_source_product_id
    AND EXISTS (
      SELECT 1 FROM public.product_categories AS canonical_category
      WHERE canonical_category.product_id = p_canonical_product_id
        AND canonical_category.category_id = source_category.category_id
    );
  GET DIAGNOSTICS v_removed_duplicate_categories = ROW_COUNT;

  UPDATE public.product_categories AS category
  SET product_id = p_canonical_product_id
  WHERE category.product_id = p_source_product_id;
  GET DIAGNOSTICS v_repointed_categories = ROW_COUNT;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(pg_catalog.to_jsonb(image.image_url) ORDER BY image.first_position),
    '[]'::jsonb
  )
  INTO v_merged_images
  FROM (
    SELECT images.image_url, pg_catalog.min(images.position) AS first_position
    FROM (
      SELECT image.value AS image_url, image.ordinality::bigint AS position
      FROM pg_catalog.jsonb_array_elements_text(COALESCE(v_canonical.images, '[]'::jsonb))
        WITH ORDINALITY AS image(value, ordinality)
      UNION ALL
      SELECT image.value AS image_url, 1000000 + image.ordinality::bigint AS position
      FROM pg_catalog.jsonb_array_elements_text(COALESCE(v_source.images, '[]'::jsonb))
        WITH ORDINALITY AS image(value, ordinality)
    ) AS images
    GROUP BY images.image_url
  ) AS image;

  UPDATE public.products AS canonical_product
  SET stock = COALESCE(v_canonical.stock, 0) + COALESCE(v_source.stock, 0),
      images = v_merged_images,
      updated_at = pg_catalog.now()
  WHERE canonical_product.id = p_canonical_product_id;

  UPDATE public.products AS source_product
  SET stock = 0,
      active = false,
      status = 'hidden',
      deleted = true,
      deleted_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  WHERE source_product.id = p_source_product_id;

  v_trash_metadata := pg_catalog.jsonb_build_object(
    'deleted_at', pg_catalog.now(),
    'deleted_by', auth.uid(),
    'retention_until', pg_catalog.now() + interval '30 days',
    'previous_state', v_previous_state
  );

  v_merge_metadata := pg_catalog.jsonb_build_object(
    'canonical_product_id', p_canonical_product_id,
    'canonical_code', v_canonical.code,
    'merged_at', pg_catalog.now(),
    'merged_by', auth.uid(),
    'merged_variation_count', v_variation_count,
    'order_items_repointed', v_repointed_order_items,
    'inventory_moves_repointed', v_repointed_inventory_moves,
    'images_repointed', v_repointed_images,
    'duplicate_images_removed', v_removed_duplicate_images,
    'categories_repointed', v_repointed_categories,
    'duplicate_categories_removed', v_removed_duplicate_categories,
    'analytics_repointed', v_repointed_analytics,
    'canonical_stock', COALESCE(v_canonical.stock, 0) + COALESCE(v_source.stock, 0),
    'source_deleted', true,
    'historical_snapshots_preserved', true
  );

  UPDATE public.products AS source_product
  SET technical_specs = pg_catalog.jsonb_set(
        pg_catalog.jsonb_set(
          COALESCE(source_product.technical_specs, '{}'::jsonb),
          '{duplicate_merge}', v_merge_metadata, true
        ),
        '{trash_metadata}', v_trash_metadata, true
      )
  WHERE source_product.id = p_source_product_id;

  UPDATE public.product_variations AS source_variation
  SET active = false,
      status = 'hidden',
      stock = 0,
      updated_at = pg_catalog.now()
  WHERE source_variation.product_id = p_source_product_id;

  v_result := v_merge_metadata || pg_catalog.jsonb_build_object(
    'success', true,
    'code', 'products_merged',
    'source_product_id', p_source_product_id,
    'canonical_product_id', p_canonical_product_id
  );

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.normalized_product_variation_attributes(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.merge_duplicate_product_into_canonical(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_product_into_canonical(uuid, uuid)
  TO authenticated;
