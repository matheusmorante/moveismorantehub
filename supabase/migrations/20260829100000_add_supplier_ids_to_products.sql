ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS supplier_ids UUID[] DEFAULT '{}';

UPDATE public.products
SET supplier_ids = ARRAY[COALESCE(main_supplier_id, supplier_id)]::UUID[]
WHERE COALESCE(main_supplier_id, supplier_id) IS NOT NULL
  AND COALESCE(array_length(supplier_ids, 1), 0) = 0;
