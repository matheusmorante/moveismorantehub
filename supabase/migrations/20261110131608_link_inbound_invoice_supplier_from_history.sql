BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

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
  v_emitter_tax_id text;
  v_formatted_emitter_tax_id text;
  v_emitter_tax_id_candidates text[];
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

  -- Reutiliza o vínculo mais recente de uma NF anterior do mesmo emitente.
  -- Os candidatos cobrem documento sem máscara, CNPJ/CPF formatado e o valor bruto.
  IF v_invoice.supplier_id IS NULL THEN
    v_emitter_tax_id := pg_catalog.upper(
      pg_catalog.regexp_replace(
        COALESCE(v_invoice.emitente_cnpj, ''),
        '[^A-Za-z0-9]',
        '',
        'g'
      )
    );
    v_formatted_emitter_tax_id := NULL;

    IF v_emitter_tax_id ~ '^[A-Z0-9]{12}[0-9]{2}$' THEN
      v_formatted_emitter_tax_id :=
        pg_catalog.substr(v_emitter_tax_id, 1, 2) || '.' ||
        pg_catalog.substr(v_emitter_tax_id, 3, 3) || '.' ||
        pg_catalog.substr(v_emitter_tax_id, 6, 3) || '/' ||
        pg_catalog.substr(v_emitter_tax_id, 9, 4) || '-' ||
        pg_catalog.substr(v_emitter_tax_id, 13, 2);
    ELSIF v_emitter_tax_id ~ '^[0-9]{11}$' THEN
      v_formatted_emitter_tax_id :=
        pg_catalog.substr(v_emitter_tax_id, 1, 3) || '.' ||
        pg_catalog.substr(v_emitter_tax_id, 4, 3) || '.' ||
        pg_catalog.substr(v_emitter_tax_id, 7, 3) || '-' ||
        pg_catalog.substr(v_emitter_tax_id, 10, 2);
    END IF;

    v_emitter_tax_id_candidates := ARRAY[
      v_invoice.emitente_cnpj::text,
      v_emitter_tax_id,
      v_formatted_emitter_tax_id
    ];

    SELECT previous_invoice.supplier_id
      INTO v_invoice.supplier_id
      FROM public.inbound_invoices AS previous_invoice
     WHERE previous_invoice.supplier_id IS NOT NULL
       AND previous_invoice.emitente_cnpj = ANY(v_emitter_tax_id_candidates)
       AND previous_invoice.data_emissao <= v_invoice.data_emissao
       AND previous_invoice.chave_acesso IS DISTINCT FROM v_invoice.chave_acesso
     ORDER BY previous_invoice.data_emissao DESC,
              previous_invoice.updated_at DESC,
              previous_invoice.chave_acesso DESC
     LIMIT 1;
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
       AND existing_invoice.supplier_id IS NULL;
  END IF;

  RETURN COALESCE(v_persisted, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.persist_sefaz_inbound_invoice(jsonb, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_sefaz_inbound_invoice(jsonb, boolean)
  TO service_role;

COMMIT;
