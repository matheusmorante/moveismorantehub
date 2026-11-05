-- Preserve the storefront price range before counting/paging; no client filtering.
-- Register pg_trgm user parameters before preserving the existing function setting.
SELECT public.similarity('morante','morante');
CREATE OR REPLACE FUNCTION public.search_catalog_product_page(p_search text, p_category_ids uuid[] DEFAULT NULL::uuid[], p_environment_category_ids uuid[] DEFAULT NULL::uuid[], p_type text DEFAULT 'all'::text, p_min_price numeric DEFAULT 0, p_max_price numeric DEFAULT 10000, p_page integer DEFAULT 1, p_page_size integer DEFAULT 15, p_sort_by text DEFAULT 'newest'::text)
 RETURNS TABLE(product_id uuid, match_rank integer, match_score real, matched_terms integer, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
 SET "pg_trgm.word_similarity_threshold" TO '0.45'
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
        false /* Keep default storefront price bounds on the server. */
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

-- Public storefront read model; the product detail keeps its complete projection.
CREATE OR REPLACE FUNCTION public.catalog_product_card_page(
  p_search text DEFAULT '', p_category_ids uuid[] DEFAULT NULL,
  p_environment_category_ids uuid[] DEFAULT NULL, p_type text DEFAULT 'all',
  p_min_price numeric DEFAULT 0, p_max_price numeric DEFAULT 10000,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 15, p_sort_by text DEFAULT 'newest'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  ids uuid[]; total bigint; cards jsonb;
  page_size integer := least(greatest(coalesce(p_page_size,15),1),30);
BEGIN
  IF nullif(btrim(p_search),'') IS NOT NULL THEN
    SELECT array_agg(s.product_id ORDER BY s.ordinality), coalesce(max(s.total_count),0)
    INTO ids,total
    FROM public.search_catalog_product_page(p_search,p_category_ids,p_environment_category_ids,
      p_type,p_min_price,p_max_price,p_page,page_size,p_sort_by) WITH ORDINALITY s;
    IF ids IS NULL AND coalesce(p_page,1)>1 THEN
      SELECT coalesce(max(s.total_count),0) INTO total FROM public.search_catalog_product_page(
        p_search,p_category_ids,p_environment_category_ids,p_type,p_min_price,p_max_price,1,1,p_sort_by) s;
    END IF;
  ELSE
    WITH eligible AS (
      SELECT p.id,p.name,p.created_at,coalesce(nullif(p.promo_price,0),p.price) effective_price
      FROM public.products p
      WHERE p.status='published' AND p.deleted_at IS NULL
        AND (NOT EXISTS(SELECT 1 FROM public.product_variations v WHERE v.product_id=p.id)
          OR EXISTS(SELECT 1 FROM public.product_variations v WHERE v.product_id=p.id AND v.status='published'))
        AND (coalesce(cardinality(p_category_ids),0)=0 OR EXISTS(SELECT 1 FROM public.product_categories c WHERE c.product_id=p.id AND c.category_id=ANY(p_category_ids)))
        AND (coalesce(cardinality(p_environment_category_ids),0)=0 OR EXISTS(SELECT 1 FROM public.product_categories c WHERE c.product_id=p.id AND c.category_id=ANY(p_environment_category_ids)))
        AND (coalesce(p_type,'all')='all' OR (p_type='salvados' AND p.is_salvado IS TRUE)
          OR (p_type='promotion' AND p.promo_price IS NOT NULL)
          OR (p_type NOT IN ('salvados','promotion') AND p.opportunity_id::text=p_type))
        AND (false
          OR (NOT EXISTS(SELECT 1 FROM public.product_variations v WHERE v.product_id=p.id)
            AND coalesce(nullif(p.promo_price,0),p.price) BETWEEN coalesce(p_min_price,0) AND coalesce(p_max_price,10000))
          OR EXISTS(SELECT 1 FROM public.product_variations v WHERE v.product_id=p.id AND v.status='published'
            AND coalesce(CASE WHEN v.use_parent_promo_price IS FALSE AND nullif(v.promo_price,0) IS NOT NULL THEN v.promo_price ELSE nullif(p.promo_price,0) END,
              CASE WHEN v.use_parent_price IS FALSE AND nullif(v.price,0) IS NOT NULL THEN v.price ELSE nullif(p.price,0) END)
              BETWEEN coalesce(p_min_price,0) AND coalesce(p_max_price,10000)))
    ), ordered AS (
      SELECT e.*,row_number() OVER(ORDER BY
        CASE WHEN p_sort_by='price-asc' THEN effective_price END ASC NULLS LAST,
        CASE WHEN p_sort_by='price-desc' THEN effective_price END DESC NULLS LAST,
        CASE WHEN p_sort_by='title-asc' THEN name END ASC NULLS LAST,created_at DESC,id) position
      FROM eligible e
    )
    SELECT array_agg(id ORDER BY position) FILTER(WHERE position>(greatest(coalesce(p_page,1),1)-1)::bigint*page_size AND position<=greatest(coalesce(p_page,1),1)::bigint*page_size),count(*)
    INTO ids,total FROM ordered;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.name,'slug',p.slug,'code',p.code,'price',p.price,'promo_price',p.promo_price,
    'status',p.status,'is_salvado',p.is_salvado,'opportunity_id',p.opportunity_id,
    'product_images',coalesce((SELECT jsonb_agg(jsonb_build_object('image_url',i.image_url,'is_main',i.is_main)) FROM
      (SELECT image_url,is_main FROM public.product_images WHERE product_id=p.id ORDER BY is_main DESC NULLS LAST,created_at,id LIMIT 1) i),'[]'::jsonb),
    'product_variations',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id',v.id,'name',v.name,'sku',v.sku,'price',v.price,'promo_price',v.promo_price,
      'image_url',split_part(v.image_url,',',1),'attributes',v.attributes,'use_parent_name',v.use_parent_name,
      'use_parent_price',v.use_parent_price,'use_parent_promo_price',v.use_parent_promo_price,'status',v.status
    ) ORDER BY v.created_at,v.id) FROM public.product_variations v WHERE v.product_id=p.id AND v.status='published'
      AND coalesce(CASE WHEN v.use_parent_promo_price IS FALSE AND nullif(v.promo_price,0) IS NOT NULL THEN v.promo_price ELSE nullif(p.promo_price,0) END,
        CASE WHEN v.use_parent_price IS FALSE AND nullif(v.price,0) IS NOT NULL THEN v.price ELSE nullif(p.price,0) END)
        BETWEEN coalesce(p_min_price,0) AND coalesce(p_max_price,10000)),'[]'::jsonb),
    'product_categories',coalesce((SELECT jsonb_agg(jsonb_build_object('category_id',c.category_id,'categories',jsonb_build_object('name',cat.name))) FROM public.product_categories c JOIN public.categories cat ON cat.id=c.category_id WHERE c.product_id=p.id),'[]'::jsonb),
    'opportunities',(SELECT jsonb_build_object('name',o.name,'slug',o.slug,'badge_color',o.badge_color,'border_color',o.border_color,'border_style',o.border_style,'badge_animation',o.badge_animation,'title_color',o.title_color) FROM public.opportunities o WHERE o.id=p.opportunity_id)
  ) ORDER BY array_position(ids,p.id)),'[]'::jsonb) INTO cards
  FROM public.products p WHERE p.id=ANY(ids) AND p.status='published' AND p.deleted_at IS NULL;
  RETURN jsonb_build_object('products',cards,'total',total);
END;
$$;
REVOKE ALL ON FUNCTION public.catalog_product_card_page(text,uuid[],uuid[],text,numeric,numeric,integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_product_card_page(text,uuid[],uuid[],text,numeric,numeric,integer,integer,text) TO anon,authenticated,service_role;
COMMENT ON FUNCTION public.catalog_product_card_page(text,uuid[],uuid[],text,numeric,numeric,integer,integer,text) IS 'Public cards only: visibility and filters before count/page; one parent image; no descriptions or private variations. Invoker RLS.';


