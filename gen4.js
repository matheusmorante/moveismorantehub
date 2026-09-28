const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('uuids.utf8.json', 'utf8')).rows;

  let sql = `-- Migration: Limpeza de Duplicatas de Teste - Etapa 1.5
-- Objetivo: Remover os 64 registros de teste isolados sem vínculos

BEGIN;

LOCK TABLE products IN EXCLUSIVE MODE;
LOCK TABLE product_variations IN EXCLUSIVE MODE;

DO $$
DECLARE
    v_count INT;
    v_deleted_vars INT;
    v_deleted_prods INT;
    v_duplicates INT;
    v_fk RECORD;
    v_query TEXT;
BEGIN
    CREATE TEMP TABLE tmp_garbage_products (id UUID PRIMARY KEY, name TEXT NOT NULL) ON COMMIT DROP;
    INSERT INTO tmp_garbage_products (id, name) VALUES
`;
  sql += data.map(r => `    ('${r.id}', '${r.name.replace(/'/g, "''")}')`).join(',\n') + ';\n\n';

  sql += `    -- 4. COUNT(*) = COUNT(DISTINCT id) = 64
    SELECT COUNT(*), COUNT(DISTINCT id) INTO v_count, v_deleted_prods FROM tmp_garbage_products;
    IF v_count <> 64 OR v_deleted_prods <> 64 THEN
        RAISE EXCEPTION 'Abortado: A lista temporária não contém exatamente 64 UUIDs distintos (Count: %, Distinct: %)', v_count, v_deleted_prods;
    END IF;

    -- 5. Validação UUID + Assinatura/Name exato
    SELECT COUNT(*) INTO v_count FROM products p JOIN tmp_garbage_products t ON p.id = t.id WHERE p.name = t.name;
    IF v_count <> 64 THEN
        RAISE EXCEPTION 'Abortado: Os UUIDs ou nomes dos candidatos mudaram desde o dry-run!';
    END IF;

    -- 6 & 7. Rechecagem runtime de TODAS as FKs (Products)
    FOR v_fk IN (
        SELECT tc.table_name, kcu.column_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
         AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name 
         AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'products' 
          AND tc.table_schema = 'public'
          AND NOT (tc.table_name = 'product_variations' AND kcu.column_name = 'product_id')
    ) LOOP
        v_query := 'SELECT COUNT(*) FROM ' || quote_ident(v_fk.table_name) || 
                   ' r JOIN tmp_garbage_products t ON r.' || quote_ident(v_fk.column_name) || '::text = t.id::text';
        EXECUTE v_query INTO v_count;
        IF v_count > 0 THEN
            RAISE EXCEPTION 'Abortado: % vínculos na tabela % apontando para products!', v_count, v_fk.table_name;
        END IF;
    END LOOP;

    -- Rechecagem runtime de TODAS as FKs (Product Variations)
    FOR v_fk IN (
        SELECT tc.table_name, kcu.column_name 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
         AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name 
         AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'product_variations' 
          AND tc.table_schema = 'public'
    ) LOOP
        v_query := 'SELECT COUNT(*) FROM ' || quote_ident(v_fk.table_name) || 
                   ' r JOIN product_variations v ON r.' || quote_ident(v_fk.column_name) || '::text = v.id::text ' ||
                   ' JOIN tmp_garbage_products t ON v.product_id::text = t.id::text';
        EXECUTE v_query INTO v_count;
        IF v_count > 0 THEN
            RAISE EXCEPTION 'Abortado: % vínculos na tabela % apontando para product_variations!', v_count, v_fk.table_name;
        END IF;
    END LOOP;

    -- 8. DELETE Variations
    DELETE FROM product_variations WHERE product_id IN (SELECT id FROM tmp_garbage_products);
    GET DIAGNOSTICS v_deleted_vars = ROW_COUNT;
    RAISE NOTICE 'Variações deletadas: %', v_deleted_vars;

    -- 8 & 9. DELETE Products
    DELETE FROM products WHERE id IN (SELECT id FROM tmp_garbage_products);
    GET DIAGNOSTICS v_deleted_prods = ROW_COUNT;
    IF v_deleted_prods <> 64 THEN
        RAISE EXCEPTION 'Abortado: Esperado deletar 64 produtos, mas % foram deletados.', v_deleted_prods;
    END IF;

    -- 10. Nenhum dos 64 permanece
    SELECT COUNT(*) INTO v_count FROM products WHERE id IN (SELECT id FROM tmp_garbage_products);
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Abortado: % produtos do lote não foram deletados e ainda existem no banco!', v_count;
    END IF;

    -- 11. Duplicatas globais = 0
    SELECT COUNT(*) INTO v_duplicates FROM (
        SELECT code FROM products WHERE code IS NOT NULL GROUP BY code HAVING COUNT(*) > 1
    ) dupes;

    IF v_duplicates > 0 THEN
        RAISE EXCEPTION 'Abortado: O banco ainda possui % códigos duplicados após a limpeza global!', v_duplicates;
    END IF;

END $$;

COMMIT;
`;

  fs.writeFileSync('C:/Users/Rosilene/.gemini/antigravity/brain/267aea66-1826-44ee-96cd-378a4c517aa1/sql-cleanup-script.md', 
`# Script de Limpeza de Lixo (Etapa 1.5 - Revisado Definitivo)

Este script apaga definitivamente as 64 entradas de teste, passando por todas as blindagens de execução.

\`\`\`sql
${sql}
\`\`\`
  `);
  console.log("Done");
} catch (e) {
  console.error(e);
}
