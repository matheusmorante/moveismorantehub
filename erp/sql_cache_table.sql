-- Script para criar a tabela de cache de endereços do Google Maps
CREATE TABLE IF NOT EXISTS public.address_cache (
    query_key text PRIMARY KEY,
    results jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Permite leitura e escrita anônima/autenticada para o cache
-- (Se precisar de Row Level Security, adicione as políticas abaixo)
ALTER TABLE public.address_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.address_cache FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.address_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.address_cache FOR UPDATE USING (true);
