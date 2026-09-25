-- Integração isolada: todos os registros de teste são revertidos antes de sair do DO.
DO $test$
DECLARE
  v_product uuid := gen_random_uuid();
  v_variation uuid := gen_random_uuid();
  v_audit uuid := gen_random_uuid();
  v_code text := 'E2E_' || replace(gen_random_uuid()::text, '-', '');
  v_observation jsonb;
  v_items jsonb;
  v_result jsonb;
  v_stock numeric;
  v_count integer;
BEGIN
  v_observation := jsonb_build_object('inventoryAudit', true, 'status', 'completed',
    'inventoryCode', v_code, 'items', jsonb_build_array(jsonb_build_object(
      'productId', v_product, 'variationId', v_variation, 'physicalCount', 3)));
  v_items := jsonb_build_array(jsonb_build_object('productId', v_product,
    'variationId', v_variation, 'name', v_code, 'physicalCount', 3, 'previousStock', 4));

  BEGIN
    INSERT INTO public.products (id, name, slug, price, stock)
      VALUES (v_product, v_code, lower(v_code), 1, 4);
    INSERT INTO public.product_variations (id, product_id, name, stock)
      VALUES (v_variation, v_product, v_code, 4);

    v_result := public.finalize_inventory_transaction(v_audit, v_code, v_observation, v_items, 'Teste isolado');
    IF v_result->>'status' <> 'processed' THEN RAISE EXCEPTION 'Commit não confirmado'; END IF;
    SELECT stock INTO v_stock FROM public.product_variations WHERE id = v_variation;
    IF v_stock <> 3 THEN RAISE EXCEPTION 'Estoque divergente'; END IF;
    SELECT count(*) INTO v_count FROM public.inventory_moves WHERE order_id = v_audit::text;
    IF v_count <> 2 THEN RAISE EXCEPTION 'Movimentos esperados: 2, encontrados: %', v_count; END IF;

    v_result := public.finalize_inventory_transaction(v_audit, v_code, v_observation, v_items, 'Teste isolado');
    IF v_result->>'status' <> 'already_processed' THEN RAISE EXCEPTION 'Reenvio não idempotente'; END IF;
    SELECT count(*) INTO v_count FROM public.inventory_moves WHERE order_id = v_audit::text;
    IF v_count <> 2 THEN RAISE EXCEPTION 'Reenvio duplicou movimentos'; END IF;

    RAISE EXCEPTION 'ROLLBACK_TEST_FIXTURE';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'ROLLBACK_TEST_FIXTURE' THEN RAISE; END IF;
  END;

  IF EXISTS (SELECT 1 FROM public.products WHERE id = v_product)
     OR EXISTS (SELECT 1 FROM public.product_variations WHERE id = v_variation)
     OR EXISTS (SELECT 1 FROM public.inventory_moves WHERE order_id = v_audit::text) THEN
    RAISE EXCEPTION 'Resíduos do teste de integração';
  END IF;
END
$test$;
