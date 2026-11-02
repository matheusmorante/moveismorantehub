BEGIN;

CREATE OR REPLACE FUNCTION public.sync_goods_receipt_inventory_move_observation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_receipt_id uuid;
  v_receipt_index integer;
  v_invoice_number text;
  v_receipt_code text;
  v_source_note text;
  v_note text;
  v_reversal_reason text;
  v_meta jsonb := '{}'::jsonb;
BEGIN
  v_receipt_id := NEW.source_receipt_id;
  IF v_receipt_id IS NULL AND NEW.related_entity_type = 'goods_receipt' THEN
    BEGIN
      v_receipt_id := NULLIF(NEW.related_entity_id, '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN NEW;
    END;
  END IF;
  IF v_receipt_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT receipt.receipt_index, receipt.invoice_number
    INTO v_receipt_index, v_invoice_number
  FROM public.goods_receipts AS receipt
  WHERE receipt.id = v_receipt_id;

  v_receipt_code := CASE
    WHEN v_receipt_index IS NULL THEN v_receipt_id::text
    ELSE pg_catalog.lpad(
      v_receipt_index::text,
      GREATEST(6, pg_catalog.length(v_receipt_index::text)),
      '0'
    )
  END;
  v_source_note := 'Entrada gerada pelo recebimento #' || v_receipt_code;
  IF NULLIF(pg_catalog.btrim(v_invoice_number), '') IS NOT NULL THEN
    v_source_note := v_source_note || ' (NF-e ' || pg_catalog.btrim(v_invoice_number) || ')';
  END IF;

  IF NULLIF(pg_catalog.btrim(NEW.observation), '') IS NOT NULL THEN
    BEGIN
      v_meta := NEW.observation::jsonb;
      IF pg_catalog.jsonb_typeof(v_meta) IS DISTINCT FROM 'object' THEN
        v_meta := pg_catalog.jsonb_build_object('note', NEW.observation);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_meta := pg_catalog.jsonb_build_object('note', NEW.observation);
    END;
  END IF;

  v_note := NULLIF(pg_catalog.btrim(v_meta->>'note'), '');
  IF v_note IS NULL THEN
    v_note := v_source_note;
  ELSIF pg_catalog.strpos(v_note, v_source_note) = 0 THEN
    v_note := v_source_note || ' | ' || v_note;
  END IF;

  v_meta := pg_catalog.jsonb_set(v_meta, '{goodsReceiptId}', pg_catalog.to_jsonb(v_receipt_id), true);
  v_meta := pg_catalog.jsonb_set(v_meta, '{note}', pg_catalog.to_jsonb(v_note), true);
  v_meta := pg_catalog.jsonb_set(v_meta, '{status}', pg_catalog.to_jsonb(COALESCE(NEW.status, 'effective')), true);

  IF NEW.status IN ('reversed', 'cancelled') THEN
    v_reversal_reason := COALESCE(
      NULLIF(pg_catalog.btrim(NEW.reversal_reason), ''),
      NULLIF(pg_catalog.btrim(v_meta->>'reversalReason'), '')
    );
    IF v_reversal_reason IS NOT NULL THEN
      v_meta := pg_catalog.jsonb_set(v_meta, '{reversalReason}', pg_catalog.to_jsonb(v_reversal_reason), true);
    ELSE
      v_meta := v_meta - 'reversalReason';
    END IF;
    IF NEW.reversed_at IS NOT NULL THEN
      v_meta := pg_catalog.jsonb_set(v_meta, '{reversedAt}', pg_catalog.to_jsonb(NEW.reversed_at), true);
    END IF;
  ELSE
    v_meta := v_meta - 'reversalReason' - 'reversedAt';
  END IF;

  NEW.observation := v_meta::text;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER zz_goods_receipt_inventory_move_observation
BEFORE INSERT OR UPDATE OF source_receipt_id, related_entity_type, related_entity_id, status, reversal_reason, reversed_at, observation
ON public.inventory_moves
FOR EACH ROW
EXECUTE FUNCTION public.sync_goods_receipt_inventory_move_observation();

COMMIT;
