-- Expand search_order_operation_ids to support 'orcamento' (budget) operations and status terms.
CREATE OR REPLACE FUNCTION public.search_order_operation_ids(p_filters jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE v_options jsonb; v_terms text[]; v_target text; v_result jsonb;
BEGIN
  SELECT COALESCE(data->'deliveryHandlingOptions','[]'::jsonb) || COALESCE(data->'pickupHandlingOptions','[]'::jsonb)
    INTO v_options FROM public.settings WHERE id='app';
  v_options := COALESCE(v_options,'[]'::jsonb);
  v_target := public.immutable_unaccent(pg_catalog.lower(pg_catalog.btrim(COALESCE(p_filters->>'status',''))));
  v_terms := CASE
    WHEN v_target IN ('agendado','agendada','agendados','agendadas') THEN ARRAY['scheduled','agendado']
    WHEN v_target IN ('concluido','concluidos') THEN ARRAY['fulfilled','concluido','atendido','entregue','finalizado']
    WHEN v_target IN ('entregue','entregues') THEN ARRAY['fulfilled','concluido','atendido','entregue','finalizado']
    WHEN v_target IN ('cancelado','cancelada') THEN ARRAY['cancelled','canceled','cancelado','cancelada','estornado']
    WHEN v_target IN ('orcado','orcada','orcados','orcadas','cotado','cotada','proposta','orcamento') THEN ARRAY['quoted','orcado','draft','rascunho']
    WHEN v_target='rascunho' THEN ARRAY['draft','rascunho']
    WHEN v_target='pendente' THEN ARRAY['pending','pendente'] ELSE ARRAY[v_target] END;
  WITH normalized AS (
    SELECT o.*, public.immutable_unaccent(pg_catalog.lower(COALESCE(NULLIF(o.order_data->>'orderType',''),NULLIF(o.order_data->>'order_type',''),o.order_type,'sale'))) AS kind,
      public.immutable_unaccent(pg_catalog.lower(COALESCE(NULLIF(o.delivery_method,''), o.order_data#>>'{shipping,deliveryMethod}',o.order_data->>'deliveryMethod',''))) AS method,
      COALESCE(NULLIF(o.status,''),o.order_data->>'status','') AS raw_status,
      COALESCE(o.order_data#>'{shipping,scheduling}',o.order_data->'schedule',o.order_data->'scheduling','{}'::jsonb) AS schedule,
      public.order_schedule_date_value(COALESCE(o.scheduled_date::text,o.order_data#>>'{shipping,scheduling,date}',o.order_data#>>'{shipping,scheduling,startDate}',o.order_data->>'scheduledDate','')) AS date
    FROM public.orders o WHERE COALESCE(o.deleted,false)=false AND o.order_data->>'deleted' IS DISTINCT FROM 'true'
      AND NOT public.order_list_is_test(pg_catalog.to_jsonb(o))
  ), classified AS (
    SELECT n.*, EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(
      CASE WHEN pg_catalog.jsonb_typeof(n.order_data->'items')='array' AND n.order_data->'items'<>'[]'::jsonb THEN n.order_data->'items'
        WHEN pg_catalog.jsonb_typeof(n.items)='array' AND n.items<>'[]'::jsonb THEN n.items ELSE pg_catalog.jsonb_build_array('{}'::jsonb) END) item
      WHERE public.order_assembly_kind(COALESCE(NULLIF(item->>'handlingType',''),NULLIF(item->>'handling',''),
        n.order_data->>'handlingType',n.order_data->>'handling',n.order_data->>'deliveryType',
        n.order_data#>>'{shipping,handlingType}',n.order_data#>>'{shipping,handling}',''),v_options)<>'') AS assembly
    FROM normalized n
  ), matched AS MATERIALIZED (
    SELECT n.id,n.created_at,n.updated_at,n.scheduled_date FROM classified n
    WHERE public.order_list_matches_words(pg_catalog.concat_ws(' ',n.customer_name,n.order_data#>>'{customerData,fullName}',n.order_number,n.order_index::text),p_filters->>'termo')
      AND (COALESCE(p_filters->>'dataInicio','')='' OR n.scheduled_date::text>=p_filters->>'dataInicio')
      AND (COALESCE(p_filters->>'dataFim','')='' OR n.scheduled_date::text<=p_filters->>'dataFim')
      AND CASE WHEN v_target='' THEN
        CASE WHEN COALESCE(p_filters->>'tipo','todas') = 'orcamento'
          THEN public.immutable_unaccent(pg_catalog.lower(n.raw_status)) NOT IN ('cancelled','canceled','cancelado','cancelada')
          ELSE public.immutable_unaccent(pg_catalog.lower(n.raw_status)) NOT IN ('draft','rascunho','cancelled','canceled','cancelado','cancelada')
        END
        ELSE EXISTS (SELECT 1 FROM pg_catalog.unnest(ARRAY[n.raw_status,n.delivery_status,n.order_data->>'deliveryStatus']) status,
          pg_catalog.unnest(v_terms) term WHERE pg_catalog.strpos(public.immutable_unaccent(pg_catalog.lower(status)),term)>0) END
      AND CASE COALESCE(p_filters->>'tipo','todas')
        WHEN 'venda' THEN n.kind IN ('sale','venda')
        WHEN 'orcamento' THEN n.kind IN ('budget','orcamento')
        WHEN 'assistencia' THEN n.kind IN ('assistance','assistencia')
        WHEN 'devolucao' THEN n.kind IN ('return','devolucao')
        WHEN 'retirada' THEN n.kind NOT IN ('assistance','assistencia','return','devolucao','budget','orcamento') AND n.method ~ 'pickup|retirada'
        WHEN 'entrega' THEN n.kind IN ('sale','venda') AND n.method !~ 'pickup|retirada'
        WHEN 'montagem' THEN n.assembly AND n.date<>'' AND n.schedule->>'pendingScheduling' IS DISTINCT FROM 'true' AND n.schedule->>'notInformed' IS DISTINCT FROM 'true'
        ELSE true END
  ), selected AS (
    SELECT id,pg_catalog.row_number() OVER (ORDER BY
      CASE WHEN COALESCE(p_filters->>'dataInicio',p_filters->>'dataFim','')<>'' THEN scheduled_date END ASC NULLS LAST,
      CASE WHEN COALESCE(p_filters->>'dataInicio',p_filters->>'dataFim','')='' THEN updated_at END DESC NULLS LAST,id) AS ordinal
    FROM matched ORDER BY ordinal LIMIT LEAST(20,GREATEST(1,COALESCE(p_limit,10)))
  ) SELECT pg_catalog.jsonb_build_object('ids',COALESCE((SELECT pg_catalog.jsonb_agg(id ORDER BY ordinal) FROM selected),'[]'::jsonb)) INTO v_result;
  RETURN v_result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.search_order_operation_ids(jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_order_operation_ids(jsonb,integer) TO authenticated,service_role;
