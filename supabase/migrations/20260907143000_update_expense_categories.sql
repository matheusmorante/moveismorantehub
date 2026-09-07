-- Migration: 20260907143000_update_expense_categories.sql
-- Atualiza categorias de despesa (saída) conforme solicitação operacional:
-- 1. "Combustível e Manutenção" -> "Combustível"
-- 2. "Manutenção do Carro" criada como categoria própria
-- 3. "Manutenção e Peças" -> "Manutenção do Imóvel"
-- 4. "Outras Despesas" -> "Outras"
-- 5. "Seguros e Impostos" -> "Seguros"
-- 6. "Energia e Utilidades" -> "Energia"
-- 7. "Embalagens e Fretes" removida

-- 1. Combustível
UPDATE public.financial_categories
SET name = 'Combustível', updated_at = NOW()
WHERE name = 'Combustível e Manutenção';

-- 2. Manutenção do Carro
INSERT INTO public.financial_categories (name, type)
SELECT 'Manutenção do Carro', 'expense'
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_categories WHERE name = 'Manutenção do Carro'
);

-- 3. Manutenção do Imóvel
UPDATE public.financial_categories
SET name = 'Manutenção do Imóvel', updated_at = NOW()
WHERE name = 'Manutenção e Peças';

-- 4. Outras
UPDATE public.financial_categories
SET name = 'Outras', updated_at = NOW()
WHERE name = 'Outras Despesas';

-- 5. Seguros
UPDATE public.financial_categories
SET name = 'Seguros', updated_at = NOW()
WHERE name = 'Seguros e Impostos';

-- 6. Energia
UPDATE public.financial_categories
SET name = 'Energia', updated_at = NOW()
WHERE name = 'Energia e Utilidades';

-- 7. Remove Embalagens e Fretes
DELETE FROM public.financial_categories
WHERE name = 'Embalagens e Fretes';
