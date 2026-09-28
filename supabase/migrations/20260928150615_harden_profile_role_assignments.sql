-- Only an authenticated administrator may assign authorization roles.
-- Profiles remains the authority; role mirrors in people are not promoted on reads.
-- Provision the first administrator through a trusted database operation, not email matching.
-- The last administrator may remove their own role only after another admin exists.
CREATE OR REPLACE FUNCTION public.is_administrator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (
        role = 'administrator'
        OR 'administrator' = ANY(coalesce(roles, ARRAY[]::text[]))
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_administrator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_administrator() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND public.is_administrator()
     AND (
       OLD.role = 'administrator'
       OR 'administrator' = ANY(coalesce(OLD.roles, ARRAY[]::text[]))
     ) THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(1297042001, 1);

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id <> OLD.id
        AND (
          role = 'administrator'
          OR 'administrator' = ANY(coalesce(roles, ARRAY[]::text[]))
        )
    ) THEN
      RAISE EXCEPTION 'At least one administrator must remain assigned';
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT'
     AND NOT public.is_administrator()
     AND (
       NEW.role IS DISTINCT FROM 'pending'
       OR cardinality(array_remove(coalesce(NEW.roles, ARRAY[]::text[]), 'pending')) > 0
     ) THEN
    RAISE EXCEPTION 'Only administrators can assign roles';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NOT public.is_administrator()
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.roles IS DISTINCT FROM OLD.roles) THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;

  IF TG_OP = 'UPDATE'
     AND public.is_administrator()
     AND NEW.role IS DISTINCT FROM 'administrator'
     AND NOT ('administrator' = ANY(coalesce(NEW.roles, ARRAY[]::text[]))) THEN
    -- Serialize administrator removals so concurrent changes cannot remove the last admin.
    PERFORM pg_catalog.pg_advisory_xact_lock(1297042001, 1);

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id <> OLD.id
        AND (
          role = 'administrator'
          OR 'administrator' = ANY(coalesce(roles, ARRAY[]::text[]))
        )
    ) THEN
      RAISE EXCEPTION 'At least one administrator must remain assigned';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE TRIGGER protect_profile_role
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();
