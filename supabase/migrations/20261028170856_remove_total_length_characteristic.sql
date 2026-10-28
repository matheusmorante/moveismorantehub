-- Remove the characteristic definition and its category/catalog links.
-- Product technicalValues and direct dimensions are intentionally preserved.
-- Rollback requires re-creating the definition and restoring its category links.
DO $remove_total_length_characteristic$
DECLARE
  v_attribute_id uuid;
  v_match_count integer;
  v_option_count integer;
  v_dependent_count integer;
  v_alternative_count integer;
  v_attribute_dependency_count integer;
  v_deleted_count integer;
  v_remaining_count integer;
BEGIN
  SELECT count(*) INTO v_match_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
    = 'comprimentototal';

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION 'Esperava uma única característica Comprimento total; encontrei %.', v_match_count;
  END IF;

  SELECT id INTO v_attribute_id
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
    = 'comprimentototal';

  SELECT count(*) INTO v_option_count
  FROM public.attribute_values
  WHERE attribute_id = v_attribute_id;

  SELECT count(*) INTO v_dependent_count
  FROM public.attributes
  WHERE dependency_attribute_id = v_attribute_id;

  SELECT count(*) INTO v_alternative_count
  FROM public.attribute_dependency_alternatives
  WHERE attribute_id = v_attribute_id OR reference_attribute_id = v_attribute_id;

  SELECT count(*) INTO v_attribute_dependency_count
  FROM public.attributes
  WHERE id = v_attribute_id AND dependency_attribute_id IS NOT NULL;

  IF v_option_count > 0 OR v_dependent_count > 0
    OR v_alternative_count > 0 OR v_attribute_dependency_count > 0 THEN
    RAISE EXCEPTION 'Comprimento total ainda possui opções ou dependências; não removi os vínculos.';
  END IF;

  DELETE FROM public.attributes WHERE id = v_attribute_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count <> 1 THEN
    RAISE EXCEPTION 'Esperava remover uma característica; removi %.', v_deleted_count;
  END IF;

  SELECT count(*) INTO v_remaining_count
  FROM public.attributes
  WHERE regexp_replace(lower(public.unaccent(btrim(name))), '[^a-z0-9]+', '', 'g')
    = 'comprimentototal';

  IF v_remaining_count <> 0
    OR EXISTS (SELECT 1 FROM public.attribute_category_applications WHERE attribute_id = v_attribute_id)
    OR EXISTS (SELECT 1 FROM public.category_attributes WHERE attribute_id = v_attribute_id) THEN
    RAISE EXCEPTION 'A remoção de Comprimento total não limpou todos os vínculos esperados.';
  END IF;
END
$remove_total_length_characteristic$;
