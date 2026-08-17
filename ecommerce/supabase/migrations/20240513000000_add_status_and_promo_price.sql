-- Adicionar campos status e promo_price na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2);
