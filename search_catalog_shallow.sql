DROP FUNCTION IF EXISTS search_catalog_shallow(text, integer);

CREATE OR REPLACE FUNCTION search_catalog_shallow(p_query text, p_limit int DEFAULT 15)
RETURNS TABLE (
    key text,
    entity_type text,
    product_id uuid,
    variation_id uuid,
    composition_id uuid,
    composition_variation_id uuid,
    parent_name text,
    variation_name text,
    display_name text,
    code text,
    sku text,
    category text,
    unit_price numeric,
    cost_price numeric,
    match_score integer
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_normalized text;
BEGIN
    v_normalized := replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_');

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
            CASE WHEN p.name ILIKE v_normalized ESCAPE '\' THEN 1 ELSE 3 END as match_score
        FROM products p
        WHERE p.active = true AND p.deleted = false AND p.is_draft = false
        -- Se possui qualquer variação cadastrada, o pai nunca é selecionável diretamente
        AND NOT EXISTS (SELECT 1 FROM product_variations pv WHERE pv.product_id = p.id)
        AND (
            p.name ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR p.code ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR p.category ILIKE '%' || v_normalized || '%' ESCAPE '\'
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
            CASE WHEN p.name ILIKE v_normalized ESCAPE '\' OR pv.name ILIKE v_normalized ESCAPE '\' THEN 2 ELSE 4 END as match_score
        FROM products p
        JOIN product_variations pv ON pv.product_id = p.id
        WHERE p.active = true AND p.deleted = false AND p.is_draft = false AND pv.active = true
        AND (
            p.name ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR p.code ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR p.category ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR pv.name ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR pv.sku ILIKE '%' || v_normalized || '%' ESCAPE '\'
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
            CASE WHEN c.name ILIKE v_normalized ESCAPE '\' THEN 1 ELSE 3 END as match_score
        FROM compositions c
        WHERE c.active = true
        -- Se possui qualquer variação cadastrada, o pai nunca é selecionável diretamente
        AND NOT EXISTS (SELECT 1 FROM composition_variations cv WHERE cv.composition_id = c.id)
        AND (
            c.name ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR c.sku ILIKE '%' || v_normalized || '%' ESCAPE '\'
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
            CASE WHEN c.name ILIKE v_normalized ESCAPE '\' OR cv.name ILIKE v_normalized ESCAPE '\' THEN 2 ELSE 4 END as match_score
        FROM compositions c
        JOIN composition_variations cv ON cv.composition_id = c.id
        WHERE c.active = true AND cv.active = true
        AND (
            c.name ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR c.sku ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR cv.name ILIKE '%' || v_normalized || '%' ESCAPE '\'
            OR cv.sku ILIKE '%' || v_normalized || '%' ESCAPE '\'
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
$$;
