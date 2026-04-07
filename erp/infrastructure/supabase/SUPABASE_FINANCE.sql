-- =========================================
-- MÓDULO FINANCEIRO - MOVEIS MORANTE ERP
-- =========================================

-- 1. Tabela de Categorias Financeiras (Plano de Contas)
CREATE TABLE IF NOT EXISTS public.financial_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public profiles are viewable by everyone for categories') THEN
        CREATE POLICY "Public profiles are viewable by everyone for categories" ON public.financial_categories FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert categories') THEN
        CREATE POLICY "Users can insert categories" ON public.financial_categories FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update categories') THEN
        CREATE POLICY "Users can update categories" ON public.financial_categories FOR UPDATE USING (true);
    END IF;
END $$;

-- Categorias Iniciais
INSERT INTO public.financial_categories (name, type) VALUES
('Vendas de Produtos', 'income'),
('Serviços e Montagem', 'income'),
('Outras Receitas', 'income'),
('Compra de Mercadorias', 'expense'),
('Salários e Encargos', 'expense'),
('Pró-labore', 'expense'),
('Internet e Telefone', 'expense'),
('Combustível e Manutenção', 'expense'),
('Seguros e Impostos', 'expense'),
('Taxas Bancárias', 'expense'),
('Impostos e Taxas', 'expense'),
('Energia e Utilidades', 'expense'),
('Aluguel', 'expense'),
('Marketing e Publicidade', 'expense'),
('Manutenção e Peças', 'expense'),
('Material de Escritório', 'expense'),
('Limpeza e Conservação', 'expense'),
('Embalagens e Fretes', 'expense'),
('Outras Despesas', 'expense')
ON CONFLICT DO NOTHING;

-- 2. Tabela de Contas a Pagar (Accounts Payable)
CREATE TABLE IF NOT EXISTS public.accounts_payable (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue')),
    category_id UUID REFERENCES public.financial_categories(id),
    supplier_name TEXT,
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public accounts_payable view') THEN
        CREATE POLICY "Public accounts_payable view" ON public.accounts_payable FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public accounts_payable insert') THEN
        CREATE POLICY "Public accounts_payable insert" ON public.accounts_payable FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public accounts_payable update') THEN
        CREATE POLICY "Public accounts_payable update" ON public.accounts_payable FOR UPDATE USING (true);
    END IF;
END $$;

-- 3. Tabela de Contas a Receber (Accounts Receivable)
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue')),
    category_id UUID REFERENCES public.financial_categories(id),
    customer_name TEXT,
    order_id BIGINT, -- Relacionamento com orders (BIGINT no ERP Morante)
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public accounts_receivable view') THEN
        CREATE POLICY "Public accounts_receivable view" ON public.accounts_receivable FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public accounts_receivable insert') THEN
        CREATE POLICY "Public accounts_receivable insert" ON public.accounts_receivable FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public accounts_receivable update') THEN
        CREATE POLICY "Public accounts_receivable update" ON public.accounts_receivable FOR UPDATE USING (true);
    END IF;
END $$;

-- 4. Tabela de Movimentações de Caixa (Financial Transactions)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    category_id UUID REFERENCES public.financial_categories(id),
    payable_id UUID REFERENCES public.accounts_payable(id),
    receivable_id UUID REFERENCES public.accounts_receivable(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public financial_transactions view') THEN
        CREATE POLICY "Public financial_transactions view" ON public.financial_transactions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public financial_transactions insert') THEN
        CREATE POLICY "Public financial_transactions insert" ON public.financial_transactions FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public financial_transactions update') THEN
        CREATE POLICY "Public financial_transactions update" ON public.financial_transactions FOR UPDATE USING (true);
    END IF;
END $$;

-- Triggers de Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_categories_updated_at BEFORE UPDATE ON public.financial_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
