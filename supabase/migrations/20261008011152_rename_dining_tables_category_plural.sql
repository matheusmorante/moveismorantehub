-- Correct the category label to plural while preserving its ID, slug, products,
-- attributes, and existing Cozinha / Sala de Jantar parent relationships.
-- Rollback: set the name back to 'Mesa para Cozinha/Sala de Jantar'.
DO $migration$
DECLARE
  v_category_id uuid;
  v_match_count integer;
BEGIN
  SELECT count(*) INTO v_match_count
  FROM public.categories
  WHERE type = 'category'
    AND name IN (
      'Mesa para Cozinha/Sala de Jantar',
      'Mesas para Cozinha/Sala de Jantar'
    );

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION 'Esperada exatamente uma categoria de mesas para a correção plural; encontradas: %',
      v_match_count;
  END IF;

  SELECT id INTO v_category_id
  FROM public.categories
  WHERE type = 'category'
    AND name IN (
      'Mesa para Cozinha/Sala de Jantar',
      'Mesas para Cozinha/Sala de Jantar'
    );

  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE type = 'category'
      AND name = 'Mesas para Cozinha/Sala de Jantar'
      AND id <> v_category_id
  ) THEN
    RAISE EXCEPTION 'Já existe outra categoria com o nome Mesas para Cozinha/Sala de Jantar';
  END IF;

  UPDATE public.categories
  SET name = 'Mesas para Cozinha/Sala de Jantar'
  WHERE id = v_category_id
    AND name = 'Mesa para Cozinha/Sala de Jantar';
END;
$migration$;
