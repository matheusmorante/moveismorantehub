WITH test_products AS (
    SELECT id, code, name 
    FROM products 
    WHERE code IN ('000001', 'ORIG', 'TB4425', '003976') 
    AND id != '78900c7a-0f8e-4f35-a3ce-894737f489bf'
),
audit AS (
    SELECT 
        p.id as product_id,
        p.code,
        p.name,
        (SELECT COUNT(*) FROM product_variations v WHERE v.product_id::text = p.id::text) as num_variacoes,
        (SELECT COUNT(*) FROM order_items o WHERE o.product_id::text = p.id::text) as refs_orders,
        (SELECT COUNT(*) FROM inventory_moves i WHERE i.product_id::text = p.id::text) as refs_inventory,
        (SELECT COUNT(*) FROM purchase_items pi WHERE pi.product_id::text = p.id::text) as refs_purchase,
        (SELECT COUNT(*) FROM goods_receipt_items g WHERE g.product_id::text = p.id::text) as refs_receipts,
        (SELECT COUNT(*) FROM product_images img WHERE img.product_id::text = p.id::text) as refs_images,
        (SELECT COUNT(*) FROM product_supplier_codes sup WHERE sup.product_id::text = p.id::text) as refs_supplier,
        (SELECT COUNT(*) FROM product_categories pc WHERE pc.product_id::text = p.id::text) as refs_categories,
        (SELECT COUNT(*) FROM product_analytics pa WHERE pa.product_id::text = p.id::text) as refs_analytics,
        (SELECT COUNT(*) FROM desire_matches dm WHERE dm.product_id::text = p.id::text) as refs_desire,
        (SELECT COUNT(*) FROM product_price_history ph WHERE ph.product_id::text = p.id::text) as refs_price_history,
        (SELECT COUNT(*) FROM inbound_invoice_items inv WHERE inv.product_id::text = p.id::text) as refs_inbound_invoice,
        (SELECT COUNT(*) FROM ncm_product_reviews ncm WHERE ncm.product_id::text = p.id::text) as refs_ncm
    FROM test_products p
)
SELECT jsonb_agg(jsonb_build_object(
    'product_id', product_id,
    'code', code,
    'name', name,
    'variacoes', num_variacoes,
    'refs_orders', refs_orders,
    'refs_inventory', refs_inventory,
    'refs_purchase', refs_purchase,
    'refs_receipts', refs_receipts,
    'refs_images', refs_images,
    'refs_supplier', refs_supplier,
    'outras_refs', (refs_categories + refs_analytics + refs_desire + refs_price_history + refs_inbound_invoice + refs_ncm),
    'total_refs', (refs_orders + refs_inventory + refs_purchase + refs_receipts + refs_images + refs_supplier + refs_categories + refs_analytics + refs_desire + refs_price_history + refs_inbound_invoice + refs_ncm)
)) FROM audit;