-- Retorna a versão exata gravada dentro da mesma transação da RPC de Produto.
-- O ACK acompanha a chave idempotente existente para que uma repetição após timeout
-- recupere a versão original, sem anunciar como salva uma edição posterior.
ALTER TABLE public.mobile_product_save_operations
  ADD COLUMN IF NOT EXISTS result_updated_at timestamptz;

COMMENT ON COLUMN public.mobile_product_save_operations.result_updated_at IS
  'Versão de products.updated_at confirmada pela RPC versionada, vinculada à operação idempotente.';

CREATE OR REPLACE FUNCTION public.save_mobile_product_transaction_with_version(
  p_operation_id uuid,
  p_expected_updated_at timestamptz,
  p_is_edit boolean,
  p_product_id uuid,
  p_product jsonb,
  p_images jsonb,
  p_category_ids uuid[],
  p_variations jsonb
)
RETURNS TABLE(product_id uuid, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_saved_product_id uuid;
  v_saved_updated_at timestamptz;
  v_prior_updated_at timestamptz;
  v_had_prior_operation boolean := false;
  v_rows_updated integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para salvar o produto.'
      USING ERRCODE = '28000';
  END IF;

  SELECT operation.result_updated_at
    INTO v_prior_updated_at
    FROM public.mobile_product_save_operations AS operation
   WHERE operation.user_id = v_user_id
     AND operation.operation_id = p_operation_id
   FOR UPDATE;
  v_had_prior_operation := FOUND;

  v_saved_product_id := public.save_mobile_product_transaction(
    p_operation_id,
    p_expected_updated_at,
    p_is_edit,
    p_product_id,
    p_product,
    p_images,
    p_category_ids,
    p_variations
  );

  -- A chamada interna valida a chave e o payload idempotente antes de reutilizar ACK.
  SELECT operation.result_updated_at
    INTO v_prior_updated_at
    FROM public.mobile_product_save_operations AS operation
   WHERE operation.user_id = v_user_id
     AND operation.operation_id = p_operation_id
     AND operation.product_id = v_saved_product_id
   FOR UPDATE;
  IF FOUND AND v_prior_updated_at IS NOT NULL THEN
    RETURN QUERY SELECT v_saved_product_id, v_prior_updated_at;
    RETURN;
  END IF;

  IF v_had_prior_operation THEN
    RAISE EXCEPTION 'A versão deste salvamento antigo não pode ser confirmada. Reabra o produto antes de continuar.'
      USING ERRCODE = '40001';
  END IF;

  SELECT product.updated_at
    INTO v_saved_updated_at
    FROM public.products AS product
   WHERE product.id = v_saved_product_id
     AND COALESCE(product.deleted, false) = false
   FOR UPDATE;

  IF NOT FOUND OR v_saved_updated_at IS NULL THEN
    RAISE EXCEPTION 'O produto foi salvo, mas sua versão não pôde ser confirmada.'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.mobile_product_save_operations AS operation
     SET result_updated_at = v_saved_updated_at
   WHERE operation.user_id = v_user_id
     AND operation.operation_id = p_operation_id
     AND operation.product_id = v_saved_product_id
     AND operation.result_updated_at IS NULL;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated <> 1 THEN
    SELECT operation.result_updated_at
      INTO v_prior_updated_at
      FROM public.mobile_product_save_operations AS operation
     WHERE operation.user_id = v_user_id
       AND operation.operation_id = p_operation_id
       AND operation.product_id = v_saved_product_id
     FOR UPDATE;
    IF NOT FOUND OR v_prior_updated_at IS NULL THEN
      RAISE EXCEPTION 'O ACK de versão do produto não pôde ser persistido.'
        USING ERRCODE = '40001';
    END IF;
    v_saved_updated_at := v_prior_updated_at;
  END IF;

  RETURN QUERY SELECT v_saved_product_id, v_saved_updated_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_mobile_product_transaction_with_version(
  uuid, timestamptz, boolean, uuid, jsonb, jsonb, uuid[], jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_mobile_product_transaction_with_version(
  uuid, timestamptz, boolean, uuid, jsonb, jsonb, uuid[], jsonb
) TO authenticated;
