-- A faixa 990000-999999 fica reservada a testes e não influencia os códigos comerciais.
BEGIN;

LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  highest_operational_index bigint;
BEGIN
  SELECT COALESCE(MAX(order_index), 0)
    INTO highest_operational_index
    FROM public.orders
   WHERE order_index BETWEEN 1 AND 989999;

  PERFORM setval(
    'public.order_index_sequence',
    GREATEST(highest_operational_index, 1),
    highest_operational_index > 0
  );
END $$;

ALTER SEQUENCE public.order_index_sequence MAXVALUE 989999;

WITH replacement_code AS (
  SELECT nextval('public.order_index_sequence') AS order_index
)
UPDATE public.orders AS target
   SET order_index = replacement_code.order_index,
       order_number = replacement_code.order_index::text,
       order_data = jsonb_set(
         COALESCE(target.order_data, '{}'::jsonb),
         '{orderIndex}',
         to_jsonb(replacement_code.order_index)
       )
  FROM replacement_code
 WHERE target.id = 'f34d4142-f129-40d3-acba-3a38ae4ac8ad';

COMMIT;
