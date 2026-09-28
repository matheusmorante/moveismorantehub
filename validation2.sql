SELECT jsonb_build_object(
    '1. Logs product_code', (SELECT COUNT(*) FROM product_code_sanitation_log WHERE entity_type = 'product_code'),
    '2. Logs variation_sku', (SELECT COUNT(*) FROM product_code_sanitation_log WHERE entity_type = 'variation_sku'),
    '3. Novos codes count', (SELECT COUNT(DISTINCT code) FROM products WHERE code >= '004005' AND code <= '004028'),
    '4. Novos SKUs count', (SELECT COUNT(*) FROM product_variations WHERE sku LIKE '0040%'),
    '5. Legados count', (SELECT COUNT(*) FROM product_variations WHERE id IN ('4c13141e-2c4c-4463-a2b4-d05009aa65fa', 'cd57da87-7a1a-4b2a-8f64-d8c48b80e342', '18d96cab-4cd0-4459-9ac5-cebeb9cedd88', 'c949f2e7-473a-4cfa-a1d4-d7c6caa51afe', '7bdb15b8-0959-4451-9a44-bba4c4788e90', 'fd89db1b-7173-48ab-a4f4-6de6fa8d5ce3')),
    '6. Remaining Duplicates', (SELECT jsonb_agg(jsonb_build_object('code', code, 'count', c)) FROM (SELECT code, COUNT(*) as c FROM products GROUP BY code HAVING COUNT(*) > 1 ORDER BY code) d)
) as result;