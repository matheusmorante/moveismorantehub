CREATE OR REPLACE FUNCTION public.lookup_variation_family_attributes(p_attributes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_item record;
  v_name text;
  v_value text;
  v_name_pattern text;
  v_value_pattern text;
  v_character text;
  v_position integer;
  v_attribute_id uuid;
  v_attribute_name text;
  v_stored_value text;
  v_results jsonb := '[]'::jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Acesso não autorizado.' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_attributes) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'A lista de características é inválida.' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN
    SELECT entry.value AS input, entry.ordinality AS ordinal
    FROM jsonb_array_elements(p_attributes) WITH ORDINALITY AS entry(value, ordinality)
  LOOP
    IF jsonb_typeof(v_item.input) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'A lista de características é inválida.' USING ERRCODE = '22023';
    END IF;

    v_name := v_item.input ->> 'name';
    v_value := v_item.input ->> 'value';

    IF v_name IS NULL OR btrim(v_name) = '' OR v_value IS NULL OR btrim(v_value) = '' THEN
      RAISE EXCEPTION 'A lista de características é inválida.' USING ERRCODE = '22023';
    END IF;

    v_name_pattern := '';
    FOR v_position IN 1..char_length(v_name) LOOP
      v_character := substr(v_name, v_position, 1);
      IF v_character = ANY (ARRAY[E'\\', '.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']']) THEN
        v_name_pattern := v_name_pattern || E'\\';
      END IF;
      v_name_pattern := v_name_pattern || v_character;
    END LOOP;

    v_value_pattern := '';
    FOR v_position IN 1..char_length(v_value) LOOP
      v_character := substr(v_value, v_position, 1);
      IF v_character = ANY (ARRAY[E'\\', '.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']']) THEN
        v_value_pattern := v_value_pattern || E'\\';
      END IF;
      v_value_pattern := v_value_pattern || v_character;
    END LOOP;

    v_attribute_id := NULL;
    v_attribute_name := NULL;
    SELECT attribute.id, attribute.name
    INTO v_attribute_id, v_attribute_name
    FROM public.attributes AS attribute
    WHERE attribute.name ~* ('^' || v_name_pattern || '$')
    LIMIT 1;

    v_stored_value := NULL;
    IF v_attribute_id IS NOT NULL THEN
      SELECT attribute_value.value
      INTO v_stored_value
      FROM public.attribute_values AS attribute_value
      WHERE attribute_value.attribute_id = v_attribute_id
        AND attribute_value.value ~* ('^' || v_value_pattern || '$')
      LIMIT 1;
    END IF;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'index', v_item.ordinal - 1,
      'attributeId', v_attribute_id,
      'name', v_attribute_name,
      'value', v_stored_value
    ));
  END LOOP;

  RETURN v_results;
END;
$function$;

REVOKE ALL ON FUNCTION public.lookup_variation_family_attributes(jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.lookup_variation_family_attributes(jsonb) TO authenticated;

COMMENT ON FUNCTION public.lookup_variation_family_attributes(jsonb)
IS 'Batch, read-only lookup for canonical variation-family attributes and values. SECURITY INVOKER preserves table RLS; only authenticated may execute.';
