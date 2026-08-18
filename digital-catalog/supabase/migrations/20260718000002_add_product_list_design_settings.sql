ALTER TABLE store_style_settings
  ADD COLUMN IF NOT EXISTS product_image_fit TEXT NOT NULL DEFAULT 'cover' CHECK (product_image_fit IN ('cover', 'contain')),
  ADD COLUMN IF NOT EXISTS product_grid_columns TEXT NOT NULL DEFAULT 'comfortable' CHECK (product_grid_columns IN ('compact', 'comfortable', 'large')),
  ADD COLUMN IF NOT EXISTS product_grid_gap TEXT NOT NULL DEFAULT 'normal' CHECK (product_grid_gap IN ('tight', 'normal', 'spacious'));
