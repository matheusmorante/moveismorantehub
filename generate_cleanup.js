const fs = require('fs');

try {
  const uuids = JSON.parse(fs.readFileSync('uuids.utf8.json', 'utf8')).rows.map(r => r.id);

  let sql = `-- Migration: Limpeza de Duplicatas de Teste - Etapa 1.5
-- Objetivo: Remover os 64 registros de teste (000001, ORIG, TB4425 e o draft de 003976)
-- que possuem zero vÃ­nculos comerciais, limpando a pista para a constraint UNIQUE.

BEGIN;

LOCK TABLE products IN EXCLUSIVE MODE;
LOCK TABLE product_variations IN EXCLUSIVE MODE;

CREATE TEMP TABLE tmp_garbage_products (id UUID) ON COMMIT DROP;

INSERT INTO tmp_garbage_products (id) VALUES
`;

  sql += uuids.map(id => `('${id}')`).join(',\\n') + ';\\n\\n';

  sql += `-- Garantia 1: Nomes de Teste Exclusivamente
IF EXISTS (
    SELECT 1 FROM products p 
    JOIN tmp_garbage_products t ON p.id = t.id 
    WHERE p.name NOT LIKE '%[teste_aut]_%' AND p.name NOT LIKE '%Pai %'
) THEN
    RAISE EXCEPTION 'Abortado: Tentativa de excluir produto que nÃ£o possui assinatura de teste no nome!';
END IF;

-- Garantia 2: VÃ­nculos Zero no Momento da ExecuÃ§Ã£o (apenas amostragem de seguranÃ§a)
IF EXISTS (SELECT 1 FROM order_items o JOIN tmp_garbage_products t ON o.product_id::text = t.id::text) THEN
    RAISE EXCEPTION 'Abortado: VÃ­nculos em order_items detectados para produto de teste!';
END IF;
IF EXISTS (SELECT 1 FROM inventory_moves i JOIN tmp_garbage_products t ON i.product_id::text = t.id::text) THEN
    RAISE EXCEPTION 'Abortado: VÃ­nculos em inventory_moves detectados para produto de teste!';
END IF;

-- 1. ExclusÃ£o de VariaÃ§Ãµes em Cascata
DELETE FROM product_variations WHERE product_id IN (SELECT id FROM tmp_garbage_products);

-- 2. ExclusÃ£o de Produtos
DELETE FROM products WHERE id IN (SELECT id FROM tmp_garbage_products);

-- PÃ³s-CondiÃ§Ã£o: Exigir zero duplicatas restando
DO $$
DECLARE
    v_duplicates INT;
BEGIN
    SELECT COUNT(*) INTO v_duplicates FROM (
        SELECT code FROM products GROUP BY code HAVING COUNT(*) > 1
    ) dupes;

    IF v_duplicates > 0 THEN
        RAISE EXCEPTION 'Abortado: O banco ainda possui % cÃ³digos duplicados apÃ³s a limpeza!', v_duplicates;
    END IF;
END $$;

COMMIT;
`;

  fs.writeFileSync('C:/Users/Rosilene/.gemini/antigravity/brain/267aea66-1826-44ee-96cd-378a4c517aa1/20260928120001_cleanup_test_duplicates.md', 
`# Script de Limpeza de Lixo (Etapa 1.5)

Este script apaga definitivamente as 64 entradas de teste (000001, ORIG, TB4425 e o draft colidindo com 003976).

\`\`\`sql\n${sql}\n\`\`\`
  `);
  console.log("Done");
} catch (e) {
  console.error(e);
}
