-- Keep the existing "Quantidade de lugares" field for its six other categories.
-- The dining-set category gets a separate chair-count field, required only for
-- Catálogo Digital publication. Existing product JSON values remain readable via
-- shared-utils/productTechnicalValueAliases.ts.
DO $migration$
DECLARE
  v_source_attribute public.attributes%ROWTYPE;
  v_category_id uuid;
  v_new_attribute_id uuid;
BEGIN
  SELECT *
  INTO v_source_attribute
  FROM public.attributes
  WHERE name = 'Quantidade de lugares';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Characteristic "Quantidade de lugares" was not found.';
  END IF;

  IF v_source_attribute.data_type IS DISTINCT FROM 'integer'
     OR v_source_attribute.active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Characteristic "Quantidade de lugares" must remain active and integer.';
  END IF;

  SELECT id
  INTO v_category_id
  FROM public.categories
  WHERE type = 'category' AND name = 'Conjunto Mesa e Cadeiras';

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Category "Conjunto Mesa e Cadeiras" was not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.category_attributes
    WHERE attribute_id = v_source_attribute.id
      AND category_id = v_category_id
  ) THEN
    RAISE EXCEPTION 'The source characteristic is not linked to "Conjunto Mesa e Cadeiras".';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attributes
    WHERE lower(btrim(name)) = lower('Quantidade de cadeiras')
  ) THEN
    RAISE EXCEPTION 'Characteristic "Quantidade de cadeiras" already exists; review before applying.';
  END IF;

  INSERT INTO public.attributes (
    name,
    active,
    is_globally_required,
    data_type,
    unit,
    is_custom,
    decimal_places,
    group_id,
    configuration,
    dependency_attribute_id,
    dependency_operator,
    dependency_value
  ) VALUES (
    'Quantidade de cadeiras',
    v_source_attribute.active,
    false,
    v_source_attribute.data_type,
    v_source_attribute.unit,
    v_source_attribute.is_custom,
    v_source_attribute.decimal_places,
    v_source_attribute.group_id,
    v_source_attribute.configuration,
    v_source_attribute.dependency_attribute_id,
    v_source_attribute.dependency_operator,
    v_source_attribute.dependency_value
  ) RETURNING id INTO v_new_attribute_id;

  DELETE FROM public.category_attributes
  WHERE attribute_id = v_source_attribute.id
    AND category_id = v_category_id;

  INSERT INTO public.category_attributes (attribute_id, category_id, is_required)
  VALUES (v_new_attribute_id, v_category_id, true);

  INSERT INTO public.attribute_category_applications (
    attribute_id, category_id, application, is_configured, updated_at
  ) VALUES (
    v_source_attribute.id, v_category_id, 'unavailable', true, now()
  )
  ON CONFLICT (attribute_id, category_id) DO UPDATE SET
    application = EXCLUDED.application,
    is_configured = true,
    updated_at = now();

  INSERT INTO public.attribute_category_applications (
    attribute_id, category_id, application, is_configured, updated_at
  ) VALUES (
    v_new_attribute_id, v_category_id, 'optional', true, now()
  )
  ON CONFLICT (attribute_id, category_id) DO UPDATE SET
    application = EXCLUDED.application,
    is_configured = true,
    updated_at = now();
END;
$migration$;
