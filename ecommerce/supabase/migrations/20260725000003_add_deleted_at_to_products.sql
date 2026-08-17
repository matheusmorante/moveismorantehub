ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'published';
