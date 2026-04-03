-- migration: create_label_layouts_table.sql
CREATE TABLE IF NOT EXISTS public.label_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('identificacao', 'precos', 'logos', 'posts')),
    columns INTEGER NOT NULL DEFAULT 1,
    rows INTEGER NOT NULL DEFAULT 1,
    margin_t NUMERIC NOT NULL DEFAULT 10,
    margin_b NUMERIC NOT NULL DEFAULT 10,
    margin_l NUMERIC NOT NULL DEFAULT 10,
    margin_r NUMERIC NOT NULL DEFAULT 10,
    gap_h NUMERIC NOT NULL DEFAULT 0,
    gap_v NUMERIC NOT NULL DEFAULT 0,
    paper_size TEXT NOT NULL DEFAULT 'A4',
    paper_width NUMERIC,
    paper_height NUMERIC,
    icon TEXT NOT NULL DEFAULT 'bi-square',
    type TEXT NOT NULL DEFAULT 'rect' CHECK (type IN ('rect', 'round')),
    name_font_size NUMERIC DEFAULT 7,
    name_color TEXT DEFAULT '#1e293b',
    price_font_size NUMERIC DEFAULT 11,
    price_color TEXT DEFAULT '#1e293b',
    promo_font_size NUMERIC DEFAULT 9,
    promo_color TEXT DEFAULT '#16a34a',
    name_pos_x NUMERIC DEFAULT 50,
    name_pos_y NUMERIC DEFAULT 30,
    price_pos_x NUMERIC DEFAULT 50,
    price_pos_y NUMERIC DEFAULT 60,
    promo_pos_x NUMERIC DEFAULT 50,
    promo_pos_y NUMERIC DEFAULT 75,
    barcode_pos_x NUMERIC DEFAULT 50,
    barcode_pos_y NUMERIC DEFAULT 90,
    price_font_size_hundreds NUMERIC,
    price_font_size_thousands NUMERIC,
    promo_price_color TEXT DEFAULT '#2563eb',
    old_price_color TEXT DEFAULT '#94a3b8',
    promo_price_font_size NUMERIC DEFAULT 24,
    name_width NUMERIC DEFAULT 80,
    name_height NUMERIC DEFAULT 20,
    name_bold BOOLEAN DEFAULT TRUE,
    name_align TEXT DEFAULT 'center',
    name_valign TEXT DEFAULT 'middle',
    price_width NUMERIC DEFAULT 80,
    price_height NUMERIC DEFAULT 30,
    price_bold BOOLEAN DEFAULT TRUE,
    price_align TEXT DEFAULT 'center',
    price_valign TEXT DEFAULT 'middle',
    promo_width NUMERIC DEFAULT 80,
    promo_height NUMERIC DEFAULT 40,
    promo_bold BOOLEAN DEFAULT TRUE,
    promo_align TEXT DEFAULT 'center',
    promo_valign TEXT DEFAULT 'middle',
    bg_color TEXT DEFAULT '#ffffff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.label_layouts ENABLE ROW LEVEL SECURITY;

-- Permissões básicas
DROP POLICY IF EXISTS "Allow authenticated users to read label layouts" ON public.label_layouts;
CREATE POLICY "Allow authenticated users to read label layouts" 
ON public.label_layouts FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert label layouts" ON public.label_layouts;
CREATE POLICY "Allow authenticated users to insert label layouts" 
ON public.label_layouts FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update label layouts" ON public.label_layouts;
CREATE POLICY "Allow authenticated users to update label layouts" 
ON public.label_layouts FOR UPDATE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete label layouts" ON public.label_layouts;
CREATE POLICY "Allow authenticated users to delete label layouts" 
ON public.label_layouts FOR DELETE 
TO authenticated 
USING (true);
