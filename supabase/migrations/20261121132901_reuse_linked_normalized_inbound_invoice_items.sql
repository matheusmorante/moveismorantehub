BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Replace only the reviewed resolver version. Preserve its invoker permissions.
DO $guard$
DECLARE
  v_function oid := pg_catalog.to_regprocedure(
    'public.find_inbound_invoice_product_links(text,smallint,text[],uuid)'
  );
BEGIN
  IF v_function IS NULL THEN
    RAISE EXCEPTION 'MISSING_INBOUND_INVOICE_PRODUCT_LINK_RESOLVER';
  END IF;
  IF (SELECT pg_catalog.md5(pg_catalog.replace(prosrc, E'\r\n', E'\n'))
        FROM pg_catalog.pg_proc WHERE oid = v_function)
      IS DISTINCT FROM 'dd016ffcc36d1b0a2c7027847268d2e9' THEN
    RAISE EXCEPTION 'UNEXPECTED_INBOUND_INVOICE_PRODUCT_LINK_RESOLVER_DEFINITION';
  END IF;
  IF pg_catalog.has_function_privilege('anon', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'ANON_MUST_NOT_EXECUTE_INBOUND_INVOICE_PRODUCT_LINK_RESOLVER';
  END IF;
  IF pg_catalog.to_regclass('public.inbound_invoice_items') IS NULL
     OR pg_catalog.to_regclass('public.idx_inbound_invoice_items_invoice_id') IS NULL
     OR pg_catalog.to_regclass('public.uq_inbound_invoice_items_invoice_item') IS NULL THEN
    RAISE EXCEPTION 'INBOUND_INVOICE_ITEM_SCHEMA_PRECONDITION_FAILED';
  END IF;
END;
$guard$;

-- JSON snapshots remain authoritative when they contain a link. When a matching
-- JSON line has no explicit choice, use its normalized row as evidence by code.
CREATE OR REPLACE FUNCTION public.find_inbound_invoice_product_links(
  p_supplier_id text, p_environment smallint, p_codes text[], p_exclude_invoice_id uuid
)
RETURNS TABLE (
  code text, product_id uuid, variation_id uuid, product_name text, sku text, selling_price numeric
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $sql$
  WITH requested AS MATERIALIZED (
    SELECT DISTINCT upper(btrim(input.code)) AS code
    FROM unnest(p_codes) input(code)
    WHERE btrim(input.code) <> ''
  ),
  supplier AS (
    SELECT id
    FROM public.people
    WHERE id = p_supplier_id AND active IS TRUE AND deleted IS NOT TRUE
      AND person_type IN ('supplier', 'suppliers')
      AND NOT (COALESCE('salvados' = ANY(stock_origins), false)
        AND NOT COALESCE('normal' = ANY(stock_origins), false))
  ),
  memory AS MATERIALIZED (
    SELECT r.code, m.product_id, m.product_variation_id AS variation_id, m.is_active
    FROM supplier s
    JOIN public.product_supplier_codes m ON m.supplier_id = s.id
    JOIN requested r ON r.code = m.supplier_product_code
  ),
  missing AS MATERIALIZED (
    SELECT r.code FROM requested r
    WHERE NOT EXISTS (SELECT FROM memory m WHERE m.code = r.code)
  ),
  history AS MATERIALIZED (
    SELECT i.id, CASE WHEN jsonb_typeof(i.itens) = 'array' THEN i.itens ELSE '[]'::jsonb END AS items
    FROM supplier s
    JOIN public.inbound_invoices i ON i.supplier_id = s.id
    WHERE EXISTS (SELECT FROM missing)
      AND i.id IS DISTINCT FROM p_exclude_invoice_id
      AND i.ambiente IS NOT DISTINCT FROM p_environment
      AND i.status_sefaz IS DISTINCT FROM 'cancelada'
  ),
  evidence AS (
    SELECT m.code,
           COALESCE(NULLIF(j.item->>'matchedProductId', ''), NULLIF(j.item->>'matched_product_id', ''),
                    NULLIF(j.item->>'product_id', ''), NULLIF(j.item->'raw_item'->>'matchedProductId', ''),
                    NULLIF(j.item->'raw_item'->>'matched_product_id', ''),
                    NULLIF(j.item->'raw_item'->>'product_id', '')) AS product_ref,
           COALESCE(NULLIF(j.item->>'matchedVariationId', ''), NULLIF(j.item->>'matched_variation_id', ''),
                    NULLIF(j.item->>'variation_id', ''), NULLIF(j.item->'raw_item'->>'matchedVariationId', ''),
                    NULLIF(j.item->'raw_item'->>'matched_variation_id', ''),
                    NULLIF(j.item->'raw_item'->>'variation_id', '')) AS variation_ref
    FROM history h
    CROSS JOIN LATERAL jsonb_array_elements(h.items) j(item)
    JOIN missing m ON m.code = upper(btrim(COALESCE(j.item->>'productCode', j.item->>'product_code')))
    WHERE COALESCE(j.item->>'linkMode', j.item->>'link_mode', j.item->'raw_item'->>'linkMode',
                   j.item->'raw_item'->>'link_mode', '') IN ('', 'single')
      AND COALESCE(j.item->>'inheritedSupplierLink', j.item->'raw_item'->>'inheritedSupplierLink')
        IS DISTINCT FROM 'true'
      AND COALESCE(NULLIF(j.item->'compositionLinks', 'null'), NULLIF(j.item->'composition_links', 'null'),
                   NULLIF(j.item->'raw_item'->'compositionLinks', 'null'),
                   NULLIF(j.item->'raw_item'->'composition_links', 'null'), '[]') = '[]'::jsonb
    UNION ALL
    SELECT m.code, j.product_id::text, j.variation_id::text
    FROM history h
    JOIN public.inbound_invoice_items j ON j.invoice_id = h.id
    JOIN missing m ON m.code = upper(btrim(j.product_code))
    WHERE (j.product_id IS NOT NULL OR j.variation_id IS NOT NULL)
      AND COALESCE(j.raw_item->>'linkMode', j.raw_item->>'link_mode', '') IN ('', 'single')
      AND j.raw_item->>'inheritedSupplierLink' IS DISTINCT FROM 'true'
      AND COALESCE(NULLIF(j.raw_item->'compositionLinks', 'null'),
                   NULLIF(j.raw_item->'composition_links', 'null'), '[]') = '[]'::jsonb
      -- Do not reuse a normalized link if its matching JSON line changed code
      -- or records an explicit/manual link decision.
      AND NOT EXISTS (
        SELECT FROM jsonb_array_elements(h.items) WITH ORDINALITY snapshot(item, position)
        WHERE CASE
            WHEN COALESCE(snapshot.item->>'itemNumber', snapshot.item->>'item_number', '') ~ '^[0-9]{1,8}$'
              THEN COALESCE(snapshot.item->>'itemNumber', snapshot.item->>'item_number')::integer
            ELSE snapshot.position::integer
          END = j.item_number
          AND (
            (
              NULLIF(upper(btrim(COALESCE(
                snapshot.item->>'productCode', snapshot.item->>'product_code'
              ))), '') IS NOT NULL
              AND upper(btrim(COALESCE(
                snapshot.item->>'productCode', snapshot.item->>'product_code'
              ))) <> m.code
            )
            OR (
              upper(btrim(COALESCE(
                snapshot.item->>'productCode', snapshot.item->>'product_code'
              ))) = m.code
              AND (
                COALESCE(NULLIF(snapshot.item->>'linkMode', ''),
                         NULLIF(snapshot.item->>'link_mode', ''),
                         NULLIF(snapshot.item->'raw_item'->>'linkMode', ''),
                         NULLIF(snapshot.item->'raw_item'->>'link_mode', ''),
                         '') NOT IN ('', 'single')
                OR COALESCE(NULLIF(snapshot.item->>'matchedProductId', ''),
                            NULLIF(snapshot.item->>'matched_product_id', ''),
                            NULLIF(snapshot.item->>'product_id', ''),
                            NULLIF(snapshot.item->'raw_item'->>'matchedProductId', ''),
                            NULLIF(snapshot.item->'raw_item'->>'matched_product_id', ''),
                            NULLIF(snapshot.item->'raw_item'->>'product_id', ''),
                            NULLIF(snapshot.item->>'matchedVariationId', ''),
                            NULLIF(snapshot.item->>'matched_variation_id', ''),
                            NULLIF(snapshot.item->>'variation_id', ''),
                            NULLIF(snapshot.item->'raw_item'->>'matchedVariationId', ''),
                            NULLIF(snapshot.item->'raw_item'->>'matched_variation_id', ''),
                            NULLIF(snapshot.item->'raw_item'->>'variation_id', '')) IS NOT NULL
                OR COALESCE(NULLIF(snapshot.item->'compositionLinks', 'null'),
                            NULLIF(snapshot.item->'composition_links', 'null'),
                            NULLIF(snapshot.item->'raw_item'->'compositionLinks', 'null'),
                            NULLIF(snapshot.item->'raw_item'->'composition_links', 'null'),
                            '[]'::jsonb) <> '[]'::jsonb
              )
            )
          )
      )
  ),
  refs AS MATERIALIZED (
    SELECT code, product_ref, variation_ref
    FROM evidence
    WHERE product_ref IS NOT NULL OR variation_ref IS NOT NULL
    UNION
    SELECT code, product_id::text, variation_id::text FROM memory WHERE is_active IS TRUE
  ),
  canonical AS (
    SELECT r.code, r.variation_ref IS NOT NULL AS has_variation, v.product_id AS variation_parent,
           v.id AS variation_id, r.product_ref
    FROM refs r
    LEFT JOIN public.product_variations v ON v.id = public.resolve_canonical_variation_id(
      CASE WHEN r.variation_ref ~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
        THEN r.variation_ref::uuid END
    ) AND v.active IS NOT FALSE
  ),
  candidates AS MATERIALIZED (
    SELECT DISTINCT c.code,
      CASE WHEN c.has_variation THEN c.variation_parent
        WHEN c.product_ref ~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' THEN c.product_ref::uuid END AS product_id,
      c.variation_id
    FROM canonical c
  )
  SELECT c.code, p.id, c.variation_id, COALESCE(NULLIF(v.name, ''), p.name),
         COALESCE(NULLIF(v.sku, ''), p.code, ''),
         COALESCE(CASE WHEN v.use_parent_price IS NOT FALSE THEN p.unit_price ELSE v.price END, p.unit_price, 0)
  FROM candidates c
  JOIN public.products p ON p.id = c.product_id
  LEFT JOIN public.product_variations v ON v.id = c.variation_id
  WHERE (SELECT count(*) FROM candidates other WHERE other.code = c.code) = 1
    AND p.active IS TRUE AND p.deleted IS FALSE AND p.is_draft IS NOT TRUE AND p.status IS DISTINCT FROM 'draft'
    AND (p.supplier_id::text = p_supplier_id OR p.main_supplier_id::text = p_supplier_id
      OR p_supplier_id = ANY(p.supplier_ids::text[]));
$sql$;

REVOKE ALL ON FUNCTION public.find_inbound_invoice_product_links(text, smallint, text[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_inbound_invoice_product_links(text, smallint, text[], uuid) TO authenticated, service_role;

COMMIT;
