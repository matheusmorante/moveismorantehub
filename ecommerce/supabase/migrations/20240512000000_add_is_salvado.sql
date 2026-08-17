-- Adicionar campo is_salvado na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_salvado BOOLEAN DEFAULT false;
