-- Todo pedido precisa possuir um código público real, sequencial e único.
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

    PERFORM setval(
        'public.order_index_sequence',
        GREATEST(highest_existing_index, 1),
        highest_existing_index > 0
    );
END $$;

WITH ranked_codes AS (
    SELECT id,
           COALESCE(order_data ->> 'orderIndex', '') ~ '^[1-9][0-9]{0,5}$' AS is_valid,
           ROW_NUMBER() OVER (
               PARTITION BY order_data ->> 'orderIndex'
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
  FROM ranked_codes AS source
 WHERE target.id = source.id
   AND (NOT source.is_valid OR source.duplicate_position > 1);

DROP TRIGGER IF EXISTS assign_order_index_before_insert ON public.orders;

DROP INDEX IF EXISTS public.orders_order_index_unique;
CREATE UNIQUE INDEX orders_order_index_unique
    ON public.orders ((order_data ->> 'orderIndex'));

ALTER TABLE public.orders
    DROP CONSTRAINT IF EXISTS orders_order_index_required;
ALTER TABLE public.orders
    ADD CONSTRAINT orders_order_index_required
    CHECK (COALESCE(order_data ->> 'orderIndex', '') ~ '^[1-9][0-9]{0,5}$');
