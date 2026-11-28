-- Apply a normalized NCM to selected products without replacing other fiscal JSONB keys.
CREATE OR REPLACE FUNCTION public.apply_product_reconciliation_ncm_batch(
  p_product_ids uuid[],
  p_ncm text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_product record;
  v_selected_count integer := 0;
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

  IF p_ncm IS NULL OR p_ncm !~ '^[0-9]{8}$' THEN
    RAISE EXCEPTION 'Informe um NCM válido com 8 dígitos.';
  END IF;

  FOR v_product IN
    SELECT product.id, product.fiscal
    FROM public.products AS product
    WHERE product.id = ANY(p_product_ids)
    ORDER BY product.id
    FOR UPDATE
  LOOP
    v_selected_count := v_selected_count + 1;

    IF v_product.fiscal IS NOT NULL
      AND jsonb_typeof(v_product.fiscal) NOT IN ('object', 'null') THEN
      RAISE EXCEPTION 'Os dados fiscais atuais precisam de revisão antes de alterar o NCM.';
    END IF;
  END LOOP;

  IF v_selected_count <> cardinality(p_product_ids) THEN
    RAISE EXCEPTION 'Produto não encontrado para a correção de NCM ou sem permissão de edição.';
  END IF;

  UPDATE public.products AS product
  SET fiscal = jsonb_set(
    COALESCE(NULLIF(product.fiscal, 'null'::jsonb), '{}'::jsonb),
    '{ncm}',
    to_jsonb(p_ncm),
    true
  )
  WHERE product.id = ANY(p_product_ids);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> cardinality(p_product_ids) THEN
    RAISE EXCEPTION 'Nem todos os produtos foram confirmados. Confira a seleção e as permissões.';
  END IF;

  RETURN v_updated_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_product_reconciliation_ncm_batch(uuid[], text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_product_reconciliation_ncm_batch(uuid[], text)
  TO authenticated;

COMMENT ON FUNCTION public.apply_product_reconciliation_ncm_batch(uuid[], text) IS
  'Atomically updates only the NCM key on selected product fiscal JSONB under the caller policies.';

NOTIFY pgrst, 'reload schema';
