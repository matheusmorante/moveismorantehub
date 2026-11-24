BEGIN;

SET LOCAL lock_timeout = '5s';

-- Keep the current selection. Creating a draft must not replace a live notice.
ALTER TABLE public.site_element_announcement_bars
  ALTER COLUMN active SET DEFAULT false;

CREATE UNIQUE INDEX site_element_announcement_bars_one_active_idx
  ON public.site_element_announcement_bars (active) WHERE active;

-- Only notices already visible through RLS expose an end time to the browser.
GRANT SELECT (ends_at) ON public.site_element_announcement_bars TO anon;

CREATE FUNCTION public.set_site_element_announcement_activation(
  p_id uuid,
  p_active boolean,
  p_expected_updated_at timestamptz
)
RETURNS TABLE (id uuid, active boolean, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
SET lock_timeout = '5s'
AS $function$
BEGIN
  IF public.has_manage_site_elements_permission() IS NOT TRUE THEN
    RAISE EXCEPTION 'Sem permissão para alterar a barra de avisos.' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR p_active IS NULL OR p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION 'Informe o aviso, o estado e a versão do cadastro.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public.site_element_announcement_bars.activation', 0)
  );

  PERFORM 1
  FROM public.site_element_announcement_bars AS notice
  WHERE notice.id = p_id AND notice.updated_at = p_expected_updated_at
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_active THEN
    UPDATE public.site_element_announcement_bars AS notice
    SET active = false
    WHERE notice.active AND notice.id <> p_id;
  END IF;

  RETURN QUERY
  UPDATE public.site_element_announcement_bars AS notice
  SET active = p_active
  WHERE notice.id = p_id
  RETURNING notice.id, notice.active, notice.updated_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_site_element_announcement_activation(uuid, boolean, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_site_element_announcement_activation(uuid, boolean, timestamptz)
  TO authenticated;

COMMENT ON FUNCTION public.set_site_element_announcement_activation(uuid, boolean, timestamptz) IS
  'Troca o único aviso ativo em uma transação, com permissão de Marketing e controle de versão.';

NOTIFY pgrst, 'reload schema';

COMMIT;
