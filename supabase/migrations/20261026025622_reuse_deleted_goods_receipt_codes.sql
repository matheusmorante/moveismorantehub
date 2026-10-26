BEGIN;

-- Códigos liberados por rascunhos removidos são reutilizados pelo mesmo
-- alocador transacional que serve os novos recebimentos.
CREATE TABLE IF NOT EXISTS public.goods_receipt_reusable_codes (
  receipt_index integer PRIMARY KEY CHECK (receipt_index BETWEEN 1 AND 999999)
);

ALTER TABLE public.goods_receipt_reusable_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.goods_receipt_reusable_codes
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.next_goods_receipt_index()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.next_goods_receipt_index() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_goods_receipt_index() TO authenticated, service_role;

-- Upserts executam o gatilho BEFORE INSERT também para um rascunho já salvo.
-- A busca deve ignorar o próprio id para preservar seu código durante autosaves.
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

CREATE TRIGGER assign_goods_receipt_index_before_update
  BEFORE UPDATE OF receipt_index ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.assign_goods_receipt_index();

CREATE OR REPLACE FUNCTION public.delete_goods_receipt_draft_transaction(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_status text;
  v_receipt_index integer;
BEGIN
  SELECT status, receipt_index
    INTO v_status, v_receipt_index
    FROM public.goods_receipts
   WHERE id = p_receipt_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_status <> 'draft'
     OR EXISTS (
       SELECT 1
         FROM public.inventory_moves
        WHERE source_receipt_id = p_receipt_id
     ) THEN
    RAISE EXCEPTION 'Recebimento confirmado não pode ser excluído; use o estorno';
  END IF;

  IF v_receipt_index BETWEEN 1 AND 999999 THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('morantehub.goods_receipt_code_allocator', 0)
    );
    INSERT INTO public.goods_receipt_reusable_codes (receipt_index)
    VALUES (v_receipt_index)
    ON CONFLICT (receipt_index) DO NOTHING;
  END IF;

  DELETE FROM public.goods_receipt_items WHERE receipt_id = p_receipt_id;
  DELETE FROM public.goods_receipts WHERE id = p_receipt_id;
END;
$function$;

COMMIT;
