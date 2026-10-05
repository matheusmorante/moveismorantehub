-- Snapshot-bound recipient IDs accept CPF, numeric/alphanumeric CNPJ, or an
-- explicit empty value for NFC-e operations where identification is optional.
-- The application validates check digits before calling this service-role RPC.
CREATE OR REPLACE FUNCTION public.apply_nfe_snapshot_recipient_tax_id(
  p_reservation jsonb,
  p_emission_request_id uuid,
  p_recipient_tax_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_snapshot public.nfe_fiscal_snapshots%ROWTYPE;
  v_tax_id text;
  v_result jsonb := p_reservation;
BEGIN
  v_tax_id := pg_catalog.translate(
    pg_catalog.upper(pg_catalog.btrim(COALESCE(p_recipient_tax_id, ''))),
    ' .-/' || pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(13),
    ''
  );
  IF v_tax_id <> '' AND v_tax_id !~ '^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$' THEN
    RAISE EXCEPTION 'NFE_RECIPIENT_TAX_ID_INVALID' USING ERRCODE = '22023';
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

REVOKE ALL ON FUNCTION public.apply_nfe_snapshot_recipient_tax_id(jsonb, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_nfe_snapshot_recipient_tax_id(jsonb, uuid, text)
  TO service_role;

-- Store an explicit blank in the immutable request snapshot. This clears an
-- optional customer identifier from the fiscal emission snapshot only; it
-- does not mutate the commercial customer profile.
CREATE OR REPLACE FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(
 p_order_id text,p_emission_request_id uuid,p_modelo varchar(2),p_ambiente integer,p_serie varchar(4),
 p_numero_minimo integer,p_item_csosn_overrides jsonb,p_item_fiscal_selections jsonb,
 p_recipient_tax_id text,p_final_consumer boolean,p_delivery_by_issuer boolean,p_card_not_integrated boolean,p_model_decision jsonb,
 p_requested_number integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_reservation jsonb; v_snapshot public.nfe_fiscal_snapshots%ROWTYPE; v_request jsonb; v_hash text; v_tax_id text;
BEGIN
 v_tax_id := pg_catalog.translate(
   pg_catalog.upper(pg_catalog.btrim(COALESCE(p_recipient_tax_id, ''))),
   ' .-/' || pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(13),
   ''
 );
 IF p_ambiente IS DISTINCT FROM 2 OR p_final_consumer IS NULL OR p_delivery_by_issuer IS NULL OR p_card_not_integrated IS NULL OR
    COALESCE(p_model_decision->>'status','')<>'ready' OR
    p_model_decision->>'model' IS DISTINCT FROM p_modelo OR
    p_model_decision->>'finalConsumer' IS DISTINCT FROM p_final_consumer::text OR
    COALESCE(p_model_decision->>'policyVersion','')<>'PR_RETAIL_2026_10' THEN
  RAISE EXCEPTION 'INVALID_RETAIL_FISCAL_CONTEXT' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('nfe_emit:'||p_order_id||':retail:2',0));
 IF EXISTS (SELECT 1 FROM public.nfe_documents WHERE order_id=p_order_id AND ambiente=2
    AND modelo<>p_modelo AND status IN ('processando','pendente','homologada','autorizada')) THEN
  RAISE EXCEPTION 'ALREADY_ACTIVE_HML_ATTEMPT' USING ERRCODE='23505';
 END IF;
 IF EXISTS (SELECT 1 FROM public.nfe_fiscal_snapshots s WHERE s.order_id=p_order_id AND s.environment=2
   AND s.requested_model<>p_modelo AND s.emission_request_id<>p_emission_request_id
   AND NOT EXISTS (SELECT 1 FROM public.nfe_documents d WHERE d.fiscal_snapshot_id=s.id
      AND d.status='erro' AND d.numero_protocolo IS NULL AND d.xml_protocolo IS NOT NULL)) THEN
  RAISE EXCEPTION 'UNRESOLVED_FISCAL_SNAPSHOT' USING ERRCODE='23505';
 END IF;
 IF p_requested_number IS NULL THEN
  v_reservation := public.prepare_nfe_fiscal_snapshot(p_order_id,p_emission_request_id,
    p_modelo,p_ambiente,p_serie,p_numero_minimo,p_item_csosn_overrides,p_item_fiscal_selections);
 ELSE
  v_reservation := public.prepare_numbered_nfe_fiscal_snapshot(p_order_id,p_emission_request_id,
    p_modelo,p_ambiente,p_serie,p_numero_minimo,p_item_csosn_overrides,p_item_fiscal_selections,p_requested_number);
 END IF;
 IF p_recipient_tax_id IS NOT NULL THEN
  v_reservation := public.apply_nfe_snapshot_recipient_tax_id(v_reservation,p_emission_request_id,v_tax_id);
 END IF;
 SELECT * INTO v_snapshot FROM public.nfe_fiscal_snapshots
  WHERE id=(v_reservation->>'snapshotId')::uuid FOR UPDATE;
 v_request := pg_catalog.jsonb_build_object('finalConsumer',p_final_consumer,
   'recipientTaxId',v_tax_id,'deliveryByIssuer',p_delivery_by_issuer,'cardNotIntegrated',p_card_not_integrated,'modelDecision',p_model_decision);
 IF v_snapshot.snapshot_data#>'{emissionRequest,modelDecision}' IS NOT NULL THEN
  IF (v_snapshot.snapshot_data->'emissionRequest') @> v_request THEN RETURN v_reservation; END IF;
  RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='23505';
 END IF;
 IF EXISTS (SELECT 1 FROM public.nfe_documents WHERE fiscal_snapshot_id=v_snapshot.id) THEN
  RAISE EXCEPTION 'FISCAL_CONTEXT_ALREADY_FROZEN' USING ERRCODE='23514';
 END IF;
 UPDATE public.nfe_fiscal_snapshots SET snapshot_data=pg_catalog.jsonb_set(snapshot_data,'{emissionRequest}',
    (snapshot_data->'emissionRequest')||v_request)
  WHERE id=v_snapshot.id;
 UPDATE public.nfe_fiscal_snapshots SET snapshot_sha256=pg_catalog.encode(extensions.digest(
   pg_catalog.convert_to(snapshot_data::text,'UTF8'),'sha256'),'hex') WHERE id=v_snapshot.id
  RETURNING snapshot_sha256 INTO v_hash;
 RETURN pg_catalog.jsonb_set(v_reservation,'{snapshotHash}',pg_catalog.to_jsonb(v_hash));
END; $function$;

REVOKE ALL ON FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(
 text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(
 text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer
) TO service_role;
