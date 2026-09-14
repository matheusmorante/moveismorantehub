-- Impede repetição do código público do pedido, mesmo com cadastros simultâneos.
-- Em códigos já duplicados, preserva o pedido mais antigo e renumera os demais.
BEGIN;

LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;

CREATE SEQUENCE IF NOT EXISTS public.order_index_sequence
  MINVALUE 1
  MAXVALUE 989999;

ALTER SEQUENCE public.order_index_sequence MAXVALUE 989999;

DO $$
DECLARE
  highest_existing_index bigint;
BEGIN
  SELECT COALESCE(MAX((order_data ->> 'orderIndex')::bigint), 0)
    INTO highest_existing_index
    FROM public.orders
   WHERE order_data ->> 'orderIndex' ~ '^[1-9][0-9]{0,5}$'
     AND (order_data ->> 'orderIndex')::bigint < 990000;

  PERFORM setval(
    'public.order_index_sequence',
    GREATEST(highest_existing_index, 1),
    highest_existing_index > 0
  );
END $$;

WITH duplicated_codes AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY order_data ->> 'orderIndex'
           ORDER BY created_at, id
         ) AS duplicate_position
    FROM public.orders
   WHERE order_data ->> 'orderIndex' ~ '^[1-9][0-9]{0,5}$'
), replacement_codes AS (
  SELECT id, nextval('public.order_index_sequence') AS order_index
    FROM duplicated_codes
   WHERE duplicate_position > 1
)
UPDATE public.orders AS target
   SET order_index = replacement_codes.order_index,
       order_number = replacement_codes.order_index::text,
       order_data = jsonb_set(
         COALESCE(target.order_data, '{}'::jsonb),
         '{orderIndex}',
         to_jsonb(replacement_codes.order_index)
       )
  FROM replacement_codes
 WHERE target.id = replacement_codes.id;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_index_unique
  ON public.orders ((order_data ->> 'orderIndex'))
  WHERE order_data ->> 'orderIndex' ~ '^[1-9][0-9]{0,5}$';

CREATE OR REPLACE FUNCTION public.next_order_index()
RETURNS integer
LANGUAGE sql
AS $$
  SELECT nextval('public.order_index_sequence')::integer;
$$;

CREATE OR REPLACE FUNCTION public.assign_order_index()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  assigned_index bigint;
BEGIN
  IF NEW.order_data ->> 'orderIndex' !~ '^[1-9][0-9]{0,5}$'
     OR EXISTS (
       SELECT 1
         FROM public.orders
        WHERE order_data ->> 'orderIndex' = NEW.order_data ->> 'orderIndex'
     ) THEN
    assigned_index := nextval('public.order_index_sequence');
    NEW.order_index := assigned_index;
    NEW.order_number := assigned_index::text;
    NEW.order_data := jsonb_set(
      COALESCE(NEW.order_data, '{}'::jsonb),
      '{orderIndex}',
      to_jsonb(assigned_index)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_order_index_before_insert ON public.orders;
CREATE TRIGGER assign_order_index_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_index();

COMMIT;
