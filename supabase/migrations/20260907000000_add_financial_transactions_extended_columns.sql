-- ============================================================
-- Migration: 20260907000000_add_financial_transactions_extended_columns.sql
-- Módulo: Financeiro (ERP & Mobile)
-- Propósito: Adicionar colunas necessárias para persistência completa de movimentações,
--            classificações gerenciais, auditoria, finalidade e relatórios.
--
-- Regras de Segurança:
--   - Não altera dados existentes
--   - Não remove nenhuma coluna
--   - Totalmente idempotente (ADD COLUMN IF NOT EXISTS)
--   - Todas as colunas são NULLABLE ou possuem DEFAULT seguro
-- ============================================================

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS category_name TEXT,
  ADD COLUMN IF NOT EXISTS result_nature TEXT,
  ADD COLUMN IF NOT EXISTS counterparty TEXT,
  ADD COLUMN IF NOT EXISTS collaborator_id UUID,
  ADD COLUMN IF NOT EXISTS collaborator_name TEXT,
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_id TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS due_day INTEGER,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS installments_total INTEGER,
  ADD COLUMN IF NOT EXISTS installment_number INTEGER,
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS transaction_time TIME,
  ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Índice para consultas frequentes de status e data
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status_date
  ON financial_transactions (status, date);

COMMENT ON COLUMN financial_transactions.status IS 'Status da movimentação: ACTIVE, PENDING, PAID, REVERSED, CANCELLED';
COMMENT ON COLUMN financial_transactions.purpose IS 'Finalidade: BUSINESS (Operação) ou PERSONAL_PARTNER (Uso Particular / Pró-labore)';
COMMENT ON COLUMN financial_transactions.result_nature IS 'Natureza no DRE: RECEITA, DESPESA ou NAO_AFETA_RESULTADO';
