-- Integridade de identidade operacional.
-- UUIDs de variação identificam itens vendáveis; SKU é somente comercial.

-- Auditoria somente-leitura: executar/consultar antes de qualquer conversão de
-- inventory_moves.product_id. Não há conversão automática de dados legados.
CREATE OR REPLACE VIEW public.inventory_move_identity_audit AS
SELECT
  move.id,
  move.product_id,
  move.variation_id,
  CASE
    WHEN move.product_id IS NULL OR btrim(move.product_id) = '' THEN 'missing_product_id'
    WHEN move.product_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'non_uuid_product_id'
    WHEN parent.id IS NULL THEN 'orphan_product_id'
    WHEN move.variation_id IS NOT NULL AND variation_record.id IS NULL THEN 'orphan_variation_id'
    WHEN move.variation_id IS NOT NULL AND variation_record.product_id <> parent.id THEN 'product_variation_mismatch'
    ELSE 'valid'
  END AS identity_status
FROM public.inventory_moves AS move
LEFT JOIN public.products AS parent
  ON parent.id::text = move.product_id
-- Algumas bases legadas ainda mantêm inventory_moves.variation_id como texto.
-- A auditoria precisa ler ambos os formatos sem conversão destrutiva.
LEFT JOIN public.product_variations AS variation_record
  ON variation_record.id::text = move.variation_id::text;

-- Valida itens JSON novos/alterados sem reinterpretar SKU ou descrição.
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
    raw_product_id := NULLIF(btrim(item->>'productId'), '');
    raw_variation_id := NULLIF(btrim(item->>'variationId'), '');

    -- Itens temporários não são fatos de estoque e permanecem sem vínculo.
    IF COALESCE((item->>'isTemporaryProduct')::boolean, false) THEN
      CONTINUE;
    END IF;

    IF raw_variation_id IS NOT NULL AND raw_variation_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'variationId inválido: %', raw_variation_id;
    END IF;

    IF raw_product_id IS NOT NULL AND raw_product_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'productId inválido: %', raw_product_id;
    END IF;

    IF raw_variation_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.product_variations WHERE id = raw_variation_id::uuid
    ) THEN
      RAISE EXCEPTION 'variationId não encontrado: %', raw_variation_id;
    END IF;

    IF raw_product_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.products WHERE id = raw_product_id::uuid
    ) THEN
      RAISE EXCEPTION 'productId não encontrado: %', raw_product_id;
    END IF;

    IF raw_product_id IS NOT NULL AND raw_variation_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.product_variations
      WHERE id = raw_variation_id::uuid
        AND product_id = raw_product_id::uuid
    ) THEN
      RAISE EXCEPTION 'variationId % não pertence ao productId %', raw_variation_id, raw_product_id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_catalog_json_item_identities()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    PERFORM public.assert_catalog_item_identities(NEW.order_data->'items');
    PERFORM public.assert_catalog_item_identities(NEW.order_data->'assistanceItems');
  ELSE
    PERFORM public.assert_catalog_item_identities(NEW.items);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_catalog_json_item_identities_before_write ON public.orders;
CREATE TRIGGER validate_catalog_json_item_identities_before_write
  BEFORE INSERT OR UPDATE OF order_data ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_catalog_json_item_identities();

DROP TRIGGER IF EXISTS validate_catalog_json_item_identities_before_write ON public.purchases;
CREATE TRIGGER validate_catalog_json_item_identities_before_write
  BEFORE INSERT OR UPDATE OF items ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.validate_catalog_json_item_identities();

DROP TRIGGER IF EXISTS validate_catalog_json_item_identities_before_write ON public.goods_receipts;
CREATE TRIGGER validate_catalog_json_item_identities_before_write
  BEFORE INSERT OR UPDATE OF items ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.validate_catalog_json_item_identities();

-- Protege uma movimentação nova/alterada contra pai e variação cruzados.
-- Movimentos legados sem variação não são reescritos por esta migration.
CREATE OR REPLACE FUNCTION public.validate_inventory_move_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.variation_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.product_id IS NULL
     OR NEW.product_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Movimentação com variation_id exige product_id UUID válido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.product_variations
    WHERE id::text = NEW.variation_id::text
      AND product_id::text = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'variation_id % não pertence ao product_id %', NEW.variation_id, NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_inventory_move_identity_before_write ON public.inventory_moves;
CREATE TRIGGER validate_inventory_move_identity_before_write
  BEFORE INSERT OR UPDATE OF product_id, variation_id ON public.inventory_moves
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_move_identity();

-- Impede ciclo em qualquer atualização direta de merged_to_variation_id.
CREATE OR REPLACE FUNCTION public.prevent_product_variation_merge_cycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_id uuid;
  next_id uuid;
BEGIN
  IF NEW.merged_to_variation_id IS NULL THEN
    RETURN NEW;
  END IF;

  current_id := NEW.merged_to_variation_id;
  LOOP
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Mesclagem de variações não pode formar ciclo.';
    END IF;

    SELECT merged_to_variation_id INTO next_id
    FROM public.product_variations
    WHERE id = current_id;

    EXIT WHEN next_id IS NULL;
    current_id := next_id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_product_variation_merge_cycle_before_write ON public.product_variations;
CREATE TRIGGER prevent_product_variation_merge_cycle_before_write
  BEFORE INSERT OR UPDATE OF merged_to_variation_id ON public.product_variations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_product_variation_merge_cycle();

CREATE OR REPLACE FUNCTION public.get_variation_merge_family(p_canonical_variation_id uuid)
RETURNS TABLE (variation_id uuid, canonical_variation_id uuid)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT variation.id, p_canonical_variation_id
  FROM public.product_variations AS variation
  WHERE public.resolve_canonical_variation_id(variation.id) = p_canonical_variation_id;
$$;

GRANT SELECT ON public.inventory_move_identity_audit TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_catalog_item_identities(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_variation_merge_family(uuid) TO authenticated;
