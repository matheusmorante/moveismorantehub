-- Restrict MDF and concretada applicability, then retire the unused USB count field.
-- Existing product technical_specs values are preserved for historical data.
DO $update_mdf_concretada_apps_remove_usb_count$
DECLARE
  v_category_count integer;
  v_mdf_attribute_id uuid;
  v_concretada_attribute_id uuid;
  v_usb_attribute_id uuid;
  v_mdf_attribute_count integer;
  v_concretada_attribute_count integer;
  v_usb_attribute_count integer;
  v_excluded_mdf_category_count integer;
  v_delete_count integer;
BEGIN
  SELECT count(*) INTO v_category_count
  FROM public.categories
  WHERE type = 'category';

  SELECT count(*) INTO v_mdf_attribute_count
  FROM public.attributes
  WHERE name = 'É 100% MDF?';
  SELECT id INTO v_mdf_attribute_id
  FROM public.attributes
  WHERE name = 'É 100% MDF?'
  LIMIT 1;

  SELECT count(*) INTO v_concretada_attribute_count
  FROM public.attributes
  WHERE name = 'É concretada?';
  SELECT id INTO v_concretada_attribute_id
  FROM public.attributes
  WHERE name = 'É concretada?'
  LIMIT 1;

  SELECT count(*) INTO v_usb_attribute_count
  FROM public.attributes
  WHERE name = 'Quantidade de entradas USB';
  SELECT id INTO v_usb_attribute_id
  FROM public.attributes
  WHERE name = 'Quantidade de entradas USB'
  LIMIT 1;

  SELECT count(*) INTO v_excluded_mdf_category_count
  FROM public.categories
  WHERE type = 'category'
    AND name IN ('Pias', 'Colchões', 'Sofás', 'Poltronas');

  IF v_category_count <> 38
    OR v_mdf_attribute_count <> 1
    OR v_concretada_attribute_count <> 1
    OR v_usb_attribute_count <> 1
    OR v_excluded_mdf_category_count <> 4 THEN
    RAISE EXCEPTION 'Precondição falhou: categorias ou características esperadas não foram encontradas de forma única.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.attributes
    WHERE id = v_mdf_attribute_id AND data_type = 'boolean' AND active IS TRUE
  ) OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_mdf_attribute_id
      AND is_configured IS TRUE
      AND application = 'optional'
  ) <> v_category_count THEN
    RAISE EXCEPTION 'Precondição falhou: É 100%% MDF? não está como Opcional configurado nas 38 categorias.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.attributes
    WHERE id = v_concretada_attribute_id AND data_type = 'boolean' AND active IS TRUE
  ) OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_concretada_attribute_id
      AND is_configured IS TRUE
      AND application = 'unavailable'
  ) <> v_category_count THEN
    RAISE EXCEPTION 'Precondição falhou: É concretada? não está como N/A configurado nas 38 categorias.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.attributes
    WHERE id = v_usb_attribute_id AND data_type = 'integer' AND active IS TRUE
  ) OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_usb_attribute_id
  ) <> v_category_count OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_usb_attribute_id
      AND is_configured IS TRUE
  ) <> v_category_count OR (
    SELECT count(*) FROM public.attribute_values WHERE attribute_id = v_usb_attribute_id
  ) <> 4 OR (
    SELECT count(*) FROM public.category_attributes WHERE attribute_id = v_usb_attribute_id
  ) <> 3 OR (
    SELECT count(*) FROM public.attributes WHERE dependency_attribute_id = v_usb_attribute_id
  ) <> 0 OR (
    SELECT count(*) FROM public.attribute_dependency_alternatives
    WHERE attribute_id = v_usb_attribute_id OR reference_attribute_id = v_usb_attribute_id
  ) <> 0 OR (
    SELECT count(*) FROM public.products
    WHERE (technical_specs -> 'technicalValues') ? 'Quantidade de entradas USB'
  ) <> 1 OR (
    SELECT count(*) FROM public.product_variations
    WHERE attributes::text ILIKE '%Quantidade de entradas USB%'
  ) <> 0 THEN
    RAISE EXCEPTION 'Precondição falhou: Quantidade de entradas USB tem relações ou valores diferentes do esperado.';
  END IF;

  UPDATE public.attribute_category_applications application
  SET application = 'unavailable',
      is_configured = true,
      updated_at = now()
  FROM public.categories category
  WHERE application.attribute_id = v_mdf_attribute_id
    AND application.category_id = category.id
    AND category.type = 'category'
    AND category.name IN ('Pias', 'Colchões', 'Sofás', 'Poltronas');

  UPDATE public.attribute_category_applications application
  SET application = 'optional',
      is_configured = true,
      updated_at = now()
  FROM public.categories category
  WHERE application.attribute_id = v_concretada_attribute_id
    AND application.category_id = category.id
    AND category.type = 'category'
    AND category.name = 'Pias';

  IF (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_mdf_attribute_id AND is_configured IS TRUE AND application = 'optional'
  ) <> v_category_count - 4 OR (
    SELECT count(*) FROM public.attribute_category_applications application
    JOIN public.categories category ON category.id = application.category_id
    WHERE application.attribute_id = v_mdf_attribute_id
      AND application.is_configured IS TRUE
      AND application.application = 'unavailable'
      AND category.name IN ('Pias', 'Colchões', 'Sofás', 'Poltronas')
  ) <> 4 OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_concretada_attribute_id
      AND is_configured IS TRUE AND application = 'optional'
  ) <> 1 OR (
    SELECT count(*) FROM public.attribute_category_applications application
    JOIN public.categories category ON category.id = application.category_id
    WHERE application.attribute_id = v_concretada_attribute_id
      AND application.application = 'optional'
      AND category.name = 'Pias'
  ) <> 1 OR (
    SELECT count(*) FROM public.attribute_category_applications
    WHERE attribute_id = v_concretada_attribute_id
      AND is_configured IS TRUE AND application = 'unavailable'
  ) <> v_category_count - 1 THEN
    RAISE EXCEPTION 'As aplicações por categoria de MDF ou concretada ficaram inconsistentes.';
  END IF;

  DELETE FROM public.attributes
  WHERE id = v_usb_attribute_id;

  GET DIAGNOSTICS v_delete_count = ROW_COUNT;

  IF v_delete_count <> 1
    OR EXISTS (SELECT 1 FROM public.attributes WHERE id = v_usb_attribute_id)
    OR EXISTS (SELECT 1 FROM public.attribute_values WHERE attribute_id = v_usb_attribute_id)
    OR EXISTS (SELECT 1 FROM public.attribute_category_applications WHERE attribute_id = v_usb_attribute_id)
    OR EXISTS (SELECT 1 FROM public.category_attributes WHERE attribute_id = v_usb_attribute_id)
    OR (
      SELECT count(*) FROM public.products
      WHERE (technical_specs -> 'technicalValues') ? 'Quantidade de entradas USB'
    ) <> 1 THEN
    RAISE EXCEPTION 'A característica USB não foi removida ou o valor técnico histórico não foi preservado.';
  END IF;
END
$update_mdf_concretada_apps_remove_usb_count$;
