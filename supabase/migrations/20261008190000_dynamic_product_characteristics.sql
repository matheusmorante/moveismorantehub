ALTER TABLE public.attributes
  ADD COLUMN is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN decimal_places smallint;

ALTER TABLE public.attribute_values
  ADD COLUMN sort_order integer;

UPDATE public.attributes
SET decimal_places = 2
WHERE data_type = 'decimal'
  AND decimal_places IS NULL;

ALTER TABLE public.attributes
  ADD CONSTRAINT attributes_decimal_places_allowed
    CHECK (decimal_places IS NULL OR decimal_places IN (1, 2, 3)),
  ADD CONSTRAINT attributes_decimal_places_required
    CHECK (data_type IS DISTINCT FROM 'decimal' OR (decimal_places IS NOT NULL AND decimal_places IN (1, 2, 3))),
  ADD CONSTRAINT attributes_percentage_uses_percent
    CHECK (data_type IS DISTINCT FROM 'percentage' OR unit IS NOT DISTINCT FROM '%');

CREATE UNIQUE INDEX attributes_normalized_name_unique
  ON public.attributes (lower(btrim(name)))
  WHERE btrim(name) <> '';

CREATE UNIQUE INDEX attribute_values_normalized_value_unique
  ON public.attribute_values (attribute_id, lower(btrim(value)))
  WHERE btrim(value) <> '';

UPDATE public.attributes
SET data_type = 'weight',
    unit = 'kg',
    decimal_places = NULL
WHERE data_type = 'weight'
   OR lower(btrim(name)) LIKE 'peso%'
   OR lower(btrim(coalesce(unit, ''))) = 'kg';

ALTER TABLE public.attributes
  ADD CONSTRAINT attributes_weight_uses_kilograms
    CHECK (data_type IS DISTINCT FROM 'weight' OR unit IS NOT DISTINCT FROM 'kg');

CREATE OR REPLACE FUNCTION public._characteristic_json_value_matches(p_value jsonb, p_option text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_text text;
BEGIN
  IF jsonb_typeof(p_value) IN ('string', 'number', 'boolean') THEN
    v_text := p_value #>> '{}';
    IF lower(btrim(v_text)) = lower(btrim(p_option)) THEN
      RETURN true;
    END IF;
    IF jsonb_typeof(p_value) = 'string' AND EXISTS (
      SELECT 1
      FROM unnest(string_to_array(v_text, ',')) AS part(value)
      WHERE lower(btrim(part.value)) = lower(btrim(p_option))
    ) THEN
      RETURN true;
    END IF;
  ELSIF jsonb_typeof(p_value) = 'array' THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_value) AS item(value) LOOP
      IF public._characteristic_json_value_matches(v_item, p_option) THEN
        RETURN true;
      END IF;
    END LOOP;
  ELSIF jsonb_typeof(p_value) = 'object' THEN
    FOR v_item IN SELECT value FROM jsonb_each(p_value) AS entry(key, value) LOOP
      IF public._characteristic_json_value_matches(v_item, p_option) THEN
        RETURN true;
      END IF;
    END LOOP;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public._characteristic_json_has_value(
  p_document jsonb,
  p_name text,
  p_option text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry record;
BEGIN
  IF jsonb_typeof(p_document) = 'object' THEN
    IF lower(btrim(coalesce(p_document->>'name', ''))) = lower(btrim(p_name))
      AND p_document ? 'value' THEN
      IF p_option IS NOT NULL THEN
        IF public._characteristic_json_value_matches(p_document->'value', p_option) THEN
          RETURN true;
        END IF;
      ELSIF p_document->'value' <> 'null'::jsonb
        AND p_document->'value' <> '""'::jsonb
        AND p_document->'value' <> '[]'::jsonb
        AND p_document->'value' <> '{}'::jsonb THEN
        RETURN true;
      END IF;
    END IF;

    FOR v_entry IN SELECT key, value FROM jsonb_each(p_document) LOOP
      IF lower(btrim(v_entry.key)) = lower(btrim(p_name)) THEN
        IF p_option IS NOT NULL THEN
          IF public._characteristic_json_value_matches(v_entry.value, p_option) THEN
            RETURN true;
          END IF;
        ELSIF v_entry.value <> 'null'::jsonb
          AND v_entry.value <> '""'::jsonb
          AND v_entry.value <> '[]'::jsonb
          AND v_entry.value <> '{}'::jsonb THEN
          RETURN true;
        END IF;
      END IF;

      IF public._characteristic_json_has_value(v_entry.value, p_name, p_option) THEN
        RETURN true;
      END IF;
    END LOOP;
  ELSIF jsonb_typeof(p_document) = 'array' THEN
    FOR v_entry IN SELECT value FROM jsonb_array_elements(p_document) AS item(value) LOOP
      IF public._characteristic_json_has_value(v_entry.value, p_name, p_option) THEN
        RETURN true;
      END IF;
    END LOOP;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public._characteristic_numeric_exceeds_precision(p_value jsonb, p_places integer)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_value numeric;
  v_text text;
  v_item jsonb;
BEGIN
  IF jsonb_typeof(p_value) = 'number' THEN
    v_value := (p_value #>> '{}')::numeric;
    RETURN v_value <> trunc(v_value, p_places);
  ELSIF jsonb_typeof(p_value) = 'string' THEN
    v_text := btrim(p_value #>> '{}');
    IF v_text !~ '^[+-]?([0-9]+([.,][0-9]+)?|[.,][0-9]+)$' THEN
      RETURN false;
    END IF;
    v_value := replace(v_text, ',', '.')::numeric;
    RETURN v_value <> trunc(v_value, p_places);
  ELSIF jsonb_typeof(p_value) = 'array' THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_value) AS item(value) LOOP
      IF public._characteristic_numeric_exceeds_precision(v_item, p_places) THEN
        RETURN true;
      END IF;
    END LOOP;
  ELSIF jsonb_typeof(p_value) = 'object' THEN
    FOR v_item IN SELECT value FROM jsonb_each(p_value) AS entry(key, value) LOOP
      IF public._characteristic_numeric_exceeds_precision(v_item, p_places) THEN
        RETURN true;
      END IF;
    END LOOP;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public._characteristic_json_exceeds_precision(
  p_document jsonb,
  p_name text,
  p_places integer
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry record;
BEGIN
  IF jsonb_typeof(p_document) = 'object' THEN
    IF lower(btrim(coalesce(p_document->>'name', ''))) = lower(btrim(p_name))
      AND p_document ? 'value'
      AND public._characteristic_numeric_exceeds_precision(p_document->'value', p_places) THEN
      RETURN true;
    END IF;

    FOR v_entry IN SELECT key, value FROM jsonb_each(p_document) LOOP
      IF lower(btrim(v_entry.key)) = lower(btrim(p_name))
        AND public._characteristic_numeric_exceeds_precision(v_entry.value, p_places) THEN
        RETURN true;
      END IF;
      IF public._characteristic_json_exceeds_precision(v_entry.value, p_name, p_places) THEN
        RETURN true;
      END IF;
    END LOOP;
  ELSIF jsonb_typeof(p_document) = 'array' THEN
    FOR v_entry IN SELECT value FROM jsonb_array_elements(p_document) AS item(value) LOOP
      IF public._characteristic_json_exceeds_precision(v_entry.value, p_name, p_places) THEN
        RETURN true;
      END IF;
    END LOOP;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public._characteristic_value_max_fractional_digits(p_value jsonb)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_text text;
  v_max integer := 0;
  v_item jsonb;
BEGIN
  IF jsonb_typeof(p_value) IN ('number', 'string') THEN
    v_text := btrim(p_value #>> '{}');
    IF v_text ~ '^[+-]?([0-9]+([.,][0-9]+)?|[.,][0-9]+)$' THEN
      RETURN scale(replace(v_text, ',', '.')::numeric);
    END IF;
  ELSIF jsonb_typeof(p_value) = 'array' THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_value) AS item(value) LOOP
      v_max := greatest(v_max, public._characteristic_value_max_fractional_digits(v_item));
    END LOOP;
  ELSIF jsonb_typeof(p_value) = 'object' THEN
    FOR v_item IN SELECT value FROM jsonb_each(p_value) AS entry(key, value) LOOP
      v_max := greatest(v_max, public._characteristic_value_max_fractional_digits(v_item));
    END LOOP;
  END IF;
  RETURN v_max;
END;
$$;

CREATE OR REPLACE FUNCTION public._characteristic_json_max_fractional_digits(p_document jsonb, p_name text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max integer := 0;
  v_entry record;
BEGIN
  IF jsonb_typeof(p_document) = 'object' THEN
    IF lower(btrim(coalesce(p_document->>'name', ''))) = lower(btrim(p_name))
      AND p_document ? 'value' THEN
      v_max := greatest(v_max, public._characteristic_value_max_fractional_digits(p_document->'value'));
    END IF;

    FOR v_entry IN SELECT key, value FROM jsonb_each(p_document) LOOP
      IF lower(btrim(v_entry.key)) = lower(btrim(p_name)) THEN
        v_max := greatest(v_max, public._characteristic_value_max_fractional_digits(v_entry.value));
      END IF;
      v_max := greatest(v_max, public._characteristic_json_max_fractional_digits(v_entry.value, p_name));
    END LOOP;
  ELSIF jsonb_typeof(p_document) = 'array' THEN
    FOR v_entry IN SELECT value FROM jsonb_array_elements(p_document) AS item(value) LOOP
      v_max := greatest(v_max, public._characteristic_json_max_fractional_digits(v_entry.value, p_name));
    END LOOP;
  END IF;
  RETURN v_max;
END;
$$;

DO $$
DECLARE
  v_attribute record;
  v_max_scale integer;
BEGIN
  FOR v_attribute IN
    SELECT id, name FROM public.attributes WHERE data_type = 'decimal'
  LOOP
    SELECT greatest(
      coalesce((
        SELECT max(public._characteristic_json_max_fractional_digits(
          product.technical_specs, v_attribute.name
        )) FROM public.products AS product
      ), 0),
      coalesce((
        SELECT max(public._characteristic_json_max_fractional_digits(
          variation.attributes, v_attribute.name
        )) FROM public.product_variations AS variation
      ), 0)
    ) INTO v_max_scale;

    IF v_max_scale > 3 THEN
      RAISE EXCEPTION 'A característica "%" possui valores com mais de 3 casas decimais; revise os dados antes da migração.', v_attribute.name;
    END IF;

    UPDATE public.attributes
    SET decimal_places = greatest(2, v_max_scale)::smallint
    WHERE id = v_attribute.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._characteristic_is_used(p_name text, p_option text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE public._characteristic_json_has_value(product.technical_specs, p_name, p_option)
  ) OR EXISTS (
    SELECT 1
    FROM public.product_variations AS variation
    WHERE public._characteristic_json_has_value(variation.attributes, p_name, p_option)
  );
$$;

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
  ELSE
    v_decimal_places := NULL;
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
      v_option_value := nullif(btrim(v_option->>'value'), '');
      IF v_option_value IS NULL THEN
        RAISE EXCEPTION 'As opções não podem estar vazias.';
      END IF;
      IF lower(v_option_value) = ANY (v_seen_options) THEN
        RAISE EXCEPTION 'As opções de uma característica não podem ter nomes duplicados.';
      END IF;
      v_seen_options := array_append(v_seen_options, lower(v_option_value));
    END LOOP;

    FOR v_old_option IN
      SELECT id, value
      FROM public.attribute_values
      WHERE attribute_id = v_id
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_definition->'options') AS item(value)
        WHERE item.value->>'id' = v_old_option.id::text
      ) THEN
        IF public._characteristic_is_used(v_old_name, v_old_option.value) THEN
          RAISE EXCEPTION 'A opção "%" não pode ser removida porque está vinculada a produtos.', v_old_option.value;
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
        coalesce((v_category->>'isRequired')::boolean, false)
      );
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_product_characteristic(p_attribute_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attribute public.attributes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para excluir características.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_attribute
  FROM public.attributes
  WHERE id = p_attribute_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Característica não encontrada.';
  END IF;

  IF public._characteristic_is_used(v_attribute.name) THEN
    UPDATE public.attributes SET active = false WHERE id = p_attribute_id;
    RETURN 'deactivated';
  END IF;

  DELETE FROM public.attributes WHERE id = p_attribute_id;
  RETURN 'deleted';
END;
$$;

REVOKE ALL ON FUNCTION public._characteristic_json_value_matches(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._characteristic_json_has_value(jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._characteristic_numeric_exceeds_precision(jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._characteristic_json_exceeds_precision(jsonb, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._characteristic_value_max_fractional_digits(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._characteristic_json_max_fractional_digits(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._characteristic_is_used(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_product_characteristic_definition(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_product_characteristic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product_characteristic_definition(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product_characteristic(uuid) TO authenticated;
