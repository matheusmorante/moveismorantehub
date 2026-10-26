-- Catalog visibility is controlled by the existing productConfig permission.
-- Enforce it at the database boundary for every writer; no runtime service-role
-- status writer is present in the repository, so do not grant a blanket bypass.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.enforce_product_catalog_status_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_roles text[];
  v_allowed_roles text[];
  v_allowed_roles_json jsonb;
  v_role text;
  v_permission_role text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;
  ELSIF NEW.status IS DISTINCT FROM 'published' THEN
    -- Product and variation drafts/hidden rows remain governed by existing
    -- product-write policies; only creating a visible catalog row is gated.
    RETURN NEW;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Seu perfil não possui permissão para alterar o Catálogo Digital.'
      USING ERRCODE = '42501';
  END IF;

  SELECT CASE
    WHEN pg_catalog.cardinality(
      pg_catalog.array_remove(COALESCE(profile.roles, ARRAY[]::text[]), 'pending')
    ) > 0 THEN pg_catalog.array_remove(COALESCE(profile.roles, ARRAY[]::text[]), 'pending')
    WHEN profile.role IS NOT NULL AND profile.role <> 'pending' THEN ARRAY[profile.role]
    ELSE ARRAY[]::text[]
  END
  INTO v_profile_roles
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id;

  IF NOT FOUND OR pg_catalog.cardinality(v_profile_roles) = 0 THEN
    RAISE EXCEPTION 'Seu perfil não possui permissão para alterar o Catálogo Digital.'
      USING ERRCODE = '42501';
  END IF;

  -- Keep aliases and accepted role names aligned with
  -- shared-utils/productPermissions.ts.
  FOREACH v_role IN ARRAY v_profile_roles LOOP
    v_role := CASE v_role
      WHEN 'admin' THEN 'administrator'
      WHEN 'master' THEN 'administrator'
      WHEN 'gerente' THEN 'manager'
      WHEN 'vendedor' THEN 'seller'
      WHEN 'entregador' THEN 'deliverer'
      WHEN 'driver' THEN 'deliverer'
      ELSE v_role
    END;

    IF v_role = 'administrator' THEN
      RETURN NEW;
    END IF;
  END LOOP;

  SELECT settings.data -> 'rolePermissions' -> 'productConfig'
  INTO v_allowed_roles_json
  FROM public.settings AS settings
  WHERE settings.id = 'app';

  IF NOT FOUND OR v_allowed_roles_json IS NULL THEN
    -- Match PRODUCT_PERMISSION_AREA.actions in shared-utils/productPermissions.ts.
    v_allowed_roles := ARRAY['manager', 'stockist', 'seller'];
  ELSIF pg_catalog.jsonb_typeof(v_allowed_roles_json) = 'array' THEN
    v_allowed_roles := ARRAY[]::text[];
    FOR v_permission_role IN
      SELECT pg_catalog.jsonb_array_elements_text(v_allowed_roles_json)
    LOOP
      v_permission_role := CASE v_permission_role
        WHEN 'admin' THEN 'administrator'
        WHEN 'master' THEN 'administrator'
        WHEN 'gerente' THEN 'manager'
        WHEN 'vendedor' THEN 'seller'
        WHEN 'entregador' THEN 'deliverer'
        WHEN 'driver' THEN 'deliverer'
        ELSE v_permission_role
      END;

      IF v_permission_role = ANY(ARRAY[
        'administrator', 'manager', 'stockist', 'seller', 'deliverer', 'accountant'
      ]) THEN
        v_allowed_roles := pg_catalog.array_append(v_allowed_roles, v_permission_role);
      END IF;
    END LOOP;
  ELSE
    -- A malformed explicit setting must not silently restore default access.
    RAISE EXCEPTION 'A permissão do Catálogo Digital está inválida.'
      USING ERRCODE = '42501';
  END IF;

  FOREACH v_role IN ARRAY v_profile_roles LOOP
    v_role := CASE v_role
      WHEN 'admin' THEN 'administrator'
      WHEN 'master' THEN 'administrator'
      WHEN 'gerente' THEN 'manager'
      WHEN 'vendedor' THEN 'seller'
      WHEN 'entregador' THEN 'deliverer'
      WHEN 'driver' THEN 'deliverer'
      ELSE v_role
    END;

    IF v_role = ANY(ARRAY[
      'administrator', 'manager', 'stockist', 'seller', 'deliverer', 'accountant'
    ]) AND v_role = ANY(v_allowed_roles) THEN
      RETURN NEW;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Seu perfil não possui permissão para alterar o Catálogo Digital.'
    USING ERRCODE = '42501';
END;
$function$;

DROP TRIGGER IF EXISTS require_product_config_for_catalog_status ON public.products;
CREATE TRIGGER require_product_config_for_catalog_status
  BEFORE INSERT OR UPDATE OF status ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_catalog_status_permission();

DROP TRIGGER IF EXISTS require_product_config_for_catalog_status ON public.product_variations;
CREATE TRIGGER require_product_config_for_catalog_status
  BEFORE INSERT OR UPDATE OF status ON public.product_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_catalog_status_permission();

REVOKE ALL ON FUNCTION public.enforce_product_catalog_status_permission()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
