-- Garantir existência da tabela inventory_moves e suas colunas
CREATE TABLE IF NOT EXISTS public.inventory_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    variation_id UUID,
    product_description TEXT,
    type TEXT,
    quantity NUMERIC(10,2) DEFAULT 0,
    date TIMESTAMPTZ DEFAULT now(),
    label TEXT,
    unit_cost NUMERIC(10,2) DEFAULT 0,
    unit_price NUMERIC(10,2) DEFAULT 0,
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS variation_id UUID;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS product_description TEXT;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS observation TEXT;
ALTER TABLE public.inventory_moves ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Habilitar RLS e criar política de acesso irrestrita para operações do sistema
ALTER TABLE public.inventory_moves ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'inventory_moves' AND policyname = 'Allow all access to inventory_moves'
    ) THEN
        CREATE POLICY "Allow all access to inventory_moves" ON public.inventory_moves FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
