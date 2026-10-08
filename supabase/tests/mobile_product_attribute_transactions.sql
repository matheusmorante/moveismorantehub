BEGIN;

SELECT set_config('app.test_run_id', 'TEST_AUT_' || gen_random_uuid()::text, true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', current_setting('request.jwt.claim.sub'),
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL search_path = public, extensions, pg_temp;

DO $test$
DECLARE
  v_run_id text := current_setting('app.test_run_id');
  v_tap text[] := '{}';
  v_finish text;
BEGIN
  PERFORM extensions.plan(12);

  v_tap := array_append(v_tap, extensions.lives_ok(
    format(
      'SELECT public.create_mobile_product_attribute_with_values(%L, %L, NULL, ARRAY[%L, %L]::text[])',
      v_run_id || '_list', 'list', 'Azul', 'Preto'
    ),
    'cria atributo de lista e valores em uma RPC autenticada'
  ));
  v_tap := array_append(v_tap, extensions.ok(
    EXISTS (
      SELECT 1 FROM public.attributes
      WHERE name = v_run_id || '_list'
        AND active IS TRUE
        AND data_type = 'list'
        AND unit IS NULL
        AND is_globally_required IS FALSE
    ),
    'persiste metadados do atributo conforme o tipo escolhido'
  ));
  v_tap := array_append(v_tap, extensions.is(
    (
      SELECT count(*)::bigint
      FROM public.attribute_values AS value
      JOIN public.attributes AS attribute ON attribute.id = value.attribute_id
      WHERE attribute.name = v_run_id || '_list'
    ),
    2::bigint,
    'persiste os dois valores iniciais vinculados ao atributo'
  ));
  v_tap := array_append(v_tap, extensions.ok(
    (
      SELECT array_agg(value.value::text ORDER BY value.value::text) = ARRAY['Azul', 'Preto']::text[]
      FROM public.attribute_values AS value
      JOIN public.attributes AS attribute ON attribute.id = value.attribute_id
      WHERE attribute.name = v_run_id || '_list'
    ),
    'preserva os valores informados na lista'
  ));
  v_tap := array_append(v_tap, extensions.lives_ok(
    format(
      'SELECT public.create_mobile_product_attribute_with_values(%L, %L, %L, ARRAY[]::text[])',
      v_run_id || '_measure', 'measure', 'cm'
    ),
    'cria atributo de medida sem lista de opções'
  ));
  v_tap := array_append(v_tap, extensions.ok(
    EXISTS (
      SELECT 1 FROM public.attributes
      WHERE name = v_run_id || '_measure'
        AND data_type = 'measure'
        AND unit = 'cm'
    ),
    'persiste unidade somente para o tipo medida'
  ));
  v_tap := array_append(v_tap, extensions.throws_ok(
    format(
      'SELECT public.create_mobile_product_attribute_with_values(%L, %L, NULL, ARRAY[]::text[])',
      v_run_id || '_empty', 'list'
    ),
    '22023',
    'Adicione pelo menos um valor para uma lista.',
    'rejeita lista vazia como no formulário do ERP'
  ));
  v_tap := array_append(v_tap, extensions.ok(
    NOT EXISTS (SELECT 1 FROM public.attributes WHERE name = v_run_id || '_empty'),
    'não deixa atributo parcial após rejeitar lista vazia'
  ));
  v_tap := array_append(v_tap, extensions.throws_ok(
    format(
      'SELECT public.create_mobile_product_attribute_with_values(%L, %L, NULL, ARRAY[%L, %L]::text[])',
      v_run_id || '_duplicate', 'list', 'Azul', 'azul'
    ),
    '23505',
    'A lista não pode conter valores duplicados.',
    'rejeita valores duplicados sem diferença de caixa'
  ));
  v_tap := array_append(v_tap, extensions.ok(
    NOT EXISTS (SELECT 1 FROM public.attributes WHERE name = v_run_id || '_duplicate'),
    'não deixa atributo parcial após rejeitar valores duplicados'
  ));
  v_tap := array_append(v_tap, extensions.throws_ok(
    format(
      'DO $atomicity$ BEGIN PERFORM public.create_mobile_product_attribute_with_values(%L, %L, NULL, ARRAY[%L]::text[]); RAISE EXCEPTION %L USING ERRCODE = %L; END $atomicity$;',
      v_run_id || '_rollback', 'list', 'Valor',
      'Falha de teste após a gravação.', 'P0001'
    ),
    'P0001',
    'Falha de teste após a gravação.',
    'reverte atributo e valores se uma etapa posterior da transação falhar'
  ));
  v_tap := array_append(v_tap, extensions.ok(
    NOT EXISTS (SELECT 1 FROM public.attributes WHERE name = v_run_id || '_rollback'),
    'não deixa atributo nem valores após rollback da transação'
  ));

  IF EXISTS (SELECT 1 FROM unnest(v_tap) line WHERE line LIKE 'not ok%') THEN
    RAISE EXCEPTION 'pgTAP failed: %', array_to_string(v_tap, E'\n');
  END IF;

  FOR v_finish IN SELECT * FROM extensions.finish() LOOP
    IF v_finish LIKE '%failed%' OR v_finish LIKE '%planned%' THEN
      RAISE EXCEPTION '%', v_finish;
    END IF;
  END LOOP;
END;
$test$;

RESET ROLE;
ROLLBACK;

SELECT '12 pgTAP assertions passed; synthetic TEST_AUT_<uuid> fixtures rolled back' AS result;
