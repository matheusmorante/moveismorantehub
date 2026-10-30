-- Saves only option rows; characteristic metadata and group membership remain untouched.
-- Rollback: DROP FUNCTION IF EXISTS public.save_characteristic_options(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.save_characteristic_options(
  p_attribute_id uuid,
  p_options jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_attribute public.attributes%ROWTYPE;
  v_old_option record;
  v_option jsonb;
  v_option_id uuid;
  v_raw_id text;
  v_option_value text;
  v_existing_value text;
  v_active boolean;
  v_has_active boolean := false;
  v_type text;
  v_order integer := 0;
  v_seen_values text[] := ARRAY[]::text[];
  v_seen_ids text[] := ARRAY[]::text[];
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para salvar opções.' USING ERRCODE = '42501';
  END IF;
  IF p_attribute_id IS NULL THEN
    RAISE EXCEPTION 'Característica não informada.';
  END IF;
  IF jsonb_typeof(p_options) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'As opções da característica devem ser uma lista.';
  END IF;
  IF jsonb_array_length(p_options) = 0 THEN
    RAISE EXCEPTION 'Mantenha pelo menos uma opção cadastrada.';
  END IF;

  SELECT * INTO v_attribute
  FROM public.attributes
  WHERE id = p_attribute_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Característica não encontrada.';
  END IF;

  v_type := public._normalize_characteristic_fill_type(v_attribute.data_type);
  IF v_type NOT IN ('radio', 'multi_select') THEN
    RAISE EXCEPTION 'Salve a característica como opção única ou múltipla antes de gerenciar opções.';
  END IF;

  FOR v_option IN SELECT value FROM jsonb_array_elements(p_options) AS item(value) LOOP
    IF jsonb_typeof(v_option) IS DISTINCT FROM 'object'
      OR jsonb_typeof(v_option->'value') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Cada opção precisa ter um texto válido.';
    END IF;

    v_option_value := nullif(btrim(v_option->>'value'), '');
    IF v_option_value IS NULL THEN
      RAISE EXCEPTION 'As opções não podem ficar vazias.';
    END IF;
    IF lower(v_option_value) = ANY(v_seen_values) THEN
      RAISE EXCEPTION 'As opções não podem ter nomes duplicados.';
    END IF;
    v_seen_values := array_append(v_seen_values, lower(v_option_value));

    IF v_option ? 'active' THEN
      IF jsonb_typeof(v_option->'active') IS DISTINCT FROM 'boolean' THEN
        RAISE EXCEPTION 'O estado da opção precisa ser verdadeiro ou falso.';
      END IF;
      v_active := (v_option->>'active')::boolean;
    ELSE
      v_active := true;
    END IF;
    v_has_active := v_has_active OR v_active;

    v_raw_id := coalesce(v_option->>'id', '');
    IF v_raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      IF lower(v_raw_id) = ANY(v_seen_ids) THEN
        RAISE EXCEPTION 'Uma opção não pode aparecer mais de uma vez.';
      END IF;
      v_seen_ids := array_append(v_seen_ids, lower(v_raw_id));
    END IF;
  END LOOP;

  IF NOT v_has_active THEN
    RAISE EXCEPTION 'Mantenha pelo menos uma opção ativa.';
  END IF;

  FOR v_old_option IN
    SELECT id, value
    FROM public.attribute_values
    WHERE attribute_id = p_attribute_id
    FOR UPDATE
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_options) AS item(value)
      WHERE lower(coalesce(item.value->>'id', '')) = v_old_option.id::text
    ) THEN
      IF public._characteristic_is_used(v_attribute.name, v_old_option.value) THEN
        RAISE EXCEPTION 'A opção "%" não pode ser removida porque está vinculada a produtos.', v_old_option.value;
      END IF;
      DELETE FROM public.attribute_values WHERE id = v_old_option.id;
    END IF;
  END LOOP;

  FOR v_option IN SELECT value FROM jsonb_array_elements(p_options) AS item(value) LOOP
    v_option_value := btrim(v_option->>'value');
    v_active := coalesce((v_option->>'active')::boolean, true);
    v_raw_id := coalesce(v_option->>'id', '');
    v_option_id := NULL;
    v_existing_value := NULL;

    IF v_raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_option_id := v_raw_id::uuid;
      SELECT value INTO v_existing_value
      FROM public.attribute_values
      WHERE id = v_option_id AND attribute_id = p_attribute_id;
    END IF;

    IF v_existing_value IS NOT NULL THEN
      IF v_existing_value <> v_option_value
        AND public._characteristic_is_used(v_attribute.name, v_existing_value) THEN
        RAISE EXCEPTION 'A opção "%" não pode ser renomeada porque está vinculada a produtos.', v_existing_value;
      END IF;
      UPDATE public.attribute_values
      SET value = v_option_value,
          active = v_active,
          sort_order = v_order
      WHERE id = v_option_id AND attribute_id = p_attribute_id;
    ELSE
      INSERT INTO public.attribute_values (attribute_id, value, active, sort_order)
      VALUES (p_attribute_id, v_option_value, v_active, v_order);
    END IF;
    v_order := v_order + 1;
  END LOOP;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', option.id::text,
        'value', option.value,
        'active', option.active,
        'sortOrder', option.sort_order
      ) ORDER BY option.sort_order, option.id
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.attribute_values AS option
  WHERE option.attribute_id = p_attribute_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.save_characteristic_options(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_characteristic_options(uuid, jsonb) TO authenticated;

-- Rollback: restore save_product_characteristic_definition_v2 from
-- 20261028123900_fix_characteristic_definition_updated_at.sql.
-- Options are validated by save_characteristic_options when submitted separately.
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

  IF p_definition ? 'options'
    AND v_type IN ('radio', 'multi_select')
    AND NOT EXISTS (
      SELECT 1 FROM public.attribute_values WHERE attribute_id = v_id AND active
    ) THEN
    RAISE EXCEPTION 'Mantenha pelo menos uma opção ativa para este tipo de característica.';
  END IF;

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
