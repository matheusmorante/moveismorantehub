-- Test receipts are identified in the existing observation JSON metadata.
-- Keep them unnumbered so neither a browser RPC nor the INSERT trigger can
-- consume the commercial goods-receipt sequence.
BEGIN;

CREATE OR REPLACE FUNCTION public.assign_goods_receipt_index()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    IF public.test_artifact_is_test(to_jsonb(NEW)) THEN
        NEW.receipt_index := NULL;
        RETURN NEW;
    END IF;

    IF NEW.receipt_index IS NULL OR NEW.receipt_index < 1 OR NEW.receipt_index > 999999
       OR EXISTS (
           SELECT 1
             FROM public.goods_receipts
            WHERE receipt_index = NEW.receipt_index
       ) THEN
        NEW.receipt_index := nextval('public.goods_receipt_index_sequence');
    END IF;
    RETURN NEW;
END;
$function$;

-- Both application and trigger use a fully qualified sequence; pin their
-- search_path to prevent name-resolution changes from affecting allocation.
ALTER FUNCTION public.next_goods_receipt_index() SET search_path = '';

COMMIT;
