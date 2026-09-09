-- A memória de fornecedor já existe em product_supplier_codes. Estes campos
-- distinguem associações confirmadas pelo operador de sugestões transitórias.
ALTER TABLE public.product_supplier_codes
  ADD COLUMN IF NOT EXISTS normalized_description TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_by_user BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

UPDATE public.product_supplier_codes
SET confirmed_at = COALESCE(confirmed_at, updated_at, created_at)
WHERE confirmed_by_user = true AND confirmed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_supplier_codes_confirmed_lookup
  ON public.product_supplier_codes (supplier_id, supplier_product_code)
  WHERE is_active = true AND confirmed_by_user = true;
