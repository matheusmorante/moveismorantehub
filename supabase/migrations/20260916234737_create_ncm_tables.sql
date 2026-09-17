-- Tabela de NCMs (Nomenclatura Comum do Mercosul)
CREATE TABLE IF NOT EXISTS public.ncms (
    code text PRIMARY KEY,
    official_description text NOT NULL,
    start_date date,
    end_date date,
    legal_act text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de aliases/descrições comerciais para NCMs
CREATE TABLE IF NOT EXISTS public.ncm_aliases (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ncm_code text NOT NULL REFERENCES public.ncms(code) ON DELETE CASCADE,
    term text NOT NULL,
    weight integer DEFAULT 1,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(ncm_code, term)
);

-- Habilitar RLS
ALTER TABLE public.ncms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncm_aliases ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Leitura pública (para usuários autenticados)
CREATE POLICY "Leitura de NCMs permitida para autenticados" 
    ON public.ncms FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Leitura de NCM Aliases permitida para autenticados" 
    ON public.ncm_aliases FOR SELECT 
    TO authenticated 
    USING (true);

-- Escrita restrita a service_role (edge function de sincronização)
CREATE POLICY "Modificação de NCMs restrita a service_role" 
    ON public.ncms 
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Usuários podem adicionar aliases 
CREATE POLICY "Criação de NCM Aliases permitida para autenticados" 
    ON public.ncm_aliases 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Modificação de NCM Aliases permitida para autenticados" 
    ON public.ncm_aliases 
    FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Deleção de NCM Aliases permitida para autenticados" 
    ON public.ncm_aliases 
    FOR DELETE 
    TO authenticated 
    USING (true);

-- Extension unaccent se não existir
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Função de RPC para busca textual e aproximação
CREATE OR REPLACE FUNCTION public.search_ncms(search_term text, max_results integer DEFAULT 20)
RETURNS TABLE (
    code text,
    official_description text,
    alias_match text,
    rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH matches AS (
        -- Busca exata ou por prefixo no código numérico
        SELECT 
            n.code,
            n.official_description,
            NULL::text as alias_match,
            1.0::real as rank
        FROM public.ncms n
        WHERE 
            n.active = true 
            AND n.code LIKE (search_term || '%')
            AND search_term ~ '^[0-9]+$'
        
        UNION ALL
        
        -- Busca textual na descrição oficial e nos aliases
        SELECT 
            n.code,
            n.official_description,
            a.term as alias_match,
            CASE WHEN a.term IS NOT NULL THEN (1.0 + (COALESCE(a.weight, 1) * 0.1))::real ELSE 0.5::real END as rank
        FROM public.ncms n
        LEFT JOIN public.ncm_aliases a ON n.code = a.ncm_code AND a.active = true
        WHERE 
            n.active = true 
            AND NOT (search_term ~ '^[0-9]+$')
            AND (
                unaccent(n.official_description) ILIKE '%' || unaccent(search_term) || '%'
                OR unaccent(a.term) ILIKE '%' || unaccent(search_term) || '%'
            )
    )
    SELECT DISTINCT ON (m.code)
        m.code,
        m.official_description,
        m.alias_match,
        m.rank
    FROM matches m
    ORDER BY m.code, m.rank DESC
    LIMIT max_results;
END;
$$;
