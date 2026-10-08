-- Renames the firmness characteristic, constrains its choices, and scopes it to
-- furniture categories where upholstery firmness can be specified.
-- Existing product values are kept under the new characteristic name.
-- Rollback: restore the prior name "Firmeza", the former options
-- (Alta (Firme), Baixa (Macio), Extra Firme, Firme, Intermediário (Médio),
-- Macio, Média (Intermediário), Ortopédico), and the previous Colchões/Quarto
-- category links; move JSON keys back only when the old key is absent.
DO $migration$
DECLARE
  v_attribute_id uuid;
  v_category_count integer;
  v_missing_categories text[];
  v_category_names text[] := ARRAY[
    'Cabeceiras',
    'Cadeiras para Escritório',
    'Cadeiras para Sala de Jantar',
    'Camas/Bases Box',
    'Colchões',
    'Conjunto para Sala de Jantar',
    'Mesa para Sala de Jantar',
    'Poltronas',
    'Sofás'
  ];
  v_old_name text := 'Firmeza';
  v_new_name text := 'Nível de firmeza do estofamento';
BEGIN
  SELECT count(*)
  INTO v_category_count
  FROM public.attributes
  WHERE lower(trim(name)) IN (lower(v_old_name), lower(v_new_name));

  IF v_category_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one firmness attribute before rename; found %', v_category_count;
  END IF;

  SELECT id
  INTO v_attribute_id
  FROM public.attributes
  WHERE lower(trim(name)) IN (lower(v_old_name), lower(v_new_name))
  FOR UPDATE;

  SELECT array_agg(expected.name ORDER BY expected.name)
  INTO v_missing_categories
  FROM (
    SELECT expected.name
    FROM unnest(v_category_names) AS expected(name)
    LEFT JOIN public.categories c
      ON lower(trim(c.name)) = lower(trim(expected.name))
      AND c.type = 'category'
    GROUP BY expected.name
    HAVING count(c.id) <> 1
  ) AS expected;

  IF coalesce(cardinality(v_missing_categories), 0) > 0 THEN
    RAISE EXCEPTION 'Expected exactly one product category for each firmness link; invalid categories: %', v_missing_categories;
  END IF;

  UPDATE public.attributes
  SET name = v_new_name,
      data_type = 'radio',
      active = true
  WHERE id = v_attribute_id;

  -- Keep existing IDs for the three canonical choices where possible.
  DELETE FROM public.attribute_values
  WHERE attribute_id = v_attribute_id
    AND lower(trim(value)) NOT IN ('macio', 'médio', 'firme');

  WITH ranked_values AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY lower(trim(value))
             ORDER BY (value = CASE lower(trim(value))
               WHEN 'macio' THEN 'Macio'
               WHEN 'médio' THEN 'Médio'
               WHEN 'firme' THEN 'Firme'
             END) DESC, id
           ) AS duplicate_number
    FROM public.attribute_values
    WHERE attribute_id = v_attribute_id
  )
  DELETE FROM public.attribute_values av
  USING ranked_values rv
  WHERE av.id = rv.id
    AND rv.duplicate_number > 1;

  UPDATE public.attribute_values
  SET value = CASE lower(trim(value))
    WHEN 'macio' THEN 'Macio'
    WHEN 'médio' THEN 'Médio'
    WHEN 'firme' THEN 'Firme'
  END
  WHERE attribute_id = v_attribute_id
    AND lower(trim(value)) IN ('macio', 'médio', 'firme');

  INSERT INTO public.attribute_values (attribute_id, value)
  SELECT v_attribute_id, choice.value
  FROM (VALUES ('Macio'), ('Médio'), ('Firme')) AS choice(value)
  ON CONFLICT (attribute_id, value) DO NOTHING;

  -- The environment "Quarto" is intentionally excluded; availability follows
  -- explicit product categories, including the requested dining-table category.
  DELETE FROM public.category_attributes ca
  WHERE ca.attribute_id = v_attribute_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.categories c
      JOIN unnest(v_category_names) AS expected(name)
        ON lower(trim(c.name)) = lower(trim(expected.name))
      WHERE c.id = ca.category_id
        AND c.type = 'category'
    );

  INSERT INTO public.category_attributes (category_id, attribute_id, is_required)
  SELECT c.id, v_attribute_id, false
  FROM public.categories c
  JOIN unnest(v_category_names) AS expected(name)
    ON lower(trim(c.name)) = lower(trim(expected.name))
  WHERE c.type = 'category'
  ON CONFLICT (category_id, attribute_id)
  DO UPDATE SET is_required = false;

  -- Rename parent product values while retaining an already-present new key.
  UPDATE public.products p
  SET technical_specs = jsonb_set(
    p.technical_specs,
    '{technicalValues}',
    ((p.technical_specs->'technicalValues') - v_old_name) ||
      CASE
        WHEN (p.technical_specs->'technicalValues') ? v_new_name THEN '{}'::jsonb
        ELSE jsonb_build_object(v_new_name, p.technical_specs->'technicalValues'->v_old_name)
      END,
    true
  )
  WHERE jsonb_typeof(p.technical_specs->'technicalValues') = 'object'
    AND (p.technical_specs->'technicalValues') ? v_old_name;

  -- Keep saved draft snapshots readable under the renamed field.
  UPDATE public.products p
  SET technical_specs = jsonb_set(
    p.technical_specs,
    '{draftProduct,technicalValues}',
    ((p.technical_specs->'draftProduct'->'technicalValues') - v_old_name) ||
      CASE
        WHEN (p.technical_specs->'draftProduct'->'technicalValues') ? v_new_name THEN '{}'::jsonb
        ELSE jsonb_build_object(v_new_name, p.technical_specs->'draftProduct'->'technicalValues'->v_old_name)
      END,
    true
  )
  WHERE jsonb_typeof(p.technical_specs->'draftProduct'->'technicalValues') = 'object'
    AND (p.technical_specs->'draftProduct'->'technicalValues') ? v_old_name;

  UPDATE public.products p
  SET technical_specs = jsonb_set(
    p.technical_specs,
    '{variationDetails}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(item.value->'technicalValues') = 'object'
            AND (item.value->'technicalValues') ? v_old_name
          THEN jsonb_set(
            item.value,
            '{technicalValues}',
            ((item.value->'technicalValues') - v_old_name) ||
              CASE
                WHEN (item.value->'technicalValues') ? v_new_name THEN '{}'::jsonb
                ELSE jsonb_build_object(v_new_name, item.value->'technicalValues'->v_old_name)
              END,
            true
          )
          ELSE item.value
        END
        ORDER BY item.ordinality
      )
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p.technical_specs->'variationDetails') = 'array'
            THEN p.technical_specs->'variationDetails'
          ELSE '[]'::jsonb
        END
      ) WITH ORDINALITY AS item(value, ordinality)
    ),
    true
  )
  WHERE jsonb_typeof(p.technical_specs->'variationDetails') = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p.technical_specs->'variationDetails') = 'array'
            THEN p.technical_specs->'variationDetails'
          ELSE '[]'::jsonb
        END
      ) AS item(value)
      WHERE jsonb_typeof(item.value->'technicalValues') = 'object'
        AND (item.value->'technicalValues') ? v_old_name
    );

  UPDATE public.products p
  SET technical_specs = jsonb_set(
    p.technical_specs,
    '{draftProduct,variations}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(item.value->'technicalValues') = 'object'
            AND (item.value->'technicalValues') ? v_old_name
          THEN jsonb_set(
            item.value,
            '{technicalValues}',
            ((item.value->'technicalValues') - v_old_name) ||
              CASE
                WHEN (item.value->'technicalValues') ? v_new_name THEN '{}'::jsonb
                ELSE jsonb_build_object(v_new_name, item.value->'technicalValues'->v_old_name)
              END,
            true
          )
          ELSE item.value
        END
        ORDER BY item.ordinality
      )
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p.technical_specs->'draftProduct'->'variations') = 'array'
            THEN p.technical_specs->'draftProduct'->'variations'
          ELSE '[]'::jsonb
        END
      ) WITH ORDINALITY AS item(value, ordinality)
    ),
    true
  )
  WHERE jsonb_typeof(p.technical_specs->'draftProduct'->'variations') = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p.technical_specs->'draftProduct'->'variations') = 'array'
            THEN p.technical_specs->'draftProduct'->'variations'
          ELSE '[]'::jsonb
        END
      ) AS item(value)
      WHERE jsonb_typeof(item.value->'technicalValues') = 'object'
        AND (item.value->'technicalValues') ? v_old_name
    );

  UPDATE public.product_variations pv
  SET attributes = (
    SELECT jsonb_agg(
      CASE
        WHEN jsonb_typeof(item.value) = 'object'
          AND lower(trim(coalesce(item.value->>'name', ''))) = lower(v_old_name)
        THEN jsonb_set(item.value, '{name}', to_jsonb(v_new_name), true)
        ELSE item.value
      END
      ORDER BY item.ordinality
    )
    FROM jsonb_array_elements(pv.attributes) WITH ORDINALITY AS item(value, ordinality)
  )
  WHERE jsonb_typeof(pv.attributes) = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(pv.attributes) AS item(value)
      WHERE jsonb_typeof(item.value) = 'object'
        AND lower(trim(coalesce(item.value->>'name', ''))) = lower(v_old_name)
    );

  IF (SELECT count(*) FROM public.attribute_values WHERE attribute_id = v_attribute_id) <> 3 THEN
    RAISE EXCEPTION 'Firmness attribute must have exactly three options after configuration';
  END IF;
END;
$migration$;
