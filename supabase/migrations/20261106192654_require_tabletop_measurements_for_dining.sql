-- Use dedicated tabletop measurements in dining sets and dining tables.
-- Preserve existing set measurements and legacy product values through aliases.
DO $tabletop_measurements_for_dining$
DECLARE
  v_set_category_id uuid;
  v_dining_table_category_id uuid;
  v_dimensions_group_id uuid;
  v_width_attribute_id uuid;
  v_depth_attribute_id uuid;
  v_thickness_attribute_id uuid;
  v_set_count integer;
  v_dining_table_count integer;
  v_dimensions_group_count integer;
  v_width_name_count integer;
  v_depth_name_count integer;
  v_thickness_name_count integer;
BEGIN
  SELECT count(*) INTO v_set_count
  FROM public.categories
  WHERE type = 'category' AND name = 'Conjunto Mesa e Cadeiras';

  SELECT count(*) INTO v_dining_table_count
  FROM public.categories
  WHERE type = 'category' AND name = 'Mesas para Cozinha/Sala de Jantar';

  SELECT id INTO v_set_category_id
  FROM public.categories
  WHERE type = 'category' AND name = 'Conjunto Mesa e Cadeiras';

  SELECT id INTO v_dining_table_category_id
  FROM public.categories
  WHERE type = 'category' AND name = 'Mesas para Cozinha/Sala de Jantar';

  SELECT count(*) INTO v_dimensions_group_count
  FROM public.attribute_groups
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'dimensoes';

  SELECT id INTO v_dimensions_group_id
  FROM public.attribute_groups
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'dimensoes';

  SELECT id INTO v_width_attribute_id
  FROM public.attributes
  WHERE name = 'Largura da mesa' AND active IS TRUE AND data_type = 'measure' AND unit = 'cm';

  SELECT id INTO v_depth_attribute_id
  FROM public.attributes
  WHERE name = 'Profundidade da mesa' AND active IS TRUE AND data_type = 'measure' AND unit = 'cm';

  SELECT id INTO v_thickness_attribute_id
  FROM public.attributes
  WHERE name = 'Espessura do Tampo (mm)' AND active IS TRUE;

  IF v_set_count <> 1 OR v_dining_table_count <> 1 THEN
    RAISE EXCEPTION 'As duas categorias de jantar precisam existir uma única vez.';
  END IF;

  IF v_dimensions_group_count <> 1 OR v_dimensions_group_id IS NULL THEN
    RAISE EXCEPTION 'O grupo Dimensões precisa existir uma única vez.';
  END IF;

  IF v_width_attribute_id IS NULL OR v_depth_attribute_id IS NULL
    OR v_thickness_attribute_id IS NULL THEN
    RAISE EXCEPTION 'Uma das características de mesa existentes não foi encontrada com o tipo esperado.';
  END IF;

  SELECT count(*) INTO v_width_name_count
  FROM public.attributes
  WHERE name = 'Largura da mesa';

  SELECT count(*) INTO v_depth_name_count
  FROM public.attributes
  WHERE name = 'Profundidade da mesa';

  SELECT count(*) INTO v_thickness_name_count
  FROM public.attributes
  WHERE name = 'Espessura do Tampo (mm)';

  IF v_width_name_count <> 1 OR v_depth_name_count <> 1 OR v_thickness_name_count <> 1 THEN
    RAISE EXCEPTION 'Os nomes originais das três características precisam ser únicos.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attributes
    WHERE name IN (
      'Largura do tampo da mesa',
      'Profundidade do tampo da mesa',
      'Espessura do tampo da mesa'
    )
  ) THEN
    RAISE EXCEPTION 'Uma característica com o nome final já existe; revisar antes de renomear.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.category_attributes
    WHERE attribute_id = v_width_attribute_id AND category_id = v_set_category_id
  ) <> 1 OR (
    SELECT count(*)
    FROM public.category_attributes
    WHERE attribute_id = v_depth_attribute_id AND category_id = v_set_category_id
  ) <> 1 THEN
    RAISE EXCEPTION 'Largura/profundidade da mesa não estão ligadas corretamente ao conjunto.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.category_attributes
    WHERE attribute_id IN (v_width_attribute_id, v_depth_attribute_id)
      AND category_id <> v_set_category_id
  ) OR EXISTS (
    SELECT 1
    FROM public.category_attributes
    WHERE attribute_id = v_thickness_attribute_id
  ) THEN
    RAISE EXCEPTION 'As características existentes têm vínculos de categoria inesperados.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attribute_category_applications application
    WHERE application.attribute_id IN (v_width_attribute_id, v_depth_attribute_id)
      AND application.category_id = v_set_category_id
      AND application.application <> 'required'
  ) THEN
    RAISE EXCEPTION 'As medidas da mesa precisam preservar a obrigatoriedade ERP atual do conjunto.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.attribute_category_applications
    WHERE attribute_id IN (v_width_attribute_id, v_depth_attribute_id, v_thickness_attribute_id)
      AND category_id IN (v_set_category_id, v_dining_table_category_id)
  ) <> 6 THEN
    RAISE EXCEPTION 'As aplicações ERP das três características não estão configuradas para as duas categorias.';
  END IF;

  UPDATE public.attributes
  SET name = 'Largura do tampo da mesa'
  WHERE id = v_width_attribute_id;

  UPDATE public.attributes
  SET name = 'Profundidade do tampo da mesa'
  WHERE id = v_depth_attribute_id;

  UPDATE public.attributes
  SET name = 'Espessura do tampo da mesa',
      data_type = 'measure',
      unit = 'mm',
      active = true,
      is_globally_required = false,
      group_id = v_dimensions_group_id
  WHERE id = v_thickness_attribute_id;

  INSERT INTO public.category_attributes (attribute_id, category_id, is_required)
  SELECT attribute.id, category.id, true
  FROM public.attributes attribute
  CROSS JOIN public.categories category
  WHERE attribute.name IN (
      'Largura do tampo da mesa',
      'Profundidade do tampo da mesa',
      'Espessura do tampo da mesa'
    )
    AND category.id IN (v_set_category_id, v_dining_table_category_id)
  ON CONFLICT (attribute_id, category_id) DO UPDATE
  SET is_required = true;

  UPDATE public.attribute_category_applications application
  SET application = CASE
        WHEN category.id = v_set_category_id
          AND attribute.name IN ('Largura do tampo da mesa', 'Profundidade do tampo da mesa')
          THEN 'required'
        ELSE 'optional'
      END,
      is_configured = true,
      updated_at = now()
  FROM public.attributes attribute
  CROSS JOIN public.categories category
  WHERE application.attribute_id = attribute.id
    AND application.category_id = category.id
    AND attribute.name IN (
      'Largura do tampo da mesa',
      'Profundidade do tampo da mesa',
      'Espessura do tampo da mesa'
    )
    AND category.id IN (v_set_category_id, v_dining_table_category_id);

  IF (
    SELECT count(*)
    FROM public.category_attributes link
    JOIN public.attributes attribute ON attribute.id = link.attribute_id
    WHERE link.category_id IN (v_set_category_id, v_dining_table_category_id)
      AND link.is_required IS TRUE
      AND attribute.name IN (
        'Largura do tampo da mesa',
        'Profundidade do tampo da mesa',
        'Espessura do tampo da mesa'
      )
  ) <> 6 THEN
    RAISE EXCEPTION 'As três medidas do tampo precisam ser obrigatórias no Catálogo nas duas categorias.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attribute_category_applications application
    JOIN public.attributes attribute ON attribute.id = application.attribute_id
    WHERE application.category_id = v_dining_table_category_id
      AND attribute.name IN (
        'Largura do tampo da mesa',
        'Profundidade do tampo da mesa',
        'Espessura do tampo da mesa'
      )
      AND application.application <> 'optional'
  ) OR EXISTS (
    SELECT 1
    FROM public.attribute_category_applications application
    JOIN public.attributes attribute ON attribute.id = application.attribute_id
    WHERE application.category_id = v_set_category_id
      AND attribute.name = 'Espessura do tampo da mesa'
      AND application.application <> 'optional'
  ) THEN
    RAISE EXCEPTION 'As novas características do Catálogo não podem tornar o cadastro ERP mais restritivo.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.attribute_category_applications application
    JOIN public.attributes attribute ON attribute.id = application.attribute_id
    WHERE application.category_id = v_set_category_id
      AND application.is_configured IS TRUE
      AND (
        (attribute.name IN ('Largura do tampo da mesa', 'Profundidade do tampo da mesa')
          AND application.application = 'required')
        OR (attribute.name = 'Espessura do tampo da mesa' AND application.application = 'optional')
      )
  ) <> 3 THEN
    RAISE EXCEPTION 'O conjunto deve manter as dimensões de mesa ERP atuais e deixar a espessura opcional.';
  END IF;
END
$tabletop_measurements_for_dining$;
