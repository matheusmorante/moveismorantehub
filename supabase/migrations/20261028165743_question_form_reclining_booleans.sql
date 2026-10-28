-- Use question-form labels for the existing Booleano characteristics without
-- replacing their IDs, category applications, dependencies, or product values.
-- Rollback, after confirming the old names are still free:
-- UPDATE public.attributes SET name = 'Retrátil' WHERE name = 'É retrátil?';
-- UPDATE public.attributes SET name = 'Reclinável' WHERE name = 'É reclinável?';
DO $rename_boolean_characteristic_names$
DECLARE
  v_retractable_count integer;
  v_reclining_count integer;
  v_collision_count integer;
  v_updated_count integer;
BEGIN
  SELECT count(*) INTO v_retractable_count
  FROM public.attributes
  WHERE lower(public.unaccent(btrim(name))) = 'retratil'
    AND data_type = 'boolean';

  SELECT count(*) INTO v_reclining_count
  FROM public.attributes
  WHERE lower(public.unaccent(btrim(name))) = 'reclinavel'
    AND data_type = 'boolean';

  SELECT count(*) INTO v_collision_count
  FROM public.attributes
  WHERE lower(public.unaccent(regexp_replace(btrim(name), '[[:punct:][:space:]]+', '', 'g')))
    IN ('eretratil', 'ereclinavel');

  IF v_retractable_count <> 1 OR v_reclining_count <> 1 OR v_collision_count <> 0 THEN
    RAISE EXCEPTION 'Precondição falhou: esperava um Retrátil e um Reclinável Booleano, sem colisões com os novos nomes.';
  END IF;

  UPDATE public.attributes
  SET name = CASE lower(public.unaccent(btrim(name)))
    WHEN 'retratil' THEN 'É retrátil?'
    WHEN 'reclinavel' THEN 'É reclinável?'
  END
  WHERE lower(public.unaccent(btrim(name))) IN ('retratil', 'reclinavel')
    AND data_type = 'boolean';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count <> 2 THEN
    RAISE EXCEPTION 'Esperava renomear 2 características existentes; atualizei %.', v_updated_count;
  END IF;
END
$rename_boolean_characteristic_names$;
