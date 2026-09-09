-- Identidade de variação: SKU é comercial; relações internas usam UUID.
-- Dados legados inválidos são preservados em `legacy_variation_id` antes da
-- conversão. Não há qualquer tentativa de reencontrá-los pelo SKU.

DO $$
DECLARE
  variation_id_type text;
BEGIN
  SELECT data_type
    INTO variation_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'inventory_moves'
    AND column_name = 'variation_id';

  IF variation_id_type = 'text' THEN
    ALTER TABLE public.inventory_moves
      ADD COLUMN IF NOT EXISTS legacy_variation_id text;

    UPDATE public.inventory_moves
       SET legacy_variation_id = variation_id
     WHERE variation_id IS NOT NULL
       AND btrim(variation_id) <> ''
       AND variation_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE public.inventory_moves
      ALTER COLUMN variation_id TYPE uuid
      USING CASE
        WHEN variation_id IS NULL OR btrim(variation_id) = '' THEN NULL
        WHEN variation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN variation_id::uuid
        ELSE NULL
      END;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_moves_variation_id_fkey'
      AND conrelid = 'public.inventory_moves'::regclass
  ) THEN
    -- NOT VALID mantém o histórico que já existia, mas exige uma variação
    -- persistida para toda nova movimentação que informe variation_id.
    ALTER TABLE public.inventory_moves
      ADD CONSTRAINT inventory_moves_variation_id_fkey
      FOREIGN KEY (variation_id)
      REFERENCES public.product_variations(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS inventory_moves_variation_id_idx
  ON public.inventory_moves (variation_id)
  WHERE variation_id IS NOT NULL;

-- Valida UUIDs de variações quando JSON operacional novo é gravado. A regra
-- aceita itens históricos sem variationId, mas nunca aceita um variationId
-- inexistente ou malformado como se fosse um SKU.
CREATE OR REPLACE FUNCTION public.assert_variation_ids_in_items(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  raw_variation_id text;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    raw_variation_id := NULLIF(btrim(item->>'variationId'), '');
    IF raw_variation_id IS NULL THEN
      CONTINUE;
    END IF;

    IF raw_variation_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'variationId inválido: %', raw_variation_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.product_variations WHERE id = raw_variation_id::uuid) THEN
      RAISE EXCEPTION 'variationId não encontrado: %', raw_variation_id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_order_variation_ids()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.assert_variation_ids_in_items(NEW.order_data->'items');
  PERFORM public.assert_variation_ids_in_items(NEW.order_data->'assistanceItems');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_variation_ids_before_write ON public.orders;
CREATE TRIGGER validate_order_variation_ids_before_write
  BEFORE INSERT OR UPDATE OF order_data ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_variation_ids();

CREATE OR REPLACE FUNCTION public.validate_purchase_variation_ids()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.assert_variation_ids_in_items(NEW.items);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_purchase_variation_ids_before_write ON public.purchases;
CREATE TRIGGER validate_purchase_variation_ids_before_write
  BEFORE INSERT OR UPDATE OF items ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.validate_purchase_variation_ids();

DROP TRIGGER IF EXISTS validate_goods_receipt_variation_ids_before_write ON public.goods_receipts;
CREATE TRIGGER validate_goods_receipt_variation_ids_before_write
  BEFORE INSERT OR UPDATE OF items ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.validate_purchase_variation_ids();
