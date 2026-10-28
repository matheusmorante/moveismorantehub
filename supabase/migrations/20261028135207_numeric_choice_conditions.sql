-- Quantity choices such as "1 cuba e meia" can be compared with zero without
-- replacing their existing option values or changing the characteristic type.
CREATE FUNCTION public._characteristic_choice_quantity_is_valid(p_attribute_id uuid, p_value text)
RETURNS boolean LANGUAGE sql STABLE
SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT btrim(p_value) = '0'
    AND EXISTS (SELECT 1 FROM public.attribute_values WHERE attribute_id = p_attribute_id AND active)
    AND NOT EXISTS (SELECT 1 FROM public.attribute_values
      WHERE attribute_id = p_attribute_id AND active AND value !~ '^[[:space:]]*[0-9]+([,.][0-9]+)?');
$$;
REVOKE ALL ON FUNCTION public._characteristic_choice_quantity_is_valid(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._characteristic_dependency_operator_is_valid(p_data_type text, p_operator text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  SELECT CASE public._normalize_characteristic_fill_type(p_data_type)
    WHEN 'text_short' THEN p_operator IN ('contains', 'not_contains', 'equals', 'not_equals')
    WHEN 'text_long' THEN p_operator IN ('contains', 'not_contains', 'equals', 'not_equals')
    WHEN 'radio' THEN p_operator IN ('equals', 'not_equals', 'greater_than')
    WHEN 'multi_select' THEN p_operator IN ('contains', 'not_contains')
    WHEN 'boolean' THEN p_operator IN ('equals', 'not_equals')
    WHEN 'integer' THEN p_operator IN ('equals', 'not_equals', 'greater_than', 'greater_or_equal', 'less_than', 'less_or_equal')
    WHEN 'decimal' THEN p_operator IN ('equals', 'not_equals', 'greater_than', 'greater_or_equal', 'less_than', 'less_or_equal')
    ELSE false
  END;
$function$
;
CREATE OR REPLACE FUNCTION public._validate_characteristic_definition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
    WHEN 'text_long' THEN ARRAY['minLength', 'maxLength']
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

  IF v_reference_type = 'radio' AND NEW.dependency_operator = 'greater_than' THEN
    IF NOT public._characteristic_choice_quantity_is_valid(NEW.dependency_attribute_id, NEW.dependency_value) THEN
      RAISE EXCEPTION 'A comparação numérica de opções exige opções iniciadas por número e valor zero.';
    END IF;
  ELSIF v_reference_type IN ('radio', 'multi_select') THEN
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
$function$
;
CREATE OR REPLACE FUNCTION public._validate_characteristic_dependency_alternative()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_primary uuid;
  v_reference_type text;
  v_active boolean;
  v_number numeric;
  v_cycle boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('morantehub.characteristic-dependencies', 0));
  SELECT dependency_attribute_id INTO v_primary FROM public.attributes WHERE id = NEW.attribute_id;
  IF v_primary IS NULL THEN
    RAISE EXCEPTION 'A condição alternativa precisa de uma condição principal.';
  END IF;
  IF NEW.reference_attribute_id = NEW.attribute_id OR NEW.reference_attribute_id = v_primary THEN
    RAISE EXCEPTION 'A referência alternativa deve ser diferente da característica e da condição principal.';
  END IF;
  SELECT public._normalize_characteristic_fill_type(data_type), coalesce(active, true)
    INTO v_reference_type, v_active FROM public.attributes WHERE id = NEW.reference_attribute_id;
  IF NOT FOUND OR NOT v_active THEN
    RAISE EXCEPTION 'A característica de referência precisa existir e estar ativa.';
  END IF;
  IF NOT public._characteristic_dependency_operator_is_valid(v_reference_type, NEW.operator) THEN
    RAISE EXCEPTION 'O operador não é compatível com o tipo da característica de referência.';
  END IF;
  IF v_reference_type = 'radio' AND NEW.operator = 'greater_than' THEN
    IF NOT public._characteristic_choice_quantity_is_valid(NEW.reference_attribute_id, NEW.value) THEN
      RAISE EXCEPTION 'A comparação numérica de opções exige opções iniciadas por número e valor zero.';
    END IF;
  ELSIF v_reference_type IN ('radio', 'multi_select') AND NOT EXISTS (
    SELECT 1 FROM public.attribute_values AS option
    WHERE option.attribute_id = NEW.reference_attribute_id AND option.active
      AND lower(btrim(option.value)) = lower(btrim(NEW.value))
  ) THEN
    RAISE EXCEPTION 'A condição precisa usar uma opção ativa da característica de referência.';
  ELSIF v_reference_type = 'boolean' AND lower(btrim(NEW.value)) NOT IN
    ('true', 'false', '1', '0', 'sim', 'não', 'nao', 's', 'n', 'yes', 'no', 'ligado', 'desligado') THEN
    RAISE EXCEPTION 'A condição booleana precisa usar Sim ou Não.';
  ELSIF v_reference_type IN ('integer', 'decimal') THEN
    BEGIN
      v_number := btrim(NEW.value)::numeric;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'A condição precisa usar um valor numérico válido.';
    END;
    IF v_number::text IN ('NaN', 'Infinity', '-Infinity') OR
      (v_reference_type = 'integer' AND trunc(v_number) <> v_number) THEN
      RAISE EXCEPTION 'A condição precisa usar um valor numérico compatível e finito.';
    END IF;
  END IF;
  WITH RECURSIVE edges(source, target) AS (
    SELECT id, dependency_attribute_id FROM public.attributes WHERE dependency_attribute_id IS NOT NULL
    UNION ALL
    SELECT attribute_id, reference_attribute_id FROM public.attribute_dependency_alternatives
  ), chain(id) AS (
    SELECT NEW.reference_attribute_id
    UNION
    SELECT edges.target FROM edges JOIN chain ON edges.source = chain.id
  ) SELECT EXISTS (SELECT 1 FROM chain WHERE id = NEW.attribute_id) INTO v_cycle;
  IF v_cycle THEN RAISE EXCEPTION 'Esta condição criaria uma dependência circular.'; END IF;
  RETURN NEW;
END;
$function$
;

CREATE FUNCTION public._protect_numeric_choice_dependency()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.value IS NOT DISTINCT FROM NEW.value
    AND OLD.active IS NOT DISTINCT FROM NEW.active THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('morantehub.characteristic-dependencies', 0));
  IF coalesce(NEW.active, true) AND NEW.value !~ '^[[:space:]]*[0-9]+([,.][0-9]+)?'
    AND (EXISTS (SELECT 1 FROM public.attributes WHERE dependency_attribute_id = NEW.attribute_id AND dependency_operator = 'greater_than')
      OR EXISTS (SELECT 1 FROM public.attribute_dependency_alternatives WHERE reference_attribute_id = NEW.attribute_id AND operator = 'greater_than')) THEN
    RAISE EXCEPTION 'Esta característica possui uma condição numérica e suas opções precisam começar com um número.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._protect_numeric_choice_dependency() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER attribute_values_protect_numeric_choice_dependency
  BEFORE INSERT OR UPDATE OF value, active ON public.attribute_values
  FOR EACH ROW EXECUTE FUNCTION public._protect_numeric_choice_dependency();
