-- Add the optional Booleano characteristic to the two applicable categories.
-- Safe rollback: mark all of its category applications N/A and retain the
-- characteristic and any product values already entered.
DO $add_integrated_storage_characteristic$
DECLARE
  v_category_count integer;
  v_target_category_count integer;
  v_group_count integer;
  v_group_id uuid;
  v_existing_count integer;
  v_attribute_id uuid;
  v_existing_type text;
  v_existing_dependency_id uuid;
  v_existing_dependency_operator text;
  v_existing_dependency_value text;
  v_application_count integer;
  v_optional_count integer;
  v_unavailable_count integer;
  v_required_count integer;
  v_configured_count integer;
BEGIN
  SELECT count(*) INTO v_category_count
  FROM public.categories
  WHERE type = 'category';

  SELECT count(*) INTO v_target_category_count
  FROM public.categories
  WHERE type = 'category'
    AND regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
      IN ('camasbasesbox', 'sofas');

  IF v_category_count < 2 OR v_target_category_count <> 2 THEN
    RAISE EXCEPTION 'Esperava encontrar Cama Box e Sofás entre as categorias; encontrei % categoria(s) alvo.', v_target_category_count;
  END IF;

  SELECT count(*) INTO v_group_count
  FROM public.attribute_groups
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
    = 'compartimentoseorganizacao';

  IF v_group_count <> 1 THEN
    RAISE EXCEPTION 'Esperava encontrar exatamente o grupo Compartimentos e organização.';
  END IF;

  SELECT id INTO v_group_id
  FROM public.attribute_groups
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
    = 'compartimentoseorganizacao';

  SELECT count(*) INTO v_existing_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
    = 'possuibauintegrado';

  IF v_existing_count > 1 THEN
    RAISE EXCEPTION 'Há mais de uma característica equivalente a Possui baú integrado?; não alterei os registros.';
  ELSIF v_existing_count = 0 THEN
    INSERT INTO public.attributes (
      name,
      active,
      is_globally_required,
      data_type,
      is_custom,
      group_id,
      configuration
    ) VALUES (
      'Possui baú integrado?',
      true,
      false,
      'boolean',
      false,
      v_group_id,
      '{}'::jsonb
    )
    RETURNING id INTO v_attribute_id;
  ELSE
    SELECT id, data_type, dependency_attribute_id, dependency_operator, dependency_value
    INTO v_attribute_id, v_existing_type, v_existing_dependency_id,
         v_existing_dependency_operator, v_existing_dependency_value
    FROM public.attributes
    WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
      = 'possuibauintegrado';

    IF v_existing_type IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'A característica equivalente existente não é Booleano; não alterei o tipo automaticamente.';
    END IF;
    IF v_existing_dependency_id IS NOT NULL
      OR v_existing_dependency_operator IS NOT NULL
      OR v_existing_dependency_value IS NOT NULL THEN
      RAISE EXCEPTION 'A característica equivalente existente tem dependências; não as removi.';
    END IF;

    UPDATE public.attributes
    SET name = 'Possui baú integrado?',
        active = true,
        is_globally_required = false,
        group_id = v_group_id
    WHERE id = v_attribute_id;
  END IF;

  INSERT INTO public.attribute_category_applications (
    attribute_id,
    category_id,
    application,
    is_configured
  )
  SELECT
    v_attribute_id,
    category.id,
    CASE
      WHEN regexp_replace(lower(public.unaccent(btrim(category.name))), '[^a-z0-9]+', '', 'g')
        IN ('camasbasesbox', 'sofas') THEN 'optional'
      ELSE 'unavailable'
    END,
    true
  FROM public.categories AS category
  WHERE category.type = 'category'
  ON CONFLICT (attribute_id, category_id) DO UPDATE
  SET application = EXCLUDED.application,
      is_configured = true,
      updated_at = now();

  SELECT count(*),
         count(*) FILTER (WHERE application = 'optional'),
         count(*) FILTER (WHERE application = 'unavailable'),
         count(*) FILTER (WHERE application = 'required'),
         count(*) FILTER (WHERE is_configured)
  INTO v_application_count, v_optional_count, v_unavailable_count,
       v_required_count, v_configured_count
  FROM public.attribute_category_applications
  WHERE attribute_id = v_attribute_id;

  IF v_application_count <> v_category_count
    OR v_optional_count <> 2
    OR v_unavailable_count <> v_category_count - 2
    OR v_required_count <> 0
    OR v_configured_count <> v_category_count THEN
    RAISE EXCEPTION 'Aplicações inesperadas após configurar Possui baú integrado?: total %, opcionais %, N/A %, obrigatórias %, configuradas %.',
      v_application_count, v_optional_count, v_unavailable_count, v_required_count, v_configured_count;
  END IF;
END
$add_integrated_storage_characteristic$;
