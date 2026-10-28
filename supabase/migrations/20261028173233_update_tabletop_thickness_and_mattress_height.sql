-- Add the dedicated tabletop thickness measure and align mattresses to total height.
-- Existing product technical_specs and legacy dimensions remain untouched.
DO $tabletop_thickness_and_mattress_height$
DECLARE
  v_category_count integer;
  v_tampos_count integer;
  v_mattress_count integer;
  v_dimensions_group_count integer;
  v_dimensions_group_id uuid;
  v_tabletop_attribute_count integer;
  v_tabletop_attribute_id uuid;
  v_tabletop_data_type text;
  v_mattress_thickness_count integer;
  v_height_attribute_count integer;
  v_mattress_height_required_count integer;
  v_sheet_attribute_count integer;
  v_sheet_attribute_id uuid;
  v_sheet_unavailable_category_count integer;
BEGIN
  SELECT count(*) INTO v_category_count
  FROM public.categories
  WHERE type = 'category';

  SELECT count(*) INTO v_tampos_count
  FROM public.categories
  WHERE type = 'category'
    AND regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'tampos';

  SELECT count(*) INTO v_mattress_count
  FROM public.categories
  WHERE type = 'category'
    AND regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'colchoes';

  SELECT count(*) INTO v_dimensions_group_count
  FROM public.attribute_groups
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'dimensoes';

  IF v_dimensions_group_count = 1 THEN
    SELECT id INTO v_dimensions_group_id
    FROM public.attribute_groups
    WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'dimensoes';
  END IF;

  SELECT count(*) INTO v_tabletop_attribute_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'espessuradotampo';

  SELECT count(*) INTO v_mattress_thickness_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'espessuradocolchao';

  SELECT count(*) INTO v_sheet_attribute_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'espessuradomdfmdp';

  SELECT count(*) INTO v_sheet_unavailable_category_count
  FROM public.categories
  WHERE type = 'category'
    AND regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
      IN ('pias', 'sofas', 'colchoes', 'tampos', 'travesseiros');

  SELECT count(*) INTO v_height_attribute_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'alturatotal'
    AND data_type = 'measure';

  SELECT count(*) INTO v_mattress_height_required_count
  FROM public.attribute_category_applications application
  JOIN public.attributes attribute ON attribute.id = application.attribute_id
  JOIN public.categories category ON category.id = application.category_id
  WHERE regexp_replace(lower(public.unaccent(btrim(attribute.name))), '[^a-z0-9]+', '', 'g') = 'alturatotal'
    AND regexp_replace(lower(public.unaccent(btrim(category.name))), '[^a-z0-9]+', '', 'g') = 'colchoes'
    AND application.application = 'required'
    AND application.is_configured;

  IF v_category_count <> 38 OR v_tampos_count <> 1 OR v_mattress_count <> 1
    OR v_dimensions_group_count <> 1 OR v_tabletop_attribute_count > 1
    OR v_mattress_thickness_count <> 1 OR v_sheet_attribute_count <> 1
    OR v_sheet_unavailable_category_count < 4 OR v_height_attribute_count <> 1
    OR v_mattress_height_required_count <> 1 THEN
    RAISE EXCEPTION 'Precondição falhou: confira categorias, grupo Dimensões, características e aplicação obrigatória de Altura total para Colchões.';
  END IF;

  SELECT id INTO v_sheet_attribute_id
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'espessuradomdfmdp';

  -- Preserve the existing characteristic identity and option records. Retire only
  -- choices that are no longer valid, then activate the requested numeric choices.
  UPDATE public.attributes
  SET name = 'Espessura das Chapas',
      data_type = 'multi_select',
      unit = NULL,
      active = true,
      is_globally_required = false
  WHERE id = v_sheet_attribute_id;

  UPDATE public.attribute_values
  SET active = false
  WHERE attribute_id = v_sheet_attribute_id
    AND value NOT IN ('10 mm', '12 mm', '15 mm', '20 mm', '25 mm', '30 mm', '35 mm', '40 mm', '45 mm', '50 mm');

  INSERT INTO public.attribute_values (attribute_id, value, sort_order, active)
  SELECT v_sheet_attribute_id, requested.value, requested.sort_order, true
  FROM (VALUES
    ('10 mm', 1), ('12 mm', 2), ('15 mm', 3), ('20 mm', 4), ('25 mm', 5),
    ('30 mm', 6), ('35 mm', 7), ('40 mm', 8), ('45 mm', 9), ('50 mm', 10)
  ) AS requested(value, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.attribute_values existing
    WHERE existing.attribute_id = v_sheet_attribute_id
      AND existing.value = requested.value
  );

  UPDATE public.attribute_values
  SET active = true,
      sort_order = CASE value
        WHEN '10 mm' THEN 1
        WHEN '12 mm' THEN 2
        WHEN '15 mm' THEN 3
        WHEN '20 mm' THEN 4
        WHEN '25 mm' THEN 5
        WHEN '30 mm' THEN 6
        WHEN '35 mm' THEN 7
        WHEN '40 mm' THEN 8
        WHEN '45 mm' THEN 9
        WHEN '50 mm' THEN 10
      END
  WHERE attribute_id = v_sheet_attribute_id
    AND value IN ('10 mm', '12 mm', '15 mm', '20 mm', '25 mm', '30 mm', '35 mm', '40 mm', '45 mm', '50 mm');

  INSERT INTO public.attribute_category_applications (
    attribute_id,
    category_id,
    application,
    is_configured
  )
  SELECT
    v_sheet_attribute_id,
    category.id,
    CASE
      WHEN regexp_replace(lower(public.unaccent(btrim(category.name))), '[^a-z0-9]+', '', 'g')
        IN ('pias', 'sofas', 'colchoes', 'tampos', 'travesseiros') THEN 'unavailable'
      ELSE 'optional'
    END,
    true
  FROM public.categories category
  WHERE category.type = 'category'
  ON CONFLICT (attribute_id, category_id) DO UPDATE
  SET application = EXCLUDED.application,
      is_configured = true,
      updated_at = now();

  IF v_tabletop_attribute_count = 0 THEN
    INSERT INTO public.attributes (
      name,
      active,
      is_globally_required,
      data_type,
      unit,
      is_custom,
      group_id,
      configuration
    ) VALUES (
      'Espessura do tampo',
      true,
      false,
      'measure',
      'mm',
      false,
      v_dimensions_group_id,
      '{}'::jsonb
    )
    RETURNING id INTO v_tabletop_attribute_id;
  ELSE
    SELECT id, data_type INTO v_tabletop_attribute_id, v_tabletop_data_type
    FROM public.attributes
    WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'espessuradotampo';

    IF v_tabletop_data_type IS DISTINCT FROM 'measure' THEN
      RAISE EXCEPTION 'Espessura do tampo já existe, mas não é uma característica do tipo medida.';
    END IF;

    UPDATE public.attributes
    SET name = 'Espessura do tampo',
        active = true,
        is_globally_required = false,
        unit = 'mm',
        group_id = v_dimensions_group_id
    WHERE id = v_tabletop_attribute_id;
  END IF;

  INSERT INTO public.attribute_category_applications (
    attribute_id,
    category_id,
    application,
    is_configured
  )
  SELECT
    v_tabletop_attribute_id,
    category.id,
    CASE
      WHEN regexp_replace(lower(public.unaccent(btrim(category.name))), '[^a-z0-9]+', '', 'g') = 'tampos'
        THEN 'required'
      ELSE 'optional'
    END,
    true
  FROM public.categories category
  WHERE category.type = 'category'
  ON CONFLICT (attribute_id, category_id) DO UPDATE
  SET application = EXCLUDED.application,
      is_configured = true,
      updated_at = now();

  -- Mattresses use Altura total. Keep their former thickness characteristic and values,
  -- but make it unavailable so it is no longer requested in the product form.
  UPDATE public.attribute_category_applications application
  SET application = 'unavailable',
      is_configured = true,
      updated_at = now()
  FROM public.attributes attribute
  WHERE application.attribute_id = attribute.id
    AND regexp_replace(lower(public.unaccent(btrim(attribute.name))), '[^a-z0-9]+', '', 'g') = 'espessuradocolchao';

  IF EXISTS (
    SELECT 1
    FROM public.attribute_category_applications application
    WHERE application.attribute_id = v_tabletop_attribute_id
    GROUP BY application.attribute_id
    HAVING count(*) <> v_category_count
      OR count(*) FILTER (WHERE application.application = 'required') <> 1
      OR count(*) FILTER (WHERE application.application = 'optional') <> v_category_count - 1
      OR count(*) FILTER (WHERE application.is_configured) <> v_category_count
  ) OR EXISTS (
    SELECT 1
    FROM public.attribute_category_applications application
    JOIN public.attributes attribute ON attribute.id = application.attribute_id
    WHERE regexp_replace(lower(public.unaccent(btrim(attribute.name))), '[^a-z0-9]+', '', 'g') = 'espessuradocolchao'
    GROUP BY application.attribute_id
    HAVING count(*) <> v_category_count
      OR count(*) FILTER (WHERE application.application = 'unavailable') <> v_category_count
      OR count(*) FILTER (WHERE application.is_configured) <> v_category_count
  ) OR EXISTS (
    SELECT 1
    FROM public.attribute_category_applications application
    WHERE application.attribute_id = v_sheet_attribute_id
    GROUP BY application.attribute_id
    HAVING count(*) <> v_category_count
      OR count(*) FILTER (WHERE application.application = 'required') <> 0
      OR count(*) FILTER (WHERE application.application = 'optional') <> v_category_count - v_sheet_unavailable_category_count
      OR count(*) FILTER (WHERE application.application = 'unavailable') <> v_sheet_unavailable_category_count
      OR count(*) FILTER (WHERE application.is_configured) <> v_category_count
  ) OR (
    SELECT count(*) FROM public.attribute_values
    WHERE attribute_id = v_sheet_attribute_id AND active
  ) <> 10 OR (
    SELECT count(DISTINCT value) FROM public.attribute_values
    WHERE attribute_id = v_sheet_attribute_id AND active
  ) <> 10 OR (
    SELECT count(*) FROM public.attribute_values
    WHERE attribute_id = v_sheet_attribute_id
      AND active
      AND value IN ('10 mm', '12 mm', '15 mm', '20 mm', '25 mm', '30 mm', '35 mm', '40 mm', '45 mm', '50 mm')
  ) <> 10 OR NOT EXISTS (
    SELECT 1 FROM public.attributes
    WHERE id = v_sheet_attribute_id
      AND name = 'Espessura das Chapas'
      AND data_type = 'multi_select'
      AND unit IS NULL
  ) THEN
    RAISE EXCEPTION 'As aplicações por categoria das características de espessura ficaram inconsistentes.';
  END IF;
END
$tabletop_thickness_and_mattress_height$;
