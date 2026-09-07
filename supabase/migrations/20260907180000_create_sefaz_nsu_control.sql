-- Migration: Tabela de controle de sincronização DF-e / NSU da SEFAZ
CREATE TABLE IF NOT EXISTS public.sefaz_nsu_control (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    cnpj VARCHAR(18) NOT NULL DEFAULT '44.512.248/0001-07',
    last_nsu VARCHAR(30) NOT NULL DEFAULT '0',
    max_nsu VARCHAR(30) NOT NULL DEFAULT '0',
    last_sync_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'idle',
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir registro inicial se não existir
INSERT INTO public.sefaz_nsu_control (id, cnpj, last_nsu, max_nsu)
VALUES ('default', '44.512.248/0001-07', '0', '0')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.sefaz_nsu_control ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de sefaz_nsu_control" ON public.sefaz_nsu_control;
CREATE POLICY "Permitir leitura de sefaz_nsu_control" ON public.sefaz_nsu_control
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir tudo em sefaz_nsu_control" ON public.sefaz_nsu_control;
CREATE POLICY "Permitir tudo em sefaz_nsu_control" ON public.sefaz_nsu_control
    FOR ALL USING (true);
