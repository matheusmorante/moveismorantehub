-- Read-only aggregate: retain the dashboard's stock rules and all eligible totals.
CREATE OR REPLACE FUNCTION public.get_dashboard_stock_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_summary jsonb;
  v_move record;
  v_observation jsonb;
  v_pending jsonb := NULL;
BEGIN
  WITH eligible_products AS MATERIALIZED (
    SELECT p.id, p.description, p.stock, p.min_stock, p.has_variations
    FROM public.products p
    WHERE p.active IS TRUE AND p.deleted_at IS NULL
      AND (p.item_type = 'product' OR p.item_type IS NULL)
      AND NOT public.test_artifact_is_test(to_jsonb(p))
      AND coalesce(p.observations, '') !~* '(HMLNFTEST|NFE_HML_MATRIX_2026_10)'
  ), stock_items AS (
    SELECT p.id AS product_id, NULL::uuid AS variation_id, coalesce(p.description, '') AS name,
      coalesce(p.stock, 0) AS stock, coalesce(p.min_stock, 0) AS min_stock
    FROM eligible_products p
    WHERE p.has_variations IS NOT TRUE OR NOT EXISTS (
      SELECT 1 FROM public.product_variations v WHERE v.product_id = p.id AND v.active IS TRUE
    )
    UNION ALL
    SELECT p.id, v.id,
      coalesce(p.description, 'null') || ' — ' || coalesce(nullif(v.name, ''), v.sku, 'null'),
      coalesce(v.stock, 0), coalesce(p.min_stock, 0)
    FROM eligible_products p JOIN public.product_variations v ON v.product_id = p.id
    WHERE p.has_variations IS TRUE AND v.active IS TRUE
  ), alerts AS MATERIALIZED (
    SELECT *, stock = 0 AS is_zero FROM stock_items
    WHERE stock = 0 OR (min_stock > 0 AND stock <= min_stock)
  ), first_items AS (
    SELECT * FROM alerts ORDER BY is_zero DESC, stock, product_id, variation_id LIMIT 8
  )
  SELECT jsonb_build_object(
    'zeroStockCount', count(*) FILTER (WHERE is_zero),
    'lowStockCount', count(*) FILTER (WHERE NOT is_zero),
    'lowStockItems', coalesce((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'productId', product_id, 'variationId', variation_id, 'name', name,
      'stock', stock, 'minStock', min_stock, 'isZero', is_zero
    )) ORDER BY is_zero DESC, stock, product_id, variation_id) FROM first_items), '[]'::jsonb)
  ) INTO v_summary FROM alerts;

  -- Legacy observations may contain plain text. Parse on the server, without
  -- truncating the candidates before looking for an in-progress inventory.
  FOR v_move IN SELECT m.date, m.observation FROM public.inventory_moves m ORDER BY m.date DESC, m.id
  LOOP
    BEGIN
      v_observation := coalesce(v_move.observation, '{}')::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN
      CONTINUE;
    END;
    IF v_observation->'inventoryAudit' = 'true'::jsonb AND v_observation->>'status' = 'in_progress' THEN
      v_pending := jsonb_strip_nulls(jsonb_build_object(
        'code', coalesce(nullif(v_observation->>'inventoryCode', ''), '—'),
        'date', coalesce(to_jsonb(v_move.date), to_jsonb(''::text)),
        'responsibleName', v_observation->>'responsibleName'
      ));
      EXIT;
    END IF;
  END LOOP;
  RETURN v_summary || jsonb_build_object('pendingInventory', v_pending);
END;
$$;
REVOKE ALL ON FUNCTION public.get_dashboard_stock_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stock_summary() TO authenticated, service_role;
COMMENT ON FUNCTION public.get_dashboard_stock_summary() IS 'RLS invoker. Full eligible zero/low stock totals, eight ordered items and latest eligible in-progress inventory; no product payloads.';

-- Keep the existing notification contract; omit variations that cannot create
-- an alert (there is no per-variation minimum column in the operational schema).
CREATE OR REPLACE FUNCTION public.notification_product_summaries(p_conditions text[] DEFAULT ARRAY['novo'])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'description',p.description,'stock',p.stock,'min_stock',p.min_stock,'unit',p.unit,
    'active',p.active,'deleted',p.deleted,'has_variations',p.has_variations,'item_type',p.item_type,
    'condition',p.condition,'notification_config',p.notification_config,
    'variations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'stock',v.stock) ORDER BY v.id)
      FROM public.product_variations v WHERE v.product_id=p.id AND coalesce(v.stock,0)=0),'[]'::jsonb)
  ) ORDER BY p.id),'[]'::jsonb)
  FROM public.products p
  WHERE p.active IS TRUE AND p.deleted_at IS NULL AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND (EXISTS(SELECT 1 FROM public.desire_matches m WHERE m.product_id=p.id AND m.notified IS FALSE)
      OR (p.deleted IS NOT TRUE AND coalesce(nullif(p.item_type,''),'product')='product'
        AND coalesce(nullif(p.condition,''),'novo')=ANY(coalesce(p_conditions,ARRAY['novo']))
        AND p.notification_config->'enabled' IS DISTINCT FROM 'false'::jsonb
        AND ((p.has_variations IS TRUE AND p.notification_config->'notifyZeroStock' IS DISTINCT FROM 'false'::jsonb
              AND EXISTS(SELECT 1 FROM public.product_variations v WHERE v.product_id=p.id AND coalesce(v.stock,0)=0))
          OR (p.has_variations IS NOT TRUE AND (
            (p.notification_config->'notifyZeroStock' IS DISTINCT FROM 'false'::jsonb AND coalesce(p.stock,0)=0)
            OR (p.notification_config->'notifyMinStock' IS DISTINCT FROM 'false'::jsonb AND p.min_stock>0 AND p.stock>0 AND p.stock<=p.min_stock))))));
$$;
REVOKE ALL ON FUNCTION public.notification_product_summaries(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.notification_product_summaries(text[]) TO authenticated,service_role;
