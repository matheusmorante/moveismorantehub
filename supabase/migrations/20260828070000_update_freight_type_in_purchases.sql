-- Adicionar colunas freight_value e freight_type se não existirem na tabela purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS freight_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS freight_type TEXT DEFAULT 'percentage';
