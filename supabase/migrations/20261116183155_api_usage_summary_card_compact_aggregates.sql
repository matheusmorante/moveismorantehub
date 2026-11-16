CREATE OR REPLACE FUNCTION public.get_api_usage_summary_card_aggregates(
  p_start_date date,
  p_end_date date,
  p_environment text DEFAULT 'all',
  p_service_names jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_allowed boolean;
  v_daily jsonb;
  v_models jsonb;
  v_modules jsonb;
BEGIN
  SELECT CASE WHEN COALESCE(pg_catalog.cardinality(p.roles), 0) > 0
    THEN p.roles && ARRAY['administrator', 'manager']::text[]
    ELSE p.role IN ('administrator', 'manager') END INTO v_allowed
  FROM public.profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(v_allowed, false) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date > p_end_date
    OR p_environment IS NULL OR p_environment NOT IN ('all', 'production', 'development', 'test') THEN
    RAISE EXCEPTION 'Filtros inválidos';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid IN ('public.api_usage_daily'::pg_catalog.regclass, 'public.api_usage_logs'::pg_catalog.regclass)
      AND NOT a.attisdropped
      AND a.attname IN ('company_id', 'tenant_id', 'organization_id', 'establishment_id', 'unit_id')
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('api_usage_daily', 'api_usage_logs')
      AND p.cmd IN ('SELECT', 'ALL') AND p.permissive = 'RESTRICTIVE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'api_usage_daily' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'authenticated' = ANY(p.roles) AND p.qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'api_usage_logs' AND p.cmd IN ('SELECT', 'ALL')
      AND p.permissive = 'PERMISSIVE' AND 'authenticated' = ANY(p.roles) AND p.qual = 'true'
  ) THEN
    RAISE EXCEPTION 'Escopo de uso de APIs mudou; revisar isolamento do Dashboard' USING ERRCODE = '55000';
  END IF;

  -- Mantém a mesma precedência: logs atuais substituem a chave diária correspondente;
  -- a tabela diária só completa chaves sem log, por retenção legada.
  WITH log_daily AS (
    SELECT (log.created_at AT TIME ZONE 'UTC')::date AS usage_date,
      log.provider, log.service, log.environment, COUNT(*)::bigint AS total_requests,
      COALESCE(SUM(log.cost_estimated), 0) AS estimated_cost,
      COUNT(*) FILTER (WHERE log.cache_hit)::bigint AS cache_hits
    FROM public.api_usage_logs log
    WHERE log.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND log.created_at < ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      AND (p_environment = 'all' OR log.environment = p_environment)
    GROUP BY (log.created_at AT TIME ZONE 'UTC')::date, log.provider, log.service, log.environment
  ), daily_source AS (
    SELECT provider, service, total_requests, estimated_cost, cache_hits FROM log_daily
    UNION ALL
    SELECT d.provider, d.service, d.total_requests::bigint, d.estimated_cost, d.cache_hits::bigint
    FROM public.api_usage_daily d
    WHERE d.usage_date BETWEEN p_start_date AND p_end_date
      AND (p_environment = 'all' OR d.environment = p_environment)
      AND NOT EXISTS (
        SELECT 1 FROM log_daily l
        WHERE l.usage_date = d.usage_date AND l.provider = d.provider
          AND l.service = d.service AND l.environment = d.environment
      )
  )
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'service', daily.service,
    'total_requests', daily.total_requests,
    'estimated_cost', daily.estimated_cost,
    'cache_hits', daily.cache_hits
  ) ORDER BY daily.service), '[]'::jsonb)
  INTO v_daily
  FROM (
    SELECT service, SUM(total_requests)::bigint AS total_requests,
      SUM(estimated_cost) AS estimated_cost, SUM(cache_hits)::bigint AS cache_hits
    FROM daily_source GROUP BY service
  ) daily;

  -- O painel detalhado recebe a lista completa pela RPC antiga. Este cartão precisa
  -- somente dos quatro primeiros resultados, já calculados com os mesmos grupos.
  WITH detail_rows AS MATERIALIZED (
    SELECT COALESCE(NULLIF(log.service, ''), 'gemini_flash') AS service_id,
      COALESCE(NULLIF(log.provider, ''), 'gemini') AS provider,
      COALESCE(
        NULLIF(pg_catalog.substring(log.operation, '\[([^]]+)\]'), ''),
        NULLIF(log.service, ''),
        NULLIF(p_service_names ->> COALESCE(NULLIF(log.service, ''), 'gemini_flash'), ''),
        COALESCE(NULLIF(log.service, ''), 'gemini_flash')
      ) AS model,
      COALESCE(NULLIF(pg_catalog.btrim(log.module_source), ''), 'general') AS module_source,
      COUNT(*)::bigint AS total_requests,
      COALESCE(SUM(COALESCE(NULLIF(log.units, 0), 1)), 0)::bigint AS total_units,
      COALESCE(SUM(log.cost_estimated), 0) AS estimated_cost,
      ROW_NUMBER() OVER (
        ORDER BY log.service,
          COALESCE(NULLIF(pg_catalog.btrim(log.module_source), ''), 'general'),
          COALESCE(NULLIF(pg_catalog.substring(log.operation, '\[([^]]+)\]'), ''), log.service)
      ) AS detail_order
    FROM public.api_usage_logs log
    WHERE log.created_at >= (p_start_date::timestamp AT TIME ZONE 'UTC')
      AND log.created_at < ((p_end_date + 1)::timestamp AT TIME ZONE 'UTC')
      AND (p_environment = 'all' OR log.environment = p_environment)
    GROUP BY log.service, log.provider,
      COALESCE(
        NULLIF(pg_catalog.substring(log.operation, '\[([^]]+)\]'), ''),
        NULLIF(log.service, ''),
        NULLIF(p_service_names ->> COALESCE(NULLIF(log.service, ''), 'gemini_flash'), ''),
        COALESCE(NULLIF(log.service, ''), 'gemini_flash')
      ),
      COALESCE(NULLIF(pg_catalog.substring(log.operation, '\[([^]]+)\]'), ''), log.service),
      COALESCE(NULLIF(pg_catalog.btrim(log.module_source), ''), 'general')
  ), model_totals AS (
    SELECT model,
      (pg_catalog.array_agg(service_id ORDER BY detail_order))[1] AS service_id,
      (pg_catalog.array_agg(provider ORDER BY detail_order))[1] AS provider,
      SUM(total_requests)::bigint AS total_requests,
      SUM(CASE WHEN (provider = 'gemini' AND service_id <> 'gemini_image')
          OR (provider = 'openai' AND service_id <> 'openai_image')
        THEN total_units ELSE 0 END)::bigint AS total_units,
      SUM(estimated_cost) AS estimated_cost,
      MIN(detail_order) AS first_order
    FROM detail_rows
    GROUP BY model
  ), model_ordered AS (
    SELECT model_totals.*,
      CASE WHEN model ~ '^(0|[1-9][0-9]*)$' AND model::numeric <= 4294967294 THEN 0 ELSE 1 END AS key_kind,
      CASE WHEN model ~ '^(0|[1-9][0-9]*)$' AND model::numeric <= 4294967294
        THEN model::numeric ELSE NULL END AS numeric_key
    FROM model_totals
  ), model_ranked AS (
    SELECT * FROM model_ordered
    ORDER BY pg_catalog.round(estimated_cost::numeric, 2) DESC,
      total_requests DESC, key_kind, numeric_key NULLS LAST, first_order
    LIMIT 4
  ), module_model_counts AS (
    SELECT module_source, model, SUM(total_requests)::bigint AS total_requests,
      MIN(detail_order) AS first_order
    FROM detail_rows
    GROUP BY module_source, model
  ), module_model_ordered AS (
    SELECT module_model_counts.*,
      CASE WHEN model ~ '^(0|[1-9][0-9]*)$' AND model::numeric <= 4294967294 THEN 0 ELSE 1 END AS key_kind,
      CASE WHEN model ~ '^(0|[1-9][0-9]*)$' AND model::numeric <= 4294967294
        THEN model::numeric ELSE NULL END AS numeric_key
    FROM module_model_counts
  ), module_top_models AS (
    SELECT DISTINCT ON (module_source) module_source, model AS top_model
    FROM module_model_ordered
    ORDER BY module_source, total_requests DESC, key_kind, numeric_key NULLS LAST, first_order
  ), module_totals AS (
    SELECT module_source,
      SUM(total_requests)::bigint AS total_requests,
      SUM(CASE WHEN (provider = 'gemini' AND service_id <> 'gemini_image')
          OR (provider = 'openai' AND service_id <> 'openai_image')
        THEN total_units ELSE 0 END)::bigint AS total_units,
      SUM(estimated_cost) AS estimated_cost,
      MIN(detail_order) AS first_order
    FROM detail_rows
    GROUP BY module_source
  ), module_ordered AS (
    SELECT module_totals.*, COALESCE(module_top_models.top_model, 'N/A') AS top_model,
      CASE WHEN module_source ~ '^(0|[1-9][0-9]*)$'
          AND module_source::numeric <= 4294967294 THEN 0 ELSE 1 END AS key_kind,
      CASE WHEN module_source ~ '^(0|[1-9][0-9]*)$'
          AND module_source::numeric <= 4294967294 THEN module_source::numeric ELSE NULL END AS numeric_key
    FROM module_totals
    LEFT JOIN module_top_models USING (module_source)
  ), module_ranked AS (
    SELECT * FROM module_ordered
    ORDER BY pg_catalog.round(estimated_cost::numeric, 2) DESC,
      total_requests DESC, key_kind, numeric_key NULLS LAST, first_order
    LIMIT 4
  )
  SELECT
    (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'model', model, 'service_id', service_id, 'provider', provider,
      'total_requests', total_requests, 'total_units', total_units,
      'estimated_cost', estimated_cost
    ) ORDER BY pg_catalog.round(estimated_cost::numeric, 2) DESC,
        total_requests DESC, key_kind, numeric_key NULLS LAST, first_order), '[]'::jsonb)
     FROM model_ranked),
    (SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'module', module_source, 'total_requests', total_requests,
      'total_units', total_units, 'estimated_cost', estimated_cost,
      'top_model', top_model
    ) ORDER BY pg_catalog.round(estimated_cost::numeric, 2) DESC,
        total_requests DESC, key_kind, numeric_key NULLS LAST, first_order), '[]'::jsonb)
     FROM module_ranked)
  INTO v_models, v_modules;
  RETURN pg_catalog.jsonb_build_object('daily', v_daily, 'models', v_models, 'modules', v_modules);
END;
$$;

REVOKE ALL ON FUNCTION public.get_api_usage_summary_card_aggregates(date, date, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_api_usage_summary_card_aggregates(date, date, text, jsonb)
  TO authenticated;
