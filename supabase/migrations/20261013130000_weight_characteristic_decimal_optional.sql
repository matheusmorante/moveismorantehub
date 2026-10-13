-- Migration: 20261013130000_weight_characteristic_decimal_optional.sql
-- Goal: Ensure characteristic 'Peso' is optional across all categories and has 1 decimal place.

-- 1. Ensure weight characteristics are optional across all categories in category_attributes
UPDATE public.category_attributes ca
SET is_required = false
FROM public.attributes a
WHERE a.id = ca.attribute_id
  AND (lower(btrim(a.name)) = 'peso' OR a.data_type = 'weight');

-- 2. Ensure weight characteristics are configured with 1 decimal place and not globally required
UPDATE public.attributes
SET decimal_places = 1,
    is_globally_required = false
WHERE data_type = 'weight'
   OR lower(btrim(name)) = 'peso';

-- 3. Update save_product_characteristic_definition function to enforce 1 decimal place and optional status for weight
CREATE OR REPLACE FUNCTION public.save_product_characteristic_definition(p_definition jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_existing public.attributes%ROWTYPE;
  v_name text;
  v_old_name text;
  v_data_type text;
  v_old_type text;
  v_unit text;
  v_old_unit text;
  v_decimal_places smallint;
  v_active boolean;
  v_is_custom boolean;
  v_is_globally_required boolean;
  v_has_options boolean;
  v_option jsonb;
  v_option_id uuid;
  v_option_value text;
  v_existing_value text;
  v_order integer := 0;
  v_seen_options text[] := ARRAY[]::text[];
  v_old_option record;
  v_category jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para salvar características.' USING ERRCODE = '42501';
  END IF;
  IF p_definition IS NULL OR jsonb_typeof(p_definition) <> 'object' THEN
    RAISE EXCEPTION 'Definição de característica inválida.';
  END IF;

  v_id := nullif(p_definition->>'id', '')::uuid;
  IF v_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.attributes
    WHERE id = v_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Característica não encontrada.';
    END IF;
    v_old_name := v_existing.name;
  END IF;

  v_name := nullif(btrim(coalesce(p_definition->>'name', v_existing.name)), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'O nome da característica é obrigatório.';
  END IF;

  v_data_type := lower(coalesce(
    nullif(p_definition->>'dataType', ''),
    v_existing.data_type,
    'text_short'
  ));
  v_data_type := CASE v_data_type
    WHEN 'text' THEN 'text_short'
    WHEN 'number' THEN 'integer'
    WHEN 'list' THEN 'radio'
    ELSE v_data_type
  END;
  IF v_data_type NOT IN (
    'radio', 'multi_select', 'integer', 'decimal', 'weight', 'percentage',
    'measure', 'text_short', 'text_long', 'boolean'
  ) THEN
    RAISE EXCEPTION 'Tipo de preenchimento não suportado: %.', v_data_type;
  END IF;

  v_old_type := CASE coalesce(v_existing.data_type, '')
    WHEN 'text' THEN 'text_short'
    WHEN 'number' THEN 'integer'
    WHEN 'list' THEN 'radio'
    ELSE coalesce(v_existing.data_type, '')
  END;
  v_old_unit := CASE
    WHEN v_old_type = 'measure' THEN coalesce(v_existing.unit, 'cm')
    ELSE v_existing.unit
  END;

  v_active := coalesce(nullif(p_definition->>'active', '')::boolean, v_existing.active, true);
  v_is_custom := coalesce(nullif(p_definition->>'isCustom', '')::boolean, v_existing.is_custom, true);
  v_is_globally_required := coalesce(
    nullif(p_definition->>'isGloballyRequired', '')::boolean,
    v_existing.is_globally_required,
    false
  );

  IF v_data_type = 'decimal' THEN
    v_decimal_places := coalesce(
      nullif(p_definition->>'decimalPlaces', '')::smallint,
      v_existing.decimal_places,
      2
    );
    IF v_decimal_places NOT IN (1, 2, 3) THEN
      RAISE EXCEPTION 'Número decimal aceita apenas 1, 2 ou 3 casas decimais.';
    END IF;
  ELSIF v_data_type = 'weight' OR lower(btrim(v_name)) = 'peso' THEN
    v_decimal_places := 1;
  ELSE
    v_decimal_places := NULL;
  END IF;

  IF v_data_type = 'weight' OR lower(btrim(v_name)) = 'peso' THEN
    v_is_globally_required := false;
  END IF;

  IF v_data_type = 'weight' THEN
    v_unit := 'kg';
  ELSIF v_data_type = 'percentage' THEN
    v_unit := '%';
  ELSIF v_data_type = 'measure' THEN
    v_unit := coalesce(nullif(btrim(p_definition->>'unit'), ''), v_existing.unit, 'cm');
    IF v_unit NOT IN ('cm', 'mm', 'm') THEN
      RAISE EXCEPTION 'Medida aceita as unidades cm, mm ou m.';
    END IF;
  ELSIF p_definition ? 'unit' THEN
    v_unit := nullif(btrim(p_definition->>'unit'), '');
  ELSE
    v_unit := v_existing.unit;
  END IF;

  IF v_id IS NOT NULL THEN
    IF lower(btrim(v_name)) <> lower(btrim(v_old_name))
      AND public._characteristic_is_used(v_old_name) THEN
      RAISE EXCEPTION 'O nome não pode ser alterado porque a característica já possui valores em produtos.';
    END IF;
    IF v_old_type <> '' AND v_data_type <> v_old_type
      AND public._characteristic_is_used(v_old_name) THEN
      RAISE EXCEPTION 'O tipo não pode ser alterado porque a característica já possui valores em produtos.';
    END IF;
    IF v_data_type = v_old_type
      AND v_unit IS DISTINCT FROM v_old_unit
      AND public._characteristic_is_used(v_old_name) THEN
      RAISE EXCEPTION 'A unidade não pode ser alterada porque a característica já possui valores em produtos.';
    END IF;
    IF v_data_type = 'decimal'
      AND v_old_type = 'decimal'
      AND v_decimal_places < coalesce(v_existing.decimal_places, 2)
      AND (
        EXISTS (
          SELECT 1 FROM public.products AS product
          WHERE public._characteristic_json_exceeds_precision(
            product.technical_specs, v_old_name, v_decimal_places
          )
        ) OR EXISTS (
          SELECT 1 FROM public.product_variations AS variation
          WHERE public._characteristic_json_exceeds_precision(
            variation.attributes, v_old_name, v_decimal_places
          )
        )
      ) THEN
      RAISE EXCEPTION 'A precisão não pode ser reduzida: existem valores que excedem as casas decimais selecionadas.';
    END IF;

    UPDATE public.attributes
    SET name = v_name,
        active = v_active,
        data_type = v_data_type,
        unit = v_unit,
        decimal_places = v_decimal_places,
        is_custom = v_is_custom,
        is_globally_required = v_is_globally_required
    WHERE id = v_id;
  ELSE
    INSERT INTO public.attributes (
      name, active, data_type, unit, decimal_places, is_custom, is_globally_required
    )
    VALUES (
      v_name, v_active, v_data_type, v_unit, v_decimal_places, v_is_custom, v_is_globally_required
    )
    RETURNING id INTO v_id;
  END IF;

  v_has_options := p_definition ? 'options';
  IF v_has_options THEN
    IF jsonb_typeof(p_definition->'options') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'As opções da característica devem ser uma lista.';
    END IF;
    IF v_data_type IN ('radio', 'multi_select') AND jsonb_array_length(p_definition->'options') = 0 THEN
      RAISE EXCEPTION 'Características de escolha precisam ter pelo menos uma opção.';
    END IF;

    FOR v_option IN SELECT value FROM jsonb_array_elements(p_definition->'options') AS item(value) LOOP
      v_option_value := btrim(v_option->>'value');
      IF v_option_value = '' THEN
        RAISE EXCEPTION 'Uma opção da característica não pode estar vazia.';
      END IF;
      IF lower(v_option_value) = ANY(v_seen_options) THEN
        RAISE EXCEPTION 'A opção "%" está duplicada.', v_option_value;
      END IF;
      v_seen_options := array_append(v_seen_options, lower(v_option_value));
    END LOOP;

    FOR v_old_option IN
      SELECT * FROM public.attribute_values
      WHERE attribute_id = v_id
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_definition->'options') AS item(value)
        WHERE (item.value->>'id')::text = v_old_option.id::text
      ) THEN
        IF public._characteristic_is_used(v_name, v_old_option.value) THEN
          RAISE EXCEPTION 'A opção "%" não pode ser removida porque está em uso por produtos.', v_old_option.value;
        END IF;
        DELETE FROM public.attribute_values WHERE id = v_old_option.id;
      END IF;
    END LOOP;

    FOR v_option IN SELECT value FROM jsonb_array_elements(p_definition->'options') AS item(value) LOOP
      v_option_value := btrim(v_option->>'value');
      v_option_id := NULL;
      IF coalesce(v_option->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_option_id := (v_option->>'id')::uuid;
      END IF;

      v_existing_value := NULL;
      IF v_option_id IS NOT NULL THEN
        SELECT value INTO v_existing_value
        FROM public.attribute_values
        WHERE id = v_option_id AND attribute_id = v_id;
      END IF;

      IF v_existing_value IS NOT NULL THEN
        IF v_existing_value <> v_option_value
          AND public._characteristic_is_used(v_old_name, v_existing_value) THEN
          RAISE EXCEPTION 'A opção "%" não pode ser renomeada porque está vinculada a produtos.', v_existing_value;
        END IF;
        UPDATE public.attribute_values
        SET value = v_option_value, sort_order = v_order
        WHERE id = v_option_id AND attribute_id = v_id;
      ELSE
        INSERT INTO public.attribute_values (attribute_id, value, sort_order)
        VALUES (v_id, v_option_value, v_order);
      END IF;
      v_order := v_order + 1;
    END LOOP;
  END IF;

  IF p_definition ? 'categoryAttributes' THEN
    IF jsonb_typeof(p_definition->'categoryAttributes') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Os vínculos de categoria devem ser uma lista.';
    END IF;
    DELETE FROM public.category_attributes WHERE attribute_id = v_id;
    FOR v_category IN
      SELECT value FROM jsonb_array_elements(p_definition->'categoryAttributes') AS item(value)
    LOOP
      INSERT INTO public.category_attributes (attribute_id, category_id, is_required)
      VALUES (
        v_id,
        (v_category->>'categoryId')::uuid,
        CASE
          WHEN v_data_type = 'weight' OR lower(btrim(v_name)) = 'peso' THEN false
          ELSE coalesce((v_category->>'isRequired')::boolean, false)
        END
      );
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;
