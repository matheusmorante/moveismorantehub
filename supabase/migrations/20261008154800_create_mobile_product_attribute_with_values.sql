CREATE OR REPLACE FUNCTION public.create_mobile_product_attribute_with_values(
  p_name text,
  p_data_type text DEFAULT 'list',
  p_unit text DEFAULT NULL,
  p_values text[] DEFAULT ARRAY[]::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_data_type text := coalesce(nullif(btrim(p_data_type), ''), 'list');
  v_attribute_id uuid;
  v_values text[] := coalesce(p_values, ARRAY[]::text[]);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária para criar uma característica.'
      USING ERRCODE = '42501';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'O nome da característica é obrigatório.'
      USING ERRCODE = '22023';
  END IF;

  IF v_data_type NOT IN ('list', 'text', 'integer', 'decimal', 'boolean', 'measure') THEN
    RAISE EXCEPTION 'Tipo de dado inválido: %.', v_data_type
      USING ERRCODE = '22023';
  END IF;

  IF v_data_type = 'list' AND cardinality(v_values) = 0 THEN
    RAISE EXCEPTION 'Adicione pelo menos um valor para uma lista.'
      USING ERRCODE = '22023';
  END IF;

  IF v_data_type <> 'list' AND cardinality(v_values) > 0 THEN
    RAISE EXCEPTION 'Somente características do tipo lista podem receber valores iniciais.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_values) AS supplied(value)
    WHERE nullif(btrim(supplied.value), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Os valores da lista não podem estar vazios.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT lower(btrim(supplied.value))
    FROM unnest(v_values) AS supplied(value)
    GROUP BY lower(btrim(supplied.value))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A lista não pode conter valores duplicados.'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.attributes (
    name,
    active,
    data_type,
    unit,
    is_globally_required
  )
  VALUES (
    v_name,
    true,
    v_data_type,
    CASE WHEN v_data_type = 'measure' THEN nullif(btrim(coalesce(p_unit, '')), '') ELSE NULL END,
    false
  )
  RETURNING id INTO v_attribute_id;

  IF cardinality(v_values) > 0 THEN
    INSERT INTO public.attribute_values (attribute_id, value)
    SELECT v_attribute_id, btrim(supplied.value)
    FROM unnest(v_values) AS supplied(value);
  END IF;

  RETURN v_attribute_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_mobile_product_attribute_with_values(text, text, text, text[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_mobile_product_attribute_with_values(text, text, text, text[])
  TO authenticated;
