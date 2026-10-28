-- Apply the requested category policy to the existing boolean characteristic.
-- Required accepts both false (Não) and true (Sim); only null is unanswered.
DO $update_possui_espelho_category_applications$
DECLARE
  v_category_count integer;
  v_attribute_count integer;
  v_attribute_id uuid;
  v_data_type text;
  v_dependency_attribute_id uuid;
  v_dependency_operator text;
  v_dependency_value text;
  v_required_category_count integer;
  v_optional_category_count integer;
BEGIN
  SELECT count(*) INTO v_category_count
  FROM public.categories
  WHERE type = 'category';

  SELECT count(*) INTO v_attribute_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'possuiespelho';

  SELECT id, data_type, dependency_attribute_id, dependency_operator, dependency_value
  INTO v_attribute_id, v_data_type, v_dependency_attribute_id, v_dependency_operator, v_dependency_value
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g') = 'possuiespelho';

  SELECT count(*) INTO v_required_category_count
  FROM public.categories
  WHERE type = 'category'
    AND regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
      IN ('penteadeiras', 'espelheiraparabanheiro', 'conjuntosparabanheiro');

  SELECT count(*) INTO v_optional_category_count
  FROM public.categories
  WHERE type = 'category'
    AND regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
      IN (
        'guardaroupas', 'comodas', 'sapateiras', 'aparadoresbuffets', 'armariosmultiuso',
        'armariosaereos', 'cristaleiras', 'mesasdecabeceira', 'homes', 'paineis'
      );

  IF v_category_count <> 38 OR v_attribute_count <> 1
    OR v_data_type IS DISTINCT FROM 'boolean'
    OR v_dependency_attribute_id IS NOT NULL
    OR v_dependency_operator IS NOT NULL
    OR v_dependency_value IS NOT NULL
    OR v_required_category_count <> 3
    OR v_optional_category_count <> 10 THEN
    RAISE EXCEPTION 'Precondição falhou: esperava 38 categorias, uma característica Possui espelho Booleano sem condições, 3 categorias obrigatórias e 10 opcionais.';
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
        IN ('penteadeiras', 'espelheiraparabanheiro', 'conjuntosparabanheiro') THEN 'required'
      WHEN regexp_replace(lower(public.unaccent(btrim(category.name))), '[^a-z0-9]+', '', 'g')
        IN (
          'guardaroupas', 'comodas', 'sapateiras', 'aparadoresbuffets', 'armariosmultiuso',
          'armariosaereos', 'cristaleiras', 'mesasdecabeceira', 'homes', 'paineis'
        ) THEN 'optional'
      ELSE 'unavailable'
    END,
    true
  FROM public.categories category
  WHERE category.type = 'category'
  ON CONFLICT (attribute_id, category_id) DO UPDATE
  SET application = EXCLUDED.application,
      is_configured = true,
      updated_at = now();

  IF EXISTS (
    SELECT 1
    FROM public.categories category
    LEFT JOIN public.attribute_category_applications application
      ON application.category_id = category.id
      AND application.attribute_id = v_attribute_id
    WHERE category.type = 'category'
      AND (
        application.attribute_id IS NULL
        OR application.is_configured IS DISTINCT FROM true
        OR application.application IS DISTINCT FROM CASE
          WHEN regexp_replace(lower(public.unaccent(btrim(category.name))), '[^a-z0-9]+', '', 'g')
            IN ('penteadeiras', 'espelheiraparabanheiro', 'conjuntosparabanheiro') THEN 'required'
          WHEN regexp_replace(lower(public.unaccent(btrim(category.name))), '[^a-z0-9]+', '', 'g')
            IN (
              'guardaroupas', 'comodas', 'sapateiras', 'aparadoresbuffets', 'armariosmultiuso',
              'armariosaereos', 'cristaleiras', 'mesasdecabeceira', 'homes', 'paineis'
            ) THEN 'optional'
          ELSE 'unavailable'
        END
      )
  ) OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_attribute_id
  ) <> v_category_count OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_attribute_id AND application = 'required' AND is_configured
  ) <> 3 OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_attribute_id AND application = 'optional' AND is_configured
  ) <> 10 OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_attribute_id AND application = 'unavailable' AND is_configured
  ) <> 25 THEN
    RAISE EXCEPTION 'As aplicações por categoria de Possui espelho ficaram inconsistentes.';
  END IF;
END
$update_possui_espelho_category_applications$;
