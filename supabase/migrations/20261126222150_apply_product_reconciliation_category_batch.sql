-- Apply the product category and its normalized relationship as one authenticated operation.
CREATE OR REPLACE FUNCTION public.apply_product_reconciliation_category_batch(
  p_product_ids uuid[],
  p_category_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_updated_count integer;
BEGIN
  IF p_product_ids IS NULL OR cardinality(p_product_ids) = 0 THEN
    RAISE EXCEPTION 'Selecione produtos para corrigir.';
  END IF;

  IF array_position(p_product_ids, NULL::uuid) IS NOT NULL
    OR cardinality(p_product_ids) <> (
      SELECT count(DISTINCT selected.product_id)::integer
      FROM unnest(p_product_ids) AS selected(product_id)
    ) THEN
    RAISE EXCEPTION 'A seleção contém produtos repetidos ou inválidos.';
  END IF;

  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'Selecione uma categoria disponível.';
  END IF;

  UPDATE public.products AS product
  SET category_id = p_category_id
  WHERE product.id = ANY(p_product_ids);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> cardinality(p_product_ids) THEN
    RAISE EXCEPTION 'Nem todos os produtos foram confirmados. Confira a seleção e as permissões.';
  END IF;

  DELETE FROM public.product_categories AS product_category
  WHERE product_category.product_id = ANY(p_product_ids);

  INSERT INTO public.product_categories (product_id, category_id)
  SELECT selected.product_id, p_category_id
  FROM unnest(p_product_ids) AS selected(product_id);

  RETURN v_updated_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_product_reconciliation_category_batch(uuid[], uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_product_reconciliation_category_batch(uuid[], uuid)
  TO authenticated;

COMMENT ON FUNCTION public.apply_product_reconciliation_category_batch(uuid[], uuid) IS
  'Atomically updates selected products and replaces their normalized category relationship under the caller policies.';

NOTIFY pgrst, 'reload schema';
