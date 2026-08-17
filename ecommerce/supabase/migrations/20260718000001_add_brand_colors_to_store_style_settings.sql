ALTER TABLE store_style_settings
  ADD COLUMN IF NOT EXISTS primary_color TEXT NOT NULL DEFAULT '#173f7a',
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#f4c430',
  ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS hero_overlay TEXT NOT NULL DEFAULT 'dark' CHECK (hero_overlay IN ('soft', 'dark', 'vibrant'));
