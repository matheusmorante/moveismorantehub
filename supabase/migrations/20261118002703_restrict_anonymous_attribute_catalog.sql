BEGIN;

-- Fail safely if the permission shape reviewed for SCE-321 has drifted.
DO $$
BEGIN
  IF to_regclass('public.attributes') IS NULL
     OR to_regclass('public.attribute_values') IS NULL THEN
    RAISE EXCEPTION 'SCE-321 precondition failed: expected attribute tables are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attributes'
      AND policyname = 'allow_public_all_attr'
      AND cmd = 'ALL'
      AND COALESCE(qual, '') = 'true'
      AND COALESCE(with_check, '') = 'true'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attribute_values'
      AND policyname = 'allow_public_all_val'
      AND cmd = 'ALL'
      AND COALESCE(qual, '') = 'true'
      AND COALESCE(with_check, '') = 'true'
  ) THEN
    RAISE EXCEPTION 'SCE-321 precondition failed: expected broad public policies changed';
  END IF;
END;
$$;

-- These catalogs are managed from the authenticated ERP/app administration
-- screens. The public catalog reads variant attributes from product_variations
-- JSON and does not require these global tables.
DROP POLICY "allow_public_all_attr" ON public.attributes;
DROP POLICY "allow_public_all_val" ON public.attribute_values;

-- Remove direct table privileges from the API's anonymous database role.
-- Authenticated users and service_role retain their existing table grants.
REVOKE ALL PRIVILEGES ON TABLE public.attributes, public.attribute_values FROM anon;

-- Restrict the existing CRUD policies to real, signed-in users. Supabase
-- anonymous-auth users use the authenticated database role, so also check the
-- JWT claim to exclude those sessions explicitly.
DROP POLICY IF EXISTS "allow_select_attr" ON public.attributes;
DROP POLICY IF EXISTS "allow_insert_attr" ON public.attributes;
DROP POLICY IF EXISTS "allow_update_attr" ON public.attributes;
DROP POLICY IF EXISTS "allow_delete_attr" ON public.attributes;

CREATE POLICY "allow_select_attr"
  ON public.attributes FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "allow_insert_attr"
  ON public.attributes FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "allow_update_attr"
  ON public.attributes FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "allow_delete_attr"
  ON public.attributes FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true');

DROP POLICY IF EXISTS "allow_select_val" ON public.attribute_values;
DROP POLICY IF EXISTS "allow_insert_val" ON public.attribute_values;
DROP POLICY IF EXISTS "allow_update_val" ON public.attribute_values;
DROP POLICY IF EXISTS "allow_delete_val" ON public.attribute_values;

CREATE POLICY "allow_select_val"
  ON public.attribute_values FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "allow_insert_val"
  ON public.attribute_values FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "allow_update_val"
  ON public.attribute_values FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "allow_delete_val"
  ON public.attribute_values FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND ((SELECT auth.jwt()) ->> 'is_anonymous') IS DISTINCT FROM 'true');

COMMIT;
