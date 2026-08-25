CREATE TABLE IF NOT EXISTS public.label_art_configs (
    layout_id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('identificacao', 'precos', 'logos', 'posts')),
    art_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.label_art_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read label art configs" ON public.label_art_configs;
CREATE POLICY "Allow authenticated users to read label art configs"
ON public.label_art_configs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert label art configs" ON public.label_art_configs;
CREATE POLICY "Allow authenticated users to insert label art configs"
ON public.label_art_configs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update label art configs" ON public.label_art_configs;
CREATE POLICY "Allow authenticated users to update label art configs"
ON public.label_art_configs FOR UPDATE TO authenticated USING (true);
