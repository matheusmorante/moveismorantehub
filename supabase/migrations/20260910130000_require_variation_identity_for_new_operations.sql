-- A variação é a identidade operacional de estoque, vendas e recebimentos.
-- product_id continua como cópia derivada para compatibilidade de leitura.

CREATE OR REPLACE FUNCTION public.assert_catalog_item_identities(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item jsonb;
  raw_product_id text;
  raw_variation_id text;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    IF COALESCE((item->>'isTemporaryProduct')::boolean, false) THEN
      CONTINUE;
    END IF;

    raw_product_id := NULLIF(btrim(item->>'productId'), '');
    raw_variation_id := NULLIF(btrim(item->>'variationId'), '');

    IF raw_variation_id IS NULL THEN
      RAISE EXCEPTION 'Item operacional exige variationId.';
    END IF;
    IF raw_variation_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'variationId inválido: %', raw_variation_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.product_variations WHERE id = raw_variation_id::uuid) THEN
      RAISE EXCEPTION 'variationId não encontrado: %', raw_variation_id;
    END IF;

    IF raw_product_id IS NOT NULL THEN
      IF raw_product_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'productId inválido: %', raw_product_id;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.product_variations
        WHERE id = raw_variation_id::uuid AND product_id = raw_product_id::uuid
      ) THEN
        RAISE EXCEPTION 'variationId % não pertence ao productId %', raw_variation_id, raw_product_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_inventory_move_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  variation_parent_id uuid;
BEGIN
  IF NEW.variation_id IS NULL OR btrim(NEW.variation_id::text) = '' THEN
    RAISE EXCEPTION 'Movimentação operacional exige variation_id.';
  END IF;

  SELECT product_id INTO variation_parent_id
  FROM public.product_variations
  WHERE id::text = NEW.variation_id::text;

  IF variation_parent_id IS NULL THEN
    RAISE EXCEPTION 'variation_id % não encontrado.', NEW.variation_id;
  END IF;

  IF NEW.product_id IS NULL OR btrim(NEW.product_id::text) = '' THEN
    NEW.product_id := variation_parent_id::text;
  ELSIF NEW.product_id::text <> variation_parent_id::text THEN
    RAISE EXCEPTION 'variation_id % não pertence ao product_id %', NEW.variation_id, NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;
