-- Only administrators can manage other accounts and their roles.
CREATE OR REPLACE FUNCTION public.is_administrator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'administrator') $$;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.is_administrator()
     AND NEW.role <> 'pending'
     AND lower(coalesce(auth.jwt() ->> 'email', '')) <> 'matheusmorante002@gmail.com' THEN
    RAISE EXCEPTION 'Only administrators can assign roles';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Only administrators can change roles';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read/write profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Administrators manage profiles" ON public.profiles;

DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile or administrators" ON public.profiles;
DROP POLICY IF EXISTS "Administrators delete profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_administrator());
CREATE POLICY "Authenticated users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_administrator());
CREATE POLICY "Users update own profile or administrators" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_administrator()) WITH CHECK (id = auth.uid() OR public.is_administrator());
CREATE POLICY "Administrators delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_administrator());

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
