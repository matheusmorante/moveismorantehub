-- Make the existing Booleano USB characteristic optionally available in Cabeceiras.
DO $make_usb_characteristic_optional_for_headboards$
DECLARE
  v_category_count integer;
  v_headboards_count integer;
  v_attribute_count integer;
  v_attribute_id uuid;
  v_data_type text;
  v_dependency_attribute_id uuid;
  v_dependency_operator text;
  v_dependency_value text;
  v_application_count integer;
  v_configured_count integer;
  v_headboards_category_id uuid;
BEGIN
  SELECT count(*) INTO v_category_count
  FROM public.categories
  WHERE type = 'category';

  SELECT count(*) INTO v_headboards_count
  FROM public.categories
  WHERE type = 'category'
    AND regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'cabeceiras';

  IF v_headboards_count = 1 THEN
    SELECT id INTO v_headboards_category_id
    FROM public.categories
    WHERE type = 'category'
      AND regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'cabeceiras';
  END IF;

  SELECT count(*) INTO v_attribute_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'entradausb';

  SELECT id, data_type, dependency_attribute_id, dependency_operator, dependency_value
  INTO v_attribute_id, v_data_type, v_dependency_attribute_id, v_dependency_operator, v_dependency_value
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'entradausb';

  SELECT count(*), count(*) FILTER (WHERE is_configured)
  INTO v_application_count, v_configured_count
  FROM public.attribute_category_applications
  WHERE attribute_id = v_attribute_id;

  IF v_category_count <> 38 OR v_headboards_count <> 1 OR v_attribute_count <> 1
    OR v_data_type IS DISTINCT FROM 'boolean'
    OR v_dependency_attribute_id IS NOT NULL
    OR v_dependency_operator IS NOT NULL
    OR v_dependency_value IS NOT NULL
    OR v_application_count <> v_category_count
    OR v_configured_count <> v_category_count THEN
    RAISE EXCEPTION 'Precondição falhou: esperava 38 categorias, uma Entrada USB Booleano sem dependências e aplicações configuradas em todas elas.';
  END IF;

  INSERT INTO public.attribute_category_applications (
    attribute_id,
    category_id,
    application,
    is_configured
  ) VALUES (
    v_attribute_id,
    v_headboards_category_id,
    'optional',
    true
  )
  ON CONFLICT (attribute_id, category_id) DO UPDATE
  SET application = EXCLUDED.application,
      is_configured = true,
      updated_at = now();

  IF (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_attribute_id
  ) <> v_category_count OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_attribute_id AND is_configured
  ) <> v_category_count OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_attribute_id AND application = 'optional'
  ) <> 1 OR (
    SELECT count(*)
    FROM public.attribute_category_applications application
    JOIN public.categories category ON category.id = application.category_id
    WHERE application.attribute_id = v_attribute_id
      AND application.application = 'optional'
      AND regexp_replace(lower(public.unaccent(btrim(category.name))), '[^a-z0-9]+', '', 'g') = 'cabeceiras'
  ) <> 1 OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_attribute_id AND application = 'required'
  ) <> 0 OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_attribute_id AND application = 'unavailable'
  ) <> v_category_count - 1 THEN
    RAISE EXCEPTION 'A aplicação de Entrada USB em Cabeceiras ficou inconsistente.';
  END IF;
END
$make_usb_characteristic_optional_for_headboards$;
