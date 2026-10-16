-- Additive command for the active entry-batch editor; application needs specific
-- authorization for the operational project. No historical rows are rewritten.
-- Rollback: disable the editing command in the frontend and retain these new
-- functions/history. Do not restore the unsafe client-only balance writer.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE FUNCTION public.inventory_batch_metadata(p_observation text)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_metadata jsonb;
BEGIN
  BEGIN
    v_metadata := p_observation::jsonb;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN '{}'::jsonb;
  END;
  RETURN CASE WHEN pg_catalog.jsonb_typeof(v_metadata) = 'object'
    THEN v_metadata ELSE '{}'::jsonb END;
END;
$function$;

CREATE FUNCTION public.inventory_batch_metadata_number(p_observation text, p_key text)
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_value jsonb := public.inventory_batch_metadata(p_observation) -> p_key;
  v_number numeric;
BEGIN
  IF pg_catalog.jsonb_typeof(v_value) NOT IN ('number', 'string') OR v_value IS NULL THEN
    RETURN NULL;
  END IF;
  BEGIN
    v_number := (v_value #>> '{}')::numeric;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN NULL;
  END;
  RETURN CASE WHEN v_number::text IN ('NaN', 'Infinity', '-Infinity') THEN NULL ELSE v_number END;
END;
$function$;

CREATE FUNCTION public.inventory_batch_is_effective(p_status text, p_observation text, p_reason text)
RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = ''
AS $function$
  WITH metadata AS (
    SELECT public.inventory_batch_metadata(p_observation) ->> 'status' AS status
  )
  SELECT NOT (
    COALESCE(p_status IN ('reversed', 'cancelled'), false)
    OR COALESCE(metadata.status IN ('reversed', 'cancelled'), false)
    OR (
      NOT (COALESCE(p_status IN ('effective', 'active', 'reversed', 'cancelled'), false)
        OR COALESCE(metadata.status IN ('effective', 'active', 'reversed', 'cancelled'), false))
      AND (COALESCE(p_reason LIKE 'Estorno%', false)
        OR COALESCE(p_reason LIKE 'Cancelamento da venda%', false))
    )
  ) FROM metadata;
$function$;

CREATE FUNCTION public.inventory_batch_can_configure(p_roles text[], p_legacy_role text, p_settings jsonb)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_roles text[] := pg_catalog.array_remove(pg_catalog.array_remove(COALESCE(p_roles, ARRAY[]::text[]), 'pending'), NULL);
  v_permissions jsonb;
  v_allowed text[];
BEGIN
  IF pg_catalog.cardinality(v_roles) = 0 AND p_legacy_role IS NOT NULL AND p_legacy_role <> 'pending' THEN
    v_roles := ARRAY[p_legacy_role];
  END IF;
  IF 'administrator' = ANY(v_roles) THEN RETURN true; END IF;
  IF pg_catalog.cardinality(v_roles) = 0 OR pg_catalog.jsonb_typeof(p_settings) IS DISTINCT FROM 'object' THEN
    RETURN false;
  END IF;
  IF NOT (p_settings ? 'rolePermissions') THEN
    RETURN v_roles && ARRAY['manager', 'stockist', 'seller'];
  END IF;
  v_permissions := p_settings -> 'rolePermissions';
  IF pg_catalog.jsonb_typeof(v_permissions) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF NOT (v_permissions ? 'productConfig') THEN
    RETURN v_roles && ARRAY['manager', 'stockist', 'seller'];
  END IF;
  v_permissions := v_permissions -> 'productConfig';
  IF pg_catalog.jsonb_typeof(v_permissions) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(v_permissions) AS allowed(value)
    WHERE pg_catalog.jsonb_typeof(allowed.value) IS DISTINCT FROM 'string') THEN RETURN false; END IF;
  SELECT COALESCE(pg_catalog.array_agg(allowed.role), ARRAY[]::text[])
    INTO v_allowed FROM pg_catalog.jsonb_array_elements_text(v_permissions) AS allowed(role);
  RETURN v_roles && v_allowed;
END;
$function$;

CREATE FUNCTION public.update_inventory_batch(
  p_move_id uuid, p_product_id uuid, p_expected_quantity numeric,
  p_expected_unit_cost numeric, p_quantity numeric, p_unit_cost numeric
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
SET lock_timeout = '5s'
SET statement_timeout = '30s'
SET idle_in_transaction_session_timeout = '60s'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_roles text[];
  v_legacy_role text;
  v_settings jsonb;
  v_product public.products%ROWTYPE;
  v_move public.inventory_moves%ROWTYPE;
  v_saved public.inventory_moves%ROWTYPE;
  v_variation public.product_variations%ROWTYPE;
  v_anchor public.inventory_moves%ROWTYPE;
  v_effective_anchor boolean := true;
  v_quantity public.inventory_moves.quantity%TYPE;
  v_unit_cost public.inventory_moves.unit_cost%TYPE;
  v_delta numeric;
  v_product_stock numeric;
  v_variation_stock numeric;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'INVENTORY_BATCH_AUTH_REQUIRED' USING ERRCODE = '42501'; END IF;
  SELECT profile.roles, profile.role INTO v_roles, v_legacy_role
    FROM public.profiles AS profile WHERE profile.id = v_actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_BATCH_PERMISSION_DENIED' USING ERRCODE = '42501'; END IF;
  SELECT settings.data INTO v_settings FROM public.settings AS settings WHERE settings.id = 'app';
  IF NOT FOUND THEN v_settings := '{}'::jsonb; END IF;
  IF NOT public.inventory_batch_can_configure(v_roles, v_legacy_role, v_settings) THEN
    RAISE EXCEPTION 'INVENTORY_BATCH_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF p_move_id IS NULL OR p_product_id IS NULL
    OR p_expected_quantity IS NULL OR p_expected_unit_cost IS NULL OR p_quantity IS NULL OR p_unit_cost IS NULL
    OR p_expected_quantity::text IN ('NaN', 'Infinity', '-Infinity')
    OR p_expected_unit_cost::text IN ('NaN', 'Infinity', '-Infinity')
    OR p_quantity::text IN ('NaN', 'Infinity', '-Infinity') OR p_unit_cost::text IN ('NaN', 'Infinity', '-Infinity')
    OR p_expected_quantity < 0 OR p_expected_unit_cost < 0 OR p_quantity < 0 OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'INVENTORY_BATCH_INVALID_VALUES' USING ERRCODE = '22023';
  END IF;
  v_quantity := p_quantity;
  v_unit_cost := pg_catalog.round(p_unit_cost, 2);
  IF v_quantity <> p_quantity THEN
    RAISE EXCEPTION 'INVENTORY_BATCH_QUANTITY_PRECISION' USING ERRCODE = '22023';
  END IF;

  -- Every call locks the product first, then its movement and variation. The
  -- locked current balances, never client snapshots, are the delta baseline.
  SELECT product.* INTO v_product FROM public.products AS product
    WHERE product.id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_BATCH_PRODUCT_NOT_FOUND' USING ERRCODE = '40001'; END IF;
  SELECT movement.* INTO v_move FROM public.inventory_moves AS movement
    WHERE movement.id = p_move_id FOR UPDATE;
  IF NOT FOUND OR v_move.product_id IS DISTINCT FROM p_product_id::text OR v_move.type IS DISTINCT FROM 'entry'
    OR v_move.quantity IS DISTINCT FROM p_expected_quantity
    OR COALESCE(v_move.unit_cost, 0) IS DISTINCT FROM p_expected_unit_cost THEN
    RAISE EXCEPTION 'INVENTORY_BATCH_SNAPSHOT_CHANGED' USING ERRCODE = '40001';
  END IF;
  IF NULLIF(v_move.variation_id, '') IS NOT NULL THEN
    SELECT variation.* INTO v_variation FROM public.product_variations AS variation
      WHERE variation.id::text = v_move.variation_id AND variation.product_id = p_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_BATCH_VARIATION_NOT_FOUND' USING ERRCODE = '40001'; END IF;
  END IF;

  v_delta := v_quantity - v_move.quantity;
  IF NOT public.inventory_batch_is_effective(v_move.status, v_move.observation, v_move.reason)
    OR public.inventory_batch_metadata_number(v_move.observation, 'targetStock') IS NOT NULL THEN
    v_delta := 0;
  END IF;
  IF v_delta <> 0 THEN
    -- Do not guess the position of an anchor with an incomplete timestamp.
    IF v_move.date IS NULL OR v_move.created_at IS NULL OR EXISTS (
      SELECT 1 FROM public.inventory_moves AS candidate
      WHERE candidate.product_id = v_move.product_id
        AND COALESCE(NULLIF(candidate.variation_id, ''), '') = COALESCE(NULLIF(v_move.variation_id, ''), '')
        AND public.inventory_batch_metadata_number(candidate.observation, 'targetStock') IS NOT NULL
        AND (public.inventory_batch_is_effective(candidate.status, candidate.observation, candidate.reason)
          OR public.inventory_batch_metadata_number(candidate.observation, 'previousStock') IS NOT NULL)
        AND (candidate.date IS NULL OR candidate.created_at IS NULL)
    ) THEN RAISE EXCEPTION 'INVENTORY_BATCH_AMBIGUOUS_TIMELINE' USING ERRCODE = '40001'; END IF;

    SELECT candidate.* INTO v_anchor FROM public.inventory_moves AS candidate
      WHERE candidate.product_id = v_move.product_id
        AND COALESCE(NULLIF(candidate.variation_id, ''), '') = COALESCE(NULLIF(v_move.variation_id, ''), '')
        AND public.inventory_batch_metadata_number(candidate.observation, 'targetStock') IS NOT NULL
        AND public.inventory_batch_is_effective(candidate.status, candidate.observation, candidate.reason)
      ORDER BY candidate.date DESC, candidate.created_at DESC LIMIT 1;
    IF NOT FOUND THEN
      v_effective_anchor := false;
      SELECT candidate.* INTO v_anchor FROM public.inventory_moves AS candidate
        WHERE candidate.product_id = v_move.product_id
          AND COALESCE(NULLIF(candidate.variation_id, ''), '') = COALESCE(NULLIF(v_move.variation_id, ''), '')
          AND public.inventory_batch_metadata_number(candidate.observation, 'targetStock') IS NOT NULL
          AND public.inventory_batch_metadata_number(candidate.observation, 'previousStock') IS NOT NULL
          AND NOT public.inventory_batch_is_effective(candidate.status, candidate.observation, candidate.reason)
        ORDER BY candidate.date DESC, candidate.created_at DESC LIMIT 1;
    END IF;
    IF v_anchor.id IS NOT NULL THEN
      IF (v_anchor.date, v_anchor.created_at) = (v_move.date, v_move.created_at) OR EXISTS (
        SELECT 1 FROM public.inventory_moves AS candidate
        WHERE candidate.product_id = v_move.product_id
          AND COALESCE(NULLIF(candidate.variation_id, ''), '') = COALESCE(NULLIF(v_move.variation_id, ''), '')
          AND candidate.id <> v_anchor.id AND candidate.date = v_anchor.date AND candidate.created_at = v_anchor.created_at
          AND public.inventory_batch_metadata_number(candidate.observation, 'targetStock') IS NOT NULL
          AND (CASE WHEN v_effective_anchor
            THEN public.inventory_batch_is_effective(candidate.status, candidate.observation, candidate.reason)
            ELSE NOT public.inventory_batch_is_effective(candidate.status, candidate.observation, candidate.reason)
              AND public.inventory_batch_metadata_number(candidate.observation, 'previousStock') IS NOT NULL END)
      ) THEN RAISE EXCEPTION 'INVENTORY_BATCH_AMBIGUOUS_TIMELINE' USING ERRCODE = '40001'; END IF;
      IF (v_anchor.date, v_anchor.created_at) > (v_move.date, v_move.created_at) THEN v_delta := 0; END IF;
    END IF;
  END IF;

  v_product_stock := COALESCE(v_product.stock, 0) + v_delta;
  IF v_product_stock::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'INVENTORY_BATCH_INVALID_STOCK' USING ERRCODE = '22023';
  END IF;
  IF v_variation.id IS NOT NULL THEN
    v_variation_stock := COALESCE(v_variation.stock, 0)::numeric + v_delta;
    IF v_delta <> 0 AND (v_delta <> pg_catalog.trunc(v_delta)
      OR v_variation_stock < -2147483648 OR v_variation_stock > 2147483647) THEN
      RAISE EXCEPTION 'INVENTORY_BATCH_VARIATION_STOCK_PRECISION' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Existing guards, RLS, costing and audit triggers execute unchanged. Any
  -- essential rejection aborts all three updates in this database transaction.
  UPDATE public.inventory_moves AS movement SET quantity = v_quantity, unit_cost = v_unit_cost
    WHERE movement.id = p_move_id RETURNING movement.* INTO v_saved;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_BATCH_WRITE_NOT_CONFIRMED' USING ERRCODE = '40001'; END IF;
  IF v_delta <> 0 THEN
    IF v_variation.id IS NOT NULL THEN
      UPDATE public.product_variations AS variation SET stock = v_variation_stock::integer
        WHERE variation.id = v_variation.id AND variation.product_id = p_product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_BATCH_VARIATION_NOT_CONFIRMED' USING ERRCODE = '40001'; END IF;
    END IF;
    UPDATE public.products AS product SET stock = v_product_stock WHERE product.id = p_product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_BATCH_STOCK_NOT_CONFIRMED' USING ERRCODE = '40001'; END IF;
  END IF;
  RETURN pg_catalog.jsonb_build_object('move', pg_catalog.to_jsonb(v_saved), 'balance_delta', v_delta);
END;
$function$;

REVOKE ALL ON FUNCTION public.inventory_batch_metadata(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.inventory_batch_metadata_number(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.inventory_batch_is_effective(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.inventory_batch_can_configure(text[], text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_inventory_batch(uuid, uuid, numeric, numeric, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_batch_metadata(text), public.inventory_batch_metadata_number(text, text),
  public.inventory_batch_is_effective(text, text, text), public.inventory_batch_can_configure(text[], text, jsonb),
  public.update_inventory_batch(uuid, uuid, numeric, numeric, numeric, numeric) TO authenticated;
COMMIT;
