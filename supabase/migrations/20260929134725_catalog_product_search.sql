-- Busca tolerante para o Catálogo Digital. Extensões já existentes são mantidas.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.normalize_catalog_search(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = public, pg_temp
AS $function$
  SELECT trim(
    regexp_replace(
      regexp_replace(
        public.immutable_unaccent(lower(p_value)),
        '[^[:alnum:]]+',
        ' ',
        'g'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.normalize_catalog_search(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_catalog_search(text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.catalog_search_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_term text NOT NULL,
  canonical_term text NOT NULL,
  normalized_alias text GENERATED ALWAYS AS (public.normalize_catalog_search(alias_term)) STORED UNIQUE,
  normalized_canonical text GENERATED ALWAYS AS (public.normalize_catalog_search(canonical_term)) STORED,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_search_aliases_alias_not_blank CHECK (normalized_alias <> ''),
  CONSTRAINT catalog_search_aliases_canonical_not_blank CHECK (normalized_canonical <> '')
);

ALTER TABLE public.catalog_search_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalog_search_aliases_public_read ON public.catalog_search_aliases;
CREATE POLICY catalog_search_aliases_public_read
  ON public.catalog_search_aliases
  FOR SELECT
  TO anon, authenticated
  USING (active);
REVOKE ALL ON TABLE public.catalog_search_aliases FROM PUBLIC;
GRANT SELECT ON TABLE public.catalog_search_aliases TO anon, authenticated;

INSERT INTO public.catalog_search_aliases (alias_term, canonical_term)
VALUES
  ('guarda-roupa', 'guarda-roupa'),
  ('guardaroupa', 'guarda-roupa'),
  ('roupeiro', 'guarda-roupa'),
  ('roupeiros', 'guarda-roupa'),
  ('armário de quarto', 'guarda-roupa'),
  ('sofá', 'sofá'),
  ('sofás', 'sofá'),
  ('cômoda', 'cômoda'),
  ('cômodas', 'cômoda'),
  ('rack para tv', 'rack'),
  ('painel para tv', 'painel')
ON CONFLICT (normalized_alias) DO UPDATE
SET canonical_term = EXCLUDED.canonical_term,
    active = true;

-- Índice na expressão usada pela RPC para buscar títulos de produtos.
CREATE INDEX IF NOT EXISTS idx_products_catalog_search_name_trgm
  ON public.products USING gin (public.normalize_catalog_search(name) gin_trgm_ops)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.search_catalog_product_page(
  p_search text,
  p_category_ids uuid[] DEFAULT NULL,
  p_environment_category_ids uuid[] DEFAULT NULL,
  p_type text DEFAULT 'all',
  p_min_price numeric DEFAULT 0,
  p_max_price numeric DEFAULT 10000,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 15,
  p_sort_by text DEFAULT 'newest'
)
RETURNS TABLE (
  product_id uuid,
  match_rank integer,
  match_score real,
  matched_terms integer,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
SET pg_trgm.word_similarity_threshold = '0.45'
AS $function$
  WITH
  input AS (
    SELECT public.normalize_catalog_search(p_search) AS query
  ),
  variants AS (
    SELECT input.query AS query, false AS is_alias
    FROM input
    WHERE char_length(input.query) >= 3

    UNION

    SELECT alias.normalized_canonical, true
    FROM input
    JOIN public.catalog_search_aliases alias
      ON alias.active
     AND alias.normalized_alias = input.query

    UNION

    SELECT alias.normalized_alias, true
    FROM input
    JOIN public.catalog_search_aliases alias
      ON alias.active
     AND alias.normalized_canonical = input.query
  ),
  variant_tokens AS (
    SELECT DISTINCT variants.query, variants.is_alias, token.value AS token
    FROM variants
    CROSS JOIN LATERAL regexp_split_to_table(variants.query, '[[:space:]]+') AS token(value)
    WHERE char_length(token.value) >= 3
      AND token.value NOT IN ('de', 'da', 'do', 'dos', 'das', 'para', 'com', 'em', 'e')
  ),
  search_terms AS (
    SELECT variants.query AS variant, variants.is_alias, variants.query AS term, true AS is_phrase
    FROM variants

    UNION

    SELECT variant_tokens.query, variant_tokens.is_alias, variant_tokens.token, false
    FROM variant_tokens
  ),
  params AS (
    SELECT
      greatest(coalesce(p_page, 1), 1)::bigint AS page,
      least(greatest(coalesce(p_page_size, 15), 1), 30)::bigint AS page_size,
      coalesce(p_sort_by, 'newest') AS sort_by
  ),
  eligible_products AS NOT MATERIALIZED (
    SELECT p.id, p.name, p.price, p.promo_price,
           coalesce(nullif(p.promo_price, 0), p.price) AS effective_price,
           p.is_salvado, p.opportunity_id, p.created_at
    FROM public.products p
    WHERE p.status = 'published'
      AND p.deleted_at IS NULL
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.product_variations pv_any WHERE pv_any.product_id = p.id
        )
        OR EXISTS (
          SELECT 1 FROM public.product_variations pv_public
          WHERE pv_public.product_id = p.id AND pv_public.status = 'published'
        )
      )
      AND (
        coalesce(cardinality(p_category_ids), 0) = 0
        OR EXISTS (
          SELECT 1 FROM public.product_categories pc
          WHERE pc.product_id = p.id AND pc.category_id = ANY (p_category_ids)
        )
      )
      AND (
        coalesce(cardinality(p_environment_category_ids), 0) = 0
        OR EXISTS (
          SELECT 1 FROM public.product_categories pc
          WHERE pc.product_id = p.id AND pc.category_id = ANY (p_environment_category_ids)
        )
      )
      AND (
        coalesce(p_type, 'all') = 'all'
        OR (p_type = 'salvados' AND p.is_salvado IS TRUE)
        OR (p_type = 'promotion' AND p.promo_price IS NOT NULL)
        OR (p_type NOT IN ('salvados', 'promotion') AND p.opportunity_id::text = p_type)
      )
      AND (
        (coalesce(p_min_price, 0) <= 0 AND coalesce(p_max_price, 10000) >= 10000)
        OR (
          NOT EXISTS (
            SELECT 1 FROM public.product_variations pv_any WHERE pv_any.product_id = p.id
          )
          AND coalesce(nullif(p.promo_price, 0), p.price)
            BETWEEN coalesce(p_min_price, 0) AND coalesce(p_max_price, 10000)
        )
        OR EXISTS (
          SELECT 1
          FROM public.product_variations pv_price
          WHERE pv_price.product_id = p.id
            AND pv_price.status = 'published'
            AND coalesce(
              CASE
                WHEN pv_price.use_parent_promo_price IS FALSE AND nullif(pv_price.promo_price, 0) IS NOT NULL
                  THEN pv_price.promo_price
                ELSE nullif(p.promo_price, 0)
              END,
              CASE
                WHEN pv_price.use_parent_price IS FALSE AND nullif(pv_price.price, 0) IS NOT NULL
                  THEN pv_price.price
                ELSE nullif(p.price, 0)
              END
            ) BETWEEN coalesce(p_min_price, 0) AND coalesce(p_max_price, 10000)
        )
      )
  ),
  raw_hits AS (
    SELECT ep.id AS product_id, st.variant, st.is_alias, st.term, st.is_phrase,
           'name'::text AS source, public.normalize_catalog_search(ep.name) AS field_value
    FROM eligible_products ep
    CROSS JOIN search_terms st
    WHERE public.normalize_catalog_search(ep.name) = st.term
       OR public.normalize_catalog_search(ep.name) LIKE st.term || '%'
       OR public.normalize_catalog_search(ep.name) LIKE '%' || st.term || '%'
       OR (st.term !~ '[[:space:]]' AND char_length(st.term) >= 4
           AND public.normalize_catalog_search(ep.name) %> st.term)

  ),
  typed_hits AS (
    SELECT raw_hits.*,
           CASE
             WHEN field_value = term THEN 0
             WHEN field_value LIKE term || '%' THEN 1
             WHEN field_value LIKE '%' || term || '%' THEN 2
             ELSE 4
           END AS hit_rank,
           CASE
             WHEN field_value = term THEN 1.0::real
             WHEN field_value LIKE term || '%' THEN 0.95::real
             WHEN field_value LIKE '%' || term || '%' THEN 0.85::real
             ELSE 0.0::real
           END AS direct_score
    FROM raw_hits
  ),
  valid_hits AS (
    SELECT typed_hits.*,
           CASE WHEN typed_hits.hit_rank < 4 THEN typed_hits.direct_score ELSE (
             SELECT max(similarity(typed_hits.term, word.value))::real
             FROM regexp_split_to_table(typed_hits.field_value, '[[:space:]]+') AS word(value)
             WHERE char_length(typed_hits.term) >= 4
               AND abs(char_length(typed_hits.term) - char_length(word.value)) <= 1
               AND similarity(typed_hits.term, word.value) >= CASE
                 WHEN char_length(typed_hits.term) = 4 THEN 0.30
                 WHEN char_length(typed_hits.term) = 5 THEN 0.40
                 ELSE 0.35
               END
           ) END AS hit_score
    FROM typed_hits
    WHERE typed_hits.hit_rank < 4
       OR (
         typed_hits.term !~ '[[:space:]]'
         AND EXISTS (
           SELECT 1
           FROM regexp_split_to_table(typed_hits.field_value, '[[:space:]]+') AS word(value)
           WHERE char_length(typed_hits.term) >= 4
             AND abs(char_length(typed_hits.term) - char_length(word.value)) <= 1
             AND similarity(typed_hits.term, word.value) >= CASE
               WHEN char_length(typed_hits.term) = 4 THEN 0.30
               WHEN char_length(typed_hits.term) = 5 THEN 0.40
               ELSE 0.35
             END
         )
       )
  ),
  variant_scores AS (
    SELECT vh.product_id, vh.variant, vh.is_alias,
           count(DISTINCT vh.term) FILTER (WHERE NOT vh.is_phrase)::integer AS matched_terms,
           count(DISTINCT vt.token)::integer AS total_terms,
           bool_or(vh.source = 'name' AND vh.is_phrase AND vh.hit_rank = 0 AND NOT vh.is_alias) AS exact_name,
           bool_or(vh.source = 'name' AND vh.is_phrase AND vh.hit_rank = 1 AND NOT vh.is_alias) AS prefix_name,
           bool_or(vh.source = 'name' AND vh.is_phrase AND vh.hit_rank = 2 AND NOT vh.is_alias) AS partial_name,
           bool_or(vh.is_alias AND vh.hit_rank < 4) AS alias_match,
           bool_or(vh.hit_rank = 4) AS fuzzy_match,
           max(vh.hit_score)::real AS score
    FROM valid_hits vh
    JOIN variant_tokens vt ON vt.query = vh.variant AND vt.is_alias = vh.is_alias
    GROUP BY vh.product_id, vh.variant, vh.is_alias
  ),
  product_scores AS (
    SELECT vs.product_id,
           CASE
             WHEN bool_or(vs.exact_name) THEN 0
             WHEN bool_or(vs.prefix_name) THEN 1
             WHEN bool_or(vs.partial_name) THEN 2
             WHEN bool_or(vs.alias_match) THEN 3
             WHEN bool_or(vs.fuzzy_match) THEN 4
             ELSE 5
           END AS rank,
           max(vs.score)::real AS score,
           max(vs.matched_terms)::integer AS matched_terms
    FROM variant_scores vs
    WHERE vs.matched_terms >= greatest(1, ceil(vs.total_terms / 2.0)::integer)
    GROUP BY vs.product_id
  ),
  ordered AS (
    SELECT ps.product_id, ps.rank, ps.score, ps.matched_terms,
           count(*) OVER () AS result_count,
           row_number() OVER (
             ORDER BY ps.rank ASC, ps.matched_terms DESC, ps.score DESC,
               CASE WHEN (SELECT sort_by FROM params) = 'price-asc' THEN ep.effective_price END ASC NULLS LAST,
               CASE WHEN (SELECT sort_by FROM params) = 'price-desc' THEN ep.effective_price END DESC NULLS LAST,
               CASE WHEN (SELECT sort_by FROM params) = 'title-asc' THEN ep.name END ASC NULLS LAST,
               ep.created_at DESC,
               ps.product_id
           ) AS row_number
    FROM product_scores ps
    JOIN eligible_products ep ON ep.id = ps.product_id
  )
  SELECT ordered.product_id, ordered.rank, ordered.score, ordered.matched_terms, ordered.result_count
  FROM ordered
  CROSS JOIN params
  WHERE ordered.row_number > (params.page - 1) * params.page_size
    AND ordered.row_number <= params.page * params.page_size
  ORDER BY ordered.row_number;
$function$;

REVOKE ALL ON FUNCTION public.search_catalog_product_page(text, uuid[], uuid[], text, numeric, numeric, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_catalog_product_page(text, uuid[], uuid[], text, numeric, numeric, integer, integer, text) TO anon, authenticated;
