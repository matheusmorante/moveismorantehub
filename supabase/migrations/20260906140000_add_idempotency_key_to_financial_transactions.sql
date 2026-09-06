-- ============================================================
-- Migration: 20260906140000_add_idempotency_key_to_financial_transactions
-- Módulo: Assistente Financeiro IA
-- Propósito: Garantir idempotência real no banco para lançamentos
--            vindos do Assistente Financeiro, eliminando a race
--            condition existente no padrão SELECT + INSERT.
--
-- Segurança:
--   - Nullable: registros históricos e manuais ficam com NULL
--   - Índice parcial WHERE NOT NULL: NULLs não colidem entre si
--   - Não altera dados existentes
--   - Não remove nenhuma coluna
--   - Idempotente: usa ADD COLUMN IF NOT EXISTS e CREATE IF NOT EXISTS
-- ============================================================

-- 1. Adicionar coluna idempotency_key (nullable por padrão)
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Criar índice UNIQUE parcial apenas onde idempotency_key IS NOT NULL
--    Isso garante que:
--    - Dois INSERTs com a mesma chave falham com erro 23505 (unique_violation)
--    - Registros manuais e históricos (NULL) não conflitam entre si
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_transactions_idempotency_key
  ON financial_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Comentário descritivo na coluna
COMMENT ON COLUMN financial_transactions.idempotency_key IS
  'Chave de idempotência estável por operação lógica do Assistente Financeiro IA. '
  'Nullable para lançamentos manuais. '
  'UNIQUE parcial (WHERE NOT NULL) garante que retries não criem duplicatas.';
