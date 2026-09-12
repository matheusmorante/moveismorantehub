-- =============================================================================
-- Migration: 20260912140000_create_inbound_invoice_items.sql
-- Objetivo: Criar tabela inbound_invoice_items para normalizar itens de NF-e
--           a partir de inbound_invoices.itens (array JSONB).
-- Operação: 100% aditiva, idempotente e reversível.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.inbound_invoice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES public.inbound_invoices(id) ON DELETE CASCADE,
    item_number integer NOT NULL DEFAULT 1,
    product_code text,
    product_description text NOT NULL,
    ean text,
    ncm text,
    cest text,
    cfop text,
    unit text,
    quantity numeric(14,4) NOT NULL DEFAULT 1,
    unit_cost numeric(14,4) NOT NULL DEFAULT 0,
    total_cost numeric(14,2) NOT NULL DEFAULT 0,
    ipi_percent numeric(8,4) DEFAULT 0,
    ipi_value numeric(14,4) DEFAULT 0,
    icms_percent numeric(8,4) DEFAULT 0,
    icms_value numeric(14,4) DEFAULT 0,
    icms_base_value numeric(14,4) DEFAULT 0,
    icms_st_percent numeric(8,4) DEFAULT 0,
    icms_st_value numeric(14,4) DEFAULT 0,
    icms_st_base_value numeric(14,4) DEFAULT 0,
    freight_value numeric(14,4) DEFAULT 0,
    insurance_value numeric(14,4) DEFAULT 0,
    discount_value numeric(14,4) DEFAULT 0,
    other_expenses_value numeric(14,4) DEFAULT 0,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    variation_id uuid REFERENCES public.product_variations(id) ON DELETE SET NULL,
    raw_item jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_inbound_invoice_items_invoice_item UNIQUE (invoice_id, item_number)
);

-- Índices de busca e relacionamento
CREATE INDEX IF NOT EXISTS idx_inbound_invoice_items_invoice_id ON public.inbound_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inbound_invoice_items_product_id ON public.inbound_invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inbound_invoice_items_variation_id ON public.inbound_invoice_items(variation_id);
CREATE INDEX IF NOT EXISTS idx_inbound_invoice_items_ean ON public.inbound_invoice_items(ean);
CREATE INDEX IF NOT EXISTS idx_inbound_invoice_items_ncm ON public.inbound_invoice_items(ncm);

-- Habilita RLS
ALTER TABLE public.inbound_invoice_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'inbound_invoice_items' AND policyname = 'Permitir leitura para anon e autenticado'
    ) THEN
        CREATE POLICY "Permitir leitura para anon e autenticado"
            ON public.inbound_invoice_items FOR SELECT
            TO anon, authenticated, service_role
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'inbound_invoice_items' AND policyname = 'Permitir escrita para autenticado e service_role'
    ) THEN
        CREATE POLICY "Permitir escrita para autenticado e service_role"
            ON public.inbound_invoice_items FOR ALL
            TO anon, authenticated, service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

GRANT ALL ON public.inbound_invoice_items TO anon, authenticated, service_role;

-- Backfill idempotente a partir de inbound_invoices.itens
INSERT INTO public.inbound_invoice_items (
    invoice_id,
    item_number,
    product_code,
    product_description,
    ean,
    ncm,
    cest,
    cfop,
    unit,
    quantity,
    unit_cost,
    total_cost,
    ipi_percent,
    ipi_value,
    icms_percent,
    icms_value,
    icms_base_value,
    icms_st_percent,
    icms_st_value,
    icms_st_base_value,
    freight_value,
    insurance_value,
    discount_value,
    other_expenses_value,
    raw_item
)
SELECT
    inv.id AS invoice_id,
    COALESCE(NULLIF(elem.item->>'itemNumber', '')::integer, elem.ord::integer) AS item_number,
    elem.item->>'productCode' AS product_code,
    COALESCE(elem.item->>'productDescription', elem.item->>'descricao', 'Item de NF') AS product_description,
    elem.item->>'ean' AS ean,
    elem.item->>'ncm' AS ncm,
    elem.item->>'cest' AS cest,
    elem.item->>'cfop' AS cfop,
    elem.item->>'unit' AS unit,
    COALESCE(NULLIF(elem.item->>'quantity', '')::numeric, 1) AS quantity,
    COALESCE(NULLIF(elem.item->>'unitCost', '')::numeric, 0) AS unit_cost,
    COALESCE(NULLIF(elem.item->>'totalCost', '')::numeric, 0) AS total_cost,
    COALESCE(NULLIF(elem.item->>'ipiPercent', '')::numeric, 0) AS ipi_percent,
    COALESCE(NULLIF(elem.item->>'ipiValue', '')::numeric, 0) AS ipi_value,
    COALESCE(NULLIF(elem.item->>'icmsPercent', '')::numeric, 0) AS icms_percent,
    COALESCE(NULLIF(elem.item->>'icmsValue', '')::numeric, 0) AS icms_value,
    COALESCE(NULLIF(elem.item->>'icmsBaseValue', '')::numeric, 0) AS icms_base_value,
    COALESCE(NULLIF(elem.item->>'icmsStPercent', '')::numeric, 0) AS icms_st_percent,
    COALESCE(NULLIF(elem.item->>'icmsStValue', '')::numeric, 0) AS icms_st_value,
    COALESCE(NULLIF(elem.item->>'icmsStBaseValue', '')::numeric, 0) AS icms_st_base_value,
    COALESCE(NULLIF(elem.item->>'freightValue', '')::numeric, 0) AS freight_value,
    COALESCE(NULLIF(elem.item->>'insuranceValue', '')::numeric, 0) AS insurance_value,
    COALESCE(NULLIF(elem.item->>'discountValue', '')::numeric, 0) AS discount_value,
    COALESCE(NULLIF(elem.item->>'otherExpensesValue', '')::numeric, 0) AS other_expenses_value,
    elem.item AS raw_item
FROM public.inbound_invoices inv
CROSS JOIN LATERAL jsonb_array_elements(inv.itens) WITH ORDINALITY AS elem(item, ord)
WHERE inv.itens IS NOT NULL 
  AND jsonb_typeof(inv.itens) = 'array' 
  AND jsonb_array_length(inv.itens) > 0
ON CONFLICT (invoice_id, item_number) DO NOTHING;
