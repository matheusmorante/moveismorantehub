BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(5);

CREATE TEMP TABLE order_status_guard_test (
  id integer PRIMARY KEY,
  status text NOT NULL,
  delivery_status text,
  order_data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TRIGGER prevent_fulfilled_cancellation_test
BEFORE UPDATE OF status ON order_status_guard_test
FOR EACH ROW
EXECUTE FUNCTION public.prevent_cancelling_fulfilled_order();

INSERT INTO order_status_guard_test (id, status) VALUES (1, 'scheduled'), (2, 'fulfilled');
INSERT INTO order_status_guard_test (id, status, delivery_status)
VALUES (3, 'scheduled', 'in_transit');

SELECT lives_ok(
  $$ UPDATE order_status_guard_test SET status = 'cancelled' WHERE id = 1 $$,
  'scheduled pode ser cancelado antes da circulação'
);
SELECT throws_ok(
  $$ UPDATE order_status_guard_test SET status = 'cancelled' WHERE id = 2 $$,
  '23514',
  'A mercadoria já circulou; registre uma devolução.',
  'fulfilled não pode ser cancelado'
);
SELECT throws_ok(
  $$ UPDATE order_status_guard_test SET status = 'cancelled' WHERE id = 3 $$,
  '23514',
  'A mercadoria já circulou; registre uma devolução.',
  'pedido em trânsito não pode ser cancelado'
);
SELECT lives_ok(
  $$ UPDATE order_status_guard_test SET status = 'scheduled' WHERE id = 2 $$,
  'a correção operacional fulfilled para scheduled continua permitida'
);
SELECT lives_ok(
  $$ UPDATE order_status_guard_test SET status = 'cancelled' WHERE id = 2 AND status = 'scheduled' $$,
  'pedido após correção para scheduled pode ser cancelado'
);

SELECT * FROM finish();
ROLLBACK;
