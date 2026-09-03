-- Migration para criação da tabela nfe_documents e controle sequencial de numeração para NF-e e NFC-e
CREATE TABLE IF NOT EXISTS nfe_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    numero_nfe INTEGER NOT NULL,
    serie VARCHAR(4) NOT NULL DEFAULT '1',
    chave_acesso VARCHAR(44) UNIQUE,
    modelo VARCHAR(2) NOT NULL DEFAULT '55', -- '55' = NF-e (Entrega), '65' = NFC-e (Retirada)
    ambiente INTEGER NOT NULL DEFAULT 2,     -- 2 = Homologação / Teste, 1 = Produção
    status VARCHAR(30) NOT NULL DEFAULT 'pendente', -- pendente, autorizada, denegada, cancelada, erro
    motivo_status TEXT,
    xml_nfe TEXT,
    xml_protocolo TEXT,
    numero_protocolo VARCHAR(30),
    danfe_url TEXT,
    valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    destinatario_nome TEXT,
    destinatario_documento TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para controle sequencial atômico de numeração por série, modelo e ambiente
CREATE TABLE IF NOT EXISTS nfe_sequences (
    id SERIAL PRIMARY KEY,
    modelo VARCHAR(2) NOT NULL, -- '55' ou '65'
    serie VARCHAR(4) NOT NULL,  -- '1', '2', etc.
    ambiente INTEGER NOT NULL,  -- 2 = homologação, 1 = produção
    ultimo_numero INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(modelo, serie, ambiente)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nfe_documents_order_id ON nfe_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_nfe_documents_chave_acesso ON nfe_documents(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfe_documents_status ON nfe_documents(status);
CREATE INDEX IF NOT EXISTS idx_nfe_documents_modelo ON nfe_documents(modelo);

-- Habilitar RLS
ALTER TABLE nfe_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_sequences ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura para autenticados e anon em nfe_documents" ON nfe_documents;
CREATE POLICY "Permitir leitura para autenticados e anon em nfe_documents" ON nfe_documents
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção e atualização em nfe_documents" ON nfe_documents;
CREATE POLICY "Permitir inserção e atualização em nfe_documents" ON nfe_documents
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo em nfe_sequences" ON nfe_sequences;
CREATE POLICY "Permitir tudo em nfe_sequences" ON nfe_sequences
    FOR ALL USING (true);

-- Função para obter o próximo número sequencial de NF-e/NFC-e
CREATE OR REPLACE FUNCTION get_next_nfe_number(
    p_modelo VARCHAR(2),
    p_serie VARCHAR(4),
    p_ambiente INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_next_num INTEGER;
BEGIN
    INSERT INTO nfe_sequences (modelo, serie, ambiente, ultimo_numero, updated_at)
    VALUES (p_modelo, p_serie, p_ambiente, 1, now())
    ON CONFLICT (modelo, serie, ambiente)
    DO UPDATE SET 
        ultimo_numero = nfe_sequences.ultimo_numero + 1,
        updated_at = now()
    RETURNING ultimo_numero INTO v_next_num;

    RETURN v_next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
