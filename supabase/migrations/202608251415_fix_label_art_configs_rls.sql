-- Allow public (anon + authenticated) read, insert, update on label_art_configs
DROP POLICY IF EXISTS "Allow authenticated users to read label art configs" ON public.label_art_configs;
DROP POLICY IF EXISTS "Allow public users to read label art configs" ON public.label_art_configs;
CREATE POLICY "Allow public users to read label art configs"
ON public.label_art_configs FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert label art configs" ON public.label_art_configs;
DROP POLICY IF EXISTS "Allow public users to insert label art configs" ON public.label_art_configs;
CREATE POLICY "Allow public users to insert label art configs"
ON public.label_art_configs FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update label art configs" ON public.label_art_configs;
DROP POLICY IF EXISTS "Allow public users to update label art configs" ON public.label_art_configs;
CREATE POLICY "Allow public users to update label art configs"
ON public.label_art_configs FOR UPDATE TO public USING (true);
