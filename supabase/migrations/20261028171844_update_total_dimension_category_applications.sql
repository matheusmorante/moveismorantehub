-- Align product characteristic applications for total dimensions.
-- Legacy catalog-publication links and stored product measurements are untouched.
DO $update_total_dimension_category_applications$
DECLARE
  v_category_count integer;
  v_target_category_count integer;
  v_attribute_count integer;
BEGIN
  SELECT count(*) INTO v_category_count
  FROM public.categories
  WHERE type = 'category';

  SELECT count(*) INTO v_target_category_count
  FROM public.categories
  WHERE type = 'category'
    AND regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
      IN ('pias', 'tampos');

  SELECT count(*) INTO v_attribute_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
    IN ('alturatotal', 'larguratotal', 'profundidadetotal');

  IF v_category_count <> 38 OR v_target_category_count <> 2 OR v_attribute_count <> 3 THEN
    RAISE EXCEPTION 'Precondição falhou: esperava 38 categorias, Pias e Tampos, e três características totais.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attributes
    WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
      IN ('alturatotal', 'larguratotal', 'profundidadetotal')
    GROUP BY regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
    HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Há nomes duplicados entre as três características totais.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attributes
    WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
      IN ('alturatotal', 'larguratotal', 'profundidadetotal')
      AND data_type <> 'measure'
  ) THEN
    RAISE EXCEPTION 'As características Altura total, Largura total e Profundidade total devem ser medidas.';
  END IF;

  INSERT INTO public.attribute_category_applications (
    attribute_id,
    category_id,
    application,
    is_configured
  )
  SELECT
    attribute.id,
    category.id,
    CASE
      WHEN regexp_replace(lower(public.unaccent(btrim(attribute.name))), '[^a-z0-9]+', '', 'g') = 'alturatotal'
        AND regexp_replace(lower(public.unaccent(btrim(category.name))), '[^a-z0-9]+', '', 'g')
          IN ('pias', 'tampos') THEN 'optional'
      ELSE 'required'
    END,
    true
  FROM public.attributes AS attribute
  CROSS JOIN public.categories AS category
  WHERE category.type = 'category'
    AND regexp_replace(lower(public.unaccent(btrim(attribute.name))), '[^a-z0-9]+', '', 'g')
      IN ('alturatotal', 'larguratotal', 'profundidadetotal')
  ON CONFLICT (attribute_id, category_id) DO UPDATE
  SET application = EXCLUDED.application,
      is_configured = true,
      updated_at = now();

  IF EXISTS (
    WITH targets AS (
      SELECT id,
             regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') AS normalized_name
      FROM public.attributes
      WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
        IN ('alturatotal', 'larguratotal', 'profundidadetotal')
    )
    SELECT 1
    FROM targets AS attribute
    JOIN public.attribute_category_applications AS application
      ON application.attribute_id = attribute.id
    GROUP BY attribute.id, attribute.normalized_name
    HAVING count(*) <> v_category_count
      OR count(*) FILTER (WHERE application.is_configured) <> v_category_count
      OR (
        attribute.normalized_name = 'alturatotal'
        AND (
          count(*) FILTER (WHERE application.application = 'required') <> v_category_count - 2
          OR count(*) FILTER (WHERE application.application = 'optional') <> 2
          OR count(*) FILTER (WHERE application.application = 'unavailable') <> 0
        )
      )
      OR (
        attribute.normalized_name IN ('larguratotal', 'profundidadetotal')
        AND (
          count(*) FILTER (WHERE application.application = 'required') <> v_category_count
          OR count(*) FILTER (WHERE application.application = 'optional') <> 0
          OR count(*) FILTER (WHERE application.application = 'unavailable') <> 0
        )
      )
  ) THEN
    RAISE EXCEPTION 'As aplicações por categoria das dimensões totais ficaram inconsistentes.';
  END IF;
END
$update_total_dimension_category_applications$;
