ALTER TABLE IF EXISTS public.store_style_settings
  ADD COLUMN IF NOT EXISTS marketing_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.store_style_settings (id, marketing_defaults)
VALUES (true, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
