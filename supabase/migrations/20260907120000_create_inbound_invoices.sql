-- Migration para criação da tabela de Notas Fiscais de Entrada (DF-e Fornecedores)
CREATE TABLE IF NOT EXISTS public.inbound_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave_acesso VARCHAR(44) UNIQUE NOT NULL,
    numero_nfe INTEGER NOT NULL,
    serie VARCHAR(4) NOT NULL DEFAULT '1',
    data_emissao TIMESTAMPTZ NOT NULL,
    emitente_cnpj VARCHAR(18) NOT NULL,
    emitente_nome TEXT NOT NULL,
    emitente_fantasia TEXT,
    emitente_uf VARCHAR(2) NOT NULL DEFAULT 'PR',
    destinatario_cnpj VARCHAR(18) NOT NULL DEFAULT '44.512.248/0001-07',
    destinatario_nome TEXT NOT NULL DEFAULT 'MOVEIS MORANTE',
    valor_produtos NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    valor_frete NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    valor_ipi NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status_sefaz VARCHAR(30) NOT NULL DEFAULT 'autorizada', -- autorizada, cancelada, denegada
    status_recebimento VARCHAR(30) NOT NULL DEFAULT 'pendente', -- pendente, recebida, parcial, ignorada
    receipt_id UUID REFERENCES public.goods_receipts(id) ON DELETE SET NULL,
    xml_conteudo TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    nsu VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_inbound_invoices_chave ON public.inbound_invoices(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_inbound_invoices_emitente_cnpj ON public.inbound_invoices(emitente_cnpj);
CREATE INDEX IF NOT EXISTS idx_inbound_invoices_status_recebimento ON public.inbound_invoices(status_recebimento);
CREATE INDEX IF NOT EXISTS idx_inbound_invoices_data_emissao ON public.inbound_invoices(data_emissao DESC);

-- Habilitar RLS
ALTER TABLE public.inbound_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura para autenticados em inbound_invoices" ON public.inbound_invoices;
CREATE POLICY "Permitir leitura para autenticados em inbound_invoices" ON public.inbound_invoices
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir tudo em inbound_invoices" ON public.inbound_invoices;
CREATE POLICY "Permitir tudo em inbound_invoices" ON public.inbound_invoices
    FOR ALL USING (true);
