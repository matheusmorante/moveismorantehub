CREATE OR REPLACE FUNCTION public.prevent_composition_inventory_moves()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_item_type text;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT product.item_type
    INTO v_item_type
    FROM public.products AS product
   WHERE product.id = NEW.product_id;

  IF FOUND AND v_item_type = 'composition' THEN
    RAISE EXCEPTION 'Produtos compostos não podem gerar movimentações de estoque.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_inventory_moves_composition_guard ON public.inventory_moves;

CREATE TRIGGER trg_inventory_moves_composition_guard
BEFORE INSERT OR UPDATE ON public.inventory_moves
FOR EACH ROW
EXECUTE FUNCTION public.prevent_composition_inventory_moves();
