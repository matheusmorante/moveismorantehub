CREATE OR REPLACE FUNCTION public.get_supplier_deletion_counts(p_supplier_ids text[])
RETURNS TABLE (
  supplier_id text,
  product_count bigint,
  purchase_count bigint,
  receipt_count bigint,
  inventory_count bigint,
  invoice_count bigint,
  unavailability_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  WITH requested AS (
    SELECT DISTINCT pg_catalog.btrim(requested_id) AS supplier_id
      FROM pg_catalog.unnest(COALESCE(p_supplier_ids, ARRAY[]::text[])) AS requested_ids(requested_id)
     WHERE pg_catalog.btrim(requested_id) <> ''
  )
  SELECT requested.supplier_id,
    (
      SELECT pg_catalog.count(DISTINCT product.id)
        FROM public.products AS product
       WHERE product.supplier_id::text = requested.supplier_id
          OR product.main_supplier_id::text = requested.supplier_id
          OR EXISTS (
               SELECT 1
                 FROM pg_catalog.unnest(COALESCE(product.supplier_ids, ARRAY[]::uuid[])) AS linked_supplier(id)
                WHERE linked_supplier.id::text = requested.supplier_id
             )
          OR EXISTS (
               SELECT 1
                 FROM public.product_supplier_codes AS supplier_code
                 LEFT JOIN public.product_variations AS variation
                   ON variation.id = supplier_code.product_variation_id
                WHERE supplier_code.supplier_id = requested.supplier_id
                  AND COALESCE(supplier_code.product_id, variation.product_id) = product.id
             )
    ) AS product_count,
    (
      SELECT pg_catalog.count(*)
        FROM public.purchases AS purchase
       WHERE purchase.supplier_id = requested.supplier_id
    ) AS purchase_count,
    (
      SELECT pg_catalog.count(*)
        FROM public.goods_receipts AS receipt
        LEFT JOIN public.purchases AS purchase ON purchase.id = receipt.purchase_id
       WHERE receipt.supplier_id = requested.supplier_id
          OR purchase.supplier_id = requested.supplier_id
    ) AS receipt_count,
    (
      SELECT pg_catalog.count(DISTINCT COALESCE(move.related_entity_id, move.id::text))
        FROM public.inventory_moves AS move
       WHERE move.label LIKE 'Inventário #%'
         AND CASE
               WHEN pg_catalog.pg_input_is_valid(move.observation, 'jsonb')
                 THEN move.observation::jsonb ->> 'supplierId' = requested.supplier_id
               ELSE false
             END
    ) AS inventory_count,
    (
      SELECT pg_catalog.count(*)
        FROM public.inbound_invoices AS invoice
       WHERE invoice.supplier_id = requested.supplier_id
    ) AS invoice_count,
    (
      SELECT pg_catalog.count(*)
        FROM public.stock_unavailabilities AS unavailability
       WHERE unavailability.supplier_id = requested.supplier_id
    ) AS unavailability_count
  FROM requested;
$function$;

REVOKE ALL ON FUNCTION public.get_supplier_deletion_counts(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_supplier_deletion_counts(text[]) TO authenticated;

CREATE POLICY people_delete_unlinked_suppliers
  ON public.people
  FOR DELETE
  TO authenticated
  USING (
    person_type ILIKE 'supplier%'
    AND EXISTS (
      SELECT 1
        FROM public.get_supplier_deletion_counts(ARRAY[id]) AS counts
       WHERE counts.supplier_id = id
         AND counts.product_count = 0
         AND counts.purchase_count = 0
         AND counts.receipt_count = 0
         AND counts.inventory_count = 0
         AND counts.invoice_count = 0
         AND counts.unavailability_count = 0
    )
  );

CREATE OR REPLACE FUNCTION public.delete_supplier_if_unlinked(p_supplier_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_deleted boolean;
BEGIN
  DELETE FROM public.people AS supplier
   WHERE supplier.id = p_supplier_id
     AND supplier.person_type ILIKE 'supplier%'
  RETURNING true INTO v_deleted;

  RETURN COALESCE(v_deleted, false);
EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_supplier_if_unlinked(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_supplier_if_unlinked(text) TO authenticated;
