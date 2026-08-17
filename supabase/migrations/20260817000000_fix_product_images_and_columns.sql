-- ====================================================================
-- CORREÇÃO E PADRONIZAÇÃO DE COLUNAS DE IMAGEM E DADOS NO SUPABASE
-- Projeto: MoranteHub (Supabase Centralizado)
-- ====================================================================

-- 1. Adicionar coluna 'images' (jsonb) para armazenar os URLs das fotos dos produtos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

-- 2. Adicionar colunas essenciais de código, marcas, categorias e estado
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS code varchar;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand varchar;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category varchar;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition varchar DEFAULT 'novo';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_variations boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS item_type varchar DEFAULT 'product';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id uuid;

-- 3. Liberar RLS para leitura pública em product_variations (para carregar fotos de variações na listagem)
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_public_select_variations" ON public.product_variations;
CREATE POLICY "allow_public_select_variations" ON public.product_variations FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_product_variations" ON public.product_variations;
CREATE POLICY "allow_all_product_variations" ON public.product_variations FOR ALL USING (true) WITH CHECK (true);

-- 4. Liberar RLS para leitura/escrita em products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_public_select_products" ON public.products;
CREATE POLICY "allow_public_select_products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_products" ON public.products;
CREATE POLICY "allow_all_products" ON public.products FOR ALL USING (true) WITH CHECK (true);
