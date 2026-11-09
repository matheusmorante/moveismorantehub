-- Keep mobile AI quota counts authoritative after migrating usage to OpenAI.
CREATE OR REPLACE FUNCTION public.get_mobile_product_ai_quota_counts(p_operation text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz;
  v_utc_day_start timestamptz;
  v_used_minute bigint;
  v_used_hour bigint;
  v_used_today bigint;
  v_used_global_today bigint;
  v_used_category_today bigint;
BEGIN
  IF p_operation IS NULL OR p_operation NOT IN (
    'catalog_extract_technical_specs',
    'mobile_product_description'
  ) THEN
    RAISE EXCEPTION 'Operação de cota inválida.' USING ERRCODE = '22023';
  END IF;

  v_now := pg_catalog.statement_timestamp();
  v_utc_day_start := pg_catalog.date_trunc(
    'day',
    v_now AT TIME ZONE 'UTC'
  ) AT TIME ZONE 'UTC';

  IF p_operation = 'catalog_extract_technical_specs' THEN
    SELECT
      pg_catalog.count(*) FILTER (
        WHERE u.created_at >= v_now - INTERVAL '1 minute'
      ),
      pg_catalog.count(*) FILTER (
        WHERE u.created_at >= v_now - INTERVAL '1 hour'
      ),
      pg_catalog.count(*)
    INTO v_used_minute, v_used_hour, v_used_today
    FROM public.api_usage_logs AS u
    WHERE u.provider IN ('gemini', 'openai')
      AND u.status = 'SUCCESS'
      AND u.operation = p_operation
      AND u.created_at >= v_utc_day_start;

    RETURN pg_catalog.jsonb_build_object(
      'usedMinute', v_used_minute,
      'usedHour', v_used_hour,
      'usedToday', v_used_today
    );
  END IF;

  SELECT
    pg_catalog.count(*),
    pg_catalog.count(*) FILTER (WHERE u.module_source = 'TEXT')
  INTO v_used_global_today, v_used_category_today
  FROM public.api_usage_logs AS u
  WHERE u.provider IN ('gemini', 'openai')
    AND u.status = 'SUCCESS'
    AND u.created_at >= v_utc_day_start;

  RETURN pg_catalog.jsonb_build_object(
    'usedGlobalToday', v_used_global_today,
    'usedCategoryToday', v_used_category_today
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_mobile_product_ai_quota_counts(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mobile_product_ai_quota_counts(text)
  TO service_role;
