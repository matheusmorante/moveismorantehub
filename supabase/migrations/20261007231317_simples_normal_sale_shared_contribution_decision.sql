-- PIS/COFINS values for this normal-sale scenario do not vary by NF-e/NFC-e.
-- Keep the supported fiscal document models explicit in one decision record.
DO $migration$
DECLARE
  v_legacy jsonb;
  v_shared jsonb;
BEGIN
  SELECT data INTO v_legacy
    FROM public.settings
   WHERE id='fiscal_decision_simples_nfe55_normal_sale_v1'
   FOR UPDATE;

  IF v_legacy IS NULL OR
     v_legacy#>>'{scope,model}' IS DISTINCT FROM '55' OR
     v_legacy#>>'{scope,operation}' IS DISTINCT FROM 'normal_sale' OR
     v_legacy#>>'{scope,issuerCrt}' IS DISTINCT FROM '1' OR
     v_legacy#>>'{pis,cst}' IS DISTINCT FROM '99' OR
     v_legacy#>>'{cofins,cst}' IS DISTINCT FROM '99' OR
     (v_legacy#>>'{pis,base}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_legacy#>>'{pis,rate}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_legacy#>>'{pis,value}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_legacy#>>'{cofins,base}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_legacy#>>'{cofins,rate}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_legacy#>>'{cofins,value}')::numeric IS DISTINCT FROM 0::numeric OR
     nullif(btrim(v_legacy->>'confirmedBy'),'') IS NULL OR
     nullif(btrim(v_legacy->>'confirmedAt'),'') IS NULL THEN
    RAISE EXCEPTION 'The confirmed CRT 1 normal-sale contribution decision is missing or has changed; review fiscal data before migration.';
  END IF;

  SELECT data INTO v_shared
    FROM public.settings
   WHERE id='fiscal_decision_simples_normal_sale_v1'
   FOR UPDATE;

  IF v_shared IS NULL THEN
    v_shared := pg_catalog.jsonb_set(
      v_legacy,
      '{scope}',
      ((v_legacy->'scope') - 'model'::text) || pg_catalog.jsonb_build_object('models', '["55", "65"]'::jsonb),
      true
    );
    v_shared := v_shared || pg_catalog.jsonb_build_object(
      'modelScopeReview', pg_catalog.jsonb_build_object(
        'reviewedAt', pg_catalog.transaction_timestamp(),
        'rationale', 'The NF-e/NFC-e model controls XML group requirements; it does not change the PIS/COFINS decision for this CRT 1 normal-sale scenario.',
        'sourceUrls', pg_catalog.jsonb_build_array(
          'https://www.nfe.fazenda.gov.br/Portal/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=S%2FEAGUrzRyk%3D',
          'https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=cjp9G+N7Xew%3D'
        )
      )
    );
    INSERT INTO public.settings(id,data)
      VALUES('fiscal_decision_simples_normal_sale_v1',v_shared);
  ELSE
    IF v_shared#>>'{scope,model}' IS NOT NULL OR
       v_shared#>'{scope,models}' IS DISTINCT FROM '["55", "65"]'::jsonb OR
       v_shared#>>'{scope,operation}' IS DISTINCT FROM 'normal_sale' OR
       v_shared#>>'{scope,issuerCrt}' IS DISTINCT FROM '1' OR
       v_shared#>>'{pis,cst}' IS DISTINCT FROM '99' OR
       v_shared#>>'{cofins,cst}' IS DISTINCT FROM '99' OR
       (v_shared#>>'{pis,base}')::numeric IS DISTINCT FROM 0::numeric OR
       (v_shared#>>'{pis,rate}')::numeric IS DISTINCT FROM 0::numeric OR
       (v_shared#>>'{pis,value}')::numeric IS DISTINCT FROM 0::numeric OR
       (v_shared#>>'{cofins,base}')::numeric IS DISTINCT FROM 0::numeric OR
       (v_shared#>>'{cofins,rate}')::numeric IS DISTINCT FROM 0::numeric OR
       (v_shared#>>'{cofins,value}')::numeric IS DISTINCT FROM 0::numeric OR
       nullif(btrim(v_shared->>'confirmedBy'),'') IS NULL OR
       nullif(btrim(v_shared->>'confirmedAt'),'') IS NULL THEN
      RAISE EXCEPTION 'The shared CRT 1 normal-sale contribution decision exists with an unexpected scope or tax values; review fiscal data before migration.';
    END IF;
  END IF;
END;
$migration$;

CREATE OR REPLACE FUNCTION public.simples_normal_sale_contribution_decision(p_model text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $function$
DECLARE
  v_decision jsonb;
BEGIN
  IF p_model IS NULL OR p_model NOT IN ('55','65') THEN
    RAISE EXCEPTION 'CONTRIBUTION_MODEL_SCOPE_REQUIRED' USING ERRCODE='23514';
  END IF;

  SELECT data INTO v_decision
    FROM public.settings
   WHERE id='fiscal_decision_simples_normal_sale_v1'
   FOR SHARE;

  IF v_decision IS NULL OR
     v_decision#>'{scope,model}' IS NOT NULL OR
     v_decision#>'{scope,models}' IS DISTINCT FROM '["55", "65"]'::jsonb OR
     v_decision#>>'{scope,operation}' IS DISTINCT FROM 'normal_sale' OR
     v_decision#>>'{scope,issuerCrt}' IS DISTINCT FROM '1' OR
     v_decision#>>'{pis,cst}' IS DISTINCT FROM '99' OR
     v_decision#>>'{cofins,cst}' IS DISTINCT FROM '99' OR
     (v_decision#>>'{pis,base}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_decision#>>'{pis,rate}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_decision#>>'{pis,value}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_decision#>>'{cofins,base}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_decision#>>'{cofins,rate}')::numeric IS DISTINCT FROM 0::numeric OR
     (v_decision#>>'{cofins,value}')::numeric IS DISTINCT FROM 0::numeric OR
     nullif(btrim(v_decision->>'confirmedBy'),'') IS NULL OR
     nullif(btrim(v_decision->>'confirmedAt'),'') IS NULL THEN
    RAISE EXCEPTION 'CONTRIBUTION_MODEL_SCOPE_REQUIRED' USING ERRCODE='23514';
  END IF;

  RETURN v_decision;
END;
$function$;

REVOKE ALL ON FUNCTION public.simples_normal_sale_contribution_decision(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.simples_normal_sale_contribution_decision(text)
  TO service_role;

-- Keep the older reservation/context API compatible for existing HML paths.
DO $migration$
DECLARE
  v_signature regprocedure := 'public.prepare_nfe_fiscal_snapshot_with_context(text,uuid,character varying,integer,character varying,integer,jsonb,jsonb,text,boolean,boolean,boolean,jsonb,integer)'::regprocedure;
  v_definition text;
  v_old_gate text := $old$
 SELECT data INTO v_contributions FROM public.settings
  WHERE id=CASE p_modelo WHEN '55' THEN 'fiscal_decision_simples_nfe55_normal_sale_v1'
    WHEN '65' THEN 'fiscal_decision_simples_nfce65_normal_sale_v1' END FOR SHARE;
 IF p_modelo IS NULL OR p_modelo NOT IN ('55','65') OR v_contributions IS NULL OR
    v_contributions#>>'{scope,model}' IS DISTINCT FROM p_modelo OR
    v_contributions#>>'{scope,operation}' IS DISTINCT FROM 'normal_sale' OR
    v_contributions#>>'{scope,issuerCrt}' IS DISTINCT FROM '1' THEN
  RAISE EXCEPTION 'CONTRIBUTION_MODEL_SCOPE_REQUIRED' USING ERRCODE='23514';
 END IF;$old$;
  v_new_gate text := $new$
 SELECT public.simples_normal_sale_contribution_decision(p_modelo) INTO v_contributions;$new$;
  v_old_frozen_check text := $old$
  IF v_snapshot.snapshot_data#>>'{fiscalInputs,contributionDecision,scope,model}' IS DISTINCT FROM p_modelo THEN
   RAISE EXCEPTION 'CONTRIBUTION_MODEL_SCOPE_REQUIRED' USING ERRCODE='23514';
  END IF;$old$;
  v_new_frozen_check text := $new$
  IF v_snapshot.snapshot_data#>>'{fiscalInputs,contributionDecision,scope,operation}' IS DISTINCT FROM 'normal_sale' OR
     v_snapshot.snapshot_data#>>'{fiscalInputs,contributionDecision,scope,issuerCrt}' IS DISTINCT FROM '1' OR
     (v_snapshot.snapshot_data#>>'{fiscalInputs,contributionDecision,scope,model}' IS DISTINCT FROM p_modelo AND
      v_snapshot.snapshot_data#>'{fiscalInputs,contributionDecision,scope,models}' IS DISTINCT FROM '["55", "65"]'::jsonb) THEN
   RAISE EXCEPTION 'CONTRIBUTION_MODEL_SCOPE_REQUIRED' USING ERRCODE='23514';
  END IF;$new$;
BEGIN
  SELECT pg_catalog.replace(pg_catalog.pg_get_functiondef(v_signature), E'\r\n', E'\n')
    INTO v_definition;
  IF pg_catalog.length(v_definition)-pg_catalog.length(pg_catalog.replace(v_definition,v_old_gate,'')) <> pg_catalog.length(v_old_gate) OR
     pg_catalog.length(v_definition)-pg_catalog.length(pg_catalog.replace(v_definition,v_old_frozen_check,'')) <> pg_catalog.length(v_old_frozen_check) THEN
    RAISE EXCEPTION 'Unexpected fiscal snapshot function definition; review the shared decision patch before applying.';
  END IF;
  v_definition := pg_catalog.replace(v_definition,v_old_gate,v_new_gate);
  v_definition := pg_catalog.replace(v_definition,v_old_frozen_check,v_new_frozen_check);
  EXECUTE v_definition;
END;
$migration$;

-- The normal outbound path also re-reads and locks the shared decision in the
-- same transaction that reserves the number, snapshot, document, and attempt.
DO $migration$
DECLARE
  v_signature regprocedure := 'public.prepare_nfe_outbound_attempt(jsonb,text,text,jsonb,uuid,uuid,integer)'::regprocedure;
  v_definition text;
  v_old_gate text := $old$
 SELECT data INTO v_contribution FROM public.settings WHERE id=CASE v_model
  WHEN '55' THEN 'fiscal_decision_simples_nfe55_normal_sale_v1' ELSE 'fiscal_decision_simples_nfce65_normal_sale_v1' END FOR SHARE;
 IF v_contribution IS NULL OR v_contribution#>>'{scope,model}' IS DISTINCT FROM v_model OR
    v_contribution#>>'{scope,issuerCrt}' IS DISTINCT FROM '1' OR
    v_contribution#>>'{scope,operation}' IS DISTINCT FROM 'normal_sale' THEN
  RAISE EXCEPTION 'CONTRIBUTION_MODEL_SCOPE_REQUIRED' USING ERRCODE='23514';
 END IF;$old$;
  v_new_gate text := $new$
 SELECT public.simples_normal_sale_contribution_decision(v_model) INTO v_contribution;$new$;
BEGIN
  SELECT pg_catalog.replace(pg_catalog.pg_get_functiondef(v_signature), E'\r\n', E'\n')
    INTO v_definition;
  IF pg_catalog.length(v_definition)-pg_catalog.length(pg_catalog.replace(v_definition,v_old_gate,'')) <> pg_catalog.length(v_old_gate) THEN
    RAISE EXCEPTION 'Unexpected outbound attempt function definition; review the shared decision patch before applying.';
  END IF;
  v_definition := pg_catalog.replace(v_definition,v_old_gate,v_new_gate);
  EXECUTE v_definition;
END;
$migration$;
