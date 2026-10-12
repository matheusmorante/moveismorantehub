-- Capture before/after stock in the same transaction as order-linked movements.
-- Order writes already lock product rows before inserting movements; this keeps
-- the snapshot consistent with create_order_with_inventory_transaction.
BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_inventory_moves_before()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_product_id uuid;
  v_variation_id uuid;
  v_previous_stock numeric;
BEGIN
  IF TG_OP = 'INSERT'
     AND NEW.related_entity_type = 'sales_order'
     AND NEW.type IN ('entry', 'exit', 'withdrawal')
     AND COALESCE(NEW.quantity, 0) > 0 THEN
    v_product_id := NULLIF(NEW.product_id::text, '')::uuid;
    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'ORDER_INVENTORY_SNAPSHOT_PRODUCT_REQUIRED';
    END IF;

    SELECT COALESCE(product.stock, 0)
      INTO v_previous_stock
    FROM public.products AS product
    WHERE product.id = v_product_id
    FOR NO KEY UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ORDER_INVENTORY_SNAPSHOT_PRODUCT_NOT_FOUND';
    END IF;

    v_variation_id := NULLIF(NEW.variation_id::text, '')::uuid;
    IF v_variation_id IS NOT NULL THEN
      SELECT COALESCE(variation.stock, 0)
        INTO v_previous_stock
      FROM public.product_variations AS variation
      WHERE variation.id = v_variation_id
        AND variation.product_id = v_product_id
      FOR NO KEY UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_INVENTORY_SNAPSHOT_VARIATION_NOT_FOUND';
      END IF;
    END IF;

    NEW.previous_stock := v_previous_stock;
    NEW.new_stock := CASE
      WHEN NEW.type = 'entry' THEN v_previous_stock + NEW.quantity
      ELSE v_previous_stock - NEW.quantity
    END;
  END IF;

  IF NEW.type = 'withdrawal' THEN
    NEW.unit_cost := public.calculate_withdrawal_unit_cost(
      NEW.product_id::text, NEW.variation_id::text, NEW.date
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
