-- Add use_parent_name columns to product_variations
ALTER TABLE public.product_variations
ADD COLUMN IF NOT EXISTS use_parent_name boolean DEFAULT true;
