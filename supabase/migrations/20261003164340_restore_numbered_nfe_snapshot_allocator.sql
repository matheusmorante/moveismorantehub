-- Restore the canonical manual allocator required by the recipient-aware overload.
-- Number and snapshot remain in one transaction; no commercial effects are created.
CREATE OR REPLACE FUNCTION public.prepare_numbered_nfe_fiscal_snapshot(
 p_order_id text,p_emission_request_id uuid,p_modelo varchar(2),p_ambiente integer,
 p_serie varchar(4),p_numero_minimo integer,p_item_csosn_overrides jsonb,
 p_item_fiscal_selections jsonb,p_requested_number integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_existing public.nfe_fiscal_snapshots%ROWTYPE;
        v_sequence_before integer; v_now timestamptz; v_result jsonb;
BEGIN
 IF p_requested_number IS NULL THEN
  RETURN public.prepare_nfe_fiscal_snapshot(p_order_id,p_emission_request_id,p_modelo,
    p_ambiente,p_serie,p_numero_minimo,p_item_csosn_overrides,p_item_fiscal_selections);
 END IF;
 IF p_requested_number < p_numero_minimo OR p_requested_number NOT BETWEEN 1 AND 999999999 OR
    COALESCE(p_order_id,'')='' OR p_emission_request_id IS NULL OR
    p_modelo NOT IN ('55','65') OR p_ambiente NOT IN (1,2) OR
    COALESCE(p_serie,'') !~ '^[0-9]{1,3}$' OR
    COALESCE(p_numero_minimo,0) NOT BETWEEN 1 AND 999999999 THEN
  RAISE EXCEPTION 'Parâmetros inválidos para número fiscal manual.' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('nfe_snapshot:'||p_emission_request_id::text,0));
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('nfe_emit:'||p_order_id||':'||p_modelo||':'||p_ambiente::text,0));

 SELECT * INTO v_existing FROM public.nfe_fiscal_snapshots
  WHERE emission_request_id=p_emission_request_id FOR UPDATE;
 IF FOUND THEN
  IF v_existing.order_id IS DISTINCT FROM p_order_id OR
     v_existing.requested_model IS DISTINCT FROM p_modelo OR
     v_existing.environment IS DISTINCT FROM p_ambiente OR v_existing.series IS DISTINCT FROM p_serie OR
     v_existing.reserved_number IS DISTINCT FROM p_requested_number OR
     COALESCE(v_existing.snapshot_data#>'{emissionRequest,itemCsosnOverrides}','{}'::jsonb)
       IS DISTINCT FROM COALESCE(p_item_csosn_overrides,'{}'::jsonb) OR
     COALESCE(v_existing.snapshot_data#>'{emissionRequest,itemFiscalSelections}','{}'::jsonb)
       IS DISTINCT FROM COALESCE(p_item_fiscal_selections,'{}'::jsonb) THEN
   RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='23505';
  END IF;
  RETURN pg_catalog.jsonb_build_object('snapshotId',v_existing.id,
    'snapshotHash',v_existing.snapshot_sha256,'number',v_existing.reserved_number,
    'issuedAt',v_existing.captured_at,'orderVersion',v_existing.order_version);
 END IF;

 INSERT INTO public.nfe_sequences(modelo,serie,ambiente,ultimo_numero,updated_at)
  VALUES(p_modelo,p_serie,p_ambiente,0,pg_catalog.clock_timestamp())
  ON CONFLICT(modelo,serie,ambiente) DO NOTHING;
 SELECT ultimo_numero INTO v_sequence_before FROM public.nfe_sequences
  WHERE modelo=p_modelo AND serie=p_serie AND ambiente=p_ambiente FOR UPDATE;

 IF EXISTS(SELECT 1 FROM public.nfe_fiscal_snapshots
    WHERE requested_model=p_modelo AND series=p_serie AND environment=p_ambiente
      AND reserved_number=p_requested_number) OR
    EXISTS(SELECT 1 FROM public.nfe_documents
    WHERE modelo=p_modelo AND serie=p_serie AND ambiente=p_ambiente
      AND numero_nfe=p_requested_number) THEN
  RAISE EXCEPTION 'NFE_NUMBER_ALREADY_USED' USING ERRCODE='23505',
    DETAIL='number='||p_requested_number::text;
 END IF;

 -- Temporarily position the canonical allocator immediately before the selected
 -- number. Restore its high-water mark before commit, even for a lower manual gap.
 UPDATE public.nfe_sequences SET ultimo_numero=p_requested_number-1,
  updated_at=pg_catalog.clock_timestamp()
  WHERE modelo=p_modelo AND serie=p_serie AND ambiente=p_ambiente;
 v_result := public.prepare_nfe_fiscal_snapshot(p_order_id,p_emission_request_id,
  p_modelo,p_ambiente,p_serie,p_requested_number,p_item_csosn_overrides,p_item_fiscal_selections);
 UPDATE public.nfe_sequences SET ultimo_numero=GREATEST(v_sequence_before,p_requested_number),
  updated_at=pg_catalog.clock_timestamp()
  WHERE modelo=p_modelo AND serie=p_serie AND ambiente=p_ambiente;
 RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot(
 text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,integer
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot(
 text,uuid,varchar,integer,varchar,integer,jsonb,jsonb,integer
) TO service_role;
