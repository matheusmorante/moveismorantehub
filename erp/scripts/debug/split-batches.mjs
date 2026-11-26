import fs from 'fs';

const updates = JSON.parse(fs.readFileSync('erp/scripts/prepared_updates.json', 'utf8'));

function generateBatch(items, batchIndex) {
  const sqlStatements = [];
  sqlStatements.push('BEGIN;');
  for (const u of items) {
    if (u.productId === 'a846c89e-1b6d-4f41-8142-34a97b0c9d17') {
      sqlStatements.push(`
        UPDATE public.products 
        SET category_id = 'c2e94000-f3ce-4c4f-80f7-ee0476793a59'
        WHERE id = '${u.productId}';

        DELETE FROM public.product_categories 
        WHERE product_id = '${u.productId}' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';

        INSERT INTO public.product_categories (product_id, category_id)
        SELECT '${u.productId}'::uuid, 'c2e94000-f3ce-4c4f-80f7-ee0476793a59'::uuid
        WHERE NOT EXISTS (
          SELECT 1 FROM public.product_categories 
          WHERE product_id = '${u.productId}' AND category_id = 'c2e94000-f3ce-4c4f-80f7-ee0476793a59'
        );
      `);
      continue;
    }

    const techJsonEscaped = JSON.stringify(u.newTv).replace(/'/g, "''");
    const altura = u.newTv['Altura'] || null;
    const largura = u.newTv['Largura'] || null;
    const profundidade = u.newTv['Profundidade'] || null;
    const marca = (u.newTv['Marca'] || '').replace(/'/g, "''");

    let catSql = '';
    if (u.targetCategoryId) {
      catSql = `category_id = '${u.targetCategoryId}',`;
      sqlStatements.push(`
        DELETE FROM public.product_categories 
        WHERE product_id = '${u.productId}' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';

        INSERT INTO public.product_categories (product_id, category_id)
        SELECT '${u.productId}'::uuid, '${u.targetCategoryId}'::uuid
        WHERE NOT EXISTS (
          SELECT 1 FROM public.product_categories 
          WHERE product_id = '${u.productId}' AND category_id = '${u.targetCategoryId}'
        );
      `);
    }

    sqlStatements.push(`
      UPDATE public.products
      SET 
        ${catSql}
        technical_specs = jsonb_set(
          COALESCE(technical_specs, '{}'::jsonb),
          '{technicalValues}',
          '${techJsonEscaped}'::jsonb,
          true
        ),
        height = COALESCE(NULLIF(height, '0'), '${altura}'),
        width = COALESCE(NULLIF(width, '0'), '${largura}'),
        depth = COALESCE(NULLIF(depth, '0'), '${profundidade}'),
        brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN '${marca}' ELSE brand END,
        updated_at = NOW()
      WHERE id = '${u.productId}';
    `);

    for (const v of u.variationSqls) {
      const attrJson = JSON.stringify(v.attributes).replace(/'/g, "''");
      sqlStatements.push(`
        UPDATE public.product_variations
        SET 
          attributes = '${attrJson}'::jsonb,
          updated_at = NOW()
        WHERE id = '${v.id}';
      `);
    }
  }
  sqlStatements.push('COMMIT;');
  const sql = sqlStatements.join('\n');
  fs.writeFileSync(`erp/scripts/batch_${batchIndex}.sql`, sql);
  console.log(`Batch ${batchIndex}: ${items.length} products, ${sql.length} chars`);
}

const batchSize = 25;
for (let i = 0; i < updates.length; i += batchSize) {
  generateBatch(updates.slice(i, i + batchSize), (i / batchSize) + 1);
}
