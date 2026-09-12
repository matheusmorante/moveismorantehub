-- =============================================================================
-- Migration: 20260912141000_create_goods_receipt_items.sql
-- Objetivo: Criar tabela goods_receipt_items para normalizar itens de recebimento
--           a partir de goods_receipts.items (array JSONB).
-- Operação: 100% aditiva, idempotente e reversível.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id uuid NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
    item_index integer NOT NULL DEFAULT 0,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    variation_id uuid REFERENCES public.product_variations(id) ON DELETE SET NULL,
    description text NOT NULL,
    quantity numeric(14,4) NOT NULL DEFAULT 1,
    base_cost numeric(14,4) NOT NULL DEFAULT 0,
    unit_cost numeric(14,4) NOT NULL DEFAULT 0,
    freight_fiscal_unit numeric(14,4) DEFAULT 0,
    freight_non_fiscal_unit numeric(14,4) DEFAULT 0,
    discount_unit numeric(14,4) DEFAULT 0,
    other_expenses_fiscal_unit numeric(14,4) DEFAULT 0,
    other_expenses_non_fiscal_unit numeric(14,4) DEFAULT 0,
    additional_cost_unit numeric(14,4) DEFAULT 0,
    item_snapshot jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_goods_receipt_items_receipt_item UNIQUE (receipt_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_receipt_id ON public.goods_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_product_id ON public.goods_receipt_items(product_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_variation_id ON public.goods_receipt_items(variation_id);

ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'goods_receipt_items' AND policyname = 'Permitir leitura de goods_receipt_items para anon e autenticado'
    ) THEN
        CREATE POLICY "Permitir leitura de goods_receipt_items para anon e autenticado"
            ON public.goods_receipt_items FOR SELECT
            TO anon, authenticated, service_role
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'goods_receipt_items' AND policyname = 'Permitir escrita de goods_receipt_items'
    ) THEN
        CREATE POLICY "Permitir escrita de goods_receipt_items"
            ON public.goods_receipt_items FOR ALL
            TO anon, authenticated, service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

GRANT ALL ON public.goods_receipt_items TO anon, authenticated, service_role;

-- Backfill idempotente a partir de goods_receipts.items (se houver linhas futuras)
INSERT INTO public.goods_receipt_items (
    receipt_id,
    item_index,
    product_id,
    variation_id,
    description,
    quantity,
    base_cost,
    unit_cost,
    item_snapshot
)
SELECT
    gr.id AS receipt_id,
    elem.ord::integer AS item_index,
    CASE WHEN elem.item->>'productId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
         THEN (elem.item->>'productId')::uuid ELSE NULL END AS product_id,
    CASE WHEN elem.item->>'variationId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
         THEN (elem.item->>'variationId')::uuid ELSE NULL END AS variation_id,
    COALESCE(elem.item->>'description', 'Item de Recebimento') AS description,
    COALESCE(NULLIF(elem.item->>'quantity', '')::numeric, 1) AS quantity,
    COALESCE(NULLIF(elem.item->>'baseCost', '')::numeric, 0) AS base_cost,
    COALESCE(NULLIF(elem.item->>'unitCost', '')::numeric, 0) AS unit_cost,
    elem.item AS item_snapshot
FROM public.goods_receipts gr
CROSS JOIN LATERAL jsonb_array_elements(gr.items) WITH ORDINALITY AS elem(item, ord)
WHERE gr.items IS NOT NULL 
  AND jsonb_typeof(gr.items) = 'array' 
  AND jsonb_array_length(gr.items) > 0
ON CONFLICT (receipt_id, item_index) DO NOTHING;
