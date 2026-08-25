ALTER TABLE public.label_layouts
    ADD COLUMN IF NOT EXISTS art_config JSONB NOT NULL DEFAULT '{}'::jsonb;
