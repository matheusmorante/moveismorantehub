-- Save every active characteristic's application from the category form.
-- Existing rows for inactive characteristics are intentionally left untouched.
CREATE OR REPLACE FUNCTION public.save_product_category_characteristic_applications(
  p_category_id uuid,
  p_applications jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_entry jsonb;
  v_attribute_id uuid;
  v_application text;
  v_seen_attribute_ids uuid[] := ARRAY[]::uuid[];
  v_expected_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para configurar uma categoria.'
      USING ERRCODE = '42501';
  END IF;

  IF p_category_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.categories
    WHERE id = p_category_id AND type = 'category'
  ) THEN
    RAISE EXCEPTION 'Selecione uma categoria válida.';
  END IF;

  IF p_applications IS NULL OR jsonb_typeof(p_applications) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'As aplicações das características devem ser uma lista.';
  END IF;

  SELECT count(*)
  INTO v_expected_count
  FROM public.attributes
  WHERE active IS DISTINCT FROM false;

  FOR v_entry IN
    SELECT value
    FROM jsonb_array_elements(p_applications) AS item(value)
  LOOP
    IF jsonb_typeof(v_entry) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Uma aplicação de característica está inválida.';
    END IF;

    BEGIN
      v_attribute_id := nullif(v_entry->>'attributeId', '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Uma característica informada é inválida.';
    END;

    v_application := nullif(v_entry->>'application', '');

    IF v_attribute_id IS NULL OR v_attribute_id = ANY(v_seen_attribute_ids) THEN
      RAISE EXCEPTION 'Cada característica ativa deve aparecer exatamente uma vez.';
    END IF;

    IF v_application IS NULL OR v_application NOT IN ('unavailable', 'optional', 'required') THEN
      RAISE EXCEPTION 'Selecione uma aplicação válida para cada característica.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.attributes
      WHERE id = v_attribute_id AND active IS DISTINCT FROM false
    ) THEN
      RAISE EXCEPTION 'A lista inclui uma característica que não está ativa.';
    END IF;

    v_seen_attribute_ids := array_append(v_seen_attribute_ids, v_attribute_id);
  END LOOP;

  IF cardinality(v_seen_attribute_ids) <> v_expected_count THEN
    RAISE EXCEPTION 'Configure todas as características ativas da categoria.';
  END IF;

  FOR v_entry IN
    SELECT value
    FROM jsonb_array_elements(p_applications) AS item(value)
  LOOP
    INSERT INTO public.attribute_category_applications (
      attribute_id,
      category_id,
      application,
      is_configured,
      updated_at
    ) VALUES (
      (v_entry->>'attributeId')::uuid,
      p_category_id,
      v_entry->>'application',
      true,
      now()
    )
    ON CONFLICT (attribute_id, category_id) DO UPDATE
    SET application = EXCLUDED.application,
        is_configured = true,
        updated_at = now();
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.save_product_category_characteristic_applications(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product_category_characteristic_applications(uuid, jsonb)
  TO authenticated;
