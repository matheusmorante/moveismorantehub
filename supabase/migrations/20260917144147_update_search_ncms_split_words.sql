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
        
        -- Busca textual com palavras separadas (AND lógico entre palavras)
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
                -- Todas as palavras do search_term devem estar na descrição oficial
                (
                    SELECT bool_and(unaccent(n.official_description) ILIKE '%' || unaccent(word) || '%')
                    FROM unnest(string_to_array(trim(search_term), ' ')) AS word
                    WHERE word != ''
                )
                OR
                -- OU Todas as palavras do search_term devem estar no alias
                (
                    a.term IS NOT NULL AND (
                        SELECT bool_and(unaccent(a.term) ILIKE '%' || unaccent(word) || '%')
                        FROM unnest(string_to_array(trim(search_term), ' ')) AS word
                        WHERE word != ''
                    )
                )
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
