-- Estrutura groups first: preserve current product values and per-characteristic category links.
CREATE TABLE public.attribute_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX attribute_groups_name_case_insensitive_idx
  ON public.attribute_groups (lower(btrim(name)));

CREATE UNIQUE INDEX attribute_groups_single_default_idx
  ON public.attribute_groups (is_default)
  WHERE is_default;

CREATE TABLE public.attribute_group_categories (
  group_id uuid NOT NULL REFERENCES public.attribute_groups(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  application text CHECK (application IN ('unavailable', 'optional', 'required')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, category_id)
);

CREATE INDEX attribute_group_categories_category_idx
  ON public.attribute_group_categories (category_id, group_id);

ALTER TABLE public.attributes
  ADD COLUMN group_id uuid,
  ADD COLUMN configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN dependency_attribute_id uuid,
  ADD COLUMN dependency_operator text,
  ADD COLUMN dependency_value text;

ALTER TABLE public.attribute_values
  ADD COLUMN active boolean NOT NULL DEFAULT true;

INSERT INTO public.attribute_groups (name, is_default)
VALUES
  ('Identificação', false),
  ('Dimensões e Peso', false),
  ('Estrutura', false),
  ('Portas', false),
  ('Gavetas', false),
  ('Prateleiras', false),
  ('Pés', false),
  ('Tecido e revestimento', false),
  ('Funcionalidades', false),
  ('Acessórios', false),
  ('Materiais e acabamento', false),
  ('Outras características', true);

UPDATE public.attributes AS attribute
SET group_id = attribute_group.id
FROM public.attribute_groups AS attribute_group
WHERE attribute_group.name = CASE
  WHEN attribute.name ~* 'prateleira' THEN 'Prateleiras'
  WHEN attribute.name ~* 'porta' THEN 'Portas'
  WHEN attribute.name ~* '(gaveta|corredi[cç])' THEN 'Gavetas'
  WHEN attribute.name ~* '(p[eé]s|rod[ií]zio)' THEN 'Pés'
  WHEN attribute.name ~* 'puxador' THEN 'Acessórios'
  WHEN attribute.name ~* '(altura|largura|profundidade|comprimento|espessura|assento|peso)'
    AND attribute.name !~* '(prateleira|gaveta|suportad[oa])' THEN 'Dimensões e Peso'
  WHEN attribute.name ~* 'estrutura'
    OR (attribute.name ~* 'peso.*suportad[oa]' AND attribute.name !~* '(prateleira|gaveta)') THEN 'Estrutura'
  WHEN attribute.name ~* '(tecido|revestimento|espuma|densidade|estofad)' THEN 'Tecido e revestimento'
  WHEN attribute.name ~* '(espelho|deslizamento|mecanismo|retr[aá]til|extens[ií]vel|cabideiro|calceiro|maleiro|usb|led)' THEN 'Funcionalidades'
  WHEN attribute.name ~* '(material|acabamento|madeira|metal|vidro)' THEN 'Materiais e acabamento'
  WHEN attribute.name ~* '^(cor|marca|modelo(/linha)?)$' THEN 'Identificação'
  ELSE 'Outras características'
END;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM public.attributes WHERE group_id IS NULL) THEN
    RAISE EXCEPTION 'Não foi possível atribuir todas as características a um grupo.';
  END IF;
END;
$migration$;

ALTER TABLE public.attributes
  ALTER COLUMN group_id SET NOT NULL,
  ADD CONSTRAINT attributes_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.attribute_groups(id) ON DELETE RESTRICT,
  ADD CONSTRAINT attributes_configuration_object_check
    CHECK (jsonb_typeof(configuration) = 'object'),
  ADD CONSTRAINT attributes_dependency_complete_check
    CHECK (
      (dependency_attribute_id IS NULL AND dependency_operator IS NULL AND dependency_value IS NULL)
      OR
      (dependency_attribute_id IS NOT NULL AND dependency_operator IS NOT NULL AND nullif(btrim(dependency_value), '') IS NOT NULL)
    ),
  ADD CONSTRAINT attributes_dependency_not_self_check
    CHECK (dependency_attribute_id IS NULL OR dependency_attribute_id <> id),
  ADD CONSTRAINT attributes_dependency_reference_fkey
    FOREIGN KEY (dependency_attribute_id) REFERENCES public.attributes(id) ON DELETE RESTRICT;

CREATE INDEX attributes_group_id_idx ON public.attributes (group_id, name);
CREATE INDEX attributes_dependency_attribute_id_idx
  ON public.attributes (dependency_attribute_id)
  WHERE dependency_attribute_id IS NOT NULL;

ALTER TABLE public.attribute_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_group_categories ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.attribute_groups FROM anon, authenticated;
REVOKE ALL ON TABLE public.attribute_group_categories FROM anon, authenticated;
GRANT SELECT ON TABLE public.attribute_groups TO authenticated;
GRANT SELECT ON TABLE public.attribute_group_categories TO authenticated;

CREATE POLICY attribute_groups_select_authenticated
  ON public.attribute_groups FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY attribute_group_categories_select_authenticated
  ON public.attribute_group_categories FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE OR REPLACE FUNCTION public._assign_default_attribute_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.group_id IS NULL THEN
    SELECT id INTO NEW.group_id
    FROM public.attribute_groups
    WHERE is_default
    LIMIT 1;
  END IF;

  IF NEW.group_id IS NULL THEN
    RAISE EXCEPTION 'Selecione um grupo para a característica.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._assign_default_attribute_group() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER attributes_assign_default_group
  BEFORE INSERT OR UPDATE OF group_id ON public.attributes
  FOR EACH ROW
  EXECUTE FUNCTION public._assign_default_attribute_group();

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
    WHEN 'boolean' THEN 'text_short'
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
CREATE TRIGGER attributes_validate_characteristic_definition
  BEFORE INSERT OR UPDATE ON public.attributes
  FOR EACH ROW EXECUTE FUNCTION public._validate_characteristic_definition();

CREATE OR REPLACE FUNCTION public._protect_dependency_option()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.value IS NOT DISTINCT FROM NEW.value
    AND OLD.active IS NOT DISTINCT FROM NEW.active THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('morantehub.characteristic-dependencies', 0));
  IF EXISTS (
    SELECT 1 FROM public.attributes AS dependent
    WHERE dependent.dependency_attribute_id = OLD.attribute_id
      AND lower(btrim(dependent.dependency_value)) = lower(btrim(OLD.value))
  ) THEN
    RAISE EXCEPTION 'A opção "%" está em uso por uma condição de característica.', OLD.value;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._protect_dependency_option() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER attribute_values_protect_dependency_option
  BEFORE DELETE OR UPDATE OF value, active ON public.attribute_values
  FOR EACH ROW EXECUTE FUNCTION public._protect_dependency_option();

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
      dependency_value = v_dependency_value,
      updated_at = now()
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

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_product_characteristic_definition_v2(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product_characteristic_definition_v2(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_product_characteristic_group(p_definition jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_name text;
  v_description text;
  v_application jsonb;
  v_category_id uuid;
  v_application_value text;
  v_seen_categories uuid[] := ARRAY[]::uuid[];
  v_expected_count integer;
  v_default boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para salvar grupos.' USING ERRCODE = '42501';
  END IF;
  IF p_definition IS NULL OR jsonb_typeof(p_definition) <> 'object' THEN
    RAISE EXCEPTION 'Definição de grupo inválida.';
  END IF;
  v_name := nullif(btrim(p_definition->>'name'), '');
  IF v_name IS NULL OR char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'Informe um nome de grupo de até 120 caracteres.';
  END IF;
  v_description := btrim(coalesce(p_definition->>'description', ''));
  IF char_length(v_description) > 1000 THEN
    RAISE EXCEPTION 'A descrição deve ter até 1.000 caracteres.';
  END IF;
  IF jsonb_typeof(p_definition->'categoryApplications') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Configure a aplicação do grupo em todas as categorias.';
  END IF;

  v_id := nullif(p_definition->>'id', '')::uuid;
  IF v_id IS NOT NULL THEN
    SELECT is_default INTO v_default FROM public.attribute_groups WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Grupo não encontrado.'; END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.attribute_groups
    WHERE lower(btrim(name)) = lower(btrim(v_name)) AND id IS DISTINCT FROM v_id
  ) THEN
    RAISE EXCEPTION 'Já existe um grupo com esse nome.';
  END IF;

  SELECT count(*) INTO v_expected_count FROM public.categories WHERE type = 'category';
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
      RAISE EXCEPTION 'Selecione uma aplicação para cada categoria.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = v_category_id AND type = 'category') THEN
      RAISE EXCEPTION 'A lista inclui uma categoria que não está disponível.';
    END IF;
    v_seen_categories := array_append(v_seen_categories, v_category_id);
  END LOOP;
  IF cardinality(v_seen_categories) <> v_expected_count THEN
    RAISE EXCEPTION 'Defina a aplicação do grupo em todas as categorias antes de salvar.';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.attribute_groups (name, description)
    VALUES (v_name, v_description) RETURNING id INTO v_id;
  ELSE
    UPDATE public.attribute_groups
    SET name = v_name, description = v_description, updated_at = now()
    WHERE id = v_id;
  END IF;

  DELETE FROM public.attribute_group_categories WHERE group_id = v_id;
  FOR v_application IN
    SELECT value FROM jsonb_array_elements(p_definition->'categoryApplications') AS item(value)
  LOOP
    INSERT INTO public.attribute_group_categories (group_id, category_id, application)
    VALUES (
      v_id,
      (v_application->>'categoryId')::uuid,
      v_application->>'application'
    );
  END LOOP;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_product_characteristic_group(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_default boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para excluir grupos.' USING ERRCODE = '42501';
  END IF;
  SELECT is_default INTO v_default
  FROM public.attribute_groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Grupo não encontrado.'; END IF;
  IF v_default THEN RAISE EXCEPTION 'O grupo padrão não pode ser excluído.'; END IF;
  IF EXISTS (SELECT 1 FROM public.attributes WHERE group_id = p_group_id) THEN
    RAISE EXCEPTION 'Mova ou exclua as características vinculadas antes de excluir o grupo.';
  END IF;
  DELETE FROM public.attribute_groups WHERE id = p_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_product_characteristic_group(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_product_characteristic_group(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product_characteristic_group(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_product_characteristic_group(uuid) TO authenticated;
