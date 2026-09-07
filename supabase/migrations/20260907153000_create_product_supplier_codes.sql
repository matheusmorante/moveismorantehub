-- Referências de códigos que cada fornecedor usa para produtos/variações do ERP.
CREATE TABLE IF NOT EXISTS public.product_supplier_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    product_variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
    -- Cadastro de pessoas possui instalações legadas com identificadores diferentes.
    -- Mantemos o identificador como texto para a migration ser compatível com todas elas.
    supplier_id TEXT NOT NULL,
    supplier_product_code TEXT NOT NULL,
    supplier_description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT product_supplier_codes_supplier_code_unique UNIQUE (supplier_id, supplier_product_code)
);

CREATE INDEX IF NOT EXISTS idx_product_supplier_codes_lookup
    ON public.product_supplier_codes (supplier_id, supplier_product_code)
    WHERE is_active = true;

ALTER TABLE public.product_supplier_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_product_supplier_codes" ON public.product_supplier_codes
    FOR ALL USING (true) WITH CHECK (true);
