-- Migration: Adicionar cost_price em product_variations para compatibilidade de consultas e relatórios
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;
