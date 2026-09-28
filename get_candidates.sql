SELECT 
    p.id as product_id, 
    p.code, 
    p.name, 
    (SELECT COUNT(*) FROM product_variations v WHERE v.product_id = p.id) as var_count
FROM products p 
WHERE p.code IN ('000001', 'ORIG', 'TB4425', '003976')
ORDER BY p.code, p.name;