-- Tags aqui são sinônimos comerciais para pesquisa; não alteram a classificação fiscal.
-- Os códigos e descrições foram conferidos na tabela NCM vigente da Receita Federal/Siscomex,
-- consultada em 02/10/2026 (Resolução Gecex nº 926/2026):
-- https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json
-- Os aliases só são habilitados para NCMs ativos na loja e vigentes.
INSERT INTO public.ncm_aliases (ncm_code, term, weight, active)
SELECT aliases.ncm_code, aliases.term, 5, true
FROM (
  VALUES
    ('94034000', 'móveis de cozinha de madeira'),
    ('94034000', 'armário de cozinha de madeira'),
    ('94034000', 'armário para cozinha'),
    ('94034000', 'armário para cozinha de madeira'),
    ('94034000', 'armário para cozinha MDF/MDP'),
    ('94034000', 'armário de cozinha MDF/MDP'),
    ('94034000', 'armário de cozinha em MDF/MDP'),
    ('94034000', 'balcão de cozinha de madeira'),
    ('94034000', 'balcão de cozinha MDF/MDP'),
    ('94034000', 'balcão para pia de madeira'),
    ('94034000', 'gabinete de cozinha de madeira'),
    ('94034000', 'gabinete de cozinha MDF/MDP'),
    ('94034000', 'móvel de cozinha em madeira'),
    ('94034000', 'móveis de cozinha MDF/MDP'),

    ('94035000', 'guarda-roupa'),
    ('94035000', 'guarda roupa'),
    ('94035000', 'guarda-roupas'),
    ('94035000', 'guarda roupas'),
    ('94035000', 'roupeiro'),
    ('94035000', 'roupeiros'),
    ('94035000', 'armário de quarto'),
    ('94035000', 'armário para dormitório'),
    ('94035000', 'armário para quarto'),
    ('94035000', 'guarda-roupa de MDF/MDP'),
    ('94035000', 'guarda-roupa em MDF/MDP'),
    ('94035000', 'guarda roupa de MDF/MDP'),
    ('94035000', 'guarda roupa em MDF/MDP'),
    ('94035000', 'roupeiro de MDF/MDP'),
    ('94035000', 'roupeiro em MDF/MDP'),
    ('94035000', 'armário de quarto MDF/MDP'),
    ('94035000', 'armário de dormitório MDF/MDP'),
    ('94035000', 'móvel de quarto MDF/MDP'),
    ('94035000', 'móveis de quarto de madeira'),
    ('94035000', 'cama de madeira'),
    ('94035000', 'cama MDF/MDP'),
    ('94035000', 'cama de MDF/MDP'),
    ('94035000', 'cama em MDF/MDP'),
    ('94035000', 'cômoda de madeira'),
    ('94035000', 'cômoda MDF/MDP'),
    ('94035000', 'cômoda em MDF/MDP'),
    ('94035000', 'mesa de cabeceira'),
    ('94035000', 'mesa de cabeceira de madeira'),
    ('94035000', 'mesa de cabeceira MDF/MDP'),
    ('94035000', 'mesa de cabeceira em MDF/MDP'),
    ('94035000', 'criado-mudo'),
    ('94035000', 'criado mudo'),
    ('94035000', 'criado-mudo MDF/MDP'),
    ('94035000', 'criado-mudo em MDF/MDP'),

    ('94036000', 'outros móveis de madeira'),
    ('94036000', 'rack de madeira'),
    ('94036000', 'rack para TV de madeira'),
    ('94036000', 'rack MDF/MDP'),
    ('94036000', 'rack para TV MDF/MDP'),
    ('94036000', 'painel para TV de madeira'),
    ('94036000', 'estante de madeira'),
    ('94036000', 'estante MDF/MDP'),
    ('94036000', 'mesa de centro de madeira'),
    ('94036000', 'mesa de jantar de madeira'),
    ('94036000', 'mesa lateral de madeira'),
    ('94036000', 'aparador de madeira'),
    ('94036000', 'aparador MDF/MDP'),
    ('94036000', 'buffet de sala de madeira'),
    ('94036000', 'móvel de sala de madeira'),
    ('94036000', 'móveis de madeira para sala'),

    ('94032090', 'outros móveis de metal'),
    ('94032090', 'móveis metálicos'),
    ('94032090', 'armário de aço'),
    ('94032090', 'armário de metal'),
    ('94032090', 'estante de aço'),
    ('94032090', 'estante de metal'),
    ('94032090', 'mesa de metal'),
    ('94032090', 'mesa de aço'),
    ('94032090', 'móvel de aço'),
    ('94032090', 'prateleira metálica'),
    ('94032090', 'prateleira de aço'),
    ('94032090', 'roupeiro de aço'),

    ('94016100', 'assento estofado com armação de madeira'),
    ('94016100', 'cadeira estofada com armação de madeira'),
    ('94016100', 'cadeira estofada com estrutura de madeira'),
    ('94016100', 'poltrona estofada com armação de madeira'),
    ('94016100', 'poltrona estofada com estrutura de madeira'),
    ('94016100', 'sofá estofado com armação de madeira'),
    ('94016100', 'sofá estofado com estrutura de madeira'),
    ('94016100', 'puff de madeira'),
    ('94016100', 'pufe de madeira'),
    ('94016100', 'puff com estrutura de madeira'),
    ('94016100', 'pufe com estrutura de madeira'),
    ('94016100', 'puff com armação de madeira'),
    ('94016100', 'pufe com armação de madeira'),

    ('94016900', 'outros assentos com armação de madeira'),
    ('94016900', 'cadeira de madeira sem estofado'),
    ('94016900', 'cadeira sem estofado com estrutura de madeira'),
    ('94016900', 'banco de madeira sem estofado'),
    ('94016900', 'banqueta de madeira sem estofado'),
    ('94016900', 'assento de madeira sem estofado'),

    ('94017100', 'assento estofado com armação de metal'),
    ('94017100', 'cadeira estofada com armação de metal'),
    ('94017100', 'cadeira estofada com estrutura metálica'),
    ('94017100', 'poltrona estofada com estrutura metálica'),
    ('94017100', 'poltrona estofada de metal'),
    ('94017100', 'sofá estofado com estrutura metálica'),
    ('94017100', 'banco estofado com estrutura metálica'),

    ('94017900', 'outros assentos com armação de metal'),
    ('94017900', 'cadeira de metal sem estofado'),
    ('94017900', 'cadeira sem estofado com estrutura metálica'),
    ('94017900', 'banco de metal sem estofado'),
    ('94017900', 'banqueta de metal sem estofado'),
    ('94017900', 'assento de metal sem estofado'),

    ('94041000', 'suporte para cama'),
    ('94041000', 'suporte para colchão'),
    ('94041000', 'somiê'),
    ('94041000', 'somiê para cama'),
    ('94041000', 'sommier'),
    ('94041000', 'somier'),
    ('94041000', 'base para colchão'),
    ('94041000', 'base box'),

    ('94042100', 'colchão de espuma'),
    ('94042100', 'colchão de espuma de poliuretano'),
    ('94042100', 'colchão de poliuretano alveolar'),
    ('94042100', 'colchão de látex alveolar'),
    ('94042100', 'colchão de borracha alveolar'),
    ('94042100', 'colchão de plástico alveolar'),

    ('94042900', 'colchão de outras matérias'),
    ('94042900', 'colchão de molas'),
    ('94042900', 'colchão de mola ensacada'),
    ('94042900', 'colchão de molas ensacadas'),
    ('94042900', 'colchão de molas bonnel'),
    ('94042900', 'colchão não alveolar'),

    ('94049000', 'outros artigos de cama e semelhantes'),
    ('94049000', 'travesseiro'),
    ('94049000', 'travesseiros'),
    ('94049000', 'almofada com enchimento'),
    ('94049000', 'edredom'),
    ('94049000', 'edredom de cama'),
    ('94049000', 'colcha acolchoada'),
    ('94049000', 'manta acolchoada'),

    ('73241000', 'pia de aço inoxidável'),
    ('73241000', 'pia inox'),
    ('73241000', 'pia de cozinha inox'),
    ('73241000', 'cuba de inox'),
    ('73241000', 'cuba de aço inoxidável'),
    ('73241000', 'lavatório de aço inox'),
    ('73241000', 'lavatório inox')
) AS aliases(ncm_code, term)
JOIN public.ncms AS n ON n.code = aliases.ncm_code
WHERE n.active = true
  AND n.is_active = true
  AND COALESCE(n.start_date, '-infinity'::date) <= current_date
  AND COALESCE(n.end_date, 'infinity'::date) >= current_date
ON CONFLICT (ncm_code, term)
DO NOTHING;

CREATE OR REPLACE FUNCTION public.list_ncm_catalog_for_admin(
  p_search text DEFAULT '', p_store_filter text DEFAULT 'active',
  p_filter text DEFAULT 'all', p_limit integer DEFAULT 30, p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_search text := NULLIF(trim(regexp_replace(COALESCE(p_search, ''), '[[:space:]]+', ' ', 'g')), '');
  v_code_search text := regexp_replace(COALESCE(v_search, ''), '[^0-9]', '', 'g');
BEGIN
  WITH catalog AS (
    SELECT n.code, n.official_description, n.active, n.is_active, n.start_date, n.end_date,
      n.legal_act, n.first_seen_at, n.last_seen_at, n.changed_at,
      count(p.id)::integer AS product_count, false AS is_unverified
    FROM public.ncms n
    LEFT JOIN public.products p
      ON regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g') = n.code
      AND COALESCE(p.deleted, false) = false
    GROUP BY n.code
    UNION ALL
    SELECT regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g'),
      'Código ausente da base vigente; consulte o histórico oficial antes de classificar.'::text,
      false, false, NULL::date, NULL::date, NULL::text, NULL::timestamptz, NULL::timestamptz,
      NULL::timestamptz, count(*)::integer, true
    FROM public.products p
    LEFT JOIN public.ncms n ON n.code = regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g')
    WHERE n.code IS NULL
      AND regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g') ~ '^[0-9]{8}$'
      AND COALESCE(p.deleted, false) = false
    GROUP BY regexp_replace(COALESCE(p.fiscal->>'ncm', ''), '[^0-9]', '', 'g')
  ), filtered AS (
    SELECT c.* FROM catalog c
    WHERE (
        v_search IS NULL
        OR (v_code_search <> '' AND c.code LIKE v_code_search || '%')
        OR public.immutable_unaccent(c.official_description) ILIKE '%' || public.immutable_unaccent(v_search) || '%'
        OR EXISTS (
          SELECT 1
          FROM public.ncm_aliases a
          WHERE a.ncm_code = c.code
            AND a.active = true
            AND NOT EXISTS (
              SELECT 1
              FROM regexp_split_to_table(v_search, '[[:space:]/]+') AS search_word(word)
              WHERE search_word.word <> ''
                AND public.immutable_unaccent(a.term) NOT ILIKE '%' || public.immutable_unaccent(search_word.word) || '%'
            )
        )
      )
      AND CASE p_store_filter
        WHEN 'active' THEN c.is_active AND NOT c.is_unverified
        WHEN 'inactive' THEN NOT c.is_active AND NOT c.is_unverified
        ELSE true
      END
      AND CASE p_filter
        WHEN 'vigentes' THEN c.active AND NOT c.is_unverified
        WHEN 'encerrados' THEN c.active = false AND NOT c.is_unverified AND COALESCE(c.start_date, '-infinity'::date) <= current_date
        WHEN 'futuros' THEN COALESCE(c.start_date, '-infinity'::date) > current_date
        WHEN 'alterados' THEN NOT c.is_unverified AND c.changed_at >= now() - interval '30 days'
        WHEN 'com_produtos' THEN c.product_count > 0
        WHEN 'revisar' THEN c.is_unverified OR (c.active = false AND COALESCE(c.start_date, '-infinity'::date) <= current_date AND c.product_count > 0)
        ELSE true
      END
  ), page AS (
    SELECT * FROM filtered ORDER BY
      CASE WHEN is_unverified OR (active = false AND product_count > 0) THEN 0 ELSE 1 END,
      code
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT jsonb_build_object('items', COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page), '[]'::jsonb),
    'total', (SELECT count(*) FROM filtered)) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.list_ncm_catalog_for_admin(text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_ncm_catalog_for_admin(text, text, text, integer, integer) TO authenticated;
