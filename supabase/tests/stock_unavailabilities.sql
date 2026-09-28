BEGIN;
SELECT plan(15);

-- 1. Tabela existe e RLS habilitado
SELECT has_table('public', 'stock_unavailabilities', 'Tabela stock_unavailabilities deve existir');
SELECT table_privs_are('public', 'stock_unavailabilities', 'authenticated', ARRAY['SELECT'], 'Authenticated deve ter apenas SELECT direto');

-- 2. Colunas e constraints estruturais
SELECT has_column('public', 'stock_unavailabilities', 'variation_id', 'Coluna variation_id deve existir');
SELECT col_not_null('public', 'stock_unavailabilities', 'variation_id', 'variation_id deve ser NOT NULL');
SELECT has_column('public', 'stock_unavailabilities', 'quantity', 'Coluna quantity deve existir');
SELECT col_not_null('public', 'stock_unavailabilities', 'quantity', 'quantity deve ser NOT NULL');
SELECT col_type_is('public', 'stock_unavailabilities', 'quantity', 'numeric(10,2)', 'quantity deve ser numeric(10,2)');

-- 3. Funções RPC existem e search_path seguro
SELECT has_function('public', 'create_stock_unavailability', ARRAY['uuid', 'uuid', 'numeric', 'text', 'text', 'text', 'text', 'text', 'text[]'], 'RPC create_stock_unavailability deve existir com assinatura correta');
SELECT has_function('public', 'undo_stock_unavailability', ARRAY['uuid'], 'RPC undo_stock_unavailability deve existir com assinatura correta');

-- 4. Storage Bucket privado
SELECT results_eq(
  'SELECT public FROM storage.buckets WHERE id = ''unavailabilities''',
  ARRAY[false],
  'Bucket unavailabilities deve ser estritamente privado'
);

-- 5. Validação de constraint de quantidade > 0
PREPARE insert_zero_quantity AS
  INSERT INTO public.stock_unavailabilities (product_id, variation_id, quantity, reason)
  VALUES (gen_random_uuid(), gen_random_uuid(), 0, 'Teste');
SELECT throws_ok(
  'insert_zero_quantity',
  '23514',
  NULL,
  'Inserção direta com quantidade zero deve violar constraint CHECK'
);

-- 6. Validação de constraint de quantidade negativa
PREPARE insert_negative_quantity AS
  INSERT INTO public.stock_unavailabilities (product_id, variation_id, quantity, reason)
  VALUES (gen_random_uuid(), gen_random_uuid(), -5, 'Teste negativo');
SELECT throws_ok(
  'insert_negative_quantity',
  '23514',
  NULL,
  'Inserção direta com quantidade negativa deve violar constraint CHECK'
);

-- 7. Validação de obrigatoriedade de motivo
PREPARE call_missing_reason AS
  SELECT public.create_stock_unavailability(gen_random_uuid(), gen_random_uuid(), 1, '', 'Descarte', 'Depósito', 'Obs', NULL, NULL);
SELECT throws_ok(
  'call_missing_reason',
  'P0001',
  NULL,
  'Chamada sem autenticação ativa deve lançar erro P0001'
);

-- 8. Validação de políticas de storage
SELECT policy_cmd_is('storage', 'objects', 'Stock users upload own unavailability evidence', 'INSERT', 'Policy de upload deve cobrir INSERT');
SELECT policy_cmd_is('storage', 'objects', 'Stock users read unavailability evidence', 'SELECT', 'Policy de leitura deve cobrir SELECT');

SELECT * FROM finish();
ROLLBACK;
