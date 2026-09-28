const fs = require('fs');
const { execSync } = require('child_process');

const sql = 
CREATE OR REPLACE FUNCTION search_catalog(p_query text, p_limit int DEFAULT 15)
RETURNS TABLE (
    key text,
    is_composition boolean,
    p jsonb,
    v jsonb,
    match_score integer
) LANGUAGE plpgsql STABLE AS \\$\\$
DECLARE
    v_normalized text;
BEGIN
    v_normalized := replace(replace(replace(p_query, '\\\\', '\\\\\\\\'), '%', '\\\\%'), '_', '\\\\_');

    RETURN QUERY
    WITH prod_matches AS (
        SELECT 
            'p-' || p.id::text as key,
            false as is_composition,
            to_jsonb(p.*) as p,
            NULL::jsonb as v,
            CASE WHEN p.name ILIKE v_normalized ESCAPE '\\\\' THEN 1 ELSE 3 END as match_score
        FROM products p
        WHERE p.active = true AND p.deleted = false AND p.is_draft = false
        AND NOT EXISTS (SELECT 1 FROM product_variations pv WHERE pv.product_id = p.id AND pv.active = true)
        AND (
            p.name ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR p.code ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR p.category ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
        )
    ),
    prod_var_matches AS (
        SELECT 
            'v-' || pv.id::text || '-' || p.id::text as key,
            false as is_composition,
            to_jsonb(p.*) as p,
            to_jsonb(pv.*) as v,
            CASE WHEN p.name ILIKE v_normalized ESCAPE '\\\\' OR pv.name ILIKE v_normalized ESCAPE '\\\\' THEN 2 ELSE 4 END as match_score
        FROM products p
        JOIN product_variations pv ON pv.product_id = p.id
        WHERE p.active = true AND p.deleted = false AND p.is_draft = false AND pv.active = true
        AND (
            p.name ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR p.code ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR p.category ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR pv.name ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR pv.sku ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
        )
    ),
    comp_matches AS (
        SELECT 
            'comp-' || c.id::text as key,
            true as is_composition,
            to_jsonb(c.*) as p,
            NULL::jsonb as v,
            CASE WHEN c.name ILIKE v_normalized ESCAPE '\\\\' THEN 1 ELSE 3 END as match_score
        FROM compositions c
        WHERE c.active = true
        AND NOT EXISTS (SELECT 1 FROM composition_variations cv WHERE cv.composition_id = c.id AND cv.active = true)
        AND (
            c.name ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR c.sku ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
        )
    ),
    comp_var_matches AS (
        SELECT 
            'comp-v-' || cv.id::text || '-' || c.id::text as key,
            true as is_composition,
            to_jsonb(c.*) as p,
            to_jsonb(cv.*) as v,
            CASE WHEN c.name ILIKE v_normalized ESCAPE '\\\\' OR cv.name ILIKE v_normalized ESCAPE '\\\\' THEN 2 ELSE 4 END as match_score
        FROM compositions c
        JOIN composition_variations cv ON cv.composition_id = c.id
        WHERE c.active = true AND cv.active = true
        AND (
            c.name ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR c.sku ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR cv.name ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
            OR cv.sku ILIKE '%' || v_normalized || '%' ESCAPE '\\\\'
        )
    )
    SELECT combined.key, combined.is_composition, combined.p, combined.v, combined.match_score
    FROM (
        SELECT * FROM prod_matches
        UNION ALL
        SELECT * FROM prod_var_matches
        UNION ALL
        SELECT * FROM comp_matches
        UNION ALL
        SELECT * FROM comp_var_matches
    ) combined
    ORDER BY combined.match_score, (combined.p->>'name')
    LIMIT p_limit;
END;
\\$\\$;
;

fs.writeFileSync('temp_rpc.sql', sql);
console.log('Running sql...');
try {
  const result = execSync('npx supabase db query -f temp_rpc.sql --linked', { encoding: 'utf8' });
  console.log(result.substring(0, 500));
} catch (e) {
  console.error(e.stdout || e.message);
}