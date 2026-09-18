-- Migration for Product Compositions

-- Create Compositions Table
CREATE TABLE IF NOT EXISTS public.compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code SERIAL NOT NULL,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT, 
    active BOOLEAN DEFAULT true,
    catalog_published BOOLEAN DEFAULT false,
    pricing_mode TEXT DEFAULT 'sum', -- 'sum', 'fixed', 'discount'
    manual_price NUMERIC(15,2),
    images JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Composition Variations Table
CREATE TABLE IF NOT EXISTS public.composition_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    composition_id UUID NOT NULL REFERENCES public.compositions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    attributes JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Composition Variation Items Table
CREATE TABLE IF NOT EXISTS public.composition_variation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    composition_variation_id UUID NOT NULL REFERENCES public.composition_variations(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL, 
    variation_id TEXT, 
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_composition_variations_comp_id ON public.composition_variations(composition_id);
CREATE INDEX IF NOT EXISTS idx_composition_variation_items_var_id ON public.composition_variation_items(composition_variation_id);
CREATE INDEX IF NOT EXISTS idx_composition_variation_items_prod_var ON public.composition_variation_items(product_id, variation_id);

-- Enable RLS
ALTER TABLE public.compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composition_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composition_variation_items ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable read access for all users" ON public.compositions FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.compositions FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.composition_variations FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.composition_variations FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON public.composition_variation_items FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.composition_variation_items FOR ALL USING (auth.role() = 'authenticated');

-- Function to calculate availability
CREATE OR REPLACE FUNCTION public.get_composition_availability(p_composition_variation_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available_qty integer := NULL;
    v_component record;
    v_component_stock integer;
    v_formable integer;
BEGIN
    FOR v_component IN 
        SELECT product_id, variation_id, quantity 
        FROM public.composition_variation_items 
        WHERE composition_variation_id = p_composition_variation_id
    LOOP
        -- Em MoranteHub, variações podem estar na mesma tabela `products` ou em campo jsonb.
        -- Como a FK de produto é TEXT, vamos consultar a tabela products pela chave correspondente (variation_id tem precedencia)
        
        IF v_component.variation_id IS NOT NULL AND v_component.variation_id != '' THEN
            SELECT COALESCE(stock, 0) INTO v_component_stock FROM public.products WHERE id = v_component.variation_id; 
        ELSE
            SELECT COALESCE(stock, 0) INTO v_component_stock FROM public.products WHERE id = v_component.product_id;
        END IF;

        IF v_component_stock IS NULL THEN
            v_component_stock := 0;
        END IF;

        v_formable := floor(v_component_stock / v_component.quantity);

        IF v_available_qty IS NULL OR v_formable < v_available_qty THEN
            v_available_qty := v_formable;
        END IF;
    END LOOP;

    RETURN COALESCE(v_available_qty, 0);
END;
$$;
