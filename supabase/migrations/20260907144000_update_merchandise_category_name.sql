-- Migration: 20260907144000_update_merchandise_category_name.sql
-- Atualiza a descrição oficial da categoria "Compra de Mercadorias" para detalhar os tipos de movimentação:
-- "Compra de Mercadorias (Boletos, PIXs de compra de móveis e frete de fornecedores)"

UPDATE public.financial_categories
SET name = 'Compra de Mercadorias (Boletos, PIXs de compra de móveis e frete de fornecedores)'
WHERE name = 'Compra de Mercadorias';
