-- Claim ownership of a frozen inventory submission at its first authorized upload.
-- Expand-only: the claim row survives a later finalization conflict so the same
-- authenticated owner can retry the exact contract version and payload.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

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
  FROM PUBLIC, anon, authenticated, service_role;

-- Retain an administrator's explicit permission list; add the project default
-- only when the key is absent or malformed.
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

DO $block$
BEGIN
  IF pg_catalog.to_regprocedure('extensions.digest(bytea,text)') IS NULL THEN
    RAISE EXCEPTION 'A extensão pgcrypto no schema extensions é necessária para proteger o snapshot do inventário.';
  END IF;
END;
$block$;

CREATE TABLE IF NOT EXISTS app_private.inventory_audit_submission_claims (
  audit_id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL,
  contract_version smallint NOT NULL CHECK (contract_version IN (1, 2)),
  submission_hash text NOT NULL CHECK (submission_hash ~ '^[0-9a-f]{64}$'),
  claimed_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  finalized_at timestamptz,
  marker_move_id uuid
);

ALTER TABLE app_private.inventory_audit_submission_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_private.inventory_audit_submission_claims
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE app_private.inventory_audit_submission_claims IS
  'Vínculo imutável entre audit_id, usuário autenticado que fez o primeiro envio autorizado e hash da submissão congelada.';

CREATE OR REPLACE FUNCTION app_private.inventory_audit_submission_hash(
  p_contract_version smallint,
  p_audit_id uuid,
  p_code text,
  p_observation jsonb,
  p_items jsonb,
  p_responsible_name text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        pg_catalog.jsonb_build_object(
          'contractVersion', p_contract_version,
          'auditId', p_audit_id,
          'code', p_code,
          'observation', p_observation,
          'items', p_items,
          'responsibleName', p_responsible_name
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$function$;

REVOKE ALL ON FUNCTION app_private.inventory_audit_submission_hash(smallint, uuid, text, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.assert_inventory_submission_envelope(
  p_contract_version smallint,
  p_audit_id uuid,
  p_code text,
  p_observation jsonb,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_item jsonb;
  v_count numeric;
  v_counted_at timestamptz;
  v_observed_count bigint;
  v_submitted_count bigint;
BEGIN
  IF p_contract_version IS NULL OR p_contract_version NOT IN (1, 2)
     OR p_audit_id IS NULL OR NULLIF(pg_catalog.btrim(p_code), '') IS NULL
     OR p_code IS NULL
     OR p_observation IS NULL
     OR pg_catalog.jsonb_typeof(p_observation) IS DISTINCT FROM 'object'
     OR pg_catalog.jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR pg_catalog.jsonb_typeof(p_observation->'items') IS DISTINCT FROM 'array'
     OR p_observation->>'status' IS DISTINCT FROM 'completed'
     OR p_observation->>'inventoryCode' IS DISTINCT FROM p_code
     OR p_observation->>'inventoryAudit' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Dados de conclusão do inventário inválidos.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_observation->'items') AS counted(item)
    WHERE counted.item->'physicalCount' IS NOT NULL
      AND counted.item->'physicalCount' <> 'null'::jsonb
  ) THEN
    RAISE EXCEPTION 'O inventário precisa ter pelo menos uma contagem.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_items) AS submitted(item)
    GROUP BY submitted.item->>'productId', COALESCE(submitted.item->>'variationId', '')
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Há produtos duplicados na submissão do inventário.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_observation->'items') AS counted(item)
    WHERE counted.item->'physicalCount' IS NOT NULL
      AND counted.item->'physicalCount' <> 'null'::jsonb
    GROUP BY counted.item->>'productId', COALESCE(counted.item->>'variationId', '')
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Há itens contados duplicados no snapshot do inventário.'
      USING ERRCODE = '22023';
  END IF;

  IF p_contract_version = 2 THEN
    SELECT pg_catalog.count(*)
      INTO v_observed_count
      FROM pg_catalog.jsonb_array_elements(p_observation->'items') AS counted(item)
     WHERE counted.item->'physicalCount' IS NOT NULL
       AND counted.item->'physicalCount' <> 'null'::jsonb;
    SELECT pg_catalog.count(*)
      INTO v_submitted_count
      FROM pg_catalog.jsonb_array_elements(p_items);
    IF v_submitted_count = 0 OR v_submitted_count <> v_observed_count THEN
      RAISE EXCEPTION 'A submissão v2 precisa conter todos os itens contados do snapshot.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_items) LOOP
    IF pg_catalog.jsonb_typeof(v_item) IS DISTINCT FROM 'object'
       OR NULLIF(v_item->>'productId', '') IS NULL
       OR v_item->'physicalCount' IS NULL
       OR pg_catalog.jsonb_typeof(v_item->'physicalCount') NOT IN ('number', 'string') THEN
      RAISE EXCEPTION 'Item da submissão sem produto ou quantidade contada válida.'
        USING ERRCODE = '22023';
    END IF;

    BEGIN
      v_count := (v_item->>'physicalCount')::numeric;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Quantidade contada inválida no inventário.'
        USING ERRCODE = '22023';
    END;
    IF v_count < 0 OR v_count::text IN ('NaN', 'Infinity', '-Infinity') THEN
      RAISE EXCEPTION 'A quantidade contada não pode ser negativa ou inválida.'
        USING ERRCODE = '22023';
    END IF;

    IF p_contract_version = 2 THEN
      IF NULLIF(v_item->>'countedAt', '') IS NULL THEN
        RAISE EXCEPTION 'Item da submissão v2 sem horário de contagem.'
          USING ERRCODE = '22023';
      END IF;
      BEGIN
        v_counted_at := (v_item->>'countedAt')::timestamptz;
      EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
        RAISE EXCEPTION 'Horário da contagem inválido.'
          USING ERRCODE = '22023';
      END;
      IF v_counted_at > pg_catalog.now() + interval '5 minutes' THEN
        RAISE EXCEPTION 'Horário da contagem está no futuro.'
          USING ERRCODE = '22023';
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_array_elements(p_observation->'items') AS counted(item)
      WHERE counted.item->>'productId' = v_item->>'productId'
        AND COALESCE(counted.item->>'variationId', '') = COALESCE(v_item->>'variationId', '')
        AND counted.item->>'physicalCount' = v_item->>'physicalCount'
        AND (p_contract_version = 1 OR counted.item->>'countedAt' = v_item->>'countedAt')
    ) THEN
      RAISE EXCEPTION 'A submissão não corresponde ao snapshot congelado da contagem.'
        USING ERRCODE = '22023';
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.assert_inventory_submission_envelope(smallint, uuid, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.claim_inventory_audit_submission(
  p_contract_version smallint,
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
  v_user_id uuid := auth.uid();
  v_owner_user_id uuid;
  v_claim_version smallint;
  v_claim_hash text;
  v_submission_hash text;
  v_marker_id uuid;
  v_marker_observation jsonb;
BEGIN
  IF v_user_id IS NULL OR NOT app_private.has_finalize_stock_inventory_permission() THEN
    RAISE EXCEPTION 'Seu perfil não possui a permissão Finalizar inventários.'
      USING ERRCODE = '42501';
  END IF;

  PERFORM app_private.assert_inventory_submission_envelope(
    p_contract_version, p_audit_id, p_code, p_observation, p_items
  );
  v_submission_hash := app_private.inventory_audit_submission_hash(
    p_contract_version, p_audit_id, p_code, p_observation, p_items, p_responsible_name
  );

  -- Shares the lock key with both finalizers so an old v1 client cannot race a v2 claim.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_audit_id::text));
  SELECT claim.owner_user_id, claim.contract_version, claim.submission_hash
    INTO v_owner_user_id, v_claim_version, v_claim_hash
    FROM app_private.inventory_audit_submission_claims AS claim
   WHERE claim.audit_id = p_audit_id
   FOR UPDATE;

  IF FOUND THEN
    IF v_owner_user_id IS DISTINCT FROM v_user_id
       OR v_claim_version IS DISTINCT FROM p_contract_version
       OR v_claim_hash IS DISTINCT FROM v_submission_hash THEN
      RAISE EXCEPTION 'Este inventário já foi reivindicado por outra conta ou por outra submissão. Retome com a conta que fez o primeiro envio.'
        USING ERRCODE = '42501';
    END IF;
    RETURN pg_catalog.jsonb_build_object('auditId', p_audit_id, 'status', 'already_claimed');
  END IF;

  SELECT move.id, COALESCE(move.observation::jsonb, '{}'::jsonb)
    INTO v_marker_id, v_marker_observation
    FROM public.inventory_moves AS move
   WHERE (move.related_entity_id = p_audit_id::text OR move.order_id = p_audit_id::text)
     AND move.label LIKE 'Inventário #%'
     AND move.type = 'adjustment'
   ORDER BY move.created_at DESC
   LIMIT 1
   FOR UPDATE;
  IF v_marker_id IS NOT NULL THEN
    IF v_marker_observation->>'status' = 'completed' THEN
      -- Legacy marker: acknowledge without assigning a new owner or writing stock.
      RETURN pg_catalog.jsonb_build_object(
        'auditId', p_audit_id, 'markerMoveId', v_marker_id, 'status', 'already_processed'
      );
    END IF;
    RAISE EXCEPTION 'Este inventário já possui um registro de uma versão anterior. Peça à equipe responsável para conferir o status antes de reenviar.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO app_private.inventory_audit_submission_claims (
    audit_id, owner_user_id, contract_version, submission_hash
  ) VALUES (
    p_audit_id, v_user_id, p_contract_version, v_submission_hash
  );

  RETURN pg_catalog.jsonb_build_object('auditId', p_audit_id, 'status', 'claimed');
END;
$function$;

REVOKE ALL ON FUNCTION app_private.claim_inventory_audit_submission(smallint, uuid, text, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_inventory_audit_submission(
  p_contract_version smallint,
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
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.has_finalize_stock_inventory_permission() THEN
    RAISE EXCEPTION 'Seu perfil não possui a permissão Finalizar inventários.'
      USING ERRCODE = '42501';
  END IF;
  RETURN app_private.claim_inventory_audit_submission(
    p_contract_version, p_audit_id, p_code, p_observation, p_items, p_responsible_name
  );
END;
$function$;

COMMENT ON FUNCTION public.claim_inventory_audit_submission(smallint, uuid, text, jsonb, jsonb, text)
  IS 'Vincula de forma idempotente o audit_id, a versão e o hash da submissão ao primeiro usuário autenticado com finalizeStockInventory.';

REVOKE ALL ON FUNCTION public.claim_inventory_audit_submission(smallint, uuid, text, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_inventory_audit_submission(smallint, uuid, text, jsonb, jsonb, text)
  TO authenticated;

-- Preserve the v1 RPC signature for older clients. New clients claim before
-- finalization; this fallback lets an older client claim atomically with its
-- legacy finalization transaction.
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
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_marker_id uuid;
  v_marker_observation jsonb;
  v_product_id uuid;
  v_variation_id uuid;
  v_target numeric;
  v_previous numeric;
  v_payload_hash text;
  v_claim_owner uuid;
  v_claim_version smallint;
  v_claim_hash text;
  v_claim_finalized_at timestamptz;
  v_claim_marker_id uuid;
  v_claim_exists boolean := false;
  v_moves jsonb := '[]'::jsonb;
  v_move_id uuid;
BEGIN
  IF v_user_id IS NULL OR NOT app_private.has_finalize_stock_inventory_permission() THEN
    RAISE EXCEPTION 'Seu perfil não possui a permissão Finalizar inventários.'
      USING ERRCODE = '42501';
  END IF;

  PERFORM app_private.assert_inventory_submission_envelope(1, p_audit_id, p_code, p_observation, p_items);
  v_payload_hash := app_private.inventory_audit_submission_hash(
    1, p_audit_id, p_code, p_observation, p_items, p_responsible_name
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_audit_id::text));

  SELECT claim.owner_user_id, claim.contract_version, claim.submission_hash,
         claim.finalized_at, claim.marker_move_id
    INTO v_claim_owner, v_claim_version, v_claim_hash,
         v_claim_finalized_at, v_claim_marker_id
    FROM app_private.inventory_audit_submission_claims AS claim
   WHERE claim.audit_id = p_audit_id
   FOR UPDATE;
  v_claim_exists := FOUND;

  IF v_claim_exists AND (
    v_claim_owner IS DISTINCT FROM v_user_id
    OR v_claim_version IS DISTINCT FROM 1
    OR v_claim_hash IS DISTINCT FROM v_payload_hash
  ) THEN
    RAISE EXCEPTION 'Este inventário pertence a outra conta ou a outra submissão. Retome com a conta e os dados do primeiro envio.'
      USING ERRCODE = '42501';
  END IF;

  IF v_claim_exists AND v_claim_finalized_at IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'auditId', p_audit_id,
      'markerMoveId', v_claim_marker_id,
      'status', 'already_processed'
    );
  END IF;

  SELECT move.id, COALESCE(move.observation::jsonb, '{}'::jsonb)
    INTO v_marker_id, v_marker_observation
    FROM public.inventory_moves AS move
   WHERE (move.related_entity_id = p_audit_id::text OR move.order_id = p_audit_id::text)
     AND move.label LIKE 'Inventário #%'
     AND move.type = 'adjustment'
   ORDER BY move.created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF v_marker_id IS NOT NULL AND v_marker_observation->>'status' = 'completed' THEN
    IF v_claim_exists THEN
      UPDATE app_private.inventory_audit_submission_claims
         SET finalized_at = COALESCE(finalized_at, pg_catalog.clock_timestamp()),
             marker_move_id = COALESCE(marker_move_id, v_marker_id)
       WHERE audit_id = p_audit_id;
    END IF;
    -- Compatibility for inventories finalized before ownership claims existed.
    RETURN pg_catalog.jsonb_build_object(
      'auditId', p_audit_id, 'markerMoveId', v_marker_id, 'status', 'already_processed'
    );
  END IF;

  IF v_marker_id IS NOT NULL AND NOT v_claim_exists THEN
    RAISE EXCEPTION 'Este inventário tem um registro anterior sem vínculo de envio. Peça à equipe responsável para conferir antes de continuar.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_claim_exists THEN
    INSERT INTO app_private.inventory_audit_submission_claims (
      audit_id, owner_user_id, contract_version, submission_hash
    ) VALUES (p_audit_id, v_user_id, 1, v_payload_hash);
  END IF;

  IF v_marker_id IS NULL THEN
    INSERT INTO public.inventory_moves
      (product_id, type, quantity, date, label, observation, related_entity_id,
       order_id, status, created_at)
    VALUES
      (NULL, 'adjustment', 0, pg_catalog.now(), 'Inventário #' || p_code || ' (Concluído)',
       p_observation::text, p_audit_id::text, p_audit_id::text, 'effective', pg_catalog.now())
    RETURNING id INTO v_marker_id;
  ELSE
    UPDATE public.inventory_moves
       SET label = 'Inventário #' || p_code || ' (Concluído)',
           observation = p_observation::text,
           related_entity_id = p_audit_id::text,
           order_id = p_audit_id::text,
           status = 'effective'
     WHERE id = v_marker_id;
  END IF;

  FOR v_item IN
    SELECT value
      FROM pg_catalog.jsonb_array_elements(p_items)
     ORDER BY value->>'productId', COALESCE(value->>'variationId', '')
  LOOP
    v_product_id := (v_item->>'productId')::uuid;
    v_variation_id := NULLIF(v_item->>'variationId', '')::uuid;
    v_target := (v_item->>'physicalCount')::numeric;
    v_previous := NULLIF(v_item->>'previousStock', '')::numeric;
    IF v_variation_id IS NOT NULL AND v_target <> pg_catalog.trunc(v_target) THEN
      RAISE EXCEPTION 'Quantidade de variação deve ser inteira.' USING ERRCODE = '22023';
    END IF;
    IF v_previous IS NULL THEN
      RAISE EXCEPTION 'Saldo esperado ausente no item do inventário.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.inventory_moves
      (product_id, variation_id, product_description, type, quantity, date, label,
       observation, related_entity_id, order_id, status, created_at)
    VALUES
      (v_product_id::text, v_variation_id::text, COALESCE(v_item->>'name', 'Item do inventário'),
       'adjustment', 0, pg_catalog.now(), 'Ajuste lançado pelo inventário #' || p_code,
       pg_catalog.jsonb_build_object(
         'source', 'inventory_audit', 'targetStock', v_target,
         'previousStock', v_previous, 'status', 'effective'
       )::text,
       p_audit_id::text, p_audit_id::text, 'effective', pg_catalog.now())
    RETURNING id INTO v_move_id;

    IF v_variation_id IS NOT NULL THEN
      UPDATE public.product_variations
         SET stock = v_target
       WHERE id = v_variation_id AND product_id = v_product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variação do inventário não encontrada.'; END IF;
      UPDATE public.products AS product
         SET stock = (
           SELECT COALESCE(pg_catalog.sum(variation.stock), 0)
             FROM public.product_variations AS variation
            WHERE variation.product_id = v_product_id
         )
       WHERE product.id = v_product_id;
    ELSE
      UPDATE public.products SET stock = v_target WHERE id = v_product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto do inventário não encontrado.'; END IF;
    END IF;
    v_moves := v_moves || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('productId', v_product_id, 'inventoryMoveId', v_move_id)
    );
  END LOOP;

  UPDATE app_private.inventory_audit_submission_claims
     SET finalized_at = pg_catalog.clock_timestamp(), marker_move_id = v_marker_id
   WHERE audit_id = p_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    'auditId', p_audit_id, 'markerMoveId', v_marker_id, 'status', 'processed', 'moves', v_moves
  );
END;
$function$;

COMMENT ON FUNCTION public.finalize_inventory_transaction(uuid, text, jsonb, jsonb, text)
  IS 'Finaliza inventários após verificar a permissão dedicada e o vínculo imutável de submissão; preserva compatibilidade com clientes v1 antigos.';
REVOKE ALL ON FUNCTION public.finalize_inventory_transaction(uuid, text, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_transaction(uuid, text, jsonb, jsonb, text)
  TO authenticated;

-- The v2 contract carries countedAt and lets the server reconcile only
-- movements that happened after the physical count. It cannot run without
-- the separately committed claim made by the first authorized upload.
CREATE OR REPLACE FUNCTION public.finalize_inventory_transaction_v2(
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
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_marker_id uuid;
  v_marker_observation jsonb;
  v_claim_owner uuid;
  v_claim_version smallint;
  v_claim_hash text;
  v_submission_hash text;
  v_claim_finalized_at timestamptz;
  v_claim_marker_id uuid;
  v_product_id uuid;
  v_variation_id uuid;
  v_merged_id uuid;
  v_counted_at timestamptz;
  v_count numeric;
  v_current numeric;
  v_delta numeric;
  v_target numeric;
  v_move_id uuid;
  v_moves jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL OR NOT app_private.has_finalize_stock_inventory_permission() THEN
    RAISE EXCEPTION 'Seu perfil não possui a permissão Finalizar inventários.'
      USING ERRCODE = '42501';
  END IF;

  PERFORM app_private.assert_inventory_submission_envelope(2, p_audit_id, p_code, p_observation, p_items);
  v_submission_hash := app_private.inventory_audit_submission_hash(
    2, p_audit_id, p_code, p_observation, p_items, p_responsible_name
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_audit_id::text));

  SELECT claim.owner_user_id, claim.contract_version, claim.submission_hash,
         claim.finalized_at, claim.marker_move_id
    INTO v_claim_owner, v_claim_version, v_claim_hash,
         v_claim_finalized_at, v_claim_marker_id
    FROM app_private.inventory_audit_submission_claims AS claim
   WHERE claim.audit_id = p_audit_id
   FOR UPDATE;
  IF NOT FOUND
     OR v_claim_owner IS DISTINCT FROM v_user_id
     OR v_claim_version IS DISTINCT FROM 2
     OR v_claim_hash IS DISTINCT FROM v_submission_hash THEN
    RAISE EXCEPTION 'A submissão v2 não foi reivindicada por esta conta ou não corresponde ao primeiro envio autorizado.'
      USING ERRCODE = '42501';
  END IF;

  IF v_claim_finalized_at IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'auditId', p_audit_id,
      'markerMoveId', v_claim_marker_id,
      'status', 'already_processed'
    );
  END IF;

  SELECT move.id, COALESCE(move.observation::jsonb, '{}'::jsonb)
    INTO v_marker_id, v_marker_observation
    FROM public.inventory_moves AS move
   WHERE (move.related_entity_id = p_audit_id::text OR move.order_id = p_audit_id::text)
     AND move.label LIKE 'Inventário #%'
     AND move.type = 'adjustment'
   ORDER BY move.created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF v_marker_id IS NOT NULL THEN
    IF v_marker_observation->>'status' = 'completed' AND v_claim_marker_id = v_marker_id THEN
      UPDATE app_private.inventory_audit_submission_claims
         SET finalized_at = COALESCE(finalized_at, pg_catalog.clock_timestamp())
       WHERE audit_id = p_audit_id;
      RETURN pg_catalog.jsonb_build_object(
        'auditId', p_audit_id, 'markerMoveId', v_marker_id, 'status', 'already_processed'
      );
    END IF;
    RAISE EXCEPTION 'Este inventário possui um registro anterior não vinculado a esta submissão. Peça à equipe responsável para conferir antes de continuar.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.inventory_moves
    (product_id, type, quantity, date, label, observation, related_entity_id,
     order_id, status, created_at)
  VALUES
    (NULL, 'adjustment', 0, pg_catalog.now(), 'Inventário #' || p_code || ' (Concluído)',
     p_observation::text, p_audit_id::text, p_audit_id::text, 'effective', pg_catalog.now())
  RETURNING id INTO v_marker_id;

  FOR v_item IN
    SELECT value
      FROM pg_catalog.jsonb_array_elements(p_items)
     ORDER BY value->>'productId', COALESCE(value->>'variationId', '')
  LOOP
    v_product_id := (v_item->>'productId')::uuid;
    v_variation_id := NULLIF(v_item->>'variationId', '')::uuid;
    v_count := (v_item->>'physicalCount')::numeric;
    v_counted_at := (v_item->>'countedAt')::timestamptz;

    IF v_variation_id IS NOT NULL AND v_count <> pg_catalog.trunc(v_count) THEN
      RAISE EXCEPTION 'Quantidade de variação deve ser inteira.' USING ERRCODE = '22023';
    END IF;

    IF v_variation_id IS NOT NULL THEN
      SELECT variation.stock, variation.merged_to_variation_id
        INTO v_current, v_merged_id
        FROM public.product_variations AS variation
       WHERE variation.id = v_variation_id AND variation.product_id = v_product_id
       FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variação do inventário não encontrada.'; END IF;
      IF v_merged_id IS NOT NULL THEN
        RAISE EXCEPTION 'Variação do inventário foi mesclada; resolução manual necessária.';
      END IF;
    ELSE
      SELECT product.stock
        INTO v_current
        FROM public.products AS product
       WHERE product.id = v_product_id
       FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto do inventário não encontrado.'; END IF;
    END IF;

    IF EXISTS (
      SELECT 1
        FROM public.inventory_moves AS move
       WHERE move.product_id::text = v_product_id::text
         AND CASE
               WHEN v_variation_id IS NULL THEN move.variation_id IS NULL
               ELSE move.variation_id::text = v_variation_id::text
             END
         AND COALESCE(move.created_at, move.date) > v_counted_at
         AND move.type IN ('adjustment', 'balance')
         AND COALESCE(move.status, 'effective') NOT IN ('reversed', 'cancelled')
         AND COALESCE(move.related_entity_id, '') <> p_audit_id::text
    ) THEN
      RAISE EXCEPTION 'Outro ajuste alterou o estoque após esta contagem; revisão necessária.';
    END IF;

    SELECT COALESCE(pg_catalog.sum(
             CASE
               WHEN move.type IN ('entry', 'in') THEN COALESCE(move.quantity, 0)
               WHEN move.type IN ('exit', 'withdrawal', 'out') THEN -COALESCE(move.quantity, 0)
               ELSE 0
             END
           ), 0)
      INTO v_delta
      FROM public.inventory_moves AS move
     WHERE move.product_id::text = v_product_id::text
       AND CASE
             WHEN v_variation_id IS NULL THEN move.variation_id IS NULL
             ELSE move.variation_id::text = v_variation_id::text
           END
       AND COALESCE(move.created_at, move.date) > v_counted_at
       AND move.type IN ('entry', 'in', 'exit', 'withdrawal', 'out')
       AND COALESCE(move.status, 'effective') NOT IN ('reversed', 'cancelled');

    v_target := v_count + v_delta;
    IF v_target < 0 THEN
      RAISE EXCEPTION 'Movimentações posteriores produziram saldo negativo.';
    END IF;

    IF v_target IS DISTINCT FROM COALESCE(v_current, 0) THEN
      INSERT INTO public.inventory_moves
        (product_id, variation_id, product_description, type, quantity, date, label,
         observation, related_entity_id, order_id, status, created_at)
      VALUES
        (v_product_id::text, v_variation_id::text, COALESCE(v_item->>'name', 'Item do inventário'),
         'adjustment', 0, pg_catalog.now(), 'Ajuste lançado pelo inventário #' || p_code,
         pg_catalog.jsonb_build_object(
           'source', 'inventory_audit', 'targetStock', v_target,
           'previousStock', v_current, 'countedAt', v_counted_at,
           'postCountDelta', v_delta, 'status', 'effective'
         )::text,
         p_audit_id::text, p_audit_id::text, 'effective', pg_catalog.now())
      RETURNING id INTO v_move_id;

      IF v_variation_id IS NOT NULL THEN
        UPDATE public.product_variations SET stock = v_target WHERE id = v_variation_id;
        UPDATE public.products AS product
           SET stock = (
             SELECT COALESCE(pg_catalog.sum(variation.stock), 0)
               FROM public.product_variations AS variation
              WHERE variation.product_id = v_product_id
           )
         WHERE product.id = v_product_id;
      ELSE
        UPDATE public.products SET stock = v_target WHERE id = v_product_id;
      END IF;
      v_moves := v_moves || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('productId', v_product_id, 'inventoryMoveId', v_move_id)
      );
    END IF;
  END LOOP;

  UPDATE app_private.inventory_audit_submission_claims
     SET finalized_at = pg_catalog.clock_timestamp(), marker_move_id = v_marker_id
   WHERE audit_id = p_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    'auditId', p_audit_id, 'markerMoveId', v_marker_id, 'status', 'processed', 'moves', v_moves
  );
END;
$function$;

COMMENT ON FUNCTION public.finalize_inventory_transaction_v2(uuid, text, jsonb, jsonb, text)
  IS 'Finaliza contagens v2 somente após validar a permissão, o owner autenticado e o hash da submissão previamente reivindicada.';
REVOKE ALL ON FUNCTION public.finalize_inventory_transaction_v2(uuid, text, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_transaction_v2(uuid, text, jsonb, jsonb, text)
  TO authenticated;

COMMIT;
