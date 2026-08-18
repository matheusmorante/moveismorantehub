-- Create product_variations table for managing dynamic attributes, stock, and pricing per variation
CREATE TABLE IF NOT EXISTS public.product_variations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name varchar NOT NULL, -- Ex: "Sofá Azul / Linho"
  sku varchar UNIQUE, -- Código SKU opcional
  price numeric, -- Preço específico da variação (opcional, se nulo herda o principal)
  stock integer DEFAULT 0, -- Controle de estoque individual
  image_url text, -- Foto específica da variação (opcional)
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb, -- Combinação (ex: {"Cor": "Azul", "Material": "Linho"})
  created_at timestamp with time zone DEFAULT now()
);

-- Optional index for performance
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON public.product_variations(product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

-- RLS policies allowing authenticated users to select, insert, update, delete
CREATE POLICY "allow_select" ON public.product_variations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "allow_insert" ON public.product_variations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "allow_update" ON public.product_variations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "allow_delete" ON public.product_variations FOR DELETE USING (auth.role() = 'authenticated');
