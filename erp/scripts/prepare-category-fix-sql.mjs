import fs from 'fs';

const sqlStatements = [
  '-- SQL MIGRATION / CORRECTION: FIX PRODUCT CATEGORIES AND SYNCHRONIZE CATEGORY_ID',
  'BEGIN;'
];

// Helper to update product category
function fixProductCategory(productId, targetCatId, removeCatIds = []) {
  sqlStatements.push(`
    -- Update product ${productId} to category ${targetCatId}
    UPDATE public.products
    SET category_id = '${targetCatId}', updated_at = NOW()
    WHERE id = '${productId}';

    -- Ensure product_categories has targetCatId
    INSERT INTO public.product_categories (product_id, category_id)
    SELECT '${productId}'::uuid, '${targetCatId}'::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_categories
      WHERE product_id = '${productId}' AND category_id = '${targetCatId}'
    );
  `);

  for (const remId of removeCatIds) {
    sqlStatements.push(`
      DELETE FROM public.product_categories
      WHERE product_id = '${productId}' AND category_id = '${remId}';
    `);
  }
}

// 1. Active product completely missing category:
// Cabeceira 160 Queen ADF Letícia (e5f10dc8-89a5-48ac-8c77-6fea63112d66) -> Cabeceiras
fixProductCategory('e5f10dc8-89a5-48ac-8c77-6fea63112d66', '6d702b44-6633-4fb4-808b-967ea6090dec');

// 2. Inactive real products missing category:
// BELICHE RUBIN ESPECIAL C/GRADE E ESCADA 1 Marfim (4a8fc879-d509-4dd8-8709-5eb91e4b56b8) -> Beliches
fixProductCategory('4a8fc879-d509-4dd8-8709-5eb91e4b56b8', 'cf2be708-6cae-4f59-ac33-07e3381bc3df');

// Berço Mini Cama Fantasia Qmovi (9dca9f63-57ef-4204-bb77-9bea261b79f1) -> Berços
fixProductCategory('9dca9f63-57ef-4204-bb77-9bea261b79f1', '197b3ff8-78d9-4e1e-bc78-416cbaa6c12a');

// 3. Misaligned products:
// Armario Multiuso Notavel Escritorio 56118 2pt Branco New (862f40a3-1084-4acc-bbd6-f2f9ecdf39b2) -> Armários Multiuso, remove Mesas para Escritório
fixProductCategory('862f40a3-1084-4acc-bbd6-f2f9ecdf39b2', 'df9d0105-e438-4569-97e3-3be34f83ec98', ['27bbf25b-32b7-40ce-904c-618c654447f2']);

// Armario Multiuso Notavel Nt 4015 2pt Branco (1e54cdb5-4909-4896-967b-775f4c127ecf) -> Armários Multiuso, remove Aparadores Buffets
fixProductCategory('1e54cdb5-4909-4896-967b-775f4c127ecf', 'df9d0105-e438-4569-97e3-3be34f83ec98', ['f642586c-4f73-409c-8066-ad5651061073']);

// Berço Minicama em MDF Liza Permobili QUEIMA DOS SALVADOS (738b26b2-b257-4ff0-a8c6-0aab14f60688) -> Berços, remove Camas/Bases Box
fixProductCategory('738b26b2-b257-4ff0-a8c6-0aab14f60688', '197b3ff8-78d9-4e1e-bc78-416cbaa6c12a', ['c2e94000-f3ce-4c4f-80f7-ee0476793a59']);

// Conjunto de Mesa Mônaco 1,37 M com Vidro e 6 Poltronas (ccd24699-628e-4e03-b20c-a6c9f28d6ce6) -> Conjunto Mesa e Cadeiras, remove Cadeiras para Cozinha
fixProductCategory('ccd24699-628e-4e03-b20c-a6c9f28d6ce6', '8024e433-982e-4777-a254-a8769c1bcacb', ['2df6d0c1-f9cd-419e-8d0f-22c63efd18f7']);

// Balcão Fruteira Dulce 2 Cestos de Metal Darmovel (a20d9403-82a0-40d0-9cdd-5ac5b3d9f352) -> Balcões com Fruteiras, remove Balcões com Tampo
fixProductCategory('a20d9403-82a0-40d0-9cdd-5ac5b3d9f352', 'bee7d82b-ccd5-45c8-893a-45cf54433cb7', ['7efd43ad-bb98-49d9-baa1-3a4b25ac5bb5']);

// Poltrona Viero Viana Veludo 82cm (f832c0f2-6cd7-4088-a76b-652b7fa0d000) -> Poltronas, remove Sofás
fixProductCategory('f832c0f2-6cd7-4088-a76b-652b7fa0d000', '8ea41168-5acd-46c2-8061-da86fc1e8be2', ['bb55b391-ea52-4527-b429-26b0e2b71b71']);

// Poltrona do Papai 80cm Noruega Berflex Estofados (60992dff-3d24-4a3b-a325-16b52e47f5c1) -> Poltronas, remove Sofás
fixProductCategory('60992dff-3d24-4a3b-a325-16b52e47f5c1', '8ea41168-5acd-46c2-8061-da86fc1e8be2', ['bb55b391-ea52-4527-b429-26b0e2b71b71']);

// Aparador para Café Cairo Pés Palito (bbd7697b-332b-44ff-a9be-bee2999d2a6a) -> Aparadores Buffets, remove Balcões com Tampo
fixProductCategory('bbd7697b-332b-44ff-a9be-bee2999d2a6a', 'f642586c-4f73-409c-8066-ad5651061073', ['7efd43ad-bb98-49d9-baa1-3a4b25ac5bb5']);

// 4. Remove multi-category pollution:
// Armário Multiuso Dubai (5511f886-6626-45c8-8c9b-3d6b55305c19) -> remove Guarda-Roupas
sqlStatements.push(`
  DELETE FROM public.product_categories
  WHERE product_id = '5511f886-6626-45c8-8c9b-3d6b55305c19' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';
`);

// Multiuso Dueto (45570901-f295-46b2-984d-96af85e0079a) -> remove Guarda-Roupas
sqlStatements.push(`
  DELETE FROM public.product_categories
  WHERE product_id = '45570901-f295-46b2-984d-96af85e0079a' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';
`);

// Sapateira Grife (c19d34fc-191d-4e23-aae5-7af7321fc5ed) -> remove Guarda-Roupas and Armários Multiuso
sqlStatements.push(`
  DELETE FROM public.product_categories
  WHERE product_id = 'c19d34fc-191d-4e23-aae5-7af7321fc5ed' AND category_id IN ('1859e792-0790-4554-b269-e3b0b707896e', 'df9d0105-e438-4569-97e3-3be34f83ec98');
`);

// Cozinha Modulada Divina MGM (12d381a7-236f-46cc-bcb3-70bf167cde2a) -> remove Colchões
sqlStatements.push(`
  DELETE FROM public.product_categories
  WHERE product_id = '12d381a7-236f-46cc-bcb3-70bf167cde2a' AND category_id = '3b616449-7d0c-40fc-9917-70a20836f3b8';
`);

// Cama Box Solteiro Cristalflex (a846c89e-1b6d-4f41-8142-34a97b0c9d17) -> remove Armários Aéreos
sqlStatements.push(`
  DELETE FROM public.product_categories
  WHERE product_id = 'a846c89e-1b6d-4f41-8142-34a97b0c9d17' AND category_id = 'c718ab5d-ade3-42fb-91fb-2a05c1a3e322';
`);

// 5. Clean up duplicate product_categories entries
sqlStatements.push(`
  -- Deduplicate product_categories
  DELETE FROM public.product_categories a
  USING public.product_categories b
  WHERE a.ctid < b.ctid
    AND a.product_id = b.product_id
    AND a.category_id = b.category_id;
`);

// 6. Global sync of products.category_id from product_categories for all products where category_id is NULL
sqlStatements.push(`
  -- Synchronize products.category_id for any products where category_id IS NULL
  UPDATE public.products p
  SET category_id = sub.chosen_cat, updated_at = NOW()
  FROM (
    SELECT DISTINCT ON (product_id) product_id, category_id AS chosen_cat
    FROM public.product_categories
    ORDER BY product_id, category_id
  ) sub
  WHERE p.id = sub.product_id
    AND p.category_id IS NULL
    AND p.name NOT LIKE '%TEST%'
    AND p.name NOT LIKE '%Hml%';
`);

sqlStatements.push('COMMIT;');

const finalSql = sqlStatements.join('\n');
fs.writeFileSync('erp/scripts/fix_categories.sql', finalSql);
console.log('Generated erp/scripts/fix_categories.sql successfully. Total chars:', finalSql.length);
