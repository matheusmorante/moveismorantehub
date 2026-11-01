BEGIN;

-- Busca os textos do catálogo com e sem diacríticos, mantendo ranking e limites.
CREATE OR REPLACE FUNCTION public.search_catalog_shallow(p_query text, p_limit integer DEFAULT 15)
 RETURNS TABLE(key text, entity_type text, product_id uuid, variation_id uuid, composition_id uuid, composition_variation_id uuid, parent_name text, variation_name text, display_name text, code text, sku text, category text, unit_price numeric, cost_price numeric, match_score integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_normalized text;
BEGIN
    v_normalized := replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_');

    v_normalized := public.immutable_unaccent(v_normalized);
    RETURN QUERY
    WITH prod_matches AS (
        SELECT 
            'p-' || p.id::text as key,
            'product' as entity_type,
            p.id as product_id,
            NULL::uuid as variation_id,
            NULL::uuid as composition_id,
            NULL::uuid as composition_variation_id,
            p.name as parent_name,
            NULL::text as variation_name,
            p.name as display_name,
            p.code,
            p.code as sku,
            p.category,
            COALESCE(p.unit_price, 0) as unit_price,
            COALESCE(p.cost_price, 0) as cost_price,
            CASE WHEN public.immutable_unaccent(p.name) ILIKE v_normalized ESCAPE '\' THEN 1 ELSE 3 END as match_score
        FROM products p
        WHERE p.active = true AND p.deleted = false AND p.is_draft = false
        -- Se possui qualquer variação cadastrada, o pai nunca é selecionável diretamente
        AND NOT EXISTS (SELECT 1 FROM product_variations pv WHERE pv.product_id = p.id)
        AND (
            public.immutable_unaccent(p.name) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(p.code) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(p.category) ILIKE '%' || v_normalized || '%' ESCAPE '\'
        )
    ),
    prod_var_matches AS (
        SELECT 
            'v-' || pv.id::text || '-' || p.id::text as key,
            'product_variation' as entity_type,
            p.id as product_id,
            pv.id as variation_id,
            NULL::uuid as composition_id,
            NULL::uuid as composition_variation_id,
            p.name as parent_name,
            pv.name as variation_name,
            p.name || ' - ' || pv.name as display_name,
            p.code,
            pv.sku,
            p.category,
            COALESCE(pv.price, p.unit_price, 0) as unit_price,
            COALESCE(pv.cost_price, p.cost_price, 0) as cost_price,
            CASE WHEN public.immutable_unaccent(p.name) ILIKE v_normalized ESCAPE '\' OR public.immutable_unaccent(pv.name) ILIKE v_normalized ESCAPE '\' THEN 2 ELSE 4 END as match_score
        FROM products p
        JOIN product_variations pv ON pv.product_id = p.id
        WHERE p.active = true AND p.deleted = false AND p.is_draft = false AND pv.active = true
        AND (
            public.immutable_unaccent(p.name) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(p.code) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(p.category) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(pv.name) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(pv.sku) ILIKE '%' || v_normalized || '%' ESCAPE '\'
        )
    ),
    comp_matches AS (
        SELECT 
            'comp-' || c.id::text as key,
            'composition' as entity_type,
            NULL::uuid as product_id,
            NULL::uuid as variation_id,
            c.id as composition_id,
            NULL::uuid as composition_variation_id,
            c.name as parent_name,
            NULL::text as variation_name,
            c.name as display_name,
            COALESCE(c.sku, 'COMP') as code,
            c.sku,
            'Composição' as category,
            COALESCE(c.manual_price, 0) as unit_price,
            0::numeric as cost_price,
            CASE WHEN public.immutable_unaccent(c.name) ILIKE v_normalized ESCAPE '\' THEN 1 ELSE 3 END as match_score
        FROM compositions c
        WHERE c.active = true
        -- Se possui qualquer variação cadastrada, o pai nunca é selecionável diretamente
        AND NOT EXISTS (SELECT 1 FROM composition_variations cv WHERE cv.composition_id = c.id)
        AND (
            public.immutable_unaccent(c.name) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(c.sku) ILIKE '%' || v_normalized || '%' ESCAPE '\'
        )
    ),
    comp_var_matches AS (
        SELECT 
            'comp-v-' || cv.id::text || '-' || c.id::text as key,
            'composition_variation' as entity_type,
            NULL::uuid as product_id,
            NULL::uuid as variation_id,
            c.id as composition_id,
            cv.id as composition_variation_id,
            c.name as parent_name,
            cv.name as variation_name,
            c.name || ' - ' || cv.name as display_name,
            COALESCE(c.sku, 'COMP') as code,
            cv.sku,
            'Composição' as category,
            COALESCE(c.manual_price, 0) as unit_price,
            0::numeric as cost_price,
            CASE WHEN public.immutable_unaccent(c.name) ILIKE v_normalized ESCAPE '\' OR public.immutable_unaccent(cv.name) ILIKE v_normalized ESCAPE '\' THEN 2 ELSE 4 END as match_score
        FROM compositions c
        JOIN composition_variations cv ON cv.composition_id = c.id
        WHERE c.active = true AND cv.active = true
        AND (
            public.immutable_unaccent(c.name) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(c.sku) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(cv.name) ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR public.immutable_unaccent(cv.sku) ILIKE '%' || v_normalized || '%' ESCAPE '\'
        )
    )
    SELECT 
        combined.key,
        combined.entity_type,
        combined.product_id,
        combined.variation_id,
        combined.composition_id,
        combined.composition_variation_id,
        combined.parent_name,
        combined.variation_name,
        combined.display_name,
        combined.code,
        combined.sku,
        combined.category,
        combined.unit_price,
        combined.cost_price,
        combined.match_score
    FROM (
        SELECT * FROM prod_matches
        UNION ALL
        SELECT * FROM prod_var_matches
        UNION ALL
        SELECT * FROM comp_matches
        UNION ALL
        SELECT * FROM comp_var_matches
    ) combined
    ORDER BY combined.match_score, combined.display_name
    LIMIT p_limit;
END;
$function$;

-- Mantém as verificações de permissão e a busca numérica da central de atendimento.
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
      public.immutable_unaccent(person.full_name) ILIKE '%' || public.immutable_unaccent(v_search) || '%'
      OR (length(v_digits) >= 3 AND (
        regexp_replace(COALESCE(person.cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE '%' || v_digits || '%'
        OR regexp_replace(COALESCE(person.phone, ''), '[^0-9]', '', 'g') LIKE '%' || v_digits || '%'
      ))
    )
  ORDER BY person.full_name
  LIMIT 15;
END;
$function$;

COMMIT;

