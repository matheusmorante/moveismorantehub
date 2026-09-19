CREATE TABLE IF NOT EXISTS public.physical_inventory_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    variation_id UUID REFERENCES public.product_variations(id) ON DELETE CASCADE,
    sku TEXT,
    status TEXT DEFAULT 'printed',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.physical_inventory_labels ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Enable read access for authenticated users" 
ON public.physical_inventory_labels FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
ON public.physical_inventory_labels FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
ON public.physical_inventory_labels FOR UPDATE 
TO authenticated 
USING (true);

-- Índices de performance
CREATE INDEX IF NOT EXISTS physical_inventory_labels_product_id_idx ON public.physical_inventory_labels(product_id);
CREATE INDEX IF NOT EXISTS physical_inventory_labels_variation_id_idx ON public.physical_inventory_labels(variation_id);
CREATE INDEX IF NOT EXISTS physical_inventory_labels_sku_idx ON public.physical_inventory_labels(sku);
