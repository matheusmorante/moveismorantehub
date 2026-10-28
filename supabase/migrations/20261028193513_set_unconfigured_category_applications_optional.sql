-- Treat every category application without an explicit operator choice as Optional.
DO $set_unconfigured_category_applications_optional$
DECLARE
  v_category_count integer;
  v_unconfigured_before integer;
  v_unconfigured_after integer;
  v_updated_count integer;
BEGIN
  SELECT count(*) INTO v_category_count
  FROM public.categories
  WHERE type = 'category';

  IF v_category_count <> 38 THEN
    RAISE EXCEPTION 'Precondição falhou: esperava 38 categorias de produto, encontrou %.', v_category_count;
  END IF;

  SELECT count(*) INTO v_unconfigured_before
  FROM public.attribute_category_applications
  WHERE is_configured IS DISTINCT FROM true;

  UPDATE public.attribute_category_applications
  SET application = 'optional',
      is_configured = true,
      updated_at = now()
  WHERE is_configured IS DISTINCT FROM true;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  SELECT count(*) INTO v_unconfigured_after
  FROM public.attribute_category_applications
  WHERE is_configured IS DISTINCT FROM true;

  IF v_updated_count <> v_unconfigured_before OR v_unconfigured_after <> 0 THEN
    RAISE EXCEPTION 'As aplicações de categoria não configuradas não foram convertidas integralmente para Opcional.';
  END IF;
END
$set_unconfigured_category_applications_optional$;
