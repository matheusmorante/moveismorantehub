-- Reversibility: this migration preserves product values and Sim/Não options;
-- restoring the matching definitions to radio needs no value rewrite.
CREATE OR REPLACE FUNCTION public._normalize_characteristic_fill_type(p_data_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE lower(coalesce(p_data_type, 'text_short'))
    WHEN 'text' THEN 'text_short'
    WHEN 'number' THEN 'integer'
    WHEN 'list' THEN 'radio'
    WHEN 'weight' THEN 'decimal'
    WHEN 'percentage' THEN 'decimal'
    WHEN 'measure' THEN 'decimal'
    WHEN 'boolean' THEN 'boolean'
    ELSE lower(coalesce(p_data_type, 'text_short'))
  END;
$$;

CREATE OR REPLACE FUNCTION public._characteristic_dependency_operator_is_valid(
  p_data_type text,
  p_operator text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE public._normalize_characteristic_fill_type(p_data_type)
    WHEN 'text_short' THEN p_operator IN ('contains', 'not_contains', 'equals', 'not_equals')
    WHEN 'text_long' THEN p_operator IN ('contains', 'not_contains', 'equals', 'not_equals')
    WHEN 'radio' THEN p_operator IN ('equals', 'not_equals')
    WHEN 'multi_select' THEN p_operator IN ('contains', 'not_contains')
    WHEN 'boolean' THEN p_operator IN ('equals', 'not_equals')
    WHEN 'integer' THEN p_operator IN ('equals', 'not_equals', 'greater_than', 'greater_or_equal', 'less_than', 'less_or_equal')
    WHEN 'decimal' THEN p_operator IN ('equals', 'not_equals', 'greater_than', 'greater_or_equal', 'less_than', 'less_or_equal')
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public._normalize_characteristic_fill_type(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._characteristic_dependency_operator_is_valid(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._validate_characteristic_definition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_type text;
  v_reference_type text;
  v_reference_active boolean;
  v_value numeric;
  v_cycle boolean;
  v_key text;
  v_allowed_keys text[];
BEGIN
  v_type := public._normalize_characteristic_fill_type(NEW.data_type);

  IF jsonb_typeof(NEW.configuration) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'As configurações da característica devem ser um objeto.';
  END IF;

  v_allowed_keys := CASE v_type
    WHEN 'text_short' THEN ARRAY['minLength', 'maxLength']
    WHEN 'text_long' THEN ARRAY['maxLength']
    WHEN 'integer' THEN ARRAY['minValue', 'maxValue']
    WHEN 'decimal' THEN ARRAY['minValue', 'maxValue']
    WHEN 'multi_select' THEN ARRAY['minSelections', 'maxSelections']
    ELSE ARRAY[]::text[]
  END;

  FOR v_key IN SELECT jsonb_object_keys(NEW.configuration) LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN
      RAISE EXCEPTION 'A configuração "%" não é compatível com o tipo da característica.', v_key;
    END IF;
    IF jsonb_typeof(NEW.configuration->v_key) IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'A configuração "%" precisa ser numérica.', v_key;
    END IF;
    IF v_key IN ('minLength', 'maxLength', 'minSelections', 'maxSelections')
      AND (
        (NEW.configuration->>v_key)::numeric < 0
        OR trunc((NEW.configuration->>v_key)::numeric) <> (NEW.configuration->>v_key)::numeric
      ) THEN
      RAISE EXCEPTION 'A configuração "%" precisa ser um inteiro não negativo.', v_key;
    END IF;
  END LOOP;

  IF v_type IN ('text_short', 'text_long')
    AND NEW.configuration ? 'minLength'
    AND NEW.configuration ? 'maxLength'
    AND (NEW.configuration->>'minLength')::numeric > (NEW.configuration->>'maxLength')::numeric THEN
    RAISE EXCEPTION 'O mínimo de caracteres não pode superar o máximo.';
  END IF;
  IF v_type IN ('integer', 'decimal') THEN
    IF NEW.configuration ? 'minValue'
      AND NEW.configuration ? 'maxValue'
      AND (NEW.configuration->>'minValue')::numeric > (NEW.configuration->>'maxValue')::numeric THEN
      RAISE EXCEPTION 'O valor mínimo não pode superar o máximo.';
    END IF;
    IF v_type = 'integer' AND (
      NEW.configuration->>'minValue' IS NOT NULL AND trunc((NEW.configuration->>'minValue')::numeric) <> (NEW.configuration->>'minValue')::numeric
      OR NEW.configuration->>'maxValue' IS NOT NULL AND trunc((NEW.configuration->>'maxValue')::numeric) <> (NEW.configuration->>'maxValue')::numeric
    ) THEN
      RAISE EXCEPTION 'Os limites do número inteiro precisam ser inteiros.';
    END IF;
    IF NEW.data_type = 'decimal' AND (NEW.decimal_places IS NULL OR NEW.decimal_places NOT IN (1, 2, 3)) THEN
      RAISE EXCEPTION 'Número decimal aceita apenas 1, 2 ou 3 casas decimais.';
    END IF;
  END IF;
  IF v_type = 'multi_select'
    AND NEW.configuration ? 'minSelections'
    AND NEW.configuration ? 'maxSelections'
    AND (NEW.configuration->>'minSelections')::numeric > (NEW.configuration->>'maxSelections')::numeric THEN
    RAISE EXCEPTION 'A quantidade mínima não pode superar a máxima.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('morantehub.characteristic-dependencies', 0));
  IF TG_OP = 'UPDATE' AND EXISTS (
    SELECT 1 FROM public.attributes AS dependent
    WHERE dependent.dependency_attribute_id = OLD.id
  ) THEN
    IF NEW.data_type IS DISTINCT FROM OLD.data_type THEN
      RAISE EXCEPTION 'O tipo não pode ser alterado enquanto outras características dependem dela.';
    END IF;
    IF OLD.active AND NOT NEW.active THEN
      RAISE EXCEPTION 'A característica não pode ser desativada enquanto outras dependem dela.';
    END IF;
  END IF;

  IF NEW.dependency_attribute_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.dependency_attribute_id = NEW.id THEN
    RAISE EXCEPTION 'Uma característica não pode depender dela mesma.';
  END IF;

  SELECT public._normalize_characteristic_fill_type(reference.data_type), coalesce(reference.active, true)
  INTO v_reference_type, v_reference_active
  FROM public.attributes AS reference
  WHERE reference.id = NEW.dependency_attribute_id;
  IF NOT FOUND OR NOT v_reference_active THEN
    RAISE EXCEPTION 'A característica de referência precisa existir e estar ativa.';
  END IF;
  IF NOT public._characteristic_dependency_operator_is_valid(v_reference_type, NEW.dependency_operator) THEN
    RAISE EXCEPTION 'O operador não é compatível com o tipo da característica de referência.';
  END IF;

  IF v_reference_type IN ('radio', 'multi_select') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.attribute_values AS option
      WHERE option.attribute_id = NEW.dependency_attribute_id
        AND option.active
        AND lower(btrim(option.value)) = lower(btrim(NEW.dependency_value))
    ) THEN
      RAISE EXCEPTION 'A condição precisa usar uma opção ativa da característica de referência.';
    END IF;
  ELSIF v_reference_type = 'boolean' THEN
    IF lower(btrim(NEW.dependency_value)) NOT IN (
      'true', 'false', '1', '0', 'sim', 'não', 'nao', 's', 'n', 'yes', 'no', 'ligado', 'desligado'
    ) THEN
      RAISE EXCEPTION 'A condição booleana precisa usar Sim ou Não.';
    END IF;
  ELSIF v_reference_type IN ('integer', 'decimal') THEN
    BEGIN
      v_value := btrim(NEW.dependency_value)::numeric;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'A condição precisa usar um valor numérico válido.';
    END;
    IF v_value::text IN ('NaN', 'Infinity', '-Infinity') THEN
      RAISE EXCEPTION 'A condição precisa usar um valor numérico finito.';
    END IF;
    IF v_reference_type = 'integer' AND trunc(v_value) <> v_value THEN
      RAISE EXCEPTION 'A condição de um número inteiro precisa ser inteira.';
    END IF;
  END IF;

  WITH RECURSIVE reference_chain(id) AS (
    SELECT NEW.dependency_attribute_id
    UNION
    SELECT attribute.dependency_attribute_id
    FROM public.attributes AS attribute
    JOIN reference_chain AS chain ON attribute.id = chain.id
    WHERE attribute.dependency_attribute_id IS NOT NULL
  )
  SELECT EXISTS (SELECT 1 FROM reference_chain WHERE id = NEW.id) INTO v_cycle;
  IF v_cycle THEN
    RAISE EXCEPTION 'Esta condição criaria uma dependência circular.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._validate_characteristic_definition() FROM PUBLIC, anon, authenticated;

WITH binary_characteristics AS (
  SELECT option.attribute_id
  FROM public.attribute_values AS option
  WHERE option.active
  GROUP BY option.attribute_id
  HAVING count(DISTINCT option.id) = 2
    AND count(DISTINCT option.id) FILTER (
      WHERE lower(unaccent(btrim(option.value))) = 'sim'
    ) = 1
    AND count(DISTINCT option.id) FILTER (
      WHERE lower(unaccent(btrim(option.value))) = 'nao'
    ) = 1
)
UPDATE public.attributes AS attribute
SET data_type = 'boolean'
FROM binary_characteristics AS binary_set
WHERE attribute.id = binary_set.attribute_id
  AND attribute.data_type IS DISTINCT FROM 'boolean';
