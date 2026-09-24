-- Migration: Expansão do controle de NSU e metadados de sincronização SEFAZ DF-e
ALTER TABLE public.sefaz_nsu_control
    ADD COLUMN IF NOT EXISTS next_allowed_sync_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_cstat VARCHAR(10),
    ADD COLUMN IF NOT EXISTS last_xmotivo TEXT,
    ADD COLUMN IF NOT EXISTS last_docs_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

-- Comentários descritivos
COMMENT ON COLUMN public.sefaz_nsu_control.next_allowed_sync_at IS 'Data/hora mínima permitida para o próximo polling de distNSU (prevenção cStat 137 / 656)';
COMMENT ON COLUMN public.sefaz_nsu_control.last_cstat IS 'Último código de status retornado pelo Web Service da SEFAZ (137, 138, 656)';
COMMENT ON COLUMN public.sefaz_nsu_control.last_xmotivo IS 'Motivo literal retornado no XML da SEFAZ';
COMMENT ON COLUMN public.sefaz_nsu_control.last_docs_count IS 'Quantidade de documentos persistidos na última execução';
COMMENT ON COLUMN public.sefaz_nsu_control.environment IS 'Ambiente de execução (production ou homologation)';
