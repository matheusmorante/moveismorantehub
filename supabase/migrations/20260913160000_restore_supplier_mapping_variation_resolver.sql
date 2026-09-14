-- Mesclagem de variações preserva a identidade e os fatos históricos.
-- A variação não canônica apenas aponta para a canônica; estoque, custo,
-- movimentações e recebimentos não são regravados por esta operação.

ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS merged_to_variation_id uuid
  REFERENCES public.product_variations(id) ON DELETE RESTRICT;

ALTER TABLE public.product_variations
  DROP CONSTRAINT IF EXISTS product_variations_cannot_merge_into_itself;

ALTER TABLE public.product_variations
  ADD CONSTRAINT product_variations_cannot_merge_into_itself
  CHECK (merged_to_variation_id IS NULL OR merged_to_variation_id <> id);

CREATE INDEX IF NOT EXISTS product_variations_merged_to_variation_id_idx
  ON public.product_variations (merged_to_variation_id)
  WHERE merged_to_variation_id IS NOT NULL;

-- Resolve uma cadeia legada para a variação canônica sem alterar o UUID
-- armazenado no fato de origem.
CREATE OR REPLACE FUNCTION public.resolve_canonical_variation_id(p_variation_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH RECURSIVE variation_chain AS (
    SELECT id, merged_to_variation_id, ARRAY[id] AS visited
    FROM public.product_variations
    WHERE id = p_variation_id

    UNION ALL

    SELECT next_variation.id, next_variation.merged_to_variation_id,
           variation_chain.visited || next_variation.id
    FROM variation_chain
    JOIN public.product_variations AS next_variation
      ON next_variation.id = variation_chain.merged_to_variation_id
    WHERE NOT next_variation.id = ANY (variation_chain.visited)
  )
  SELECT id
  FROM variation_chain
  WHERE merged_to_variation_id IS NULL
  ORDER BY cardinality(visited) DESC
  LIMIT 1;
$$;

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


REVOKE ALL ON FUNCTION public.resolve_canonical_variation_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_canonical_variation_id(uuid) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';

