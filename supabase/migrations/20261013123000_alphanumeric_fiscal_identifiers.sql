-- Target: MoranteHub hkoxhourxwlddgsfdgws, primary branch, public.
-- Lifecycle: BLOCKED pending authorized remote application and catalog/behavior validation.
-- NT Conjunta 2025.001 / NT 2026.004 v1.01: CNPJ ASCII uppercase, numeric DVs.
-- Expansion only: no business-row backfill, sequence reset, new permissions or SEFAZ calls.
-- Exact live definitions inspected on 2026-10-13; abort on drift before changing anything.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $guard$
BEGIN
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.apply_nfe_snapshot_recipient_tax_id(jsonb,uuid,text)'::regprocedure)) <> '2815b6261d5afd94c45b2cd7d391ca51' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: apply_nfe_snapshot_recipient_tax_id';
  END IF;
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.is_nfe_hml_number_conflict(text,text)'::regprocedure)) <> '83973f54e5b60f17ef26760594985180' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: is_nfe_hml_number_conflict';
  END IF;
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.prepare_nfe_operation_draft(text,uuid,text,smallint,text,uuid)'::regprocedure)) <> '297ca988481986b0e6045cc4958c079d' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: prepare_nfe_operation_draft';
  END IF;
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.reserve_nfe_outbound_emission(text,character varying,integer,uuid,character varying,text,integer,character varying)'::regprocedure)) <> '2a2d402936d01237a27b89e84f4e888d' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: reserve_nfe_outbound_emission';
  END IF;
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.persist_authorized_nfe_operation_draft(uuid,uuid,integer,text,character varying,text,text,text,timestamp with time zone,text,text,jsonb)'::regprocedure)) <> 'ba330683dbe84d03aa2f8087e090e79c' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: persist_authorized_nfe_operation_draft';
  END IF;
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.peek_nfe_outbound_number(text,text,integer,text,integer)'::regprocedure)) <> '2788a7a6c3a64d09bbf604aad301d2a5' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: peek_nfe_outbound_number';
  END IF;
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.prepare_nfe_outbound_attempt(jsonb,text,text,jsonb,uuid,uuid,integer)'::regprocedure)) <> '02e5a87ca7ebd88b4a8d97aa3acf33c8' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: prepare_nfe_outbound_attempt';
  END IF;
  IF pg_catalog.md5(pg_catalog.pg_get_functiondef('public.reserve_hml_nfe_outbound(text,uuid,character varying,text,integer,character varying,jsonb,uuid)'::regprocedure)) <> 'abab2b3327fc16d16a6596506b272710' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: reserve_hml_nfe_outbound';
  END IF;
  IF (SELECT pg_catalog.md5(pg_catalog.pg_get_constraintdef(oid)) FROM pg_catalog.pg_constraint WHERE conrelid='public.nfe_operation_drafts'::regclass AND conname='nfe_operation_drafts_original_access_key_check') IS DISTINCT FROM 'b11000cd7d7e753d85a5c0d424cca45b' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: nfe_operation_drafts_original_access_key_check';
  END IF;
  IF (SELECT pg_catalog.md5(pg_catalog.pg_get_constraintdef(oid)) FROM pg_catalog.pg_constraint WHERE conrelid='public.nfe_establishment_sequences'::regclass AND conname='nfe_establishment_sequences_issuer_cnpj_check') IS DISTINCT FROM '9f0bd4955a16859353c60ded76fc188d' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: nfe_establishment_sequences_issuer_cnpj_check';
  END IF;
  IF (SELECT pg_catalog.md5(pg_catalog.pg_get_constraintdef(oid)) FROM pg_catalog.pg_constraint WHERE conrelid='public.nfe_legacy_sequence_scope'::regclass AND conname='nfe_legacy_sequence_scope_issuer_cnpj_check') IS DISTINCT FROM '9f0bd4955a16859353c60ded76fc188d' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: nfe_legacy_sequence_scope_issuer_cnpj_check';
  END IF;
  IF (SELECT pg_catalog.md5(pg_catalog.pg_get_constraintdef(oid)) FROM pg_catalog.pg_constraint WHERE conrelid='public.nfe_outbound_attempts'::regclass AND conname='nfe_outbound_attempts_issuer_cnpj_check') IS DISTINCT FROM '9f0bd4955a16859353c60ded76fc188d' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: nfe_outbound_attempts_issuer_cnpj_check';
  END IF;
  IF (SELECT pg_catalog.md5(pg_catalog.pg_get_constraintdef(oid)) FROM pg_catalog.pg_constraint WHERE conrelid='public.nfe_outbound_attempts'::regclass AND conname='nfe_outbound_attempts_access_key_check') IS DISTINCT FROM 'b060d0fdd811bf187c19fe41c5e38924' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: nfe_outbound_attempts_access_key_check';
  END IF;
  IF pg_catalog.md5(pg_catalog.pg_get_indexdef('public.uq_nfe_snapshot_establishment_sequence'::regclass)) <> '69f93db2f6b21e759fb48bf93a13619a' THEN
    RAISE EXCEPTION 'CNPJ_ALPHA_SCHEMA_DRIFT: uq_nfe_snapshot_establishment_sequence';
  END IF;
END;
$guard$;

ALTER TABLE public.nfe_establishment_sequences
  DROP CONSTRAINT nfe_establishment_sequences_issuer_cnpj_check,
  ADD CONSTRAINT nfe_establishment_sequences_issuer_cnpj_check CHECK (issuer_cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$');
ALTER TABLE public.nfe_legacy_sequence_scope
  DROP CONSTRAINT nfe_legacy_sequence_scope_issuer_cnpj_check,
  ADD CONSTRAINT nfe_legacy_sequence_scope_issuer_cnpj_check CHECK (issuer_cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$');
ALTER TABLE public.nfe_outbound_attempts
  DROP CONSTRAINT nfe_outbound_attempts_issuer_cnpj_check,
  ADD CONSTRAINT nfe_outbound_attempts_issuer_cnpj_check CHECK (issuer_cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$');
ALTER TABLE public.nfe_outbound_attempts
  DROP CONSTRAINT nfe_outbound_attempts_access_key_check,
  ADD CONSTRAINT nfe_outbound_attempts_access_key_check CHECK (access_key ~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$');
ALTER TABLE public.nfe_operation_drafts
  DROP CONSTRAINT nfe_operation_drafts_original_access_key_check,
  ADD CONSTRAINT nfe_operation_drafts_original_access_key_check CHECK (original_access_key ~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$');

-- Keep establishment identity in the unique sequence key; preserve legacy numeric tuples.
DROP INDEX public.uq_nfe_snapshot_establishment_sequence;
CREATE UNIQUE INDEX uq_nfe_snapshot_establishment_sequence
  ON public.nfe_fiscal_snapshots (
    COALESCE(issuer_cnpj, regexp_replace(upper(snapshot_data#>>'{issuerProfile,companyCnpj}'), '[./[:space:]-]', '', 'g')),
    requested_model, (series::integer), environment, reserved_number
  );

-- CREATE OR REPLACE preserves owners and ACLs. Function security/search_path are unchanged.
CREATE OR REPLACE FUNCTION public.apply_nfe_snapshot_recipient_tax_id(p_reservation jsonb, p_emission_request_id uuid, p_recipient_tax_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_snapshot public.nfe_fiscal_snapshots%ROWTYPE;
  v_tax_id text;
  v_result jsonb := p_reservation;
BEGIN
  v_tax_id := pg_catalog.regexp_replace(pg_catalog.upper(COALESCE(p_recipient_tax_id, '')), '[./[:space:]-]', '', 'g');
  IF v_tax_id = '' OR v_tax_id !~ '^([0-9]{11}|[A-Z0-9]{12}[0-9]{2})$' THEN
    RAISE EXCEPTION 'NFE_RECIPIENT_TAX_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nfe_snapshot:' || p_emission_request_id::text, 0));
  SELECT * INTO v_snapshot FROM public.nfe_fiscal_snapshots
    WHERE emission_request_id = p_emission_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NFE_SNAPSHOT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_snapshot.snapshot_data #>> '{emissionRequest,recipientTaxId}' IS NOT NULL THEN
    IF v_snapshot.snapshot_data #>> '{emissionRequest,recipientTaxId}' <> v_tax_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_set(v_result, '{snapshotHash}',
      pg_catalog.to_jsonb(v_snapshot.snapshot_sha256), true);
  END IF;

  v_snapshot.snapshot_data := pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(v_snapshot.snapshot_data,
      '{fiscalInputs,customer,cpfCnpj}', pg_catalog.to_jsonb(v_tax_id), true),
    '{emissionRequest,recipientTaxId}', pg_catalog.to_jsonb(v_tax_id), true);
  v_snapshot.snapshot_sha256 := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_snapshot.snapshot_data::text, 'UTF8'), 'sha256'),
    'hex');
  UPDATE public.nfe_fiscal_snapshots
    SET snapshot_data = v_snapshot.snapshot_data,
        snapshot_sha256 = v_snapshot.snapshot_sha256
    WHERE id = v_snapshot.id;

  RETURN pg_catalog.jsonb_set(v_result, '{snapshotHash}',
    pg_catalog.to_jsonb(v_snapshot.snapshot_sha256), true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_nfe_hml_number_conflict(p_response_xml text, p_original_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
DECLARE v_status text; v_reason text; v_other_key text;
BEGIN
  IF COALESCE(p_original_key,'') !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$' OR COALESCE(p_response_xml,'')='' OR
     NOT pg_catalog.xml_is_well_formed_document(p_response_xml) THEN RETURN false; END IF;
  v_status := (pg_catalog.xpath(
    'string((//*[local-name()="retEnviNFe"]/*[local-name()="cStat"] | //*[local-name()="retEnviNFe"]/*[local-name()="protNFe"]/*[local-name()="infProt"]/*[local-name()="cStat"])[last()])',
    p_response_xml::xml))[1]::text;
  IF v_status IS DISTINCT FROM '539' THEN RETURN false; END IF;
  v_reason := (pg_catalog.xpath(
    'string((//*[local-name()="retEnviNFe"]/*[local-name()="xMotivo"] | //*[local-name()="retEnviNFe"]/*[local-name()="protNFe"]/*[local-name()="infProt"]/*[local-name()="xMotivo"])[last()])',
    p_response_xml::xml))[1]::text;
  v_other_key := (pg_catalog.regexp_match(v_reason,
    '\[chNFe:[[:space:]]*([0-9]{6}[A-Z0-9]{12}[0-9]{26})\]'))[1];
  RETURN COALESCE(v_other_key IS NOT NULL AND v_other_key<>p_original_key AND
    pg_catalog.substr(v_other_key,1,2)=pg_catalog.substr(p_original_key,1,2) AND
    pg_catalog.substr(v_other_key,7,28)=pg_catalog.substr(p_original_key,7,28),false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.prepare_nfe_operation_draft(p_kind text, p_original_document_id uuid, p_return_order_id text, p_environment smallint, p_reason text, p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_source public.nfe_documents%ROWTYPE;
  v_sale public.orders%ROWTYPE;
  v_return public.orders%ROWTYPE;
  v_existing_id uuid;
  v_draft_id uuid;
  v_source_line record;
  v_quantity numeric;
  v_item_number integer := 0;
  v_delivery_status text;
BEGIN
  IF p_kind NOT IN ('estorno', 'return') OR p_environment NOT IN (1, 2) THEN
    RAISE EXCEPTION 'Tipo ou ambiente fiscal inválido';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_original_document_id::text));
  SELECT * INTO v_source FROM public.nfe_documents
   WHERE id = p_original_document_id FOR UPDATE;
  IF NOT FOUND OR v_source.document_type <> 'outbound'
     OR v_source.ambiente <> p_environment
     OR v_source.status <> (CASE WHEN p_environment = 1 THEN 'autorizada' ELSE 'homologada' END)
     OR NOT (
       (p_kind = 'estorno' AND v_source.modelo IN ('55', '65'))
       OR (p_kind = 'return' AND v_source.modelo = '55')
     )
     OR COALESCE(v_source.numero_protocolo, '') !~ '^[0-9]{15}$'
     OR COALESCE(v_source.chave_acesso, '') !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
     OR substring(COALESCE(v_source.chave_acesso, '') FROM 21 FOR 2) <> v_source.modelo THEN
    RAISE EXCEPTION 'Documento fiscal original não autorizado no ambiente selecionado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.nfe_document_items WHERE document_id = v_source.id) THEN
    RAISE EXCEPTION 'Documento fiscal original sem linhas conferidas; reconciliação necessária';
  END IF;
  SELECT * INTO v_sale FROM public.orders WHERE id = v_source.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda original não encontrada'; END IF;

  SELECT id INTO v_existing_id FROM public.nfe_operation_drafts
   WHERE operation_kind = p_kind AND original_document_id = p_original_document_id
     AND environment = p_environment
     AND return_order_id IS NOT DISTINCT FROM p_return_order_id
     AND status <> 'rejected'
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN v_existing_id; END IF;

  IF p_kind = 'estorno' THEN
    IF p_return_order_id IS NOT NULL OR length(btrim(COALESCE(p_reason, ''))) < 15 THEN
      RAISE EXCEPTION 'Estorno exige justificativa e não pode apontar uma devolução';
    END IF;
    IF lower(btrim(COALESCE(v_sale.status, ''))) NOT IN ('cancelled', 'cancelado')

 AND NOT EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r

   WHERE r.original_document_id=v_source.id AND r.order_id=v_sale.id AND r.environment=p_environment

   AND r.reversal_kind='estorno' AND r.status='awaiting_reversal' AND v_sale.status='scheduled'

   AND NOT public.order_has_fiscal_circulation(to_jsonb(v_sale))

   AND NOT public.order_has_delivery_in_progress(to_jsonb(v_sale))) THEN
      RAISE EXCEPTION 'Venda comercial precisa estar cancelada antes de preparar estorno';
    END IF;
    v_delivery_status := lower(btrim(COALESCE(
      NULLIF(v_sale.delivery_status, ''),
      NULLIF(v_sale.order_data ->> 'deliveryStatus', ''),
      NULLIF(v_sale.order_data #>> '{shipping,deliveryStatus}', ''),
      ''
    )));
    IF lower(btrim(COALESCE(v_sale.status, ''))) IN (
         'fulfilled', 'atendido', 'completed', 'delivered', 'entregue', 'retirado', 'collected'
       )
       OR v_delivery_status IN (
         'in_transit', 'in-transit', 'delivered', 'completed', 'finished',
         'out_for_delivery', 'out-for-delivery', 'em_rota', 'em rota', 'em_entrega', 'em entrega',
         'collected', 'em_transito', 'entregue', 'concluido', 'coletado', 'retirado',
         'returned', 'returned_to_store', 'returning', 'refused', 'recusado', 'devolvido'
       )
       OR v_sale.delivery_started_at IS NOT NULL
       OR v_sale.delivery_arrived_at IS NOT NULL
       OR v_sale.delivery_finished_at IS NOT NULL
       OR COALESCE(v_sale.order_data #>> '{shipping,deliveryStartedAt}', '') <> ''
       OR COALESCE(v_sale.order_data #>> '{shipping,deliveryArrivedAt}', '') <> ''
       OR COALESCE(v_sale.order_data #>> '{shipping,deliveryFinishedAt}', '') <> ''
       OR COALESCE(v_sale.order_data #>> '{shipping,unattendedAt}', '') <> ''
       OR COALESCE(v_sale.order_data #>> '{shipping,pickupConfirmedAt}', '') <> ''
       OR COALESCE(v_sale.order_data ->> 'deliveryFinishedAt', '') <> ''
       OR COALESCE(v_sale.order_data ->> 'pickupConfirmedAt', '') <> '' THEN
      RAISE EXCEPTION 'Venda com evidência de circulação não é elegível a estorno; verifique devolução ou retorno';
    END IF;
  ELSE
    IF p_return_order_id IS NULL THEN RAISE EXCEPTION 'Devolução comercial obrigatória'; END IF;
    SELECT * INTO v_return FROM public.orders WHERE id = p_return_order_id FOR UPDATE;
    IF NOT FOUND OR v_return.order_type <> 'return' OR v_return.status <> 'fulfilled'
       OR (v_return.linked_order_id IS DISTINCT FROM v_source.order_id::text
           AND v_return.order_data->>'linkedOrderId' IS DISTINCT FROM v_source.order_id::text) THEN
      RAISE EXCEPTION 'A devolução precisa estar atendida e vinculada à venda faturada';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.nfe_return_item_allocations
       WHERE return_order_id = p_return_order_id AND original_document_id = p_original_document_id
         AND fiscal_return_document_id IS NULL
    ) THEN RAISE EXCEPTION 'Devolução sem itens fiscais ainda disponíveis para vincular à NF-e'; END IF;
  END IF;

  INSERT INTO public.nfe_operation_drafts(
    operation_kind, finalidade, original_document_id, original_access_key,
    return_order_id, environment, reason, created_by
  ) VALUES (
    p_kind, CASE WHEN p_kind = 'estorno' THEN 3 ELSE 4 END,
    v_source.id, v_source.chave_acesso, p_return_order_id, p_environment,
    NULLIF(btrim(p_reason), ''), p_user_id
  ) RETURNING id INTO v_draft_id;

  FOR v_source_line IN SELECT * FROM public.nfe_document_items
                         WHERE document_id = v_source.id ORDER BY item_number LOOP
    IF p_kind = 'estorno' THEN
      v_quantity := v_source_line.billed_quantity;
    ELSE
      SELECT COALESCE(sum(quantity), 0) INTO v_quantity
        FROM public.nfe_return_item_allocations
       WHERE return_order_id = p_return_order_id
         AND original_document_id = v_source.id
         AND original_item_number = v_source_line.item_number
         AND fiscal_return_document_id IS NULL;
    END IF;
    IF v_quantity = 0 THEN CONTINUE; END IF;
    IF v_quantity > v_source_line.billed_quantity THEN
      RAISE EXCEPTION 'Quantidade da devolução acima da linha faturada';
    END IF;
    v_item_number := v_item_number + 1;
    INSERT INTO public.nfe_operation_draft_lines(
      draft_id, original_document_item_id, fiscal_item_number, quantity,
      gross_value, discount_value
    ) VALUES (
      v_draft_id, v_source_line.id, v_item_number, v_quantity,
      round(v_source_line.gross_value * v_quantity / v_source_line.billed_quantity, 2),
      round(v_source_line.discount_value * v_quantity / v_source_line.billed_quantity, 2)
    );
  END LOOP;
  IF v_item_number = 0 THEN RAISE EXCEPTION 'Rascunho fiscal sem itens devolvidos'; END IF;

  IF p_kind = 'return' THEN
    INSERT INTO public.nfe_operation_draft_allocations(draft_line_id, allocation_id)
    SELECT line.id, allocation.id
      FROM public.nfe_operation_draft_lines AS line
      JOIN public.nfe_document_items AS source_line ON source_line.id = line.original_document_item_id
      JOIN public.nfe_return_item_allocations AS allocation
        ON allocation.original_document_id = source_line.document_id
       AND allocation.original_item_number = source_line.item_number
     WHERE line.draft_id = v_draft_id AND allocation.return_order_id = p_return_order_id
       AND allocation.fiscal_return_document_id IS NULL;
  END IF;
  RETURN v_draft_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reserve_nfe_outbound_emission(p_order_id text, p_modelo character varying, p_ambiente integer, p_emission_request_id uuid, p_chave_acesso character varying, p_xml_nfe text, p_numero_nfe integer, p_serie character varying)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_existing_id uuid;
    v_existing_status varchar;
    v_new_id uuid;
BEGIN
    IF p_order_id IS NULL
       OR p_modelo IS NULL OR p_modelo NOT IN ('55', '65')
       OR p_ambiente IS NULL OR p_ambiente NOT IN (1, 2)
       OR p_emission_request_id IS NULL
       OR COALESCE(p_chave_acesso, '') !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
       OR COALESCE(p_xml_nfe, '') = ''
       OR p_numero_nfe IS NULL OR p_numero_nfe NOT BETWEEN 1 AND 999999999
       OR COALESCE(p_serie, '') !~ '^[0-9]{1,3}$'
       OR substring(p_chave_acesso FROM 21 FOR 2) <> p_modelo
       OR substring(p_chave_acesso FROM 23 FOR 3) <> lpad(p_serie, 3, '0')
       OR substring(p_chave_acesso FROM 26 FOR 9) <> lpad(p_numero_nfe::text, 9, '0')
       OR position(('Id="NFe' || p_chave_acesso || '"') IN p_xml_nfe) = 0 THEN
        RAISE EXCEPTION 'Envelope inválido para reserva de emissão fiscal.';
    END IF;

    -- Unique active attempts are scoped by order, model, and environment.
    PERFORM pg_advisory_xact_lock(hashtextextended(
        'nfe_emit:' || p_order_id::text || ':' || p_modelo || ':' || p_ambiente::text,
        0
    ));

    IF EXISTS (
        SELECT 1 FROM public.nfe_documents
         WHERE emission_request_id = p_emission_request_id
    ) THEN
        RAISE EXCEPTION 'DUPLICATE_IDEMPOTENCY_KEY';
    END IF;

    SELECT id, status INTO v_existing_id, v_existing_status
      FROM public.nfe_documents
     WHERE order_id = p_order_id
       AND modelo = p_modelo
       AND ambiente = p_ambiente
       AND document_type = 'outbound'
       AND status IN ('pendente', 'processando')
     LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'ALREADY_ACTIVE:%:%', v_existing_id, v_existing_status;
    END IF;

    INSERT INTO public.nfe_documents (
        order_id, numero_nfe, serie, chave_acesso,
        modelo, ambiente, status, document_type, finalidade,
        emission_request_id, motivo_status, xml_nfe, created_at, updated_at
    ) VALUES (
        p_order_id, p_numero_nfe, p_serie, p_chave_acesso,
        p_modelo, p_ambiente, 'processando', 'outbound', 1,
        p_emission_request_id, 'Transmissão em andamento', p_xml_nfe, now(), now()
    ) RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.persist_authorized_nfe_operation_draft(p_draft_id uuid, p_document_id uuid, p_number integer, p_series text, p_access_key character varying, p_signed_xml text, p_sefaz_response_xml text, p_protocol_number text, p_protocol_date timestamp with time zone, p_status text, p_status_reason text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_draft public.nfe_operation_drafts%ROWTYPE;
  v_source public.nfe_documents%ROWTYPE;
  v_document_id uuid;
  v_expected_items integer;
  v_inserted_items integer;
  v_item jsonb;
  v_line public.nfe_operation_draft_lines%ROWTYPE;
  v_linked_allocations numeric;
  v_invoice_total numeric;
BEGIN
  IF p_status NOT IN ('autorizada', 'homologada')
     OR p_number <= 0 OR NULLIF(btrim(p_series), '') IS NULL
     OR p_access_key !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
     OR substring(p_access_key FROM 21 FOR 2) <> '55'
     OR substring(p_access_key FROM 23 FOR 3) <> lpad(p_series, 3, '0')
     OR substring(p_access_key FROM 26 FOR 9) <> lpad(p_number::text, 9, '0')
     OR p_protocol_number !~ '^[0-9]{15}$'
     OR NULLIF(p_signed_xml, '') IS NULL
     OR NULLIF(p_sefaz_response_xml, '') IS NULL
     OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Retorno de autorização fiscal incompleto';
  END IF;

  SELECT * INTO v_draft FROM public.nfe_operation_drafts
   WHERE id = p_draft_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rascunho fiscal não encontrado'; END IF;

  -- A retry after an RPC/network timeout returns the already persisted result,
  -- but only when it describes the exact same authorized document.
  IF v_draft.document_id IS NOT NULL THEN
    IF v_draft.document_id <> p_document_id OR v_draft.access_key <> p_access_key
       OR v_draft.signed_xml IS DISTINCT FROM p_signed_xml THEN
      RAISE EXCEPTION 'Rascunho já vinculado a outro documento fiscal';
    END IF;
    RETURN v_draft.document_id;
  END IF;
  IF v_draft.status NOT IN ('transmitting', 'unknown')
     OR (p_status = 'autorizada' AND v_draft.environment <> 1)
     OR (p_status = 'homologada' AND v_draft.environment <> 2) THEN
    RAISE EXCEPTION 'Rascunho não está em estado compatível com autorização';
  END IF;

  SELECT * INTO v_source FROM public.nfe_documents
   WHERE id = v_draft.original_document_id FOR UPDATE;
  IF NOT FOUND OR v_source.status <> p_status
     OR v_source.ambiente <> v_draft.environment
     OR v_source.document_type <> 'outbound'
     OR v_source.chave_acesso <> v_draft.original_access_key
     OR p_access_key = v_draft.original_access_key THEN
    RAISE EXCEPTION 'Documento fiscal original diverge do ambiente autorizado';
  END IF;

  SELECT count(*) INTO v_expected_items FROM public.nfe_operation_draft_lines
   WHERE draft_id = v_draft.id;
  IF v_expected_items <> jsonb_array_length(p_items) THEN
    RAISE EXCEPTION 'Itens fiscais recebidos diferem do rascunho revisado';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_line FROM public.nfe_operation_draft_lines
     WHERE id = NULLIF(v_item->>'draft_line_id', '')::uuid
       AND draft_id = v_draft.id FOR UPDATE;
    IF NOT FOUND OR v_line.reviewed_cfop IS NULL
       OR v_line.reviewed_product_xml IS DISTINCT FROM v_item->>'product_xml'
       OR v_line.reviewed_taxes_xml IS DISTINCT FROM v_item->>'taxes_xml'
       OR (v_item->>'quantity')::numeric <> v_line.quantity
       OR (v_item->>'gross_value')::numeric <> v_line.gross_value
       OR COALESCE((v_item->>'discount_value')::numeric, 0) <> v_line.discount_value
       OR (v_item->>'item_number')::integer <> v_line.fiscal_item_number
       OR NOT EXISTS (
         SELECT 1 FROM public.nfe_document_items source_line
          WHERE source_line.id = v_line.original_document_item_id
            AND source_line.product_code = v_item->>'product_code'
            AND source_line.description = v_item->>'description'
       ) THEN
      RAISE EXCEPTION 'Item transmitido não corresponde à revisão fiscal persistida';
    END IF;
    IF v_draft.operation_kind = 'return' THEN
      SELECT COALESCE(sum(allocation.quantity), 0) INTO v_linked_allocations
        FROM public.nfe_operation_draft_allocations link
        JOIN public.nfe_return_item_allocations allocation ON allocation.id = link.allocation_id
       WHERE link.draft_line_id = v_line.id
         AND (allocation.fiscal_return_document_id IS NULL OR allocation.fiscal_return_document_id = p_document_id);
      IF v_linked_allocations <> v_line.quantity THEN
        RAISE EXCEPTION 'Quantidade transmitida não corresponde às alocações da devolução';
      END IF;
    END IF;
  END LOOP;

  v_invoice_total := substring(p_signed_xml FROM '<vNF>([0-9]+[.][0-9]{2})</vNF>')::numeric;
  IF v_invoice_total IS NULL OR v_invoice_total < 0 THEN
    RAISE EXCEPTION 'Total vNF do XML autorizado ausente ou inválido';
  END IF;

  INSERT INTO public.nfe_documents(
    id, order_id, numero_nfe, serie, chave_acesso, modelo, ambiente, status,
    motivo_status, valor_total, xml_nfe, xml_protocolo, numero_protocolo, document_type,
    finalidade, original_document_id, related_return_order_id, fiscal_draft,
    created_at, updated_at
  ) VALUES (
    p_document_id, v_source.order_id, p_number, p_series, p_access_key, '55',
    v_draft.environment, p_status, p_status_reason, v_invoice_total, p_signed_xml,
    p_sefaz_response_xml, p_protocol_number,
    CASE WHEN v_draft.operation_kind = 'estorno' THEN 'estorno' ELSE 'return' END,
    v_draft.finalidade, v_source.id, v_draft.return_order_id,
    jsonb_build_object('draft_id', v_draft.id, 'reason', v_draft.reason,
      'nature_of_operation', v_draft.nature_of_operation,
      'review_data', v_draft.review_data),
    now(), now()
  );

  INSERT INTO public.nfe_document_items(
    document_id, item_number, product_code, description, billed_quantity,
    unit_value, gross_value, discount_value, product_xml, taxes_xml
  )
  SELECT p_document_id, (item->>'item_number')::integer,
    item->>'product_code', item->>'description', (item->>'quantity')::numeric,
    (item->>'unit_value')::numeric, (item->>'gross_value')::numeric,
    COALESCE((item->>'discount_value')::numeric, 0),
    item->>'product_xml', item->>'taxes_xml'
  FROM jsonb_array_elements(p_items) AS items(item);
  GET DIAGNOSTICS v_inserted_items = ROW_COUNT;
  IF v_inserted_items <> v_expected_items THEN
    RAISE EXCEPTION 'Snapshot dos itens fiscais incompleto';
  END IF;

  IF v_draft.operation_kind = 'return' THEN
    UPDATE public.nfe_return_item_allocations allocation
       SET fiscal_return_document_id = p_document_id
      FROM public.nfe_operation_draft_allocations link
      JOIN public.nfe_operation_draft_lines line ON line.id = link.draft_line_id
     WHERE link.allocation_id = allocation.id AND line.draft_id = v_draft.id
       AND (allocation.fiscal_return_document_id IS NULL OR allocation.fiscal_return_document_id = p_document_id);
  END IF;

  UPDATE public.nfe_operation_drafts SET
    status = 'authorized', document_id = p_document_id, access_key = p_access_key,
    signed_xml = p_signed_xml, sefaz_response_xml = p_sefaz_response_xml,
    protocol_number = p_protocol_number, authorized_at = COALESCE(p_protocol_date, now()),
    updated_at = now()
   WHERE id = v_draft.id;
  RETURN p_document_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.peek_nfe_outbound_number(p_issuer_cnpj text, p_model text, p_environment integer, p_series text, p_minimum integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_number bigint; v_legacy integer := 0; v_document integer; v_snapshot integer;
BEGIN
 IF p_issuer_cnpj IS NULL OR p_issuer_cnpj !~ '^[A-Z0-9]{12}[0-9]{2}$' OR p_model IS NULL OR p_model NOT IN ('55','65') OR
    p_environment IS NULL OR p_environment NOT IN (1,2) OR p_series IS NULL OR p_series !~ '^(0|[1-9][0-9]{0,2})$' OR p_series::integer NOT BETWEEN 0 AND 889 OR
    p_minimum IS NULL OR p_minimum NOT BETWEEN 1 AND 999999999 THEN
  RAISE EXCEPTION 'INVALID_FISCAL_SEQUENCE' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM public.nfe_legacy_sequence_scope WHERE issuer_cnpj=p_issuer_cnpj) THEN
  SELECT max(ultimo_numero) INTO v_legacy FROM public.nfe_sequences
   WHERE modelo=p_model AND ambiente=p_environment AND serie::integer=p_series::integer;
 END IF;
 SELECT numero_nfe INTO v_document FROM public.nfe_documents
  WHERE modelo=p_model AND ambiente=p_environment AND serie::integer=p_series::integer AND
   (issuer_cnpj=p_issuer_cnpj OR issuer_cnpj IS NULL AND
    substring(xml_nfe FROM '<emit>.*?<CNPJ>([A-Z0-9]{12}[0-9]{2})</CNPJ>')=p_issuer_cnpj)
  ORDER BY numero_nfe DESC LIMIT 1;
 SELECT reserved_number INTO v_snapshot FROM public.nfe_fiscal_snapshots
  WHERE requested_model=p_model AND environment=p_environment AND series::integer=p_series::integer AND
   coalesce(issuer_cnpj,regexp_replace(upper(snapshot_data#>>'{issuerProfile,companyCnpj}'),'[./[:space:]-]','','g'))=p_issuer_cnpj
  ORDER BY reserved_number DESC LIMIT 1;
 SELECT greatest(p_minimum::bigint,coalesce(last_number,0)::bigint+1,
   coalesce(v_legacy,0)::bigint+1,coalesce(v_document,0)::bigint+1,coalesce(v_snapshot,0)::bigint+1)
 INTO v_number FROM (SELECT 1) seed LEFT JOIN public.nfe_establishment_sequences n
  ON n.issuer_cnpj=p_issuer_cnpj AND n.model=p_model AND n.environment=p_environment AND n.series=p_series;
 IF v_number>999999999 THEN RAISE EXCEPTION 'FISCAL_SEQUENCE_EXHAUSTED' USING ERRCODE='23514'; END IF;
 RETURN v_number::integer;
END; $function$;

CREATE OR REPLACE FUNCTION public.prepare_nfe_outbound_attempt(p_snapshot jsonb, p_signed_xml text, p_access_key text, p_request_command jsonb, p_attempt_token uuid, p_actor_id uuid, p_minimum_number integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_request jsonb := p_snapshot->'emissionRequest'; v_inputs jsonb := p_snapshot->'fiscalInputs';
 v_order public.orders%ROWTYPE; v_app jsonb; v_profile jsonb; v_products jsonb; v_customer jsonb; v_contribution jsonb;
 v_prior public.nfe_outbound_attempts%ROWTYPE; v_request_id uuid; v_order_id text;
 v_issuer text; v_model text; v_env integer; v_series text; v_number integer;
 v_snapshot_id uuid; v_document_id uuid; v_hash text; v_xml_hash text; v_trace jsonb; v_fingerprint text;
 v_field record;
BEGIN
 v_request_id := (v_request->>'id')::uuid; v_order_id := p_snapshot#>>'{order,id}';
 v_issuer := regexp_replace(upper(p_snapshot#>>'{issuerProfile,companyCnpj}'),'[./[:space:]-]','','g');
 v_model := v_request->>'requestedModel'; v_env := (v_request->>'environment')::integer;
 v_series := v_request->>'series'; v_number := (v_request->>'number')::integer;
 IF p_attempt_token IS NULL OR v_request_id IS NULL OR coalesce(v_order_id,'')='' OR
    jsonb_typeof(p_request_command) IS DISTINCT FROM 'object' OR
    p_request_command->>'orderId' IS DISTINCT FROM v_order_id OR
    p_request_command->>'emissionRequestId' IS DISTINCT FROM v_request_id::text OR
    p_request_command->>'environment' IS DISTINCT FROM v_env::text OR
    p_access_key IS NULL OR p_access_key !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$' OR p_signed_xml IS NULL OR
    v_model IS NULL OR v_model NOT IN ('55','65') OR v_env IS NULL OR v_env NOT IN (1,2) OR
    v_issuer IS NULL OR v_issuer !~ '^[A-Z0-9]{12}[0-9]{2}$' OR v_series IS NULL OR v_number IS NULL OR
    p_snapshot->>'schemaVersion' IS DISTINCT FROM '1' OR
    (v_env=1 AND v_order_id LIKE 'TEST_AUT_%') THEN
  RAISE EXCEPTION 'INVALID_OUTBOUND_PREPARATION' USING ERRCODE='22023';
 END IF;
 FOR v_field IN SELECT key,value FROM jsonb_each(p_request_command) LOOP
  IF v_field.key IN ('orderId','environment','emissionRequestId','requestedNumber') THEN CONTINUE; END IF;
  IF v_field.key NOT IN ('itemCsosnOverrides','itemFiscalSelections','recipientTaxId','recipientIe','recipientIeIndicator',
     'finalConsumer','deliveryByIssuer','cardNotIntegrated','transporter','freightMode','hasTransport','transportResponsible','freightContractResponsible') OR
     v_request->v_field.key IS DISTINCT FROM v_field.value THEN
   RAISE EXCEPTION 'FISCAL_COMMAND_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
  END IF;
 END LOOP;
 IF p_request_command ? 'requestedNumber' AND (p_request_command->>'requestedNumber')::integer IS DISTINCT FROM v_number THEN
  RAISE EXCEPTION 'FISCAL_COMMAND_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
 END IF;
 v_fingerprint := encode(extensions.digest(convert_to(p_request_command::text,'UTF8'),'sha256'),'hex');
 PERFORM pg_advisory_xact_lock(hashtextextended('nfe_snapshot:'||v_request_id::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('nfe_emit:'||v_order_id||':retail:'||v_env::text,0));
 SELECT * INTO v_prior FROM public.nfe_outbound_attempts WHERE emission_request_id=v_request_id;
 IF FOUND THEN
  IF v_prior.request_command IS DISTINCT FROM p_request_command OR
     v_prior.order_id IS DISTINCT FROM v_order_id OR v_prior.environment IS DISTINCT FROM v_env OR
     v_prior.issuer_cnpj IS DISTINCT FROM v_issuer THEN
   RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='23505';
  END IF;
  RETURN jsonb_build_object('documentId',v_prior.document_id,'snapshotId',v_prior.snapshot_id,'created',false);
 END IF;
 IF EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots WHERE emission_request_id=v_request_id) OR
    EXISTS(SELECT 1 FROM public.nfe_documents WHERE emission_request_id=v_request_id) THEN
  RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='23505';
 END IF;
 IF EXISTS(SELECT 1 FROM public.nfe_documents WHERE order_id=v_order_id AND ambiente=v_env AND
   modelo IN ('55','65') AND document_type='outbound' AND status IN ('processando','pendente','autorizada','homologada')

   AND NOT public.is_order_edit_reversal_confirmed(id)) OR
    EXISTS(SELECT 1 FROM public.nfe_outbound_attempts WHERE order_id=v_order_id AND environment=v_env AND
      issuer_cnpj=v_issuer AND state<>'rejected'

   AND NOT public.is_order_edit_reversal_confirmed(document_id)) THEN
  RAISE EXCEPTION 'ALREADY_ACTIVE_FISCAL_ATTEMPT' USING ERRCODE='23505';
 END IF;
 SELECT * INTO v_order FROM public.orders WHERE id=v_order_id FOR SHARE;
 IF NOT FOUND OR v_order.order_type IS NULL OR v_order.order_type NOT IN ('sale','showroom') OR coalesce(v_order.deleted,false) OR
    lower(coalesce(v_order.status,'')) IN ('','draft','cancelled','cancelado') OR
    v_order.order_data->>'fiscalScenario'='HML_TECHNICAL_V1' THEN
  RAISE EXCEPTION 'ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL' USING ERRCODE='23514';
 END IF;
 IF p_snapshot#>'{order,data}' IS DISTINCT FROM v_order.order_data OR
    (p_snapshot#>>'{order,version}')::integer IS DISTINCT FROM v_order.version OR
    (p_snapshot#>>'{order,updatedAt}')::timestamptz IS DISTINCT FROM v_order.updated_at OR
    p_snapshot#>>'{order,type}' IS DISTINCT FROM v_order.order_type OR
    p_snapshot#>>'{order,status}' IS DISTINCT FROM v_order.status OR
    p_snapshot#>>'{order,deleted}' IS DISTINCT FROM 'false' THEN
  RAISE EXCEPTION 'FISCAL_SOURCE_CHANGED' USING ERRCODE='40001';
 END IF;
 SELECT data INTO v_app FROM public.settings WHERE id='app' FOR SHARE;
 SELECT jsonb_object_agg(k,v_app->k) FILTER(WHERE v_app->k IS NOT NULL AND v_app->k<>'null'::jsonb)
 INTO v_profile FROM unnest(ARRAY['companyName','companyAddress','companyCnpj','companyIE','companyIM','companyCRT',
  'companyLogradouro','companyNumero','companyBairro','companyCEP','companyCMun','companyXMun','companyUF','companyPhone','cscId']) k;
 IF v_profile IS DISTINCT FROM p_snapshot->'issuerProfile' OR
    v_profile->>'companyCRT' IS DISTINCT FROM '1' OR v_profile->>'companyUF' IS DISTINCT FROM 'PR' THEN
  RAISE EXCEPTION 'FISCAL_SOURCE_CHANGED' USING ERRCODE='40001';
 END IF;
 SELECT public.simples_normal_sale_contribution_decision(v_model) INTO v_contribution;
 SELECT coalesce(jsonb_object_agg(p.id,p.fiscal),'{}'::jsonb) INTO v_products FROM (
  SELECT id,fiscal FROM public.products WHERE id IN (
   SELECT (i->>'productId')::uuid FROM jsonb_array_elements(v_order.order_data->'items') i
   WHERE i->>'productId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') FOR SHARE) p;
 SELECT jsonb_build_object('id',id,'fullName',full_name,'cpfCnpj',cpf_cnpj,'address',address,
  'ie',rg_ie,'personType',person_type_pf_pj) INTO v_customer FROM public.people
  WHERE id=v_order.order_data#>>'{customerData,id}' AND NOT coalesce(deleted,false) FOR SHARE;
 IF v_customer IS NULL OR v_inputs IS DISTINCT FROM jsonb_build_object('products',v_products,'customer',v_customer,
    'contributionDecision',v_contribution,'fiscalDefaults',v_app->'fiscalDefaults') THEN
  RAISE EXCEPTION 'FISCAL_SOURCE_CHANGED' USING ERRCODE='40001';
 END IF;
 IF v_request#>>'{modelDecision,status}' IS DISTINCT FROM 'ready' OR
    v_request#>>'{modelDecision,model}' IS DISTINCT FROM v_model OR
    v_request#>>'{modelDecision,policyVersion}' IS DISTINCT FROM 'PR_RETAIL_2026_10' OR
    v_request->>'finalConsumer' IS DISTINCT FROM v_request#>>'{modelDecision,finalConsumer}' OR
    v_model='65' AND v_request->>'finalConsumer' IS DISTINCT FROM 'true' THEN
  RAISE EXCEPTION 'RETAIL_MODEL_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(v_request->'itemFiscalSelections') IS DISTINCT FROM 'object' OR
    (SELECT count(*) FROM jsonb_each(v_request->'itemFiscalSelections')) NOT BETWEEN 1 AND 990 OR
    (SELECT count(*) FROM jsonb_each(v_request->'itemFiscalSelections')) <>
     (SELECT count(*) FROM jsonb_array_elements(v_order.order_data->'items') i WHERE coalesce(i->>'itemType','product')<>'service') OR
    EXISTS(SELECT 1 FROM jsonb_each(v_request->'itemFiscalSelections') s WHERE
     s.key !~ '^[1-9][0-9]{0,2}$' OR NOT EXISTS(SELECT 1 FROM public.ncms n WHERE
      n.code=s.value->>'ncm' AND n.active AND (n.start_date IS NULL OR n.start_date<=current_date) AND
      (n.end_date IS NULL OR n.end_date>=current_date))) THEN
  RAISE EXCEPTION 'INVALID_ITEM_FISCAL_SELECTIONS' USING ERRCODE='23514';
 END IF;
 IF substring(p_access_key,7,14)<>v_issuer OR substring(p_access_key,21,2)<>v_model OR
    substring(p_access_key,23,3)<>lpad(v_series,3,'0') OR substring(p_access_key,26,9)<>lpad(v_number::text,9,'0') OR
    strpos(p_signed_xml,'Id="NFe'||p_access_key||'"')=0 OR
    strpos(p_signed_xml,'<tpAmb>'||v_env::text||'</tpAmb>')=0 OR
    strpos(p_signed_xml,'<tpAmb>'||(3-v_env)::text||'</tpAmb>')>0 OR
    strpos(p_signed_xml,'<mod>'||v_model||'</mod>')=0 OR strpos(p_signed_xml,'<Signature')=0 THEN
  RAISE EXCEPTION 'FISCAL_XML_IDENTITY_MISMATCH' USING ERRCODE='23514';
 END IF;
 IF p_snapshot->>'capturedAt' IS NULL OR (p_snapshot->>'capturedAt')::timestamptz NOT BETWEEN clock_timestamp()-interval '5 minutes' AND clock_timestamp()+interval '1 minute' THEN
  RAISE EXCEPTION 'FISCAL_SNAPSHOT_EXPIRED' USING ERRCODE='23514';
 END IF;
 v_trace := p_snapshot->'decisionTrace';
 IF jsonb_typeof(v_trace) IS DISTINCT FROM 'array' OR jsonb_array_length(v_trace)=0 OR
    EXISTS(SELECT 1 FROM jsonb_array_elements(v_trace) t WHERE t->>'ruleSetVersion' IS DISTINCT FROM 'NORMAL_SALE_V1') THEN
  RAISE EXCEPTION 'FISCAL_DECISION_TRACE_REQUIRED' USING ERRCODE='23514';
 END IF;
 PERFORM public.reserve_nfe_outbound_number(v_issuer,v_model,v_env,v_series,p_minimum_number,v_number);
 v_hash := encode(extensions.digest(convert_to((p_snapshot-'decisionTrace')::text,'UTF8'),'sha256'),'hex');
 v_xml_hash := encode(extensions.digest(convert_to(p_signed_xml,'UTF8'),'sha256'),'hex');
 INSERT INTO public.nfe_fiscal_snapshots(emission_request_id,order_id,order_version,order_updated_at,
  requested_model,environment,series,reserved_number,snapshot_data,snapshot_sha256,captured_at,issuer_cnpj)
 VALUES(v_request_id,v_order_id,v_order.version,v_order.updated_at,v_model,v_env,v_series,v_number,
  p_snapshot-'decisionTrace',v_hash,(p_snapshot->>'capturedAt')::timestamptz,v_issuer) RETURNING id INTO v_snapshot_id;
 INSERT INTO public.nfe_documents(order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,
  document_type,finalidade,emission_request_id,motivo_status,xml_nfe,fiscal_ruleset_version,fiscal_decision_trace,issuer_cnpj)
 VALUES(v_order_id,v_number,v_series,p_access_key,v_model,v_env,'processando','outbound',1,v_request_id,
  'Documento preparado; transmissão ainda não iniciada',p_signed_xml,'NORMAL_SALE_V1',v_trace,v_issuer)
 RETURNING id INTO v_document_id;
 INSERT INTO public.nfe_outbound_attempts(emission_request_id,order_id,document_id,snapshot_id,issuer_cnpj,
  model,environment,series,number,access_key,request_fingerprint,request_command,xml_sha256,state,actor_id,attempt_token,attempt_expires_at)
 VALUES(v_request_id,v_order_id,v_document_id,v_snapshot_id,v_issuer,v_model,v_env,v_series,v_number,p_access_key,
  v_fingerprint,p_request_command,v_xml_hash,'prepared',p_actor_id,p_attempt_token,clock_timestamp()+interval '2 minutes');
 RETURN jsonb_build_object('documentId',v_document_id,'snapshotId',v_snapshot_id,'snapshotHash',v_hash,'created',true);
END; $function$;

CREATE OR REPLACE FUNCTION public.reserve_hml_nfe_outbound(p_order_id text, p_emission_request_id uuid, p_access_key character varying, p_signed_xml text, p_number integer, p_series character varying, p_decision_trace jsonb, p_attempt_token uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_snapshot public.nfe_fiscal_snapshots%ROWTYPE;
  v_id uuid;
  v_version text;
BEGIN
  IF p_order_id IS NULL OR p_emission_request_id IS NULL OR p_attempt_token IS NULL OR
     COALESCE(p_access_key, '') !~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$' OR
     p_signed_xml IS NULL OR pg_catalog.strpos(p_signed_xml,'<tpAmb>2</tpAmb>')=0 OR
     pg_catalog.strpos(p_signed_xml,'<tpAmb>1</tpAmb>')>0 OR
     pg_catalog.strpos(p_signed_xml, 'Id="NFe' || p_access_key || '"') = 0 OR
     COALESCE(p_series, '') !~ '^[0-9]{1,3}$' OR
     p_number IS NULL OR p_number NOT BETWEEN 1 AND 999999999 OR
     p_decision_trace IS NULL OR
     pg_catalog.jsonb_typeof(p_decision_trace) <> 'array' OR
     pg_catalog.jsonb_array_length(p_decision_trace) = 0 THEN
    RAISE EXCEPTION 'INVALID_HML_RESERVATION' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nfe_emit:' || p_order_id || ':retail:2', 0)
  );
  SELECT * INTO v_snapshot FROM public.nfe_fiscal_snapshots
  WHERE emission_request_id = p_emission_request_id;
  IF NOT FOUND OR v_snapshot.order_id <> p_order_id OR
     v_snapshot.requested_model NOT IN ('55','65') OR v_snapshot.environment <> 2 OR
     v_snapshot.reserved_number <> p_number OR v_snapshot.series <> p_series OR
     pg_catalog.substr(p_access_key, 21, 2) <> v_snapshot.requested_model OR
     pg_catalog.substr(p_access_key, 23, 3) <> pg_catalog.lpad(p_series, 3, '0') OR
     pg_catalog.substr(p_access_key, 26, 9) <> pg_catalog.lpad(p_number::text, 9, '0') OR
     COALESCE(p_decision_trace->0->>'ruleSetVersion','') NOT IN ('HML_TECHNICAL_V1','HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') THEN
    RAISE EXCEPTION 'HML_SNAPSHOT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  v_version := p_decision_trace->0->>'ruleSetVersion';
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_decision_trace) t
    WHERE t->>'ruleSetVersion' IS DISTINCT FROM v_version) THEN
    RAISE EXCEPTION 'HML_RULESET_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF v_version='HML_TECHNICAL_V1' AND
    (COALESCE(v_snapshot.snapshot_data#>>'{order,data,fiscalScenario}','')<>'HML_TECHNICAL_V1' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,data,testRunId}','')<>p_order_id OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,status}','')<>'draft' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,deleted}','')<>'true' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,data,deleted}','')<>'true' OR
     jsonb_array_length(COALESCE(v_snapshot.snapshot_data#>'{order,data,payments}','[]'::jsonb))<>0 OR
     p_order_id !~ '^TEST_AUT_[0-9a-f-]{36}$') THEN
    RAISE EXCEPTION 'HML_SYNTHETIC_SNAPSHOT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF v_version IN ('HML_NORMAL_SALE_V1','HML_NORMAL_SALE_V2') AND
    (p_order_id ~ '^TEST_AUT_' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,type}','')<>'sale' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,deleted}','true')<>'false' OR
     COALESCE(v_snapshot.snapshot_data#>>'{order,status}','draft') IN ('draft','cancelled','cancelado') OR
     COALESCE(v_snapshot.snapshot_data#>>'{issuerProfile,companyCRT}','')<>'1' OR
     COALESCE(v_snapshot.snapshot_data#>>'{issuerProfile,companyUF}','')<>'PR' OR
     COALESCE(v_snapshot.snapshot_data#>'{emissionRequest,itemFiscalSelections}','{}'::jsonb)='{}'::jsonb OR
     COALESCE(v_snapshot.snapshot_data#>>'{fiscalInputs,customer,id}','')='') THEN
    RAISE EXCEPTION 'HML_REAL_SNAPSHOT_MISMATCH' USING ERRCODE = '23514';
  END IF;
  IF v_version='HML_NORMAL_SALE_V2' AND (
    v_snapshot.snapshot_data#>>'{emissionRequest,modelDecision,model}' IS DISTINCT FROM v_snapshot.requested_model OR
    v_snapshot.snapshot_data#>>'{emissionRequest,modelDecision,policyVersion}' IS DISTINCT FROM 'PR_RETAIL_2026_10' OR
    (p_decision_trace->0->'result'->'modelDecision') IS DISTINCT FROM v_snapshot.snapshot_data#>'{emissionRequest,modelDecision}' OR
    pg_catalog.strpos(p_signed_xml,'<mod>'||v_snapshot.requested_model||'</mod>')=0 OR
    pg_catalog.strpos(p_signed_xml,'<indFinal>'||CASE WHEN v_snapshot.snapshot_data#>>'{emissionRequest,finalConsumer}'='true' THEN '1' ELSE '0' END||'</indFinal>')=0 OR
    v_snapshot.requested_model='65' AND v_snapshot.snapshot_data#>>'{emissionRequest,finalConsumer}' IS DISTINCT FROM 'true') THEN
   RAISE EXCEPTION 'RETAIL_MODEL_SNAPSHOT_MISMATCH' USING ERRCODE='23514';
  END IF;
  IF v_version = 'HML_NORMAL_SALE_V1' AND v_snapshot.requested_model<>'55' THEN
   RAISE EXCEPTION 'LEGACY_HML_MODEL_MISMATCH' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nfe_documents
             WHERE emission_request_id = p_emission_request_id) THEN
    RAISE EXCEPTION 'DUPLICATE_HML_ATTEMPT' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nfe_documents
             WHERE order_id = p_order_id AND modelo IN ('55','65') AND ambiente = 2
               AND status IN ('processando', 'pendente', 'homologada', 'autorizada')) THEN
    RAISE EXCEPTION 'ALREADY_ACTIVE_HML_ATTEMPT' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.nfe_documents (
    order_id, numero_nfe, serie, chave_acesso, modelo, ambiente,
    status, document_type, finalidade, emission_request_id, motivo_status,
    xml_nfe, fiscal_ruleset_version, fiscal_decision_trace,
    hml_attempt_token, hml_attempt_expires_at,
    created_at, updated_at
  ) VALUES (
    p_order_id, p_number, p_series, p_access_key, v_snapshot.requested_model, 2,
    'processando', 'outbound', 1, p_emission_request_id,
    'Transmissão HML em andamento', p_signed_xml,
    v_version, p_decision_trace,
    p_attempt_token, pg_catalog.clock_timestamp() + interval '2 minutes',
    pg_catalog.now(), pg_catalog.now()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

COMMIT;
