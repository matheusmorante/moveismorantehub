CREATE OR REPLACE FUNCTION public.get_api_usage_monthly_total(
  p_service text,
  p_start_date date,
  p_end_date date,
  p_environment text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_daily_total numeric;
BEGIN
  IF p_service IS NULL OR pg_catalog.btrim(p_service) = ''
    OR p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date
    OR p_environment IS NULL
    OR p_environment NOT IN ('all', 'production', 'development', 'test') THEN
    RAISE EXCEPTION 'Filtros inválidos para consultar uso mensal de API'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(pg_catalog.sum(d.total_requests), 0)::numeric
  INTO v_daily_total
  FROM public.api_usage_daily AS d
  WHERE d.service = p_service
    AND d.usage_date BETWEEN p_start_date AND p_end_date
    AND (p_environment = 'all' OR d.environment = p_environment);

  IF v_daily_total <> 0 THEN
    RETURN v_daily_total;
  END IF;

  RETURN COALESCE((
    SELECT pg_catalog.sum(COALESCE(NULLIF(log.units, 0), 1::numeric))
    FROM public.api_usage_logs AS log
    WHERE log.service = p_service
      AND log.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND log.created_at <= (
        (p_end_date::timestamp + INTERVAL '1 day' - INTERVAL '1 millisecond')
        AT TIME ZONE 'UTC'
      )
      AND (p_environment = 'all' OR log.environment = p_environment)
  ), 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_api_usage_monthly_total(text, date, date, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_api_usage_monthly_total(text, date, date, text)
  TO authenticated;
