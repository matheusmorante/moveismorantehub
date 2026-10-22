-- Reversão da migration 20261022183100_fiscal_document_export_history.sql.
-- Primeiro desabilite/remova a rota de exportação e a interface que consultam esta tabela.
-- Esta operação remove permanentemente o histórico de pacotes já registrados.
BEGIN;

DROP TABLE IF EXISTS public.nfe_document_export_history;

COMMIT;
