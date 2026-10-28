-- Enforce the productConfig permission at the database boundary for product
-- and variation create/save operations. Both supported writers include name
-- in product persistence; the separate status trigger still governs catalog
-- publication independently.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.products') IS NULL
     OR pg_catalog.to_regclass('public.product_variations') IS NULL
     OR pg_catalog.to_regclass('public.profiles') IS NULL
     OR pg_catalog.to_regclass('public.settings') IS NULL THEN
    RAISE EXCEPTION 'Precondição ausente para proteger o salvamento de Produtos.';
  END IF;

  IF pg_catalog.to_regprocedure('auth.uid()') IS NULL
     OR pg_catalog.to_regprocedure(
       'public.inventory_batch_can_configure(text[],text,jsonb)'
     ) IS NULL THEN
    RAISE EXCEPTION 'Resolvedores de autenticação/permissão necessários não estão disponíveis.';
  END IF;

  IF pg_catalog.to_regprocedure(
       'public.enforce_product_config_for_save()'
     ) IS NOT NULL THEN
    RAISE EXCEPTION 'A função de proteção de salvamento já existe; migration interrompida sem alterar estado.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_trigger AS existing_trigger
     WHERE existing_trigger.tgrelid IN (
       pg_catalog.to_regclass('public.products'),
       pg_catalog.to_regclass('public.product_variations')
     )
       AND existing_trigger.tgname = 'require_product_config_for_save'
       AND NOT existing_trigger.tgisinternal
  ) THEN
    RAISE EXCEPTION 'O nome do gatilho de salvamento já está ocupado; migration interrompida sem alterar estado.';
  END IF;
END;
$preflight$;

CREATE FUNCTION public.enforce_product_config_for_save()
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

  -- Match the shared permission resolver's legacy role aliases. Malformed
  -- explicit settings remain fail-closed in inventory_batch_can_configure.
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

CREATE TRIGGER require_product_config_for_save
  BEFORE INSERT OR UPDATE OF name ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_config_for_save();

CREATE TRIGGER require_product_config_for_save
  BEFORE INSERT OR UPDATE OF name ON public.product_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_config_for_save();

REVOKE ALL ON FUNCTION public.enforce_product_config_for_save()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
