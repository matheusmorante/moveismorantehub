-- Criar tabela purchases se não existir
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id TEXT,
    supplier_name TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    items JSONB DEFAULT '[]'::jsonb,
    total_value NUMERIC(12,2) DEFAULT 0,
    observation TEXT DEFAULT '',
    status TEXT DEFAULT 'opened',
    invoice_number TEXT,
    invoice_date TIMESTAMPTZ,
    invoice_status TEXT DEFAULT 'pending',
    fiscal_key TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    ipi_value NUMERIC(12,2) DEFAULT 0,
    freight_percent NUMERIC(12,2) DEFAULT 0,
    "stockProcessed" BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e criar política de acesso
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'purchases' AND policyname = 'Allow all access to purchases'
    ) THEN
        CREATE POLICY "Allow all access to purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
