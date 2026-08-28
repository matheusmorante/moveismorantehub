-- Adicionar colunas ipi_value, ipi_type e freight_percent se não existirem na tabela purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS ipi_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS ipi_type TEXT DEFAULT 'percentage';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS freight_percent NUMERIC(10,2) DEFAULT 0;
