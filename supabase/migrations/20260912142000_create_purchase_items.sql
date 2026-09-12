-- =============================================================================
-- Migration: 20260912142000_create_purchase_items.sql
-- Objetivo: Criar tabela purchase_items para normalizar itens de compras
--           a partir de purchases.items (array JSONB).
-- Operação: 100% aditiva, idempotente e reversível.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    item_index integer NOT NULL DEFAULT 0,
    product_id text,
    variation_id text,
    description text NOT NULL,
    quantity numeric(14,4) NOT NULL DEFAULT 1,
    base_cost numeric(14,4) NOT NULL DEFAULT 0,
    unit_cost numeric(14,4) NOT NULL DEFAULT 0,
    total_cost numeric(14,2) NOT NULL DEFAULT 0,
    item_snapshot jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_purchase_items_purchase_item UNIQUE (purchase_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON public.purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_variation_id ON public.purchase_items(variation_id);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchase_items' AND policyname = 'Permitir leitura de purchase_items'
    ) THEN
        CREATE POLICY "Permitir leitura de purchase_items"
            ON public.purchase_items FOR SELECT
            TO anon, authenticated, service_role
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'purchase_items' AND policyname = 'Permitir escrita de purchase_items'
    ) THEN
        CREATE POLICY "Permitir escrita de purchase_items"
            ON public.purchase_items FOR ALL
            TO anon, authenticated, service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

GRANT ALL ON public.purchase_items TO anon, authenticated, service_role;

-- Backfill idempotente a partir de purchases.items (6 itens existentes)
INSERT INTO public.purchase_items (
    purchase_id,
    item_index,
    product_id,
    variation_id,
    description,
    quantity,
    base_cost,
    unit_cost,
    total_cost,
    item_snapshot
)
SELECT
    p.id AS purchase_id,
    elem.ord::integer AS item_index,
    elem.item->>'productId' AS product_id,
    elem.item->>'variationId' AS variation_id,
    COALESCE(elem.item->>'description', 'Item de Compra') AS description,
    COALESCE(NULLIF(elem.item->>'quantity', '')::numeric, 1) AS quantity,
    COALESCE(NULLIF(elem.item->>'baseCost', '')::numeric, 0) AS base_cost,
    COALESCE(NULLIF(elem.item->>'unitCost', '')::numeric, 0) AS unit_cost,
    COALESCE(NULLIF(elem.item->>'totalCost', '')::numeric, 0) AS total_cost,
    elem.item AS item_snapshot
FROM public.purchases p
CROSS JOIN LATERAL jsonb_array_elements(p.items) WITH ORDINALITY AS elem(item, ord)
WHERE p.items IS NOT NULL 
  AND jsonb_typeof(p.items) = 'array' 
  AND jsonb_array_length(p.items) > 0
ON CONFLICT (purchase_id, item_index) DO NOTHING;
