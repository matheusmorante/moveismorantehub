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

-- Executa a mesclagem em uma única transação. Os fornecedores pertencem ao
-- produto pai, portanto o conjunto do pai não canônico é unido ao do pai
-- canônico. O fornecedor principal do canônico só muda se ele ainda não tiver
-- um, preservando a prioridade que já foi definida pelo operador.
CREATE OR REPLACE FUNCTION public.merge_product_variation_into_canonical(
  p_non_canonical_variation_id uuid,
  p_canonical_variation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_non_canonical record;
  v_canonical record;
  v_non_canonical_supplier_ids uuid[];
  v_canonical_supplier_ids uuid[];
  v_merged_supplier_ids uuid[];
  v_transferred_supplier_ids uuid[];
  v_fallback_main_supplier_id uuid;
BEGIN
  IF p_non_canonical_variation_id IS NULL
     OR p_canonical_variation_id IS NULL THEN
    RAISE EXCEPTION 'As variações não canônica e canônica são obrigatórias.';
  END IF;

  IF p_non_canonical_variation_id = p_canonical_variation_id THEN
    RAISE EXCEPTION 'Uma variação não pode ser mesclada nela mesma.';
  END IF;

  -- Lock em ordem estável para evitar corrida/deadlock entre mesclagens.
  PERFORM 1
  FROM public.product_variations
  WHERE id IN (p_non_canonical_variation_id, p_canonical_variation_id)
  ORDER BY id
  FOR UPDATE;

  SELECT variation.id, variation.product_id, variation.merged_to_variation_id,
         product.supplier_id, product.main_supplier_id, product.supplier_ids
    INTO v_non_canonical
  FROM public.product_variations AS variation
  JOIN public.products AS product ON product.id = variation.product_id
  WHERE variation.id = p_non_canonical_variation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variação não canônica % não encontrada.', p_non_canonical_variation_id;
  END IF;

  SELECT variation.id, variation.product_id, variation.merged_to_variation_id,
         product.supplier_id, product.main_supplier_id, product.supplier_ids
    INTO v_canonical
  FROM public.product_variations AS variation
  JOIN public.products AS product ON product.id = variation.product_id
  WHERE variation.id = p_canonical_variation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variação canônica % não encontrada.', p_canonical_variation_id;
  END IF;

  IF v_non_canonical.merged_to_variation_id IS NOT NULL THEN
    RAISE EXCEPTION 'A variação % já está mesclada em %.',
      p_non_canonical_variation_id, v_non_canonical.merged_to_variation_id;
  END IF;

  IF v_canonical.merged_to_variation_id IS NOT NULL THEN
    RAISE EXCEPTION 'A variação canônica % já aponta para outra variação; informe a canônica final.',
      p_canonical_variation_id;
  END IF;

  v_non_canonical_supplier_ids := ARRAY(
    SELECT DISTINCT supplier_id
    FROM unnest(COALESCE(v_non_canonical.supplier_ids, '{}'::uuid[]) ||
                ARRAY[v_non_canonical.supplier_id, v_non_canonical.main_supplier_id]) AS supplier_id
    WHERE supplier_id IS NOT NULL
  );

  v_canonical_supplier_ids := ARRAY(
    SELECT DISTINCT supplier_id
    FROM unnest(COALESCE(v_canonical.supplier_ids, '{}'::uuid[]) ||
                ARRAY[v_canonical.supplier_id, v_canonical.main_supplier_id]) AS supplier_id
    WHERE supplier_id IS NOT NULL
  );

  v_merged_supplier_ids := ARRAY(
    SELECT DISTINCT supplier_id
    FROM unnest(v_canonical_supplier_ids || v_non_canonical_supplier_ids) AS supplier_id
    WHERE supplier_id IS NOT NULL
  );

  v_transferred_supplier_ids := ARRAY(
    SELECT supplier_id
    FROM unnest(v_non_canonical_supplier_ids) AS supplier_id
    WHERE NOT supplier_id = ANY(v_canonical_supplier_ids)
  );

  v_fallback_main_supplier_id := COALESCE(
    v_canonical.main_supplier_id,
    v_canonical.supplier_id,
    v_non_canonical.main_supplier_id,
    v_non_canonical.supplier_id,
    v_merged_supplier_ids[1]
  );

  UPDATE public.products
  SET supplier_ids = COALESCE(v_merged_supplier_ids, '{}'::uuid[]),
      main_supplier_id = v_fallback_main_supplier_id,
      supplier_id = COALESCE(v_canonical.supplier_id, v_fallback_main_supplier_id),
      updated_at = now()
  WHERE id = v_canonical.product_id;

  UPDATE public.product_variations
  SET merged_to_variation_id = p_canonical_variation_id,
      status = 'hidden'
  WHERE id = p_non_canonical_variation_id;

  RETURN jsonb_build_object(
    'success', true,
    'nonCanonicalVariationId', p_non_canonical_variation_id,
    'canonicalVariationId', p_canonical_variation_id,
    'transferredSupplierIds', COALESCE(to_jsonb(v_transferred_supplier_ids), '[]'::jsonb),
    'canonicalSupplierIds', COALESCE(to_jsonb(v_merged_supplier_ids), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_canonical_variation_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_product_variation_into_canonical(uuid, uuid) TO authenticated;
