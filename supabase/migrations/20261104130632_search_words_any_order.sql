-- Mantém a assinatura, permissões, elegibilidade e ordenação da busca existente.
CREATE OR REPLACE FUNCTION public.search_catalog_shallow(p_query text, p_limit integer DEFAULT 15)
RETURNS TABLE(key text, entity_type text, product_id uuid, variation_id uuid, composition_id uuid, composition_variation_id uuid, parent_name text, variation_name text, display_name text, code text, sku text, category text, unit_price numeric, cost_price numeric, match_score integer)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    v_normalized text;
    v_words text[];
    v_anchor text;
BEGIN
    v_normalized := replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_');
    v_normalized := public.immutable_unaccent(v_normalized);
    IF v_normalized IS NULL THEN RETURN; END IF;
    v_words := CASE WHEN btrim(v_normalized) = '' THEN ARRAY[v_normalized]
                    ELSE regexp_split_to_array(btrim(v_normalized), '\s+') END;
    SELECT word INTO v_anchor FROM unnest(v_words) AS word ORDER BY length(word) DESC LIMIT 1;

    RETURN QUERY
    WITH prod_matches AS (
        SELECT
            'p-' || p.id::text AS key,
            'product' AS entity_type,
            p.id AS product_id,
            NULL::uuid AS variation_id,
            NULL::uuid AS composition_id,
            NULL::uuid AS composition_variation_id,
            p.name AS parent_name,
            NULL::text AS variation_name,
            p.name AS display_name,
            p.code,
            p.code AS sku,
            p.category,
            COALESCE(p.unit_price, 0) AS unit_price,
            COALESCE(p.cost_price, 0) AS cost_price,
            CASE WHEN public.immutable_unaccent(p.name) ILIKE v_normalized ESCAPE '\' THEN 1 ELSE 3 END AS match_score,
            ARRAY[p.name, p.code, p.category] AS search_fields
        FROM public.products p
        WHERE p.active = true AND p.deleted = false AND p.is_draft = false
          AND NOT EXISTS (SELECT 1 FROM public.product_variations pv WHERE pv.product_id = p.id)
          AND (
            public.immutable_unaccent(p.name) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(p.code) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(p.category) ILIKE '%' || v_anchor || '%' ESCAPE '\'
          )
    ), prod_var_matches AS (
        SELECT
            'v-' || pv.id::text || '-' || p.id::text AS key,
            'product_variation' AS entity_type,
            p.id AS product_id,
            pv.id AS variation_id,
            NULL::uuid AS composition_id,
            NULL::uuid AS composition_variation_id,
            p.name AS parent_name,
            pv.name AS variation_name,
            p.name || ' - ' || pv.name AS display_name,
            p.code,
            pv.sku,
            p.category,
            COALESCE(pv.price, p.unit_price, 0) AS unit_price,
            COALESCE(pv.cost_price, p.cost_price, 0) AS cost_price,
            CASE WHEN public.immutable_unaccent(p.name) ILIKE v_normalized ESCAPE '\' OR public.immutable_unaccent(pv.name) ILIKE v_normalized ESCAPE '\' THEN 2 ELSE 4 END AS match_score,
            ARRAY[p.name, p.code, p.category, pv.name, pv.sku] AS search_fields
        FROM public.products p
        JOIN public.product_variations pv ON pv.product_id = p.id
        WHERE p.active = true AND p.deleted = false AND p.is_draft = false AND pv.active = true
          AND (
            public.immutable_unaccent(p.name) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(p.code) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(p.category) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(pv.name) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(pv.sku) ILIKE '%' || v_anchor || '%' ESCAPE '\'
          )
    ), comp_matches AS (
        SELECT
            'comp-' || c.id::text AS key,
            'composition' AS entity_type,
            NULL::uuid AS product_id,
            NULL::uuid AS variation_id,
            c.id AS composition_id,
            NULL::uuid AS composition_variation_id,
            c.name AS parent_name,
            NULL::text AS variation_name,
            c.name AS display_name,
            COALESCE(c.sku, 'COMP') AS code,
            c.sku,
            'Composição' AS category,
            COALESCE(c.manual_price, 0) AS unit_price,
            0::numeric AS cost_price,
            CASE WHEN public.immutable_unaccent(c.name) ILIKE v_normalized ESCAPE '\' THEN 1 ELSE 3 END AS match_score,
            ARRAY[c.name, c.sku] AS search_fields
        FROM public.compositions c
        WHERE c.active = true
          AND NOT EXISTS (SELECT 1 FROM public.composition_variations cv WHERE cv.composition_id = c.id)
          AND (
            public.immutable_unaccent(c.name) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(c.sku) ILIKE '%' || v_anchor || '%' ESCAPE '\'
          )
    ), comp_var_matches AS (
        SELECT
            'comp-v-' || cv.id::text || '-' || c.id::text AS key,
            'composition_variation' AS entity_type,
            NULL::uuid AS product_id,
            NULL::uuid AS variation_id,
            c.id AS composition_id,
            cv.id AS composition_variation_id,
            c.name AS parent_name,
            cv.name AS variation_name,
            c.name || ' - ' || cv.name AS display_name,
            COALESCE(c.sku, 'COMP') AS code,
            cv.sku,
            'Composição' AS category,
            COALESCE(c.manual_price, 0) AS unit_price,
            0::numeric AS cost_price,
            CASE WHEN public.immutable_unaccent(c.name) ILIKE v_normalized ESCAPE '\' OR public.immutable_unaccent(cv.name) ILIKE v_normalized ESCAPE '\' THEN 2 ELSE 4 END AS match_score,
            ARRAY[c.name, c.sku, cv.name, cv.sku] AS search_fields
        FROM public.compositions c
        JOIN public.composition_variations cv ON cv.composition_id = c.id
        WHERE c.active = true AND cv.active = true
          AND (
            public.immutable_unaccent(c.name) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(c.sku) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(cv.name) ILIKE '%' || v_anchor || '%' ESCAPE '\'
            OR public.immutable_unaccent(cv.sku) ILIKE '%' || v_anchor || '%' ESCAPE '\'
          )
    )
    SELECT combined.key, combined.entity_type, combined.product_id, combined.variation_id,
           combined.composition_id, combined.composition_variation_id, combined.parent_name,
           combined.variation_name, combined.display_name, combined.code, combined.sku,
           combined.category, combined.unit_price, combined.cost_price, combined.match_score
    FROM (
        SELECT * FROM prod_matches
        UNION ALL SELECT * FROM prod_var_matches
        UNION ALL SELECT * FROM comp_matches
        UNION ALL SELECT * FROM comp_var_matches
    ) combined
    WHERE cardinality(v_words) = 1 OR NOT EXISTS (
        SELECT 1 FROM unnest(v_words) AS word(value)
        WHERE NOT EXISTS (
            SELECT 1 FROM unnest(combined.search_fields) AS field(value)
            WHERE public.immutable_unaccent(field.value) ILIKE '%' || word.value || '%' ESCAPE '\'
        )
    )
    ORDER BY combined.match_score, combined.display_name
    LIMIT p_limit;
END;
$function$;

-- Mantém a autorização e a pesquisa numérica da central de atendimento.
CREATE OR REPLACE FUNCTION public.customer_support_search_customers(p_search text)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
SET statement_timeout TO '10s'
AS $function$
DECLARE
  v_search text := btrim(COALESCE(p_search, ''));
  v_digits text := CASE WHEN btrim(COALESCE(p_search, '')) ~ '^[+0-9[:space:]().-]+$' THEN regexp_replace(COALESCE(p_search, ''), '[^0-9]', '', 'g') ELSE '' END;
BEGIN
  IF NOT public.customer_support_can_view() OR NOT public.customer_support_can_view_commercial_info() THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF length(v_search) < 2 OR length(v_search) > 100 THEN
    RAISE EXCEPTION 'CUSTOMER_SUPPORT_CUSTOMER_SEARCH_INVALID' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT jsonb_build_object(
    'id', person.id,
    'full_name', person.full_name,
    'phone', person.phone,
    'cpf_cnpj', person.cpf_cnpj,
    'email', person.email,
    'address', person.address,
    'created_at', person.created_at,
    'active', person.active
  )
  FROM public.people AS person
  WHERE (person.deleted IS NULL OR person.deleted = false)
    AND (
      (person.full_name IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM regexp_split_to_table(v_search, '\s+') AS word(value)
        WHERE public.immutable_unaccent(person.full_name) NOT ILIKE '%' || public.immutable_unaccent(word.value) || '%'
      ))
      OR (length(v_digits) >= 3 AND (
        regexp_replace(COALESCE(person.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_digits || '%'
        OR regexp_replace(COALESCE(person.phone, ''), '[^0-9]', '', 'g') LIKE '%' || v_digits || '%'
      ))
    )
  ORDER BY person.full_name
  LIMIT 15;
END;
$function$;
