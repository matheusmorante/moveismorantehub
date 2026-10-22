CREATE OR REPLACE FUNCTION public.get_fiscal_documents_summary(
  p_search text DEFAULT '',
  p_status text DEFAULT 'all',
  p_model text DEFAULT 'all',
  p_environment integer DEFAULT NULL,
  p_document_type text DEFAULT 'all',
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_target_document_id uuid DEFAULT NULL,
  p_accountant_view boolean DEFAULT false
)
RETURNS TABLE (
  total_count bigint,
  total_value numeric,
  authorized_count bigint,
  authorized_value numeric,
  canceled_count bigint,
  canceled_value numeric,
  estorno_count bigint,
  estorno_value numeric,
  pending_count bigint,
  pending_value numeric,
  rejected_count bigint,
  rejected_value numeric,
  abandoned_count bigint,
  abandoned_value numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
SET statement_timeout = '8s'
AS $function$
  WITH sanitized_input AS (
    SELECT
      nullif(btrim(coalesce(p_search, '')), '') IS NOT NULL AS search_requested,
      nullif(
        btrim(
          replace(
            regexp_replace(coalesce(p_search, ''), '[,%*()"]', ' ', 'g'),
            chr(92),
            ' '
          )
        ),
        ''
      ) AS search_text
  ),
  input AS (
    SELECT
      search_requested,
      search_text,
      regexp_replace(coalesce(search_text, ''), '^#', '') AS search_number,
      coalesce(
        nullif(ltrim(regexp_replace(coalesce(search_text, ''), '^#', ''), '0'), ''),
        '0'
      ) AS normalized_search_number
    FROM sanitized_input
  ),
  filtered_documents AS (
    SELECT d.status, d.document_type, d.valor_total
    FROM public.nfe_documents AS d
    CROSS JOIN input AS i
    WHERE (p_target_document_id IS NULL OR d.id = p_target_document_id)
      AND (
        p_target_document_id IS NOT NULL
        OR p_document_type = 'all' AND (
          d.document_type IN ('outbound', 'estorno') OR d.document_type IS NULL
        )
        OR p_document_type = 'outbound' AND (
          d.document_type = 'outbound' OR d.document_type IS NULL
        )
        OR p_document_type = 'estorno' AND d.document_type = 'estorno'
      )
      AND (
        p_status = 'all'
        OR p_accountant_view AND p_status = 'autorizada' AND (
          p_environment = 1 AND d.status = 'autorizada'
          OR p_environment = 2 AND d.status = 'homologada'
          OR p_environment IS NULL AND d.status IN ('autorizada', 'homologada')
        )
        OR d.status = p_status
      )
      AND (p_model = 'all' OR d.modelo = p_model)
      AND (p_environment IS NULL OR d.ambiente = p_environment)
      AND (
        p_target_document_id IS NOT NULL
        OR p_date_from IS NULL
        OR d.created_at >= (p_date_from::text || 'T00:00:00-03:00')::timestamptz
      )
      AND (
        p_target_document_id IS NOT NULL
        OR p_date_to IS NULL
        OR d.created_at < ((p_date_to + 1)::text || 'T00:00:00-03:00')::timestamptz
      )
      AND (
        NOT i.search_requested
        OR i.search_text IS NOT NULL AND (
          i.search_number ~ '^[0-9]{1,9}$'
          AND d.numero_nfe = CASE
            WHEN i.search_number ~ '^[0-9]{1,9}$' THEN i.search_number::integer
          END
          OR d.chave_acesso ILIKE '%' || i.search_text || '%'
          OR d.destinatario_nome ILIKE '%' || i.search_text || '%'
          OR d.destinatario_documento ILIKE '%' || i.search_text || '%'
          OR (
            i.search_number ~ '^[0-9]{1,12}$'
            AND EXISTS (
              SELECT 1
              FROM public.orders AS o
              WHERE o.id = d.order_id
                AND o.order_number::text = i.normalized_search_number
            )
          )
        )
      )
  )
  SELECT
    count(*)::bigint,
    coalesce(sum(valor_total), 0),
    count(*) FILTER (WHERE status IN ('autorizada', 'homologada'))::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status IN ('autorizada', 'homologada')), 0),
    count(*) FILTER (WHERE status = 'cancelada')::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status = 'cancelada'), 0),
    count(*) FILTER (WHERE document_type = 'estorno')::bigint,
    coalesce(sum(valor_total) FILTER (WHERE document_type = 'estorno'), 0),
    count(*) FILTER (WHERE status IN ('pendente', 'processando', 'erro'))::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status IN ('pendente', 'processando', 'erro')), 0),
    count(*) FILTER (WHERE status IN ('rejeitada', 'denegada'))::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status IN ('rejeitada', 'denegada')), 0),
    count(*) FILTER (WHERE status = 'abandoned')::bigint,
    coalesce(sum(valor_total) FILTER (WHERE status = 'abandoned'), 0)
  FROM filtered_documents;
$function$;

REVOKE ALL ON FUNCTION public.get_fiscal_documents_summary(
  text, text, text, integer, text, date, date, uuid, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fiscal_documents_summary(
  text, text, text, integer, text, date, date, uuid, boolean
) TO authenticated;

COMMENT ON FUNCTION public.get_fiscal_documents_summary(
  text, text, text, integer, text, date, date, uuid, boolean
) IS 'Retorna totalizadores fiscais somente de leitura aplicando os filtros da listagem e o RLS do operador.';
