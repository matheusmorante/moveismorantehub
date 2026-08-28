-- Application settings are readable by the app, but only administrators may change them.
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all settings access" ON public.settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;
DROP POLICY IF EXISTS "Administrators manage settings" ON public.settings;

CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Administrators manage settings" ON public.settings FOR ALL TO authenticated
USING (public.is_administrator()) WITH CHECK (public.is_administrator());
