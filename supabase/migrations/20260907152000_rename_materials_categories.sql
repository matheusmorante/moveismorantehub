-- Migration: 20260907152000_rename_materials_categories.sql
-- Renomeia as categorias de materiais:
-- 1. "Limpeza e Conservação" -> "Materiais de Limpeza"
-- 2. "Material de Escritório" -> "Materiais de Escritório"

UPDATE public.financial_categories
SET name = 'Materiais de Limpeza', updated_at = NOW()
WHERE name = 'Limpeza e Conservação';

UPDATE public.financial_categories
SET name = 'Materiais de Escritório', updated_at = NOW()
WHERE name = 'Material de Escritório';
