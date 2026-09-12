-- Migration para adicionar colunas de rateio e metadados de recebimento em goods_receipts
ALTER TABLE public.goods_receipts
    ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'received',
    ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ipi_percent NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS freight_percent NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS non_fiscal_discount_mode TEXT,
    ADD COLUMN IF NOT EXISTS non_fiscal_discount_value NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS non_fiscal_freight_mode TEXT,
    ADD COLUMN IF NOT EXISTS non_fiscal_freight_value NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS non_fiscal_other_expenses_mode TEXT,
    ADD COLUMN IF NOT EXISTS non_fiscal_other_expenses_value NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fiscal_ipi NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fiscal_freight NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fiscal_discount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fiscal_other_expenses NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
