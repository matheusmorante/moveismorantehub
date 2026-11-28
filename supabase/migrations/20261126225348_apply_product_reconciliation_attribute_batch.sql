-- Apply one reconciliation attribute to selected products' variations atomically.
CREATE OR REPLACE FUNCTION public.apply_product_reconciliation_attribute_batch(
  p_product_ids uuid[],
  p_name text,
  p_value text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_variation record;
  v_item record;
  v_attributes jsonb;
  v_updated_attributes jsonb;
  v_attribute_item jsonb;
  v_attribute_name text;
  v_name text;
  v_value text;
  v_found boolean;
  v_updated_count integer := 0;
  v_affected_count integer;
  v_trim_chars CONSTANT text :=
    pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) ||
    pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32) ||
    pg_catalog.chr(160) || pg_catalog.chr(5760) ||
    pg_catalog.chr(8192) || pg_catalog.chr(8193) || pg_catalog.chr(8194) ||
    pg_catalog.chr(8195) || pg_catalog.chr(8196) || pg_catalog.chr(8197) ||
    pg_catalog.chr(8198) || pg_catalog.chr(8199) || pg_catalog.chr(8200) ||
    pg_catalog.chr(8201) || pg_catalog.chr(8202) || pg_catalog.chr(8232) ||
    pg_catalog.chr(8233) || pg_catalog.chr(8239) || pg_catalog.chr(8287) ||
    pg_catalog.chr(12288) || pg_catalog.chr(65279);
BEGIN
  IF p_product_ids IS NULL OR pg_catalog.cardinality(p_product_ids) = 0 THEN
    RAISE EXCEPTION 'Selecione produtos para corrigir.';
  END IF;

  IF pg_catalog.array_position(p_product_ids, NULL::uuid) IS NOT NULL
    OR pg_catalog.cardinality(p_product_ids) <> (
      SELECT pg_catalog.count(DISTINCT selected.product_id)::integer
      FROM pg_catalog.unnest(p_product_ids) AS selected(product_id)
    ) THEN
    RAISE EXCEPTION 'A seleção contém produtos repetidos ou inválidos.';
  END IF;

  v_name := pg_catalog.btrim(COALESCE(p_name, ''), v_trim_chars);
  v_value := pg_catalog.btrim(COALESCE(p_value, ''), v_trim_chars);
  IF v_name = '' THEN
    RAISE EXCEPTION 'Selecione a característica.';
  END IF;
  IF v_value = '' THEN
    RAISE EXCEPTION 'Informe o valor da característica.';
  END IF;

  -- Lock in a stable order, preserving the caller's SELECT/UPDATE RLS policies.
  FOR v_variation IN
    SELECT variation.id, variation.product_id, variation.attributes
    FROM public.product_variations AS variation
    WHERE variation.product_id = ANY(p_product_ids)
    ORDER BY variation.id
    FOR UPDATE
  LOOP
    v_attributes := v_variation.attributes;

    -- Match the existing client contract: null becomes [], JSON strings are
    -- parsed once, and only arrays are accepted. Objects and other shapes fail.
    IF v_attributes IS NULL OR pg_catalog.jsonb_typeof(v_attributes) = 'null' THEN
      v_attributes := '[]'::jsonb;
    ELSIF pg_catalog.jsonb_typeof(v_attributes) = 'string' THEN
      BEGIN
        v_attributes := (v_attributes #>> '{}')::jsonb;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'As características atuais precisam de revisão antes da alteração.';
      END;
    END IF;

    IF pg_catalog.jsonb_typeof(v_attributes) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'As características atuais precisam de revisão antes da alteração.';
    END IF;

    v_updated_attributes := '[]'::jsonb;
    v_found := false;

    FOR v_item IN
      SELECT attribute.value
      FROM pg_catalog.jsonb_array_elements(v_attributes)
        WITH ORDINALITY AS attribute(value, ordinal)
      ORDER BY attribute.ordinal
    LOOP
      IF pg_catalog.jsonb_typeof(v_item.value) IS DISTINCT FROM 'object'
        OR pg_catalog.jsonb_typeof(v_item.value -> 'name') IS DISTINCT FROM 'string'
        OR pg_catalog.jsonb_typeof(v_item.value -> 'value') IS DISTINCT FROM 'string'
        OR (
          v_item.value ? 'showName'
          AND pg_catalog.jsonb_typeof(v_item.value -> 'showName') IS DISTINCT FROM 'boolean'
        ) THEN
        RAISE EXCEPTION 'Uma característica atual está inválida e precisa de revisão.';
      END IF;

      v_attribute_name := pg_catalog.btrim(v_item.value ->> 'name', v_trim_chars);
      IF v_attribute_name = '' THEN
        RAISE EXCEPTION 'Uma característica atual está inválida e precisa de revisão.';
      END IF;

      -- Zod's passthrough behavior is preserved: retain unknown metadata,
      -- normalize each name, and change only the first case-insensitive match.
      v_attribute_item := pg_catalog.jsonb_set(
        v_item.value,
        '{name}',
        pg_catalog.to_jsonb(v_attribute_name),
        false
      );
      IF NOT v_found
        AND pg_catalog.lower(v_attribute_name) = pg_catalog.lower(v_name) THEN
        v_attribute_item := pg_catalog.jsonb_set(
          v_attribute_item,
          '{value}',
          pg_catalog.to_jsonb(v_value),
          false
        );
        v_found := true;
      END IF;

      v_updated_attributes := v_updated_attributes || pg_catalog.jsonb_build_array(v_attribute_item);
    END LOOP;

    IF NOT v_found THEN
      v_updated_attributes := v_updated_attributes || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('name', v_name, 'value', v_value, 'showName', true)
      );
    END IF;

    UPDATE public.product_variations AS variation
    SET attributes = v_updated_attributes
    WHERE variation.id = v_variation.id
      AND variation.product_id = v_variation.product_id;

    GET DIAGNOSTICS v_affected_count = ROW_COUNT;
    IF v_affected_count <> 1 THEN
      RAISE EXCEPTION 'Nenhum registro foi confirmado. Confira o cadastro e a permissão de edição.';
    END IF;
    v_updated_count := v_updated_count + v_affected_count;
  END LOOP;

  RETURN v_updated_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_product_reconciliation_attribute_batch(uuid[], text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_product_reconciliation_attribute_batch(uuid[], text, text)
  TO authenticated;

COMMENT ON FUNCTION public.apply_product_reconciliation_attribute_batch(uuid[], text, text) IS
  'Atomically applies one validated reconciliation attribute to selected product variations under caller RLS policies.';

NOTIFY pgrst, 'reload schema';
