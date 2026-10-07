-- Keep each model's business decision in the same transaction as its snapshot
-- and number. No invoice, counter or historical snapshot is rewritten here.
-- Patch the installed context function so unrelated pending migrations (recipient
-- normalization, allocator changes) are neither applied nor rolled back.
DO $migration$
DECLARE
  v_signature regprocedure := 'public.prepare_nfe_fiscal_snapshot_with_context(text,uuid,character varying,integer,character varying,integer,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer)'::regprocedure;
  v_definition text;
  v_marker text;
BEGIN
  SELECT pg_catalog.replace(pg_catalog.pg_get_functiondef(v_signature), E'\r\n', E'\n')
    INTO v_definition;
  IF pg_catalog.strpos(v_definition, 'CONTRIBUTION_MODEL_SCOPE_REQUIRED') > 0 THEN
    RETURN;
  END IF;

  FOREACH v_marker IN ARRAY ARRAY[
    'DECLARE v_reservation jsonb;',
    ' PERFORM pg_catalog.pg_advisory_xact_lock(',
    ' IF v_snapshot.snapshot_data#>''{emissionRequest,modelDecision}'' IS NOT NULL THEN',
    'UPDATE public.nfe_fiscal_snapshots SET snapshot_data=pg_catalog.jsonb_set(snapshot_data,''{emissionRequest}'',',
    '(snapshot_data->''emissionRequest'')||v_request)'
  ] LOOP
    IF pg_catalog.strpos(v_definition, v_marker) = 0 OR
       pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition,v_marker,'')) <> pg_catalog.length(v_marker) THEN
      RAISE EXCEPTION 'Unexpected fiscal context definition; review migration before applying.';
    END IF;
  END LOOP;

  v_definition := pg_catalog.replace(v_definition, 'DECLARE v_reservation jsonb;',
    'DECLARE v_contributions jsonb; v_reservation jsonb;');
  v_definition := pg_catalog.replace(v_definition,
    ' PERFORM pg_catalog.pg_advisory_xact_lock(',
    $scope$
 SELECT data INTO v_contributions FROM public.settings
  WHERE id=CASE p_modelo WHEN '55' THEN 'fiscal_decision_simples_nfe55_normal_sale_v1'
    WHEN '65' THEN 'fiscal_decision_simples_nfce65_normal_sale_v1' END FOR SHARE;
 IF p_modelo IS NULL OR p_modelo NOT IN ('55','65') OR v_contributions IS NULL OR
    v_contributions#>>'{scope,model}' IS DISTINCT FROM p_modelo OR
    v_contributions#>>'{scope,operation}' IS DISTINCT FROM 'normal_sale' OR
    v_contributions#>>'{scope,issuerCrt}' IS DISTINCT FROM '1' THEN
  RAISE EXCEPTION 'CONTRIBUTION_MODEL_SCOPE_REQUIRED' USING ERRCODE='23514';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock($scope$);
  v_definition := pg_catalog.replace(v_definition,
    ' IF v_snapshot.snapshot_data#>''{emissionRequest,modelDecision}'' IS NOT NULL THEN',
    $frozen$
 IF v_snapshot.snapshot_data#>'{emissionRequest,modelDecision}' IS NOT NULL THEN
  IF v_snapshot.snapshot_data#>>'{fiscalInputs,contributionDecision,scope,model}' IS DISTINCT FROM p_modelo THEN
   RAISE EXCEPTION 'CONTRIBUTION_MODEL_SCOPE_REQUIRED' USING ERRCODE='23514';
  END IF;$frozen$);
  v_definition := pg_catalog.replace(v_definition,
    'UPDATE public.nfe_fiscal_snapshots SET snapshot_data=pg_catalog.jsonb_set(snapshot_data,''{emissionRequest}'',',
    'UPDATE public.nfe_fiscal_snapshots SET snapshot_data=pg_catalog.jsonb_set(pg_catalog.jsonb_set(snapshot_data,''{emissionRequest}'',');
  v_definition := pg_catalog.replace(v_definition,
    '(snapshot_data->''emissionRequest'')||v_request)',
    '(snapshot_data->''emissionRequest'')||v_request),''{fiscalInputs,contributionDecision}'',v_contributions)');
  EXECUTE v_definition;
END;
$migration$;
