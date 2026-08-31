-- Human-facing order codes are numeric and shared by sales, pickup, delivery and assistance orders.
-- The UUID remains the internal primary key; order_data.orderIndex is the six-digit public code.

CREATE SEQUENCE IF NOT EXISTS public.order_index_sequence MINVALUE 1 MAXVALUE 999999;

CREATE OR REPLACE FUNCTION public.next_order_index()
RETURNS integer
LANGUAGE sql
AS $$
    SELECT nextval('public.order_index_sequence')::integer;
$$;

DO $$
DECLARE
    highest_existing_index bigint;
BEGIN
    SELECT COALESCE(MAX((order_data ->> 'orderIndex')::bigint), 0)
      INTO highest_existing_index
      FROM public.orders
     WHERE COALESCE(order_data ->> 'orderIndex', '') ~ '^[1-9][0-9]{0,5}$';

    PERFORM setval('public.order_index_sequence', GREATEST(highest_existing_index, 1), highest_existing_index > 0);
END $$;

WITH numbered_orders AS (
    SELECT id,
           COALESCE(order_data ->> 'orderIndex', '') ~ '^[1-9][0-9]{0,5}$' AS has_valid_index,
           ROW_NUMBER() OVER (
               PARTITION BY CASE
                   WHEN COALESCE(order_data ->> 'orderIndex', '') ~ '^[1-9][0-9]{0,5}$'
                       THEN order_data ->> 'orderIndex'
                   ELSE id::text
               END
               ORDER BY created_at, id
           ) AS duplicate_position
      FROM public.orders
)
UPDATE public.orders AS target
   SET order_data = jsonb_set(
       COALESCE(target.order_data, '{}'::jsonb),
       '{orderIndex}',
       to_jsonb(nextval('public.order_index_sequence'))
   )
  FROM numbered_orders AS source
 WHERE target.id = source.id
   AND (NOT source.has_valid_index OR source.duplicate_position > 1);

CREATE OR REPLACE FUNCTION public.assign_order_index()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    assigned_index bigint;
BEGIN
    IF COALESCE(NEW.order_data ->> 'orderIndex', '') !~ '^[1-9][0-9]{0,5}$'
       OR EXISTS (
           SELECT 1
             FROM public.orders
            WHERE order_data ->> 'orderIndex' = NEW.order_data ->> 'orderIndex'
       ) THEN
        assigned_index := nextval('public.order_index_sequence');
        NEW.order_data := jsonb_set(COALESCE(NEW.order_data, '{}'::jsonb), '{orderIndex}', to_jsonb(assigned_index));
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_order_index_before_insert ON public.orders;
CREATE TRIGGER assign_order_index_before_insert
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.assign_order_index();

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_index_unique
    ON public.orders ((order_data ->> 'orderIndex'))
    WHERE COALESCE(order_data ->> 'orderIndex', '') ~ '^[1-9][0-9]{0,5}$';
