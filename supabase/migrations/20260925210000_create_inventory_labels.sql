-- migration: 20260925210000_create_inventory_labels.sql
-- Tabela para rastreamento de unidades físicas individuais com etiqueta única

CREATE TABLE IF NOT EXISTS public.inventory_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    variation_id UUID,
    sku TEXT,
    barcode TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discarded', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    printed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_labels_product_id ON public.inventory_labels(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_labels_variation_id ON public.inventory_labels(variation_id);
CREATE INDEX IF NOT EXISTS idx_inventory_labels_sku ON public.inventory_labels(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_labels_created_at ON public.inventory_labels(created_at);

ALTER TABLE public.inventory_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated and anon to read inventory_labels" ON public.inventory_labels;
CREATE POLICY "Allow authenticated and anon to read inventory_labels"
ON public.inventory_labels FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Allow authenticated and anon to insert inventory_labels" ON public.inventory_labels;
CREATE POLICY "Allow authenticated and anon to insert inventory_labels"
ON public.inventory_labels FOR INSERT
TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated and anon to update inventory_labels" ON public.inventory_labels;
CREATE POLICY "Allow authenticated and anon to update inventory_labels"
ON public.inventory_labels FOR UPDATE
TO authenticated, anon
USING (true);
