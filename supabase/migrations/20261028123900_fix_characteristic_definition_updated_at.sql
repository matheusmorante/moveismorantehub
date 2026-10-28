-- The attributes table does not track updated_at. Keep the definition RPC aligned
-- with its actual schema so creating and editing characteristics work atomically.
CREATE OR REPLACE FUNCTION public.save_product_characteristic_definition_v2(p_definition jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_group_id uuid;
  v_configuration jsonb;
  v_dependency_id uuid;
  v_dependency_operator text;
  v_dependency_value text;
  v_option jsonb;
  v_option_value text;
  v_active boolean;
  v_type text;
  v_application jsonb;
  v_category_id uuid;
  v_application_value text;
  v_seen_categories uuid[] := ARRAY[]::uuid[];
  v_expected_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para salvar características.' USING ERRCODE = '42501';
  END IF;
  IF p_definition IS NULL OR jsonb_typeof(p_definition) <> 'object' THEN
    RAISE EXCEPTION 'Definição de característica inválida.';
  END IF;

  -- Reuse the established name, type, option and product-value integrity checks.
  v_id := public.save_product_characteristic_definition(p_definition);
  SELECT public._normalize_characteristic_fill_type(data_type)
  INTO v_type FROM public.attributes WHERE id = v_id;

  SELECT group_id, configuration INTO v_group_id, v_configuration
  FROM public.attributes WHERE id = v_id;
  IF p_definition ? 'groupId' THEN
    v_group_id := nullif(p_definition->>'groupId', '')::uuid;
    IF v_group_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.attribute_groups WHERE id = v_group_id) THEN
      RAISE EXCEPTION 'Selecione um grupo válido para a característica.';
    END IF;
  END IF;

  IF p_definition ? 'configuration' THEN
    v_configuration := p_definition->'configuration';
  END IF;
  IF jsonb_typeof(v_configuration) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'As configurações da característica devem ser um objeto.';
  END IF;

  IF p_definition ? 'dependency' THEN
    IF p_definition->'dependency' = 'null'::jsonb THEN
      v_dependency_id := NULL;
      v_dependency_operator := NULL;
      v_dependency_value := NULL;
    ELSIF jsonb_typeof(p_definition->'dependency') = 'object' THEN
      v_dependency_id := nullif(p_definition->'dependency'->>'referenceAttributeId', '')::uuid;
      v_dependency_operator := nullif(p_definition->'dependency'->>'operator', '');
      v_dependency_value := nullif(btrim(p_definition->'dependency'->>'value'), '');
    ELSE
      RAISE EXCEPTION 'A condição da característica é inválida.';
    END IF;
  ELSE
    SELECT dependency_attribute_id, dependency_operator, dependency_value
    INTO v_dependency_id, v_dependency_operator, v_dependency_value
    FROM public.attributes WHERE id = v_id;
  END IF;

  UPDATE public.attributes
  SET group_id = v_group_id,
      configuration = v_configuration,
      dependency_attribute_id = v_dependency_id,
      dependency_operator = v_dependency_operator,
      dependency_value = v_dependency_value
  WHERE id = v_id;

  IF p_definition ? 'options' THEN
    FOR v_option IN SELECT value FROM jsonb_array_elements(p_definition->'options') AS item(value) LOOP
      v_option_value := nullif(btrim(v_option->>'value'), '');
      v_active := coalesce(nullif(v_option->>'active', '')::boolean, true);
      UPDATE public.attribute_values
      SET active = v_active
      WHERE attribute_id = v_id AND lower(btrim(value)) = lower(v_option_value);
    END LOOP;
  END IF;

  IF v_type IN ('radio', 'multi_select') AND NOT EXISTS (
    SELECT 1 FROM public.attribute_values WHERE attribute_id = v_id AND active
  ) THEN
    RAISE EXCEPTION 'Mantenha pelo menos uma opção ativa para este tipo de característica.';
  END IF;

  -- Keep the write atomic with the characteristic definition. Existing clients that
  -- omit categoryApplications leave the saved category mapping untouched.
  IF p_definition ? 'categoryApplications' THEN
    IF jsonb_typeof(p_definition->'categoryApplications') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'A aplicação por categoria deve ser uma lista.';
    END IF;
    SELECT count(*) INTO v_expected_count
    FROM public.categories WHERE type = 'category';
    FOR v_application IN
      SELECT value FROM jsonb_array_elements(p_definition->'categoryApplications') AS item(value)
    LOOP
      IF jsonb_typeof(v_application) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'A aplicação de uma categoria está inválida.';
      END IF;
      v_category_id := nullif(v_application->>'categoryId', '')::uuid;
      v_application_value := nullif(v_application->>'application', '');
      IF v_category_id IS NULL OR v_category_id = ANY(v_seen_categories) THEN
        RAISE EXCEPTION 'Cada categoria deve aparecer exatamente uma vez.';
      END IF;
      IF v_application_value IS NULL OR v_application_value NOT IN ('unavailable', 'optional', 'required') THEN
        RAISE EXCEPTION 'Selecione uma aplicação válida para cada categoria.';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.categories
        WHERE id = v_category_id AND type = 'category'
      ) THEN
        RAISE EXCEPTION 'A lista inclui uma categoria que não está disponível.';
      END IF;
      v_seen_categories := array_append(v_seen_categories, v_category_id);
    END LOOP;
    IF cardinality(v_seen_categories) <> v_expected_count THEN
      RAISE EXCEPTION 'A aplicação deve incluir cada categoria disponível uma única vez.';
    END IF;

    DELETE FROM public.attribute_category_applications WHERE attribute_id = v_id;
    FOR v_application IN
      SELECT value FROM jsonb_array_elements(p_definition->'categoryApplications') AS item(value)
    LOOP
      INSERT INTO public.attribute_category_applications (
        attribute_id,
        category_id,
        application,
        is_configured,
        updated_at
      ) VALUES (
        v_id,
        (v_application->>'categoryId')::uuid,
        v_application->>'application',
        true,
        now()
      );
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_product_characteristic_definition_v2(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product_characteristic_definition_v2(jsonb) TO authenticated;
