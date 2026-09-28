SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') as has_orders,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_moves') as has_inventory;