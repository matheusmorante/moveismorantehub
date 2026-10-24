-- Authorization for the legacy inventory finalizer. The matching role setting
-- is managed by the ERP permission catalog and defaults to stock managers.
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.has_finalize_stock_inventory_permission()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_roles text[];
  v_allowed_roles text[];
  v_allowed_roles_json jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT CASE
    WHEN pg_catalog.cardinality(
      pg_catalog.array_remove(COALESCE(profile.roles, ARRAY[]::text[]), 'pending')
    ) > 0 THEN pg_catalog.array_remove(COALESCE(profile.roles, ARRAY[]::text[]), 'pending')
    WHEN profile.role IS NOT NULL AND profile.role <> 'pending' THEN ARRAY[profile.role]
    ELSE ARRAY[]::text[]
  END
  INTO v_user_roles
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id;

  IF NOT FOUND OR pg_catalog.cardinality(v_user_roles) = 0 THEN
    RETURN false;
  END IF;

  IF 'administrator' = ANY(v_user_roles) THEN
    RETURN true;
  END IF;

  SELECT settings.data -> 'rolePermissions' -> 'finalizeStockInventory'
  INTO v_allowed_roles_json
  FROM public.settings AS settings
  WHERE settings.id = 'app';

  IF NOT FOUND OR v_allowed_roles_json IS NULL THEN
    v_allowed_roles := ARRAY['manager', 'stockist'];
  ELSIF pg_catalog.jsonb_typeof(v_allowed_roles_json) = 'array' THEN
    SELECT COALESCE(pg_catalog.array_agg(permission_role.role_name), ARRAY[]::text[])
    INTO v_allowed_roles
    FROM pg_catalog.jsonb_array_elements_text(v_allowed_roles_json) AS permission_role(role_name);
  ELSE
    RETURN false;
  END IF;

  RETURN v_user_roles && v_allowed_roles;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.has_finalize_stock_inventory_permission()
  FROM PUBLIC, anon, authenticated;

-- Backfill the new setting without overwriting an administrator's existing
-- explicit role list. This keeps the server and client defaults aligned.
UPDATE public.settings AS settings
SET data = pg_catalog.jsonb_set(
  COALESCE(settings.data, '{}'::jsonb),
  '{rolePermissions}',
  (
    CASE
      WHEN pg_catalog.jsonb_typeof(COALESCE(settings.data, '{}'::jsonb)->'rolePermissions') = 'object'
        THEN COALESCE(settings.data->'rolePermissions', '{}'::jsonb)
      ELSE '{}'::jsonb
    END
  ) || pg_catalog.jsonb_build_object(
    'finalizeStockInventory', pg_catalog.jsonb_build_array('manager', 'stockist')
  ),
  true
)
WHERE settings.id = 'app'
  AND pg_catalog.jsonb_typeof(settings.data #> '{rolePermissions,finalizeStockInventory}') IS DISTINCT FROM 'array';

-- Keep the existing RPC contract and stock writes intact, but require a real
-- authenticated profile with the dedicated permission before any side effect.
CREATE OR REPLACE FUNCTION public.finalize_inventory_transaction(
  p_audit_id uuid,
  p_code text,
  p_observation jsonb,
  p_items jsonb,
  p_responsible_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_item jsonb;
  v_marker_id uuid;
  v_marker_observation jsonb;
  v_product_id uuid;
  v_variation_id uuid;
  v_target numeric;
  v_previous numeric;
  v_moves jsonb := '[]'::jsonb;
  v_move_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.has_finalize_stock_inventory_permission() THEN
    RAISE EXCEPTION 'Seu perfil não possui a permissão Finalizar inventários.'
      USING ERRCODE = '42501';
  END IF;

  IF p_audit_id IS NULL OR NULLIF(btrim(p_code), '') IS NULL
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR p_observation->>'status' IS DISTINCT FROM 'completed'
     OR p_observation->>'inventoryCode' IS DISTINCT FROM p_code
     OR p_observation->>'inventoryAudit' IS DISTINCT FROM 'true'
     OR jsonb_typeof(p_observation->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Dados de conclusão do inventário inválidos';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS adjusted(item)
    GROUP BY adjusted.item->>'productId', adjusted.item->>'variationId'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Ajustes duplicados no mesmo inventário';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_audit_id::text));

  SELECT id, COALESCE(observation::jsonb, '{}'::jsonb)
    INTO v_marker_id, v_marker_observation
    FROM public.inventory_moves
   WHERE (related_entity_id = p_audit_id::text OR order_id = p_audit_id::text)
     AND label LIKE 'Inventário #%' AND type = 'adjustment'
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF v_marker_id IS NOT NULL AND v_marker_observation->>'status' = 'completed' THEN
    RETURN jsonb_build_object('auditId', p_audit_id, 'markerMoveId', v_marker_id, 'status', 'already_processed');
  END IF;

  IF v_marker_id IS NULL THEN
    INSERT INTO public.inventory_moves
      (product_id, type, quantity, date, label, observation, related_entity_id, order_id, status, created_at)
    VALUES
      (NULL, 'adjustment', 0, now(), 'Inventário #' || p_code || ' (Concluído)',
       p_observation::text, p_audit_id::text, p_audit_id::text, 'effective', now())
    RETURNING id INTO v_marker_id;
  ELSE
    UPDATE public.inventory_moves
       SET label = 'Inventário #' || p_code || ' (Concluído)',
           observation = p_observation::text, related_entity_id = p_audit_id::text,
           order_id = p_audit_id::text, status = 'effective'
     WHERE id = v_marker_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := NULLIF(v_item->>'productId', '')::uuid;
    v_variation_id := NULLIF(v_item->>'variationId', '')::uuid;
    v_target := NULLIF(v_item->>'physicalCount', '')::numeric;
    v_previous := NULLIF(v_item->>'previousStock', '')::numeric;
    IF v_product_id IS NULL OR v_target IS NULL OR v_target < 0 OR v_previous IS NULL THEN
      RAISE EXCEPTION 'Ajuste de inventário inválido';
    END IF;
    IF v_variation_id IS NOT NULL AND v_target <> trunc(v_target) THEN
      RAISE EXCEPTION 'Quantidade de variação deve ser inteira';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_observation->'items') AS counted(item)
      WHERE counted.item->>'productId' = v_product_id::text
        AND COALESCE(counted.item->>'variationId', '') = COALESCE(v_variation_id::text, '')
        AND (counted.item->>'physicalCount')::numeric = v_target
    ) THEN
      RAISE EXCEPTION 'Ajuste não corresponde à contagem consolidada';
    END IF;

    INSERT INTO public.inventory_moves
      (product_id, variation_id, product_description, type, quantity, date, label,
       observation, related_entity_id, order_id, status, created_at)
    VALUES
      (v_product_id::text, v_variation_id::text, COALESCE(v_item->>'name', 'Item do inventário'),
       'adjustment', 0, now(), 'Ajuste lançado pelo inventário #' || p_code,
       jsonb_build_object('source', 'inventory_audit', 'targetStock', v_target,
                          'previousStock', v_previous, 'status', 'effective')::text,
       p_audit_id::text, p_audit_id::text, 'effective', now())
    RETURNING id INTO v_move_id;

    IF v_variation_id IS NOT NULL THEN
      UPDATE public.product_variations SET stock = v_target
       WHERE id = v_variation_id AND product_id = v_product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variação do inventário não encontrada'; END IF;
      UPDATE public.products SET stock = (
        SELECT COALESCE(sum(stock), 0) FROM public.product_variations WHERE product_id = v_product_id
      ) WHERE id = v_product_id;
    ELSE
      UPDATE public.products SET stock = v_target WHERE id = v_product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto do inventário não encontrado'; END IF;
    END IF;
    v_moves := v_moves || jsonb_build_array(jsonb_build_object('productId', v_product_id, 'inventoryMoveId', v_move_id));
  END LOOP;

  RETURN jsonb_build_object('auditId', p_audit_id, 'markerMoveId', v_marker_id,
                            'status', 'processed', 'moves', v_moves);
END;
$function$;

COMMENT ON FUNCTION public.finalize_inventory_transaction(uuid, text, jsonb, jsonb, text)
  IS 'Finaliza inventários apenas para perfis autorizados por finalizeStockInventory.';

REVOKE ALL ON FUNCTION public.finalize_inventory_transaction(uuid, text, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_transaction(uuid, text, jsonb, jsonb, text)
  TO authenticated, service_role;
