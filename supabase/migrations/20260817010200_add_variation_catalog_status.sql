-- As variações acompanham o status de visibilidade do produto-pai no catálogo.
ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'published';
