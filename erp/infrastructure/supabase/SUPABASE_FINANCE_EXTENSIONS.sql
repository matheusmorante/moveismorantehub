-- ========================================================
-- EXTENSÕES E CATEGORIAS DO MÓDULO FINANCEIRO - MORANTE HUB
-- ========================================================

-- 1. Garante existência das colunas adicionais na tabela financial_transactions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='origin') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN origin TEXT DEFAULT 'MANUAL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='created_by') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN created_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='transaction_time') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN transaction_time TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='counterparty') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN counterparty TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='purpose') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN purpose TEXT DEFAULT 'BUSINESS';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='vehicle_id') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN vehicle_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='account_id') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN account_id TEXT DEFAULT 'Caixa Geral';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_transactions' AND column_name='status') THEN
        ALTER TABLE public.financial_transactions ADD COLUMN status TEXT DEFAULT 'ACTIVE';
    END IF;
END $$;

-- 2. Inserção / Garantia de Categorias de RECEITA
INSERT INTO public.financial_categories (name, type) VALUES
('Venda de mercadorias', 'income'),
('Serviços de montagem', 'income'),
('Frete / entrega', 'income'),
('Assistência / serviço', 'income'),
('Juros recebidos', 'income'),
('Multas recebidas', 'income'),
('Recebimento de cliente', 'income'),
('Recuperação / reembolso', 'income'),
('Venda de ativo', 'income'),
('Outras receitas', 'income')
ON CONFLICT DO NOTHING;

-- 3. Inserção / Garantia de Categorias de DESPESA
INSERT INTO public.financial_categories (name, type) VALUES
-- MERCADORIA / OPERAÇÃO
('Compra de mercadorias', 'expense'),
('Frete de compra', 'expense'),
('Frete de entrega', 'expense'),
('Combustível', 'expense'),
('Pedágio', 'expense'),
('Estacionamento', 'expense'),
('Manutenção de veículos', 'expense'),
('Peças de veículos', 'expense'),
('Seguro de veículos', 'expense'),
('Lavagem / conservação de veículos', 'expense'),

-- FUNCIONÁRIOS
('Salários', 'expense'),
('Adiantamento salarial', 'expense'),
('Encargos trabalhistas', 'expense'),
('Benefícios', 'expense'),
('Vale-transporte', 'expense'),
('Vale-refeição / alimentação', 'expense'),
('Comissão', 'expense'),
('Hora extra', 'expense'),
('Prestador de serviço', 'expense'),

-- ESTRUTURA
('Aluguel', 'expense'),
('Condomínio', 'expense'),
('Energia elétrica', 'expense'),
('Água', 'expense'),
('Internet', 'expense'),
('Telefone', 'expense'),
('Segurança', 'expense'),
('Limpeza', 'expense'),
('Manutenção predial', 'expense'),
('Material de limpeza', 'expense'),
('Material de escritório', 'expense'),

-- TECNOLOGIA
('Software / sistemas', 'expense'),
('Hospedagem', 'expense'),
('Domínio', 'expense'),
('Serviços de nuvem', 'expense'),
('APIs', 'expense'),
('Assinaturas digitais', 'expense'),
('Equipamentos de informática', 'expense'),
('Manutenção de informática', 'expense'),

-- MARKETING
('Anúncios', 'expense'),
('Redes sociais', 'expense'),
('Material gráfico', 'expense'),
('Fotografia', 'expense'),
('Publicidade', 'expense'),
('Promoções', 'expense'),

-- FINANCEIRO / ADMINISTRATIVO
('Tarifas bancárias', 'expense'),
('Taxas de cartão', 'expense'),
('Juros pagos', 'expense'),
('Multas', 'expense'),
('Contabilidade', 'expense'),
('Consultoria', 'expense'),
('Serviços jurídicos', 'expense'),
('Impostos e tributos', 'expense'),
('Licenças / taxas públicas', 'expense'),

-- SÓCIOS
('Pró-labore', 'expense'),
('Retirada de sócio', 'expense'),
('Adiantamento a sócio', 'expense'),
('Distribuição de lucros', 'expense'),

-- OUTROS
('Devolução / reembolso a cliente', 'expense'),
('Perdas / avarias', 'expense'),
('Doações', 'expense'),
('Despesa não classificada', 'expense'),
('Outras despesas', 'expense')
ON CONFLICT DO NOTHING;
