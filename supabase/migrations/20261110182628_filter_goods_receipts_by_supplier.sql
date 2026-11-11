BEGIN;

CREATE OR REPLACE FUNCTION public.filter_goods_receipts_by_supplier(
  p_supplier_id text,
  p_supplier_name text
)
RETURNS SETOF public.goods_receipts
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT receipt.*
  FROM public.goods_receipts AS receipt
  WHERE
    (p_supplier_id IS NOT NULL AND receipt.supplier_id = p_supplier_id)
    OR (
      p_supplier_name IS NOT NULL
      AND receipt.supplier_name IS NOT NULL
      AND (
        strpos(lower(receipt.supplier_name), lower(p_supplier_name)) > 0
        OR strpos(lower(p_supplier_name), lower(receipt.supplier_name)) > 0
      )
    );
$function$;

REVOKE ALL ON FUNCTION public.filter_goods_receipts_by_supplier(text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.filter_goods_receipts_by_supplier(text, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
