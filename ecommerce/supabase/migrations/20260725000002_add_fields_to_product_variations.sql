-- Add customization and inheritance fields to product_variations table
ALTER TABLE public.product_variations
ADD COLUMN IF NOT EXISTS promo_price numeric,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS width varchar,
ADD COLUMN IF NOT EXISTS depth varchar,
ADD COLUMN IF NOT EXISTS height varchar,
ADD COLUMN IF NOT EXISTS use_parent_price boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS use_parent_promo_price boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS use_parent_dimensions boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS use_parent_description boolean DEFAULT true;
