-- Rename dining furniture categories while preserving category IDs, product links,
-- attribute links, and existing slugs. Add Cozinha as a second environment parent.
-- Rollback: restore the old names below and delete only Cozinha links for these
-- three categories; retain their Sala de Jantar relationships.
DO $migration$
DECLARE
  v_kitchen_id uuid;
  v_dining_id uuid;
  v_category_id uuid;
  v_name_count integer;
  v_item record;
BEGIN
  SELECT count(*) INTO v_name_count
  FROM public.categories
  WHERE name = 'Cozinha' AND type = 'environment';
  IF v_name_count <> 1 THEN
    RAISE EXCEPTION 'Esperada exatamente uma categoria-raiz Cozinha; encontradas: %', v_name_count;
  END IF;
  SELECT id INTO v_kitchen_id
  FROM public.categories
  WHERE name = 'Cozinha' AND type = 'environment';

  SELECT count(*) INTO v_name_count
  FROM public.categories
  WHERE name = 'Sala de Jantar' AND type = 'environment';
  IF v_name_count <> 1 THEN
    RAISE EXCEPTION 'Esperada exatamente uma categoria-raiz Sala de Jantar; encontradas: %', v_name_count;
  END IF;
  SELECT id INTO v_dining_id
  FROM public.categories
  WHERE name = 'Sala de Jantar' AND type = 'environment';

  FOR v_item IN
    SELECT * FROM (VALUES
      ('Conjunto para Sala de Jantar', 'Conjunto Mesa e Cadeiras'),
      ('Cadeiras para Sala de Jantar', 'Cadeiras para Cozinha/Sala de Jantar'),
      ('Mesa para Sala de Jantar', 'Mesa para Cozinha/Sala de Jantar')
    ) AS category_names(old_name, new_name)
  LOOP
    SELECT count(*) INTO v_name_count
    FROM public.categories
    WHERE type = 'category'
      AND name IN (v_item.old_name, v_item.new_name);
    IF v_name_count <> 1 THEN
      RAISE EXCEPTION 'Esperada exatamente uma categoria para % → %; encontradas: %',
        v_item.old_name, v_item.new_name, v_name_count;
    END IF;

    SELECT id INTO v_category_id
    FROM public.categories
    WHERE type = 'category'
      AND name IN (v_item.old_name, v_item.new_name);

    IF EXISTS (
      SELECT 1 FROM public.categories
      WHERE type = 'category'
        AND name = v_item.new_name
        AND id <> v_category_id
    ) THEN
      RAISE EXCEPTION 'Já existe outra categoria com o novo nome: %', v_item.new_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.category_relationships
      WHERE parent_id = v_dining_id AND child_id = v_category_id
    ) THEN
      RAISE EXCEPTION 'A categoria % não está vinculada a Sala de Jantar', v_item.old_name;
    END IF;

    UPDATE public.categories
    SET name = v_item.new_name
    WHERE id = v_category_id
      AND name = v_item.old_name;

    INSERT INTO public.category_relationships (parent_id, child_id)
    VALUES (v_kitchen_id, v_category_id)
    ON CONFLICT (parent_id, child_id) DO NOTHING;
  END LOOP;
END;
$migration$;
