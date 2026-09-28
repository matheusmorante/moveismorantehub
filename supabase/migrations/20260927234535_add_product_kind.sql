ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_kind varchar NOT NULL DEFAULT 'normal';
