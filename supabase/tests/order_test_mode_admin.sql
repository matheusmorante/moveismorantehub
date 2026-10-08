BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(4);

CREATE TEMP TABLE order_test_mode_guard_fixture (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_type text NOT NULL,
  linked_order_id text,
  order_data jsonb
);

CREATE TRIGGER enforce_order_test_mode_admin_fixture
  BEFORE INSERT OR UPDATE ON pg_temp.order_test_mode_guard_fixture
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_test_mode_admin();

GRANT INSERT, UPDATE ON pg_temp.order_test_mode_guard_fixture TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE pg_temp.order_test_mode_guard_fixture_id_seq TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

SELECT lives_ok(
  $$INSERT INTO pg_temp.order_test_mode_guard_fixture (order_type, order_data)
    VALUES ('sale', '{}'::jsonb)$$,
  'pedido sem marcador é permitido e permanece normal'
);
SELECT throws_ok(
  $$INSERT INTO pg_temp.order_test_mode_guard_fixture (order_type, order_data)
    VALUES ('sale', '{"is_test": true}'::jsonb)$$,
  '42501',
  'Somente administradores podem marcar ou desmarcar pedidos como teste',
  'não administrador não pode criar pedido de venda como teste'
);
SELECT throws_ok(
  $$UPDATE pg_temp.order_test_mode_guard_fixture
       SET order_data = '{"is_test": true}'::jsonb
     WHERE id = 1$$,
  '42501',
  'Somente administradores podem marcar ou desmarcar pedidos como teste',
  'não administrador não pode marcar como teste um pedido já existente'
);

RESET ROLE;
SELECT set_config(
  'request.jwt.claim.sub',
  COALESCE((
    SELECT id::text
      FROM public.profiles
     WHERE role = 'administrator'
        OR 'administrator' = ANY(COALESCE(roles, ARRAY[]::text[]))
     LIMIT 1
  ), '00000000-0000-0000-0000-000000000000'),
  true
) IS NOT NULL;
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO pg_temp.order_test_mode_guard_fixture (order_type, order_data)
    VALUES ('sale', '{"is_test": true}'::jsonb)$$,
  'administrador pode criar pedido de venda marcado explicitamente como teste'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
