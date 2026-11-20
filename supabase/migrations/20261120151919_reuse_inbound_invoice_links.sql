BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Only a unique active supplier from the same issuer and environment is inherited.
CREATE FUNCTION public.find_inbound_invoice_history_supplier(
  p_emitter text, p_environment smallint, p_access_key text
)
RETURNS TABLE (id text, stock_origins text[])
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $sql$
  WITH emitter AS (
    SELECT upper(regexp_replace(COALESCE(p_emitter, ''), '[^A-Za-z0-9]', '', 'g')) AS document
  ),
  known_suppliers AS (
    SELECT min(i.supplier_id) AS id
    FROM emitter e
    JOIN public.inbound_invoices i
      ON upper(regexp_replace(i.emitente_cnpj, '[^A-Za-z0-9]', '', 'g')) = e.document
    JOIN public.people s ON s.id = i.supplier_id
    WHERE e.document ~ '^([0-9]{11}|[A-Z0-9]{12}[0-9]{2})$'
      AND i.chave_acesso IS DISTINCT FROM p_access_key
      AND i.ambiente IS NOT DISTINCT FROM p_environment
      AND i.status_sefaz IS DISTINCT FROM 'cancelada'
      AND s.person_type IN ('supplier', 'suppliers')
      AND s.active IS TRUE AND s.deleted IS NOT TRUE
    HAVING count(DISTINCT i.supplier_id) = 1
  )
  SELECT s.id, s.stock_origins FROM known_suppliers k JOIN public.people s USING (id);
$sql$;

-- Explicit supplier codes have priority. For other codes, editable invoice
-- snapshots are authoritative; normalized rows are the fallback for row-only invoices.
CREATE FUNCTION public.find_inbound_invoice_product_links(
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
                    NULLIF(j.item->>'product_id', '')) AS product_ref,
           COALESCE(NULLIF(j.item->>'matchedVariationId', ''), NULLIF(j.item->>'matched_variation_id', ''),
                    NULLIF(j.item->>'variation_id', '')) AS variation_ref
    FROM history h
    CROSS JOIN LATERAL jsonb_array_elements(h.items) j(item)
    JOIN missing m ON m.code = upper(btrim(COALESCE(j.item->>'productCode', j.item->>'product_code')))
    WHERE COALESCE(j.item->>'linkMode', j.item->>'link_mode', j.item->'raw_item'->>'linkMode', '') IN ('', 'single')
      AND j.item->>'inheritedSupplierLink' IS DISTINCT FROM 'true'
      AND COALESCE(NULLIF(j.item->'compositionLinks', 'null'), NULLIF(j.item->'composition_links', 'null'), '[]') = '[]'::jsonb
    UNION ALL
    SELECT m.code, j.product_id::text, j.variation_id::text
    FROM history h
    JOIN public.inbound_invoice_items j ON j.invoice_id = h.id
    JOIN missing m ON m.code = upper(btrim(j.product_code))
    WHERE jsonb_array_length(h.items) = 0
      AND COALESCE(j.raw_item->>'linkMode', j.raw_item->>'link_mode', '') IN ('', 'single')
      AND j.raw_item->>'inheritedSupplierLink' IS DISTINCT FROM 'true'
      AND COALESCE(NULLIF(j.raw_item->'compositionLinks', 'null'), NULLIF(j.raw_item->'composition_links', 'null'), '[]') = '[]'::jsonb
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

-- Runs only against a pending invoice. The JSON and existing normalized rows
-- are updated in one transaction; JSON-only imports keep their original shape.
CREATE FUNCTION public.reuse_pending_inbound_invoice_links(
  p_invoice_id uuid, p_include_related boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $sql$
DECLARE
  v_invoice record;
  v_supplier text;
  v_items jsonb;
  v_links jsonb;
  v_related_id uuid;
BEGIN
  SELECT i.id, i.chave_acesso, i.emitente_cnpj, i.destinatario_cnpj, i.ambiente, i.supplier_id, i.itens
    INTO v_invoice
    FROM public.inbound_invoices i
   WHERE i.id = p_invoice_id
     AND i.status_recebimento IN ('pendente', 'manifestada')
     AND i.receipt_id IS NULL
     AND i.status_sefaz IS DISTINCT FROM 'cancelada'
     AND NOT EXISTS (
       SELECT FROM public.goods_receipts r
       WHERE NULLIF(upper(regexp_replace(r.fiscal_key, '[./[:space:]-]', '', 'g')), '') IS NOT NULL
         AND upper(regexp_replace(r.fiscal_key, '[./[:space:]-]', '', 'g')) = i.chave_acesso
     )
   FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_supplier := v_invoice.supplier_id;
  IF v_supplier IS NULL THEN
    SELECT s.id INTO v_supplier FROM public.find_inbound_invoice_history_supplier(
      v_invoice.emitente_cnpj, v_invoice.ambiente, v_invoice.chave_acesso
    ) s;
  END IF;
  IF v_supplier IS NULL THEN RETURN NULL; END IF;

  v_items := CASE WHEN jsonb_typeof(v_invoice.itens) = 'array' THEN v_invoice.itens ELSE '[]'::jsonb END;
  WITH invoice_items AS MATERIALIZED (
    SELECT j.position,
           CASE WHEN COALESCE(j.item->>'itemNumber', j.item->>'item_number', '') ~ '^[0-9]{1,8}$'
             THEN COALESCE(j.item->>'itemNumber', j.item->>'item_number')::integer
             ELSE j.position::integer END AS item_number,
           upper(btrim(COALESCE(j.item->>'productCode', j.item->>'product_code'))) AS code,
           j.item
    FROM jsonb_array_elements(v_items) WITH ORDINALITY j(item, position)
    UNION ALL
    SELECT NULL, n.item_number, upper(btrim(n.product_code)), COALESCE(n.raw_item, '{}'::jsonb)
    FROM public.inbound_invoice_items n WHERE n.invoice_id = p_invoice_id AND jsonb_array_length(v_items) = 0
  ),
  eligible AS MATERIALIZED (
    SELECT j.position, j.item_number, j.code, n.id AS normalized_id
    FROM invoice_items j
    LEFT JOIN public.inbound_invoice_items n ON n.invoice_id = p_invoice_id AND n.item_number = j.item_number
    WHERE NULLIF(j.code, '') IS NOT NULL
      AND (SELECT count(*) FROM invoice_items duplicate WHERE duplicate.item_number = j.item_number) = 1
      -- An explicit mode (even an emptied single link) belongs to this invoice.
      AND COALESCE(j.item->>'linkMode', j.item->>'link_mode', n.raw_item->>'linkMode', n.raw_item->>'link_mode', '') = ''
      AND COALESCE(NULLIF(j.item->'compositionLinks', 'null'), NULLIF(j.item->'composition_links', 'null'), '[]') = '[]'::jsonb
      AND COALESCE(NULLIF(j.item->>'matchedProductId', ''), NULLIF(j.item->>'matched_product_id', ''),
                   NULLIF(j.item->>'product_id', '')) IS NULL
      AND COALESCE(NULLIF(j.item->>'matchedVariationId', ''), NULLIF(j.item->>'matched_variation_id', ''),
                   NULLIF(j.item->>'variation_id', '')) IS NULL
      AND n.product_id IS NULL AND n.variation_id IS NULL
      AND (n.id IS NULL OR (upper(btrim(n.product_code)) = j.code
        AND (n.raw_item IS NULL OR jsonb_typeof(n.raw_item) = 'object')))
  ),
  links AS MATERIALIZED (
    SELECT t.position, t.normalized_id, t.item_number, t.code, m.product_id, m.variation_id,
           jsonb_build_object('matchedProductId', m.product_id, 'matchedVariationId', m.variation_id,
             'matched_product_id', m.product_id, 'matched_variation_id', m.variation_id,
             'productErpName', m.product_name, 'linkedProductCode', m.sku, 'sellingPrice', m.selling_price,
             'linkMode', 'single', 'inheritedSupplierLink', true) AS patch
    FROM public.find_inbound_invoice_product_links(
      v_supplier, v_invoice.ambiente, ARRAY(SELECT DISTINCT code FROM eligible), p_invoice_id
    ) m
    JOIN eligible t ON t.code = m.code
  ),
  updated_rows AS (
    UPDATE public.inbound_invoice_items n
       SET product_id = link.product_id, variation_id = link.variation_id,
           raw_item = COALESCE(n.raw_item, '{}'::jsonb) || link.patch
      FROM links link
     WHERE n.id = link.normalized_id AND n.product_id IS NULL AND n.variation_id IS NULL
     RETURNING n.id
  ),
  confirmed_links AS (
    SELECT l.* FROM links l
    WHERE l.normalized_id IS NULL OR EXISTS (SELECT FROM updated_rows r WHERE r.id = l.normalized_id)
  )
  SELECT
    COALESCE((SELECT jsonb_agg(CASE WHEN l.patch IS NULL THEN j.item ELSE j.item || l.patch END ORDER BY j.position)
      FROM invoice_items j LEFT JOIN confirmed_links l USING (position) WHERE j.position IS NOT NULL), v_items),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('itemNumber', l.item_number, 'supplierProductCode', l.code)
      || l.patch ORDER BY l.item_number)
      FROM confirmed_links l), '[]'::jsonb)
    INTO v_items, v_links;

  IF v_invoice.supplier_id IS DISTINCT FROM v_supplier OR jsonb_array_length(v_links) > 0 THEN
    UPDATE public.inbound_invoices i
       SET supplier_id = v_supplier,
           itens = CASE WHEN jsonb_array_length(v_items) > 0 THEN v_items ELSE i.itens END,
           updated_at = now()
     WHERE i.id = p_invoice_id;
  END IF;

  IF p_include_related AND v_invoice.supplier_id IS NOT NULL THEN
    FOR v_related_id IN
      SELECT i.id FROM public.inbound_invoices i
      WHERE i.id <> p_invoice_id
        AND i.ambiente IS NOT DISTINCT FROM v_invoice.ambiente
        AND i.destinatario_cnpj = v_invoice.destinatario_cnpj
        AND i.status_recebimento IN ('pendente', 'manifestada')
        AND i.receipt_id IS NULL
        AND i.status_sefaz IS DISTINCT FROM 'cancelada'
        AND (
          i.supplier_id = v_supplier
          OR (i.supplier_id IS NULL AND upper(regexp_replace(i.emitente_cnpj, '[^A-Za-z0-9]', '', 'g'))
            = upper(regexp_replace(v_invoice.emitente_cnpj, '[^A-Za-z0-9]', '', 'g')))
        )
      ORDER BY i.id
    LOOP
      PERFORM public.reuse_pending_inbound_invoice_links(v_related_id, false);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('supplierId', v_supplier, 'items', v_links);
END;
$sql$;

REVOKE ALL ON FUNCTION public.find_inbound_invoice_history_supplier(text, smallint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_inbound_invoice_product_links(text, smallint, text[], uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reuse_pending_inbound_invoice_links(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_inbound_invoice_history_supplier(text, smallint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_inbound_invoice_product_links(text, smallint, text[], uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reuse_pending_inbound_invoice_links(uuid, boolean) TO authenticated, service_role;

-- Preserve the installed SEFAZ writer's existing XML and metadata rules.
DO $guard$
BEGIN
  IF (SELECT md5(replace(prosrc, E'\r\n', E'\n')) FROM pg_catalog.pg_proc
      WHERE oid = 'public.persist_sefaz_inbound_invoice(jsonb,boolean)'::regprocedure)
      IS DISTINCT FROM '7a7165b5a0f1e6bc50c53d70896a6afa' THEN
    RAISE EXCEPTION 'UNEXPECTED_PERSIST_SEFAZ_INBOUND_INVOICE_DEFINITION';
  END IF;
END;
$guard$;

CREATE OR REPLACE FUNCTION public.persist_sefaz_inbound_invoice(
  p_invoice jsonb,
  p_received_full_xml boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_invoice public.inbound_invoices%ROWTYPE;
  v_persisted boolean;
BEGIN
  IF p_invoice IS NULL
     OR pg_catalog.jsonb_typeof(p_invoice) IS DISTINCT FROM 'object'
     OR p_received_full_xml IS NULL
     OR NULLIF(pg_catalog.btrim(p_invoice ->> 'chave_acesso'), '') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'INVALID_INBOUND_INVOICE_PAYLOAD';
  END IF;

  v_invoice := pg_catalog.jsonb_populate_record(
    NULL::public.inbound_invoices,
    p_invoice
  );

  IF v_invoice.supplier_id IS NULL THEN
    SELECT s.id INTO v_invoice.supplier_id FROM public.find_inbound_invoice_history_supplier(
      v_invoice.emitente_cnpj, v_invoice.ambiente, v_invoice.chave_acesso
    ) s;
  END IF;

  -- A distribuição automática armazena metadados, não substitui o XML completo
  -- que o operador importa pelo fluxo próprio do ERP.
  IF p_received_full_xml THEN
    v_invoice.itens := '[]'::jsonb;
    v_invoice.xml_conteudo := NULL;
  END IF;

  INSERT INTO public.inbound_invoices AS existing_invoice (
    chave_acesso,
    modelo,
    ambiente,
    numero_nfe,
    serie,
    data_emissao,
    emitente_cnpj,
    supplier_id,
    emitente_nome,
    emitente_fantasia,
    emitente_uf,
    destinatario_cnpj,
    destinatario_nome,
    valor_produtos,
    valor_total,
    valor_frete,
    valor_ipi,
    valor_icms,
    valor_icms_st,
    status_sefaz,
    status_recebimento,
    xml_conteudo,
    itens,
    nsu
  ) VALUES (
    v_invoice.chave_acesso,
    v_invoice.modelo,
    v_invoice.ambiente,
    v_invoice.numero_nfe,
    v_invoice.serie,
    v_invoice.data_emissao,
    v_invoice.emitente_cnpj,
    v_invoice.supplier_id,
    v_invoice.emitente_nome,
    v_invoice.emitente_fantasia,
    v_invoice.emitente_uf,
    v_invoice.destinatario_cnpj,
    v_invoice.destinatario_nome,
    v_invoice.valor_produtos,
    v_invoice.valor_total,
    v_invoice.valor_frete,
    v_invoice.valor_ipi,
    v_invoice.valor_icms,
    v_invoice.valor_icms_st,
    v_invoice.status_sefaz,
    v_invoice.status_recebimento,
    v_invoice.xml_conteudo,
    v_invoice.itens,
    v_invoice.nsu
  )
  ON CONFLICT (chave_acesso) DO UPDATE SET
    modelo = EXCLUDED.modelo,
    ambiente = EXCLUDED.ambiente,
    numero_nfe = EXCLUDED.numero_nfe,
    serie = EXCLUDED.serie,
    data_emissao = EXCLUDED.data_emissao,
    emitente_cnpj = EXCLUDED.emitente_cnpj,
    supplier_id = COALESCE(existing_invoice.supplier_id, EXCLUDED.supplier_id),
    updated_at = CASE
      WHEN existing_invoice.supplier_id IS NULL AND EXCLUDED.supplier_id IS NOT NULL
        THEN pg_catalog.now()
      ELSE existing_invoice.updated_at
    END,
    emitente_nome = EXCLUDED.emitente_nome,
    emitente_fantasia = EXCLUDED.emitente_fantasia,
    emitente_uf = EXCLUDED.emitente_uf,
    destinatario_cnpj = EXCLUDED.destinatario_cnpj,
    destinatario_nome = EXCLUDED.destinatario_nome,
    valor_produtos = EXCLUDED.valor_produtos,
    valor_total = EXCLUDED.valor_total,
    valor_frete = EXCLUDED.valor_frete,
    valor_ipi = EXCLUDED.valor_ipi,
    valor_icms = EXCLUDED.valor_icms,
    valor_icms_st = EXCLUDED.valor_icms_st,
    status_sefaz = EXCLUDED.status_sefaz,
    status_recebimento = EXCLUDED.status_recebimento,
    xml_conteudo = CASE
      WHEN p_received_full_xml
       AND COALESCE(existing_invoice.xml_conteudo, '') ~* '<([[:alnum:]_]+:)?resNFe([[:space:]>])'
        THEN existing_invoice.xml_conteudo
      ELSE EXCLUDED.xml_conteudo
    END,
    itens = EXCLUDED.itens,
    nsu = EXCLUDED.nsu
  WHERE NOT (
    CASE
      WHEN pg_catalog.jsonb_typeof(existing_invoice.itens) = 'array'
        THEN pg_catalog.jsonb_array_length(existing_invoice.itens) > 0
      ELSE false
    END
    OR COALESCE(existing_invoice.xml_conteudo, '') ~* '<([[:alnum:]_]+:)?(nfeProc|infNFe)([[:space:]>])'
  )
  RETURNING true INTO v_persisted;

  -- A linha completa continua intacta; apenas preenche um vínculo ausente.
  IF NOT COALESCE(v_persisted, false) AND v_invoice.supplier_id IS NOT NULL THEN
    UPDATE public.inbound_invoices AS existing_invoice
       SET supplier_id = v_invoice.supplier_id,
           updated_at = pg_catalog.now()
     WHERE existing_invoice.chave_acesso = v_invoice.chave_acesso
       AND existing_invoice.supplier_id IS NULL
       AND existing_invoice.status_recebimento IN ('pendente', 'manifestada')
       AND existing_invoice.status_sefaz IS DISTINCT FROM 'cancelada'
       AND existing_invoice.receipt_id IS NULL;
  END IF;

  RETURN COALESCE(v_persisted, false);
END;
$function$;

COMMIT;
