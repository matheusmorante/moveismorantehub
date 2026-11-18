CREATE OR REPLACE FUNCTION public.update_mobile_product_attribute_with_values(
  p_attribute_id uuid,
  p_name text,
  p_values text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_updated_rows integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária para atualizar a característica.'
      USING ERRCODE = '42501';
  END IF;

  IF p_attribute_id IS NULL THEN
    RAISE EXCEPTION 'Selecione uma característica para atualizar.'
      USING ERRCODE = '22023';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'O nome da característica é obrigatório.'
      USING ERRCODE = '22023';
  END IF;

  IF p_values IS NULL OR cardinality(p_values) = 0 THEN
    RAISE EXCEPTION 'Adicione pelo menos um valor para a característica.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_values) AS supplied(value)
    WHERE supplied.value IS NULL OR btrim(supplied.value) = ''
  ) THEN
    RAISE EXCEPTION 'Os valores da característica não podem estar vazios.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT btrim(supplied.value)
    FROM unnest(p_values) AS supplied(value)
    GROUP BY btrim(supplied.value)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A característica não pode conter valores duplicados.'
      USING ERRCODE = '23505';
  END IF;

  UPDATE public.attributes
  SET name = v_name
  WHERE id = p_attribute_id;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  IF v_updated_rows = 0 THEN
    RAISE EXCEPTION 'Característica não encontrada ou sem permissão para atualização.'
      USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.attribute_values
  WHERE attribute_id = p_attribute_id;

  INSERT INTO public.attribute_values (attribute_id, value)
  SELECT p_attribute_id, btrim(supplied.value)
  FROM unnest(p_values) AS supplied(value);
END;
$$;

REVOKE ALL ON FUNCTION public.update_mobile_product_attribute_with_values(uuid, text, text[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_mobile_product_attribute_with_values(uuid, text, text[])
  TO authenticated;
