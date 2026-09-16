-- Migration to create an RPC that checks if variations are in use across multiple operation tables
-- This is used to disable the "Delete Variation" button in the Product Form if the variation has history.

CREATE OR REPLACE FUNCTION public.get_variations_in_use(p_variation_ids uuid[])
RETURNS uuid[]
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_used_ids uuid[];
  v_variation_ids_text text[];
BEGIN
  -- Cast uuid array to text array for tables that store variation_id as text (e.g. order_items)
  v_variation_ids_text := array(SELECT unnest(p_variation_ids)::text);

  SELECT array_agg(DISTINCT variation_id_uuid) INTO v_used_ids
  FROM (
    -- Order items (sales, assistances, returns)
    SELECT NULLIF(variation_id, '')::uuid AS variation_id_uuid FROM public.order_items WHERE variation_id = ANY(v_variation_ids_text)
    UNION ALL
    -- Purchases
    SELECT NULLIF(variation_id, '')::uuid AS variation_id_uuid FROM public.purchase_items WHERE variation_id = ANY(v_variation_ids_text)
    UNION ALL
    -- Goods Receipts
    SELECT variation_id AS variation_id_uuid FROM public.goods_receipt_items WHERE variation_id = ANY(p_variation_ids)
    UNION ALL
    -- Inbound Invoices (NFe)
    SELECT variation_id AS variation_id_uuid FROM public.inbound_invoice_items WHERE variation_id = ANY(p_variation_ids)
  ) sub
  WHERE variation_id_uuid IS NOT NULL;

  RETURN COALESCE(v_used_ids, ARRAY[]::uuid[]);
END;
$$;

-- Grant execution permissions
REVOKE ALL ON FUNCTION public.get_variations_in_use(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_variations_in_use(uuid[]) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
