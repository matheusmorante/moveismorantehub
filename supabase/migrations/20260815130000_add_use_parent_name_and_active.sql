-- Migration: Add use_parent_name to product_variations and active to attributes

-- Adiciona a coluna use_parent_name na tabela de variações de produto
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS use_parent_name boolean DEFAULT true;

-- Adiciona a coluna active na tabela de atributos globais
ALTER TABLE public.attributes ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
