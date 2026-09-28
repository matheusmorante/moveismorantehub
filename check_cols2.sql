SELECT jsonb_build_object(
  'order_items_product', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id'),
  'order_items_variation', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'variation_id'),
  'inventory_moves_product', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'inventory_moves' AND column_name = 'product_id'),
  'inventory_moves_variation', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'inventory_moves' AND column_name = 'variation_id'),
  'purchase_items_product', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'purchase_items' AND column_name = 'product_id'),
  'purchase_items_variation', (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'purchase_items' AND column_name = 'variation_id')
);