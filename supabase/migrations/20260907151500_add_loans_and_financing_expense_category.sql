-- Migration: 20260907151500_add_loans_and_financing_expense_category.sql
-- Adiciona categoria "Empréstimos e Financiamentos" para saídas (gastos da empresa)
INSERT INTO public.financial_categories (name, type)
SELECT 'Empréstimos e Financiamentos', 'expense'
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_categories WHERE name = 'Empréstimos e Financiamentos'
);
