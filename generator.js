const fs = require('fs');

const rawData = [
  { p: 'ba14c95b-e779-484b-9f2d-d16a1c69dc8d', oc: '000200', nc: '004005', v: '6d7a55a7-2d87-4408-be04-d698b16c6319', os: '000200-01', ns: '004005-01' },
  { p: 'ba14c95b-e779-484b-9f2d-d16a1c69dc8d', oc: '000200', nc: '004005', v: '8111ec1e-0f28-42ac-80af-3537f25dfae7', os: '000200-02', ns: '004005-02' },
  { p: 'ba14c95b-e779-484b-9f2d-d16a1c69dc8d', oc: '000200', nc: '004005', v: 'd8730061-35b6-4165-b31e-b9fe8ce0bf20', os: '000200-03', ns: '004005-03' },
  { p: 'bb3cc2fd-18f5-4a1b-8348-9333b7a52a66', oc: '000200', nc: '004006', v: 'ea8e07a9-6147-4e2a-9973-e154f06777d4', os: '000200-05', ns: '004006-05' },
  { p: 'b6bd1e92-0f58-428e-af25-73c8eda7945c', oc: '000128', nc: '004007', v: '028dddd6-14f5-4905-80e0-339d75f9baa5', os: '000227-01', ns: '004007-01' },
  { p: 'd1a7c139-32be-48e2-b790-b3ed4f92dab0', oc: '000130', nc: '004008', v: 'cc31e9b9-a3d6-45e9-a056-34751d6dc9a1', os: '000130-01', ns: '004008-01' },
  { p: 'd1a7c139-32be-48e2-b790-b3ed4f92dab0', oc: '000130', nc: '004008', v: '8392f728-b2c1-4f45-8f52-ec2b495fcce9', os: '000130-02', ns: '004008-02' },
  { p: '512b3807-f649-47fc-870b-6e53c44729e3', oc: '000229', nc: '004009', v: '4c13141e-2c4c-4463-a2b4-d05009aa65fa', os: 'armario-aereo-80cm-1-porta-basculante-pistao-angelin' },
  { p: '512b3807-f649-47fc-870b-6e53c44729e3', oc: '000229', nc: '004009', v: 'cd57da87-7a1a-4b2a-8f64-d8c48b80e342', os: 'armario-aereo-80cm-1-porta-basculante-pistao-canary' },
  { p: '7c13e343-a15b-451f-9fbc-1f49bf22d864', oc: '000345', nc: '004010', v: 'a53d0383-53aa-4038-bc97-15bcdc82e0cd', os: '000345-02', ns: '004010-02' },
  { p: 'cde26f3b-960e-4bc7-8a90-574978db8cab', oc: '000242', nc: '004011', v: '18d96cab-4cd0-4459-9ac5-cebeb9cedd88', os: 'guarda-roupa-verona-178-6-portas-com-frisos-angelinbranco' },
  { p: 'cde26f3b-960e-4bc7-8a90-574978db8cab', oc: '000242', nc: '004011', v: 'c949f2e7-473a-4cfa-a1d4-d7c6caa51afe', os: 'guarda-roupa-verona-178-6-portas-com-frisos-angelindunaline' },
  { p: 'bb8ec31b-92a3-4116-9fb6-5d6520f5e0ae', oc: '000222', nc: '004012', v: '7eda63e7-a662-4b56-9bac-9332edac4c29', os: '000222-01', ns: '004012-01' },
  { p: 'bb8ec31b-92a3-4116-9fb6-5d6520f5e0ae', oc: '000222', nc: '004012', v: '4025d3a3-7943-49a1-901d-2133efbe4308', os: '000222-02', ns: '004012-02' },
  { p: '686fa9f5-c5e7-44af-a87e-c8b74f4a86cb', oc: '000255', nc: '004013', v: '7bdb15b8-0959-4451-9a44-bba4c4788e90', os: '01-7bdb15' },
  { p: '34d2dc3e-c53e-40ad-a40d-d24ce03d3111', oc: '000253', nc: '004014', v: 'a8e96040-46b2-40cb-b228-22c86252d58c', os: '000253', ns: '004014' },
  { p: '9193bcb1-ff4e-47ed-b8d6-60aca392b9e2', oc: '000024', nc: '004015', v: '196bc63c-1f0e-40ed-aa5c-01ff660f310f', os: '000024-01', ns: '004015-01' },
  { p: 'ae5b20d5-6d41-43ec-93ff-23af2183c7f6', oc: '000347', nc: '004016', v: '7d602405-da4a-40c0-9aa2-f9aa7fe117df', os: '000347', ns: '004016' },
  { p: '6d773652-aa81-4b69-b057-85fc10dc5022', oc: '000021', nc: '004017', v: 'b91f97fd-30ec-4618-9694-d7344e329338', os: '000021-01', ns: '004017-01' },
  { p: '296e2933-e6f1-454d-a9d8-49e4f01793d5', oc: '000217', nc: '004018', v: 'e86031c6-7cc9-4874-bc25-6374213970de', os: '000217-01', ns: '004018-01' },
  { p: 'c0b9d19a-45e1-465b-a074-6c2186957f34', oc: '000244', nc: '004019', v: '4e1caf0b-9441-47f0-b4ce-ec1224d3ab2d', os: '000244-01', ns: '004019-01' },
  { p: '7cb32922-c9f0-4975-a1bb-3e97f3f14e5b', oc: '000215', nc: '004020', v: '7400094f-a841-4f0b-a19b-1f31aa1a5ad4', os: '000215-01', ns: '004020-01' },
  { p: 'bf786e0b-4564-4821-9205-e461d6631690', oc: '000226', nc: '004021', v: 'fefa8fb6-fd2b-4c66-a55c-a36c2ffcb46c', os: '000226-01', ns: '004021-01' },
  { p: '93c4890a-574c-4d76-bf00-b87917932e68', oc: '000217', nc: '004022', v: '240dc1ef-ed0e-4963-b7c3-b2b4fbe18c3e', os: '000217-02', ns: '004022-02' },
  { p: '9dca9f63-57ef-4204-bb77-9bea261b79f1', oc: '000223', nc: '004023', v: '3fa03882-4cbe-47ca-9b49-b499be9921e2', os: '000223-04', ns: '004023-04' },
  { p: '079df765-5642-4d1c-9a37-6805d725ba24', oc: '000225', nc: '004024', v: '8f69c826-cf25-4e88-8bc1-211670d34dcc', os: '000225-01', ns: '004024-01' },
  { p: '76c8517a-99ec-4801-a209-e71f9f738993', oc: '000237', nc: '004025', v: 'fd89db1b-7173-48ab-a4f4-6de6fa8d5ce3', os: '000237-01-fd89db' },
  { p: '77b05ad0-ca46-43eb-8c2a-b728b126c921', oc: '000254', nc: '004026', v: '7f52d9a1-54a5-4940-8d3b-77cba8eec0d3', os: '000254-01', ns: '004026-01' },
  { p: '51854b71-3c3b-4b22-ba56-5865bbff4ce8', oc: '000348', nc: '004027', v: '54bbdc19-11ec-4945-bfa0-c73732b93927', os: '000348-04', ns: '004027-04' },
  { p: '8cfc4f0c-aae2-4cf1-bac8-2ef86abe1df2', oc: '003976', nc: '004028', v: 'd50d8c07-0570-413f-9b45-f5e00e79efef', os: '003976-01', ns: '004028-01' }
];

let sql = `-- Migration: Saneamento de SKUs e Códigos Duplicados - Etapa 1
-- Objetivo: Renumerar os produtos duplicados por falha de concorrência e corrigir as variações inconsistentes.

BEGIN;

-- 1. Bloqueio explícito contra concorrência e inserções durante o saneamento
LOCK TABLE products IN EXCLUSIVE MODE;
LOCK TABLE product_variations IN EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS product_code_sanitation_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID,
    variation_id UUID,
    old_value TEXT,
    new_value TEXT,
    entity_type TEXT,
    reason TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Proteção e Grants da tabela de auditoria
ALTER TABLE product_code_sanitation_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON product_code_sanitation_log FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "service_role_only" ON product_code_sanitation_log;
CREATE POLICY "service_role_only" ON product_code_sanitation_log TO service_role USING (true) WITH CHECK (true);

DO \\$\\$
DECLARE
    v_row_count INT;
    v_products_updated INT := 0;
    v_variations_updated INT := 0;
BEGIN
    -- 3. Verificação de unicidade DENTRO do lote (Assertion via temp tables)
    CREATE TEMP TABLE tmp_new_codes (code TEXT) ON COMMIT DROP;
`;

const distinctProducts = [...new Map(rawData.map(item => [item.p, item])).values()];

sql += `    INSERT INTO tmp_new_codes (code) VALUES\n`;
sql += `    ` + distinctProducts.map(p => `('${p.nc}')`).join(',') + `;\n`;

sql += `
    IF (SELECT COUNT(*) FROM tmp_new_codes) <> (SELECT COUNT(DISTINCT code) FROM tmp_new_codes) THEN
        RAISE EXCEPTION 'Abortado: O lote de novos produtos contém códigos duplicados internamente!';
    END IF;

    CREATE TEMP TABLE tmp_new_skus (sku TEXT) ON COMMIT DROP;
`;

const updatedVariations = rawData.filter(v => v.ns);
sql += `    INSERT INTO tmp_new_skus (sku) VALUES\n`;
sql += `    ` + updatedVariations.map(v => `('${v.ns}')`).join(',') + `;\n`;

sql += `
    IF (SELECT COUNT(*) FROM tmp_new_skus) <> (SELECT COUNT(DISTINCT sku) FROM tmp_new_skus) THEN
        RAISE EXCEPTION 'Abortado: O lote de novos SKUs contém códigos duplicados internamente!';
    END IF;

    -- Verificações de Unicidade do lote contra o banco existente
    IF EXISTS (SELECT 1 FROM products p JOIN tmp_new_codes t ON p.code = t.code) THEN
        RAISE EXCEPTION 'Abortado: Um ou mais códigos novos do lote já existem no banco!';
    END IF;

    IF EXISTS (SELECT 1 FROM product_variations v JOIN tmp_new_skus t ON v.sku = t.sku) THEN
        RAISE EXCEPTION 'Abortado: Um ou mais SKUs novos do lote já existem no banco!';
    END IF;

    -- Execução Segura de Products (UPDATE condicional)
`;

for (const p of distinctProducts) {
    sql += `    UPDATE products SET code = '${p.nc}', updated_at = NOW() WHERE id = '${p.p}' AND code = '${p.oc}';\n`;
    sql += `    GET DIAGNOSTICS v_row_count = ROW_COUNT;\n`;
    sql += `    IF v_row_count <> 1 THEN\n`;
    sql += `        RAISE EXCEPTION 'Abortado: Falha no UPDATE do produto ${p.p}. Estado divergiu (Esperado: ${p.oc}).';\n`;
    sql += `    END IF;\n`;
    sql += `    INSERT INTO product_code_sanitation_log (product_id, old_value, new_value, entity_type, reason) VALUES ('${p.p}', '${p.oc}', '${p.nc}', 'product_code', 'Renumeração determinística de duplicata');\n`;
    sql += `    v_products_updated := v_products_updated + 1;\n`;
}

sql += `\n    -- Execução Segura de Variations (UPDATE condicional)\n`;

const legacyVariations = rawData.filter(v => !v.ns);

for (const v of updatedVariations) {
    sql += `    UPDATE product_variations SET sku = '${v.ns}', updated_at = NOW() WHERE id = '${v.v}' AND sku = '${v.os}' AND product_id = '${v.p}';\n`;
    sql += `    GET DIAGNOSTICS v_row_count = ROW_COUNT;\n`;
    sql += `    IF v_row_count <> 1 THEN\n`;
    sql += `        RAISE EXCEPTION 'Abortado: Falha no UPDATE da variação ${v.v}. Estado divergiu (Esperado: ${v.os} do produto ${v.p}).';\n`;
    sql += `    END IF;\n`;
    sql += `    INSERT INTO product_code_sanitation_log (product_id, variation_id, old_value, new_value, entity_type, reason) VALUES ('${v.p}', '${v.v}', '${v.os}', '${v.ns}', 'variation_sku', 'Alinhamento de SKU pós-saneamento de código');\n`;
    sql += `    v_variations_updated := v_variations_updated + 1;\n`;
}

sql += `\n    -- Pós-condições Fortes\n`;
sql += `    IF v_products_updated <> ${distinctProducts.length} THEN\n`;
sql += `        RAISE EXCEPTION 'Abortado: Esperado atualizar ${distinctProducts.length} produtos, mas atualizou %', v_products_updated;\n`;
sql += `    END IF;\n`;

sql += `    IF v_variations_updated <> ${updatedVariations.length} THEN\n`;
sql += `        RAISE EXCEPTION 'Abortado: Esperado atualizar ${updatedVariations.length} variações, mas atualizou %', v_variations_updated;\n`;
sql += `    END IF;\n`;

sql += `\n    -- Validação de preservação dos SKUs legados (Classe C)\n`;
for (const v of legacyVariations) {
    sql += `    IF NOT EXISTS (SELECT 1 FROM product_variations WHERE id = '${v.v}' AND sku = '${v.os}') THEN\n`;
    sql += `        RAISE EXCEPTION 'Abortado: SKU legado/manual ${v.os} não preservado ou ausente para variação ${v.v}.';\n`;
    sql += `    END IF;\n`;
}

sql += `
    RAISE NOTICE 'Saneamento concluído com sucesso. Produtos: %, Variações: %.', v_products_updated, v_variations_updated;
END \\$\\$;

COMMIT;
`;

fs.writeFileSync('C:/Users/Rosilene/Desktop/morantehub/supabase/migrations/20260928120000_saneamento_skus.sql', sql);
