ALTER TABLE public.goods_receipts ADD COLUMN IF NOT EXISTS receipt_index integer;

CREATE SEQUENCE IF NOT EXISTS public.goods_receipt_index_sequence MINVALUE 1 MAXVALUE 999999;

DO $$
DECLARE
    highest_index integer;
BEGIN
    SELECT COALESCE(MAX(receipt_index), 0) INTO highest_index
      FROM public.goods_receipts
     WHERE receipt_index BETWEEN 1 AND 999999;
    PERFORM setval('public.goods_receipt_index_sequence', GREATEST(highest_index, 1), highest_index > 0);
END $$;

WITH numbered_receipts AS (
    SELECT id,
           receipt_index BETWEEN 1 AND 999999 AS has_valid_index,
           ROW_NUMBER() OVER (
               PARTITION BY CASE
                   WHEN receipt_index BETWEEN 1 AND 999999 THEN receipt_index::text
                   ELSE id::text
               END
               ORDER BY created_at, id
           ) AS duplicate_position
      FROM public.goods_receipts
)
UPDATE public.goods_receipts AS target
   SET receipt_index = nextval('public.goods_receipt_index_sequence')
  FROM numbered_receipts AS source
 WHERE target.id = source.id
   AND (NOT source.has_valid_index OR source.duplicate_position > 1);

CREATE OR REPLACE FUNCTION public.next_goods_receipt_index()
RETURNS integer
LANGUAGE sql
AS $$
    SELECT nextval('public.goods_receipt_index_sequence')::integer;
$$;

CREATE OR REPLACE FUNCTION public.assign_goods_receipt_index()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.receipt_index IS NULL OR NEW.receipt_index < 1 OR NEW.receipt_index > 999999
       OR EXISTS (SELECT 1 FROM public.goods_receipts WHERE receipt_index = NEW.receipt_index) THEN
        NEW.receipt_index := nextval('public.goods_receipt_index_sequence');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_goods_receipt_index_before_insert ON public.goods_receipts;
CREATE TRIGGER assign_goods_receipt_index_before_insert
    BEFORE INSERT ON public.goods_receipts
    FOR EACH ROW EXECUTE FUNCTION public.assign_goods_receipt_index();

CREATE UNIQUE INDEX IF NOT EXISTS goods_receipts_receipt_index_unique
    ON public.goods_receipts (receipt_index);
