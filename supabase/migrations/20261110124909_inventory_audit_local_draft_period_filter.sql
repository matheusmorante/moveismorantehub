CREATE OR REPLACE FUNCTION public.list_inventory_audit_sessions(
  p_page integer,
  p_period_start timestamp with time zone,
  p_local_drafts jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_local_drafts jsonb := COALESCE(p_local_drafts, '[]'::jsonb);
  v_offset bigint;
BEGIN
  IF p_page IS NULL OR p_page < 1 THEN
    RAISE EXCEPTION 'A página do histórico de inventários deve ser positiva.'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.jsonb_typeof(v_local_drafts) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'A lista de rascunhos locais do inventário é inválida.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.jsonb_array_elements(v_local_drafts) AS entry(value)
     WHERE pg_catalog.jsonb_typeof(entry.value) IS DISTINCT FROM 'object'
        OR pg_catalog.jsonb_typeof(entry.value->'id') IS DISTINCT FROM 'string'
        OR COALESCE(entry.value->>'id', '') = ''
        OR pg_catalog.jsonb_typeof(entry.value->'draft_date') IS DISTINCT FROM 'string'
        OR NOT pg_catalog.pg_input_is_valid(
          entry.value->>'draft_date',
          'timestamp with time zone'
        )
  ) THEN
    RAISE EXCEPTION 'Os identificadores ou datas dos rascunhos locais são inválidos.'
      USING ERRCODE = '22023';
  END IF;

  v_offset := (p_page::bigint - 1) * 15;

  RETURN (
    WITH local_input AS MATERIALIZED (
      SELECT draft.id,
             draft.draft_date::timestamp with time zone AS session_date
        FROM pg_catalog.jsonb_to_recordset(v_local_drafts)
          AS draft(id text, draft_date text)
    ),
    local_rows AS MATERIALIZED (
      SELECT DISTINCT ON (draft.id)
             draft.id,
             draft.session_date
        FROM local_input AS draft
       ORDER BY draft.id, draft.session_date DESC NULLS LAST
    ),
    raw_markers AS MATERIALIZED (
      SELECT move.id AS marker_id,
             move.date AS session_date,
             move.label,
             move.observation,
             COALESCE(
               NULLIF(move.related_entity_id, ''),
               NULLIF(move.source_receipt_id::text, ''),
               NULLIF(move.order_id, '')
             ) AS related_move_id,
             COALESCE(
               NULLIF(move.related_entity_id, ''),
               NULLIF(move.source_receipt_id::text, ''),
               NULLIF(move.order_id, ''),
               move.id::text
             ) AS session_id
        FROM public.inventory_moves AS move
       WHERE move.label LIKE 'Inventário #%'
         AND (p_period_start IS NULL OR move.date >= p_period_start)
    ),
    parsed_markers AS MATERIALIZED (
      SELECT marker.*,
             CASE
               WHEN pg_catalog.pg_input_is_valid(marker.observation, 'jsonb')
                 THEN marker.observation::jsonb
               ELSE '{}'::jsonb
             END AS snapshot
        FROM raw_markers AS marker
    ),
    valid_markers AS MATERIALIZED (
      SELECT marker.*,
             CASE
               WHEN marker.snapshot ? 'status'
                AND marker.snapshot->'status' NOT IN (
                  'null'::jsonb, 'false'::jsonb, '""'::jsonb, '0'::jsonb
                )
                 THEN marker.snapshot->>'status'
               ELSE 'completed'
             END AS session_status,
             CASE
               WHEN marker.snapshot ? 'inventoryCode'
                AND marker.snapshot->'inventoryCode' NOT IN (
                  'null'::jsonb, 'false'::jsonb, '""'::jsonb, '0'::jsonb
                )
                 THEN marker.snapshot->>'inventoryCode'
               ELSE pg_catalog.substr(marker.label, pg_catalog.char_length('Inventário #') + 1)
             END AS inventory_code
        FROM parsed_markers AS marker
       WHERE pg_catalog.jsonb_typeof(marker.snapshot) = 'object'
         AND CASE
               WHEN marker.snapshot ? 'inventoryAudit' THEN
                 marker.snapshot->'inventoryAudit' NOT IN (
                   'null'::jsonb, 'false'::jsonb, '""'::jsonb, '0'::jsonb
                 )
               ELSE false
             END
         AND CASE
               WHEN pg_catalog.jsonb_typeof(marker.snapshot->'items') = 'array'
                 THEN true
               ELSE false
             END
    ),
    visible_remote AS MATERIALIZED (
      SELECT marker.*
        FROM valid_markers AS marker
       WHERE marker.session_status = 'completed'
          OR NOT EXISTS (
               SELECT 1
                 FROM local_rows AS local
                WHERE local.id = marker.session_id
             )
    ),
    visible_local AS MATERIALIZED (
      SELECT local.*
        FROM local_rows AS local
       WHERE (p_period_start IS NULL OR local.session_date >= p_period_start)
         AND NOT EXISTS (
               SELECT 1
                 FROM valid_markers AS marker
                WHERE marker.session_id = local.id
                  AND marker.session_status = 'completed'
             )
    ),
    unified_rows AS MATERIALIZED (
      SELECT 'local'::text AS kind,
             local.id AS session_id,
             local.session_date,
             0::integer AS kind_order,
             local.id AS sort_key,
             NULL::uuid AS marker_id,
             NULL::text AS related_move_id,
             NULL::text AS session_status,
             NULL::text AS inventory_code,
             NULL::jsonb AS snapshot
        FROM visible_local AS local
      UNION ALL
      SELECT 'remote'::text AS kind,
             marker.session_id,
             marker.session_date,
             1::integer AS kind_order,
             marker.marker_id::text AS sort_key,
             marker.marker_id,
             marker.related_move_id,
             marker.session_status,
             marker.inventory_code,
             marker.snapshot
        FROM visible_remote AS marker
    ),
    page_rows AS MATERIALIZED (
      SELECT row.*
        FROM unified_rows AS row
       ORDER BY row.session_date DESC NULLS LAST,
                row.kind_order ASC,
                row.sort_key ASC
       LIMIT 15
      OFFSET v_offset
    ),
    page_with_adjustments AS MATERIALIZED (
      SELECT page.*,
             COALESCE(adjustments.adjustments_count, 0)::integer AS adjustments_count,
             COALESCE(adjustments.reversed_count, 0)::integer AS reversed_count
        FROM page_rows AS page
        LEFT JOIN LATERAL (
          SELECT pg_catalog.count(*)::integer AS adjustments_count,
                 pg_catalog.count(*) FILTER (
                   WHERE CASE
                     WHEN adjustment.status IN ('reversed', 'cancelled')
                       OR parsed.snapshot->>'status' IN ('reversed', 'cancelled')
                       THEN true
                     WHEN adjustment.status IN ('effective', 'active')
                       OR parsed.snapshot->>'status' IN (
                         'effective', 'active', 'reversed', 'cancelled'
                       )
                       THEN false
                     WHEN adjustment.reason LIKE 'Cancelamento da venda%'
                       OR adjustment.reason LIKE 'Estorno de devolução%'
                       OR adjustment.reason LIKE 'Estorno%'
                       THEN true
                     ELSE false
                   END
                 )::integer AS reversed_count
            FROM public.inventory_moves AS adjustment
            CROSS JOIN LATERAL (
              SELECT CASE
                       WHEN pg_catalog.pg_input_is_valid(adjustment.observation, 'jsonb')
                         THEN adjustment.observation::jsonb
                       ELSE '{}'::jsonb
                     END AS snapshot
            ) AS parsed
           WHERE page.kind = 'remote'
             AND adjustment.label LIKE 'Ajuste lançado pelo inventário #%'
             AND COALESCE(
                   NULLIF(adjustment.related_entity_id, ''),
                   NULLIF(adjustment.source_receipt_id::text, ''),
                   NULLIF(adjustment.order_id, '')
                 ) IS NOT DISTINCT FROM page.related_move_id
        ) AS adjustments ON page.kind = 'remote'
    ),
    recent_moves AS MATERIALIZED (
      SELECT move.id, move.date, move.label, move.observation
        FROM public.inventory_moves AS move
       ORDER BY move.date DESC, move.id ASC
       LIMIT 30
    ),
    parsed_recent_moves AS MATERIALIZED (
      SELECT recent.*,
             CASE
               WHEN pg_catalog.pg_input_is_valid(recent.observation, 'jsonb')
                 THEN recent.observation::jsonb
               ELSE '{}'::jsonb
             END AS snapshot
        FROM recent_moves AS recent
    ),
    recent_inventory_codes AS MATERIALIZED (
      SELECT recent.date,
             recent.id,
             CASE
               WHEN recent.snapshot ? 'inventoryCode'
                AND recent.snapshot->'inventoryCode' NOT IN (
                  'null'::jsonb, 'false'::jsonb, '""'::jsonb, '0'::jsonb
                )
                 THEN recent.snapshot->>'inventoryCode'
               ELSE pg_catalog.substr(recent.label, pg_catalog.char_length('Inventário #') + 1)
             END AS inventory_code
        FROM parsed_recent_moves AS recent
       WHERE recent.label LIKE 'Inventário #%'
    )
    SELECT pg_catalog.jsonb_build_object(
      'totalItems', (SELECT pg_catalog.count(*) FROM unified_rows),
      'rows', COALESCE(
        (
          SELECT pg_catalog.jsonb_agg(
            CASE
              WHEN page.kind = 'local' THEN
                pg_catalog.jsonb_build_object('kind', 'local', 'id', page.session_id)
              ELSE
                pg_catalog.jsonb_build_object(
                  'kind', 'remote',
                  'id', page.session_id,
                  'markerMoveId', page.marker_id::text,
                  'date', page.session_date,
                  'status', page.session_status,
                  'inventoryCode', page.inventory_code,
                  'items', page.snapshot->'items',
                  'name', page.snapshot->'name',
                  'hasStages', page.snapshot->'hasStages',
                  'responsibleId', page.snapshot->'responsibleId',
                  'responsibleName', page.snapshot->'responsibleName',
                  'adjustmentsCount', page.adjustments_count,
                  'reversedCount', page.reversed_count
                )
            END
            ORDER BY page.session_date DESC NULLS LAST,
                     page.kind_order ASC,
                     page.sort_key ASC
          )
            FROM page_with_adjustments AS page
        ),
        '[]'::jsonb
      ),
      'reservedCodes', COALESCE(
        (
          SELECT pg_catalog.jsonb_agg(code.inventory_code ORDER BY code.date DESC, code.id ASC)
            FROM recent_inventory_codes AS code
           WHERE code.inventory_code IS NOT NULL
             AND code.inventory_code <> ''
        ),
        '[]'::jsonb
      )
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.list_inventory_audit_sessions(
  integer,
  timestamp with time zone,
  jsonb
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.list_inventory_audit_sessions(
  integer,
  timestamp with time zone,
  jsonb
) TO authenticated;

COMMENT ON FUNCTION public.list_inventory_audit_sessions(
  integer,
  timestamp with time zone,
  jsonb
) IS 'Returns one fixed page of ERP inventory audit sessions, merging minimal local-draft keys under the caller''s table permissions.';
