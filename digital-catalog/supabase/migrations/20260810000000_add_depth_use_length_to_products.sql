-- Adiciona coluna depth_use_length à tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS depth_use_length BOOLEAN DEFAULT FALSE;
