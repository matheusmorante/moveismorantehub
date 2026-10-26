BEGIN;

-- Reservas e reciclagem são chamadas somente pelo gatilho SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.next_goods_receipt_index()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_code integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('morantehub.goods_receipt_code_allocator', 0)
  );

  SELECT reusable.receipt_index
    INTO v_code
    FROM public.goods_receipt_reusable_codes AS reusable
   ORDER BY reusable.receipt_index
   LIMIT 1
   FOR UPDATE;

  IF FOUND THEN
    DELETE FROM public.goods_receipt_reusable_codes
     WHERE receipt_index = v_code;
    RETURN v_code;
  END IF;

  LOOP
    v_code := pg_catalog.nextval('public.goods_receipt_index_sequence'::regclass)::integer;
    EXIT WHEN NOT EXISTS (
      SELECT 1
        FROM public.goods_receipts AS receipt
       WHERE receipt.receipt_index = v_code
    );
  END LOOP;

  RETURN v_code;
END;
$function$;

REVOKE ALL ON FUNCTION public.next_goods_receipt_index()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_goods_receipt_index()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF public.test_artifact_is_test(to_jsonb(NEW)) THEN
    NEW.receipt_index := NULL;
    RETURN NEW;
  END IF;

  IF NEW.receipt_index IS NULL
     OR NEW.receipt_index < 1
     OR NEW.receipt_index > 999999
     OR EXISTS (
       SELECT 1
         FROM public.goods_receipts AS receipt
        WHERE receipt.receipt_index = NEW.receipt_index
          AND receipt.id <> NEW.id
     ) THEN
    NEW.receipt_index := public.next_goods_receipt_index();
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_goods_receipt_index()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
