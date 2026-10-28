-- Use component dimensions for dining sets and hide the combined dimensions.
DO $set_dining_set_dimension_applications$
DECLARE
  v_category_id uuid;
  v_category_count integer;
  v_attribute_count integer;
  v_configured_count integer;
  v_measure_count integer;
BEGIN
  SELECT count(*) INTO v_category_count
  FROM public.categories
  WHERE type = 'category'
    AND name = 'Conjunto Mesa e Cadeiras';
  SELECT id INTO v_category_id
  FROM public.categories
  WHERE type = 'category'
    AND name = 'Conjunto Mesa e Cadeiras'
  LIMIT 1;

  SELECT count(*) INTO v_attribute_count
  FROM public.attributes
  WHERE name IN (
    'Largura total', 'Profundidade total', 'Altura total',
    'Largura da mesa', 'Profundidade da mesa', 'Altura da mesa',
    'Largura da cadeira', 'Profundidade da cadeira', 'Altura da cadeira'
  );

  SELECT count(*) INTO v_measure_count
  FROM public.attributes
  WHERE name IN (
    'Largura total', 'Profundidade total', 'Altura total',
    'Largura da mesa', 'Profundidade da mesa', 'Altura da mesa',
    'Largura da cadeira', 'Profundidade da cadeira', 'Altura da cadeira'
  ) AND data_type = 'measure';

  SELECT count(*) INTO v_configured_count
  FROM public.attribute_category_applications application
  JOIN public.attributes attribute ON attribute.id = application.attribute_id
  WHERE attribute.name IN (
    'Largura total', 'Profundidade total', 'Altura total',
    'Largura da mesa', 'Profundidade da mesa', 'Altura da mesa',
    'Largura da cadeira', 'Profundidade da cadeira', 'Altura da cadeira'
  )
    AND application.category_id = v_category_id
    AND application.is_configured IS TRUE;

  IF v_category_count <> 1 OR v_attribute_count <> 9
    OR v_measure_count <> 9 OR v_configured_count <> 9 THEN
    RAISE EXCEPTION 'Precondição falhou: categoria e nove características de dimensão não foram encontradas/configuradas.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attribute_category_applications application
    JOIN public.attributes attribute ON attribute.id = application.attribute_id
    WHERE application.category_id = v_category_id
      AND (
        (attribute.name IN ('Largura total', 'Profundidade total', 'Altura total')
          AND (application.application IS NULL OR application.application NOT IN ('required', 'unavailable')))
        OR (attribute.name IN ('Largura da cadeira', 'Profundidade da cadeira', 'Altura da cadeira')
          AND (application.application IS NULL OR application.application NOT IN ('required', 'optional')))
        OR (attribute.name IN ('Largura da mesa', 'Profundidade da mesa', 'Altura da mesa')
          AND application.application <> 'required')
      )
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: há uma aplicação inesperada nas dimensões do conjunto.';
  END IF;

  UPDATE public.attribute_category_applications application
  SET application = 'unavailable',
      is_configured = true,
      updated_at = now()
  FROM public.attributes attribute
  WHERE application.attribute_id = attribute.id
    AND application.category_id = v_category_id
    AND attribute.name IN ('Largura total', 'Profundidade total', 'Altura total');

  UPDATE public.attribute_category_applications application
  SET application = 'optional',
      is_configured = true,
      updated_at = now()
  FROM public.attributes attribute
  WHERE application.attribute_id = attribute.id
    AND application.category_id = v_category_id
    AND attribute.name IN ('Largura da cadeira', 'Profundidade da cadeira', 'Altura da cadeira');

  IF (
    SELECT count(*)
    FROM public.attribute_category_applications application
    JOIN public.attributes attribute ON attribute.id = application.attribute_id
    WHERE application.category_id = v_category_id
      AND application.is_configured IS TRUE
      AND application.application = 'unavailable'
      AND attribute.name IN ('Largura total', 'Profundidade total', 'Altura total')
  ) <> 3 OR (
    SELECT count(*)
    FROM public.attribute_category_applications application
    JOIN public.attributes attribute ON attribute.id = application.attribute_id
    WHERE application.category_id = v_category_id
      AND application.is_configured IS TRUE
      AND application.application = 'required'
      AND attribute.name IN ('Largura da mesa', 'Profundidade da mesa', 'Altura da mesa')
  ) <> 3 OR (
    SELECT count(*)
    FROM public.attribute_category_applications application
    JOIN public.attributes attribute ON attribute.id = application.attribute_id
    WHERE application.category_id = v_category_id
      AND application.is_configured IS TRUE
      AND application.application = 'optional'
      AND attribute.name IN ('Largura da cadeira', 'Profundidade da cadeira', 'Altura da cadeira')
  ) <> 3 THEN
    RAISE EXCEPTION 'As aplicações das dimensões do Conjunto Mesa e Cadeiras ficaram inconsistentes.';
  END IF;
END
$set_dining_set_dimension_applications$;
