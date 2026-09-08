-- Mantém os fatos fiscais extraídos separados dos vínculos internos do ERP.
ALTER TABLE public.inbound_invoices
    ADD COLUMN IF NOT EXISTS data_saida_entrada TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS natureza_operacao TEXT,
    ADD COLUMN IF NOT EXISTS modelo VARCHAR(4),
    ADD COLUMN IF NOT EXISTS protocolo TEXT,
    ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS valor_seguro NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS outras_despesas NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS valor_icms NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS emitente_ie TEXT,
    ADD COLUMN IF NOT EXISTS emitente_endereco JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- people.id é TEXT neste projeto; o vínculo deve conservar o mesmo tipo.
    ADD COLUMN IF NOT EXISTS supplier_id TEXT REFERENCES public.people(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS documento_original_path TEXT,
    ADD COLUMN IF NOT EXISTS documento_original_mime TEXT,
    ADD COLUMN IF NOT EXISTS origem_importacao TEXT NOT NULL DEFAULT 'sefaz',
    ADD COLUMN IF NOT EXISTS extraction_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS extraction_confidence JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_inbound_invoices_supplier_id ON public.inbound_invoices(supplier_id);

-- Bucket privado: a edge function grava com service role e o app usa URL assinada.
INSERT INTO storage.buckets (id, name, public)
VALUES ('inbound-invoice-documents', 'inbound-invoice-documents', false)
ON CONFLICT (id) DO NOTHING;
