CREATE TABLE IF NOT EXISTS public.goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT now(), invoice_number TEXT, invoice_date TIMESTAMPTZ,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, total_value NUMERIC(12,2) NOT NULL DEFAULT 0, observation TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goods_receipts' AND policyname = 'Allow all access to goods receipts') THEN CREATE POLICY "Allow all access to goods receipts" ON public.goods_receipts FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
