-- Enforce the same productConfig gate used by ERP and native product forms at
-- the database boundary for product/variation create and save RPCs.
-- save_mobile_product_transaction always writes products.name on insert/update;
-- a column-specific trigger protects that contract without replacing the RPC.
-- Rollback: drop both triggers and this trigger function; no data is rewritten.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.enforce_product_config_for_save()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_roles text[];
  v_legacy_role text;
  v_normalized_roles text[];
  v_settings jsonb;
  v_normalized_permission_roles jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Seu perfil não possui permissão para criar ou editar produtos.'
      USING ERRCODE = '42501';
  END IF;

  SELECT profile.roles, profile.role
    INTO v_profile_roles, v_legacy_role
    FROM public.profiles AS profile
   WHERE profile.id = v_user_id;

  v_profile_roles := pg_catalog.array_remove(
    pg_catalog.array_remove(COALESCE(v_profile_roles, ARRAY[]::text[]), 'pending'),
    NULL
  );
  IF pg_catalog.cardinality(v_profile_roles) = 0 THEN
    v_profile_roles := CASE
      WHEN v_legacy_role IS NOT NULL AND v_legacy_role <> 'pending'
        THEN ARRAY[v_legacy_role]
      ELSE ARRAY[]::text[]
    END;
  END IF;

  SELECT COALESCE(
    pg_catalog.array_agg(DISTINCT normalized.role),
    ARRAY[]::text[]
  )
    INTO v_normalized_roles
    FROM (
      SELECT CASE source.role
        WHEN 'admin' THEN 'administrator'
        WHEN 'master' THEN 'administrator'
        WHEN 'gerente' THEN 'manager'
        WHEN 'vendedor' THEN 'seller'
        WHEN 'entregador' THEN 'deliverer'
        WHEN 'driver' THEN 'deliverer'
        ELSE source.role
      END AS role
      FROM pg_catalog.unnest(v_profile_roles) AS source(role)
    ) AS normalized
   WHERE normalized.role = ANY(ARRAY[
     'administrator', 'manager', 'stockist', 'seller', 'deliverer', 'accountant'
   ]::text[]);

  SELECT settings.data
    INTO v_settings
    FROM public.settings AS settings
   WHERE settings.id = 'app';
  IF NOT FOUND THEN
    v_settings := '{}'::jsonb;
  END IF;

  -- The shared permission resolver accepts legacy role aliases on both sides.
  -- Normalize only a well-shaped array; malformed settings remain fail-closed
  -- in inventory_batch_can_configure.
  IF pg_catalog.jsonb_typeof(v_settings -> 'rolePermissions') = 'object'
     AND pg_catalog.jsonb_typeof(v_settings #> '{rolePermissions,productConfig}') = 'array'
     AND NOT EXISTS (
       SELECT 1
         FROM pg_catalog.jsonb_array_elements(
           v_settings #> '{rolePermissions,productConfig}'
         ) AS entry(value)
        WHERE pg_catalog.jsonb_typeof(entry.value) IS DISTINCT FROM 'string'
     ) THEN
    SELECT COALESCE(
      pg_catalog.jsonb_agg(pg_catalog.to_jsonb(normalized.role)),
      '[]'::jsonb
    )
      INTO v_normalized_permission_roles
      FROM (
        SELECT CASE source.role
          WHEN 'admin' THEN 'administrator'
          WHEN 'master' THEN 'administrator'
          WHEN 'gerente' THEN 'manager'
          WHEN 'vendedor' THEN 'seller'
          WHEN 'entregador' THEN 'deliverer'
          WHEN 'driver' THEN 'deliverer'
          ELSE source.role
        END AS role
        FROM pg_catalog.jsonb_array_elements_text(
          v_settings #> '{rolePermissions,productConfig}'
        ) AS source(role)
      ) AS normalized
     WHERE normalized.role = ANY(ARRAY[
       'administrator', 'manager', 'stockist', 'seller', 'deliverer', 'accountant'
     ]::text[]);

    v_settings := pg_catalog.jsonb_set(
      v_settings,
      '{rolePermissions,productConfig}',
      v_normalized_permission_roles,
      false
    );
  END IF;

  IF NOT public.inventory_batch_can_configure(
    v_normalized_roles,
    NULL::text,
    v_settings
  ) THEN
    RAISE EXCEPTION 'Seu perfil não possui permissão para criar ou editar produtos.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS require_product_config_for_save ON public.products;
CREATE TRIGGER require_product_config_for_save
  BEFORE INSERT OR UPDATE OF name ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_config_for_save();

DROP TRIGGER IF EXISTS require_product_config_for_save ON public.product_variations;
CREATE TRIGGER require_product_config_for_save
  BEFORE INSERT OR UPDATE OF name ON public.product_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_config_for_save();

REVOKE ALL ON FUNCTION public.enforce_product_config_for_save()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
