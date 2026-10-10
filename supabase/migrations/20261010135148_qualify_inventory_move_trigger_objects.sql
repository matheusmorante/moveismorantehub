-- Keep inventory movement trigger helpers usable from SECURITY DEFINER RPCs
-- that intentionally run with an empty search_path.
BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_withdrawal_unit_cost(
  p_product_id text,
  p_variation_id text,
  p_date timestamptz
)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_avg_cost numeric;
  v_next_cost numeric;
BEGIN
  IF p_product_id IS NULL OR p_product_id = '' THEN
    RETURN 0;
  END IF;

  IF p_variation_id IS NOT NULL AND p_variation_id <> '' THEN
    SELECT avg(unit_cost) INTO v_avg_cost
    FROM public.inventory_moves
    WHERE product_id::text = p_product_id
      AND variation_id::text = p_variation_id
      AND type = 'entry'
      AND date < p_date
      AND unit_cost IS NOT NULL AND unit_cost > 0;
  ELSE
    SELECT avg(unit_cost) INTO v_avg_cost
    FROM public.inventory_moves
    WHERE product_id::text = p_product_id
      AND (variation_id IS NULL OR variation_id::text = '')
      AND type = 'entry'
      AND date < p_date
      AND unit_cost IS NOT NULL AND unit_cost > 0;
  END IF;

  IF v_avg_cost IS NOT NULL AND v_avg_cost > 0 THEN
    RETURN round(v_avg_cost, 2);
  END IF;

  IF p_variation_id IS NOT NULL AND p_variation_id <> '' THEN
    SELECT unit_cost INTO v_next_cost
    FROM public.inventory_moves
    WHERE product_id::text = p_product_id
      AND variation_id::text = p_variation_id
      AND type = 'entry'
      AND date >= p_date
      AND unit_cost IS NOT NULL AND unit_cost > 0
    ORDER BY date ASC
    LIMIT 1;
  ELSE
    SELECT unit_cost INTO v_next_cost
    FROM public.inventory_moves
    WHERE product_id::text = p_product_id
      AND (variation_id IS NULL OR variation_id::text = '')
      AND type = 'entry'
      AND date >= p_date
      AND unit_cost IS NOT NULL AND unit_cost > 0
    ORDER BY date ASC
    LIMIT 1;
  END IF;

  RETURN coalesce(round(v_next_cost, 2), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_inventory_moves_before()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.type = 'withdrawal' THEN
    NEW.unit_cost := public.calculate_withdrawal_unit_cost(
      NEW.product_id::text, NEW.variation_id::text, NEW.date
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_inventory_moves_after()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_prod_id text;
  v_var_id text;
  v_date timestamptz;
  r record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_prod_id := OLD.product_id::text;
    v_var_id := OLD.variation_id::text;
    v_date := OLD.date;
  ELSE
    v_prod_id := NEW.product_id::text;
    v_var_id := NEW.variation_id::text;
    v_date := NEW.date;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.type <> 'entry' THEN
    RETURN NULL;
  END IF;
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.type <> 'entry' THEN
    IF TG_OP = 'UPDATE' AND OLD.type <> 'entry' THEN
      RETURN NULL;
    END IF;
  END IF;

  IF v_var_id IS NOT NULL AND v_var_id <> '' THEN
    FOR r IN
      SELECT id, product_id, variation_id, date
      FROM public.inventory_moves
      WHERE product_id::text = v_prod_id
        AND variation_id::text = v_var_id
        AND type = 'withdrawal'
        AND date >= v_date
    LOOP
      UPDATE public.inventory_moves
      SET unit_cost = public.calculate_withdrawal_unit_cost(
        r.product_id::text, r.variation_id::text, r.date
      )
      WHERE id = r.id;
    END LOOP;
  ELSE
    FOR r IN
      SELECT id, product_id, variation_id, date
      FROM public.inventory_moves
      WHERE product_id::text = v_prod_id
        AND (variation_id IS NULL OR variation_id::text = '')
        AND type = 'withdrawal'
        AND date >= v_date
    LOOP
      UPDATE public.inventory_moves
      SET unit_cost = public.calculate_withdrawal_unit_cost(
        r.product_id::text, r.variation_id::text, r.date
      )
      WHERE id = r.id;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

COMMIT;
