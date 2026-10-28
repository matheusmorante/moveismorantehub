-- Additional conditions are alternatives (OR) to the existing primary condition.
-- The existing columns and RPC remain supported for older clients.
CREATE TABLE public.attribute_dependency_alternatives (
  attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  reference_attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE RESTRICT,
  operator text NOT NULL,
  value text NOT NULL CHECK (nullif(btrim(value), '') IS NOT NULL),
  PRIMARY KEY (attribute_id, reference_attribute_id),
  CHECK (attribute_id <> reference_attribute_id)
);
CREATE INDEX attribute_dependency_alternatives_reference_idx
  ON public.attribute_dependency_alternatives (reference_attribute_id);
ALTER TABLE public.attribute_dependency_alternatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY attribute_dependency_alternatives_read ON public.attribute_dependency_alternatives
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
REVOKE ALL ON public.attribute_dependency_alternatives FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.attribute_dependency_alternatives TO authenticated;

CREATE FUNCTION public._validate_characteristic_dependency_alternative()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
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
  IF v_reference_type IN ('radio', 'multi_select') AND NOT EXISTS (
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
$$;
REVOKE ALL ON FUNCTION public._validate_characteristic_dependency_alternative() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER attribute_dependency_alternatives_validate
  BEFORE INSERT OR UPDATE ON public.attribute_dependency_alternatives
  FOR EACH ROW EXECUTE FUNCTION public._validate_characteristic_dependency_alternative();

CREATE FUNCTION public._protect_characteristic_dependency_alternatives()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE v_cycle boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('morantehub.characteristic-dependencies', 0));
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.dependency_attribute_id, NEW.dependency_operator, NEW.dependency_value)
        IS DISTINCT FROM (OLD.dependency_attribute_id, OLD.dependency_operator, OLD.dependency_value)
      AND EXISTS (SELECT 1 FROM public.attribute_dependency_alternatives WHERE attribute_id = OLD.id) THEN
      RAISE EXCEPTION 'Atualize também as condições alternativas ao alterar a condição principal.';
    END IF;
    IF (NEW.data_type IS DISTINCT FROM OLD.data_type OR (coalesce(OLD.active, true) AND NOT coalesce(NEW.active, true)))
      AND EXISTS (SELECT 1 FROM public.attribute_dependency_alternatives WHERE reference_attribute_id = OLD.id) THEN
      RAISE EXCEPTION 'A característica está em uso por uma condição alternativa.';
    END IF;
  END IF;
  IF NEW.dependency_attribute_id IS NOT NULL THEN
    WITH RECURSIVE edges(source, target) AS (
      SELECT id, dependency_attribute_id FROM public.attributes WHERE dependency_attribute_id IS NOT NULL
      UNION ALL
      SELECT attribute_id, reference_attribute_id FROM public.attribute_dependency_alternatives
    ), chain(id) AS (
      SELECT NEW.dependency_attribute_id
      UNION
      SELECT edges.target FROM edges JOIN chain ON edges.source = chain.id
    ) SELECT EXISTS (SELECT 1 FROM chain WHERE id = NEW.id) INTO v_cycle;
    IF v_cycle THEN RAISE EXCEPTION 'Esta condição criaria uma dependência circular.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._protect_characteristic_dependency_alternatives() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER attributes_protect_dependency_alternatives
  BEFORE INSERT OR UPDATE ON public.attributes
  FOR EACH ROW EXECUTE FUNCTION public._protect_characteristic_dependency_alternatives();

CREATE FUNCTION public._protect_alternative_dependency_option()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.value IS NOT DISTINCT FROM NEW.value
    AND OLD.active IS NOT DISTINCT FROM NEW.active THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('morantehub.characteristic-dependencies', 0));
  IF EXISTS (SELECT 1 FROM public.attribute_dependency_alternatives
      WHERE reference_attribute_id = OLD.attribute_id AND lower(btrim(value)) = lower(btrim(OLD.value))) THEN
    RAISE EXCEPTION 'A opção "%" está em uso por uma condição alternativa.', OLD.value;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._protect_alternative_dependency_option() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER attribute_values_protect_alternative_dependency
  BEFORE DELETE OR UPDATE OF value, active ON public.attribute_values
  FOR EACH ROW EXECUTE FUNCTION public._protect_alternative_dependency_option();

CREATE FUNCTION public.save_product_characteristic_definition_v3(p_definition jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE v_id uuid; v_alternative jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para salvar características.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_definition) IS DISTINCT FROM 'object' OR
     jsonb_typeof(p_definition->'dependencyAlternatives') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'As condições alternativas devem ser uma lista.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('morantehub.characteristic-dependencies', 0));
  v_id := nullif(p_definition->>'id', '')::uuid;
  IF v_id IS NOT NULL THEN
    DELETE FROM public.attribute_dependency_alternatives WHERE attribute_id = v_id;
  END IF;
  v_id := public.save_product_characteristic_definition_v2(p_definition);
  FOR v_alternative IN SELECT value FROM jsonb_array_elements(p_definition->'dependencyAlternatives') LOOP
    INSERT INTO public.attribute_dependency_alternatives (attribute_id, reference_attribute_id, operator, value)
    VALUES (v_id, nullif(v_alternative->>'referenceAttributeId', '')::uuid,
      nullif(v_alternative->>'operator', ''), nullif(btrim(v_alternative->>'value'), ''));
  END LOOP;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_product_characteristic_definition_v3(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product_characteristic_definition_v3(jsonb) TO authenticated;
