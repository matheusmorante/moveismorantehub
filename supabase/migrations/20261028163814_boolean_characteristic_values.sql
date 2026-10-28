-- Boolean characteristics store explicit true/false answers; blank legacy values stay null.
-- IDs, attribute-value rows, category links, application rows outside Sofás, and product JSON shape are preserved.

DO $$
DECLARE
  v_sofa_id uuid;
  v_depth_open_id uuid;
  v_depth_closed_id uuid;
  v_retractable_id uuid;
  v_reclining_id uuid;
  v_boolean_names text[];
  v_updated integer;
BEGIN
  SELECT id INTO v_sofa_id
  FROM public.categories
  WHERE lower(public.unaccent(btrim(name))) = 'sofas';
  IF v_sofa_id IS NULL OR (
    SELECT count(*) FROM public.categories
    WHERE lower(public.unaccent(btrim(name))) = 'sofas'
  ) <> 1 THEN
    RAISE EXCEPTION 'A categoria Sofás precisa existir uma única vez antes da migração Booleano.';
  END IF;

  SELECT id INTO v_depth_open_id FROM public.attributes
  WHERE lower(public.unaccent(btrim(name))) = 'profundidade aberto';
  SELECT id INTO v_depth_closed_id FROM public.attributes
  WHERE lower(public.unaccent(btrim(name))) = 'profundidade fechado';
  SELECT id INTO v_retractable_id FROM public.attributes
  WHERE lower(public.unaccent(btrim(name))) = 'retratil';
  SELECT id INTO v_reclining_id FROM public.attributes
  WHERE lower(public.unaccent(btrim(name))) = 'reclinavel';

  IF v_depth_open_id IS NULL OR v_depth_closed_id IS NULL
    OR v_retractable_id IS NULL OR v_reclining_id IS NULL THEN
    RAISE EXCEPTION 'As quatro características de Sofás precisam existir antes da migração Booleano.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attributes
    WHERE id IN (v_depth_open_id, v_depth_closed_id)
      AND data_type NOT IN ('measure', 'decimal')
  ) THEN
    RAISE EXCEPTION 'Profundidade aberto/fechado precisa estar em tipo numérico compatível.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.attributes
    WHERE id IN (v_retractable_id, v_reclining_id)
      AND data_type <> 'boolean'
  ) THEN
    RAISE EXCEPTION 'Retrátil e Reclinável precisam estar tipadas como boolean.';
  END IF;

  -- Convert only definitions whose complete option set is exactly Sim and Não.
  -- Existing Sim/Não option rows are retained as legacy metadata and no product values are recreated.
  WITH binary_characteristics AS (
    SELECT option.attribute_id
    FROM public.attribute_values AS option
    GROUP BY option.attribute_id
    HAVING count(DISTINCT lower(public.unaccent(btrim(option.value)))) = 2
      AND bool_and(lower(public.unaccent(btrim(option.value))) IN ('sim', 'nao'))
  ), eligible AS (
    SELECT attribute.id
    FROM public.attributes AS attribute
    JOIN binary_characteristics AS binary_set ON binary_set.attribute_id = attribute.id
    WHERE lower(attribute.data_type) IN ('radio', 'list')
  )
  UPDATE public.attributes AS attribute
  SET data_type = 'boolean'
  FROM eligible
  WHERE attribute.id = eligible.id;

  UPDATE public.attributes
  SET data_type = 'decimal', decimal_places = coalesce(decimal_places, 2)
  WHERE id IN (v_depth_open_id, v_depth_closed_id)
    AND (data_type <> 'decimal' OR decimal_places IS NULL);

  -- Set only the four requested application rows for Sofás.
  UPDATE public.attribute_category_applications AS application
  SET application = 'optional', is_configured = true, updated_at = now()
  FROM public.attributes AS attribute
  WHERE application.attribute_id = attribute.id
    AND application.category_id = v_sofa_id
    AND attribute.id IN (v_depth_open_id, v_depth_closed_id, v_retractable_id, v_reclining_id);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 4 THEN
    RAISE EXCEPTION 'Esperava atualizar 4 aplicações de Sofás; atualizei %.', v_updated;
  END IF;

  SELECT array_agg(DISTINCT lower(public.unaccent(btrim(name))))
  INTO v_boolean_names
  FROM public.attributes
  WHERE data_type = 'boolean';
  IF coalesce(cardinality(v_boolean_names), 0) = 0 THEN
    RAISE EXCEPTION 'Nenhuma característica Booleano foi encontrada para migrar os valores existentes.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp._boolean_characteristic_json_value(p_value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_type text;
  v_text text;
  v_normalized text;
  v_number numeric;
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) = 'null' THEN
    RETURN 'null'::jsonb;
  END IF;

  v_type := jsonb_typeof(p_value);
  IF v_type = 'boolean' THEN
    RETURN p_value;
  ELSIF v_type = 'number' THEN
    v_number := (p_value #>> '{}')::numeric;
    IF v_number = 1 THEN RETURN 'true'::jsonb; END IF;
    IF v_number = 0 THEN RETURN 'false'::jsonb; END IF;
    RAISE EXCEPTION 'Valor numérico inesperado em característica Booleano: %.', p_value;
  ELSIF v_type <> 'string' THEN
    RAISE EXCEPTION 'Formato inesperado em característica Booleano: %.', v_type;
  END IF;

  v_text := p_value #>> '{}';
  v_normalized := lower(public.unaccent(btrim(v_text)));
  IF v_normalized IN ('sim', 's', 'true', 'yes', 'ligado') THEN
    RETURN 'true'::jsonb;
  ELSIF v_normalized IN ('nao', 'n', 'false', 'no', 'desligado') THEN
    RETURN 'false'::jsonb;
  ELSIF v_normalized IN (
    '', 'nao se aplica', 'n/a', 'nao informar', 'nao informado', 'nao preenchido',
    'not applicable', 'not informed'
  ) THEN
    -- These legacy placeholders are not Boolean commercial answers; retain them as unanswered.
    RETURN 'null'::jsonb;
  END IF;

  RAISE EXCEPTION 'Resposta legado não reconhecida em característica Booleano: "%".', v_text;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp._boolean_characteristic_json_tree(p_value jsonb, p_names text[])
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_entry record;
  v_key text;
  v_child jsonb;
  v_record_name text;
  v_is_named_boolean boolean;
BEGIN
  IF p_value IS NULL THEN RETURN NULL; END IF;

  CASE jsonb_typeof(p_value)
    WHEN 'object' THEN
      v_result := '{}'::jsonb;
      v_record_name := lower(public.unaccent(btrim(coalesce(
        p_value->>'name', p_value->>'attribute_name', p_value->>'attribute',
        p_value->>'key', p_value->>'characteristic', ''
      ))));
      v_is_named_boolean := v_record_name = ANY(p_names);

      FOR v_entry IN SELECT key, value FROM jsonb_each(p_value) LOOP
        v_key := v_entry.key;
        v_child := v_entry.value;

        IF v_is_named_boolean AND v_key IN ('value', 'val', 'option') THEN
          v_child := pg_temp._boolean_characteristic_json_value(v_child);
        ELSIF lower(public.unaccent(btrim(v_key))) = ANY(p_names) THEN
          IF jsonb_typeof(v_child) = 'object' AND (v_child ? 'value' OR v_child ? 'val' OR v_child ? 'option') THEN
            FOR v_key IN SELECT unnest(ARRAY['value', 'val', 'option']) LOOP
              IF v_child ? v_key THEN
                v_child := jsonb_set(
                  v_child,
                  ARRAY[v_key],
                  pg_temp._boolean_characteristic_json_value(v_child->v_key),
                  false
                );
              END IF;
            END LOOP;
          ELSE
            v_child := pg_temp._boolean_characteristic_json_value(v_child);
          END IF;
        ELSE
          v_child := pg_temp._boolean_characteristic_json_tree(v_child, p_names);
        END IF;

        v_result := v_result || jsonb_build_object(v_entry.key, v_child);
      END LOOP;
      RETURN v_result;
    WHEN 'array' THEN
      v_result := '[]'::jsonb;
      FOR v_entry IN SELECT value FROM jsonb_array_elements(p_value) LOOP
        v_result := v_result || jsonb_build_array(
          pg_temp._boolean_characteristic_json_tree(v_entry.value, p_names)
        );
      END LOOP;
      RETURN v_result;
    ELSE
      RETURN p_value;
  END CASE;
END;
$$;

DO $$
DECLARE
  v_boolean_names text[];
BEGIN
  SELECT array_agg(DISTINCT lower(public.unaccent(btrim(name))))
  INTO v_boolean_names
  FROM public.attributes
  WHERE data_type = 'boolean';

  WITH transformed AS MATERIALIZED (
    SELECT id, pg_temp._boolean_characteristic_json_tree(technical_specs, v_boolean_names) AS value
    FROM public.products
    WHERE technical_specs IS NOT NULL
  )
  UPDATE public.products AS product
  SET technical_specs = transformed.value
  FROM transformed
  WHERE product.id = transformed.id
    AND product.technical_specs IS DISTINCT FROM transformed.value;

  WITH transformed AS MATERIALIZED (
    SELECT id, pg_temp._boolean_characteristic_json_tree(attributes, v_boolean_names) AS value
    FROM public.product_variations
    WHERE attributes IS NOT NULL
  )
  UPDATE public.product_variations AS variation
  SET attributes = transformed.value
  FROM transformed
  WHERE variation.id = transformed.id
    AND variation.attributes IS DISTINCT FROM transformed.value;
END;
$$;

DROP FUNCTION pg_temp._boolean_characteristic_json_tree(jsonb, text[]);
DROP FUNCTION pg_temp._boolean_characteristic_json_value(jsonb);

