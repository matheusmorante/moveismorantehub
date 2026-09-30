-- Immutable form and catalog/customer facts. No commercial writes.
CREATE OR REPLACE FUNCTION public.prepare_nfe_fiscal_snapshot(
  p_order_id text,
  p_emission_request_id uuid,
  p_modelo varchar(2),
  p_ambiente integer,
  p_serie varchar(4),
  p_numero_minimo integer,
  p_item_csosn_overrides jsonb,
  p_item_fiscal_selections jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.nfe_fiscal_snapshots%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_settings jsonb;
  v_csosn_configuration jsonb;
  v_issuer_profile jsonb;
  v_fiscal_inputs jsonb;
  v_products jsonb;
  v_customer jsonb;
  v_contributions jsonb;
  v_snapshot_data jsonb;
  v_snapshot_hash text;
  v_captured_at timestamptz;
  v_number integer;
  v_snapshot_id uuid;
BEGIN
  IF COALESCE(p_order_id, '') = ''
     OR p_emission_request_id IS NULL
     OR p_modelo IS NULL OR p_modelo NOT IN ('55', '65')
     OR p_ambiente IS NULL OR p_ambiente NOT IN (1, 2)
     OR COALESCE(p_serie, '') !~ '^[0-9]{1,3}$'
     OR COALESCE(p_numero_minimo, 0) NOT BETWEEN 1 AND 999999999
     OR p_item_csosn_overrides IS NULL OR pg_catalog.jsonb_typeof(p_item_csosn_overrides) <> 'object' THEN
    RAISE EXCEPTION 'Parâmetros inválidos para snapshot fiscal.' USING ERRCODE = '22023';
  END IF;

  IF p_item_fiscal_selections IS NULL OR pg_catalog.jsonb_typeof(p_item_fiscal_selections) <> 'object' OR
     (p_ambiente <> 2 AND p_item_fiscal_selections <> '{}'::jsonb) OR
     (SELECT count(*) FROM pg_catalog.jsonb_each(p_item_fiscal_selections)) > 990 THEN
    RAISE EXCEPTION 'INVALID_ITEM_FISCAL_SELECTIONS' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_item_fiscal_selections) s
    WHERE s.key !~ '^[1-9][0-9]{0,2}$' OR s.key::integer > 990 OR
      pg_catalog.jsonb_typeof(s.value) <> 'object' OR
      (SELECT count(*) FROM pg_catalog.jsonb_object_keys(s.value)) <> 5 OR
      NOT (s.value ?& ARRAY['ncm','cfop','origem','cest','csosn']) OR
      EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(s.value) f WHERE pg_catalog.jsonb_typeof(f.value) <> 'string') OR
      COALESCE(s.value->>'ncm','') !~ '^[0-9]{8}$' OR
      COALESCE(s.value->>'cfop','') !~ '^[567][0-9]{3}$' OR
      COALESCE(s.value->>'origem','') !~ '^[0-8]$' OR
      COALESCE(s.value->>'cest','') !~ '^([0-9]{7})?$' OR
      COALESCE(s.value->>'csosn','') NOT IN ('101','102','103','201','202','203','300','400','500','900')) THEN
    RAISE EXCEPTION 'INVALID_ITEM_FISCAL_SELECTIONS' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nfe_snapshot:' || p_emission_request_id::text, 0)
  );
  -- Different clicks for the same sale must not consume a second number while
  -- the first emission has an unresolved outcome.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nfe_emit:' || p_order_id || ':' || p_modelo || ':' || p_ambiente::text, 0)
  );

  SELECT * INTO v_existing
    FROM public.nfe_fiscal_snapshots
   WHERE emission_request_id = p_emission_request_id;

  IF FOUND THEN
    IF v_existing.order_id IS DISTINCT FROM p_order_id
       OR v_existing.requested_model IS DISTINCT FROM p_modelo
       OR v_existing.environment IS DISTINCT FROM p_ambiente
       OR v_existing.series IS DISTINCT FROM p_serie
       OR COALESCE(v_existing.snapshot_data #> '{emissionRequest,itemCsosnOverrides}', '{}'::jsonb)
            IS DISTINCT FROM p_item_csosn_overrides OR
       COALESCE(v_existing.snapshot_data #> '{emissionRequest,itemFiscalSelections}', '{}'::jsonb)
            IS DISTINCT FROM p_item_fiscal_selections THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = '23505';
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'snapshotId', v_existing.id,
      'snapshotHash', v_existing.snapshot_sha256,
      'number', v_existing.reserved_number,
      'issuedAt', v_existing.captured_at,
      'orderVersion', v_existing.order_version
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.nfe_fiscal_snapshots AS s
    WHERE s.order_id = p_order_id AND s.requested_model = p_modelo
      AND s.environment = p_ambiente AND s.emission_request_id <> p_emission_request_id
      AND NOT EXISTS (
        SELECT 1 FROM public.nfe_documents AS d
        WHERE d.fiscal_snapshot_id = s.id
          AND d.status NOT IN ('pendente', 'processando')
      )
  ) THEN
    RAISE EXCEPTION 'ALREADY_ACTIVE_FISCAL_ATTEMPT' USING ERRCODE = '23505';
  END IF;

  SELECT o.id, o.order_type, o.status, o.deleted, o.order_data, o.version, o.updated_at
    INTO v_order.id, v_order.order_type, v_order.status, v_order.deleted, v_order.order_data,
         v_order.version, v_order.updated_at
    FROM public.orders AS o
   WHERE o.id = p_order_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF COALESCE(v_order.order_type, '') NOT IN ('sale', 'showroom')
     OR pg_catalog.lower(COALESCE(v_order.status, '')) IN ('cancelled', 'cancelado') THEN
    RAISE EXCEPTION 'ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL' USING ERRCODE = '23514';
  END IF;
  IF v_order.order_data IS NULL OR pg_catalog.jsonb_typeof(v_order.order_data) <> 'object' THEN
    RAISE EXCEPTION 'ORDER_FISCAL_DATA_UNAVAILABLE' USING ERRCODE = '23514';
  END IF;
  IF v_order.version IS NULL OR v_order.updated_at IS NULL THEN
    RAISE EXCEPTION 'ORDER_REVISION_UNAVAILABLE' USING ERRCODE = '23514';
  END IF;
  IF v_order.order_data ->> 'fiscalScenario' = 'HML_TECHNICAL_V1' AND
     (v_order.status <> 'draft' OR v_order.deleted IS DISTINCT FROM true OR
      pg_catalog.jsonb_array_length(COALESCE(v_order.order_data -> 'payments', '[]'::jsonb)) <> 0) THEN
    RAISE EXCEPTION 'HML_ORDER_NOT_ISOLATED' USING ERRCODE = '23514';
  END IF;
  IF v_order.order_data ->> 'fiscalScenario' = 'HML_TECHNICAL_V1' AND EXISTS (
    SELECT 1 FROM public.nfe_fiscal_snapshots AS s
    WHERE s.order_id = p_order_id AND s.requested_model = '55'
      AND s.environment = 2 AND s.emission_request_id <> p_emission_request_id
  ) THEN
    RAISE EXCEPTION 'HML_ORDER_ALREADY_HAS_ATTEMPT' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_each_text(p_item_csosn_overrides) AS choice
    WHERE choice.key !~ '^[1-9][0-9]{0,2}$' OR
      choice.value NOT IN ('101','102','103','201','202','203','300','400','500','900')) OR
    (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_each(p_item_csosn_overrides)) > 990 THEN
    RAISE EXCEPTION 'INVALID_ITEM_CSOSN_OVERRIDES' USING ERRCODE = '22023';
  END IF;
  IF v_order.order_data ->> 'fiscalScenario' = 'HML_TECHNICAL_V1' AND EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_each(p_item_csosn_overrides) AS choice WHERE choice.key <> '1'
  ) THEN
    RAISE EXCEPTION 'ITEM_CSOSN_OVERRIDE_OUT_OF_RANGE' USING ERRCODE = '22023';
  END IF;

  IF p_item_fiscal_selections <> '{}'::jsonb AND
    (SELECT count(*) FROM pg_catalog.jsonb_each(p_item_fiscal_selections)) <>
    (SELECT count(*) FROM pg_catalog.jsonb_array_elements(v_order.order_data->'items') i
      WHERE COALESCE(i->>'itemType','product') <> 'service') THEN
    RAISE EXCEPTION 'FISCAL_SELECTION_ITEM_COUNT_MISMATCH' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_item_fiscal_selections) s
    WHERE s.key::integer > (SELECT count(*) FROM pg_catalog.jsonb_array_elements(v_order.order_data->'items') i
      WHERE COALESCE(i->>'itemType','product') <> 'service') OR
      (p_item_csosn_overrides ? s.key AND p_item_csosn_overrides->>s.key <> s.value->>'csosn')) THEN
    RAISE EXCEPTION 'FISCAL_SELECTION_ITEM_MISMATCH' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_item_fiscal_selections) s
    WHERE NOT EXISTS (SELECT 1 FROM public.ncms n WHERE n.code=s.value->>'ncm'
      AND n.active AND (n.start_date IS NULL OR n.start_date <= CURRENT_DATE)
      AND (n.end_date IS NULL OR n.end_date >= CURRENT_DATE))) THEN
    RAISE EXCEPTION 'NCM_NOT_ACTIVE' USING ERRCODE = '23514';
  END IF;
  SELECT COALESCE(jsonb_object_agg(p.id,p.fiscal),'{}'::jsonb) INTO v_products FROM (
    SELECT p.id,p.fiscal FROM public.products p
    WHERE p.id IN (SELECT (i->>'productId')::uuid FROM pg_catalog.jsonb_array_elements(v_order.order_data->'items') i)
    FOR SHARE
  ) p;
  SELECT jsonb_build_object('id',p.id,'fullName',p.full_name,'cpfCnpj',p.cpf_cnpj,
    'address',p.address,'ie',p.rg_ie,'personType',p.person_type_pf_pj)
    INTO v_customer FROM public.people p
    WHERE p.id=v_order.order_data#>>'{customerData,id}' AND NOT COALESCE(p.deleted,false) FOR SHARE;
  SELECT data INTO v_contributions FROM public.settings
    WHERE id='fiscal_decision_simples_nfe55_normal_sale_v1' FOR SHARE;

  SELECT s.data INTO v_settings
    FROM public.settings AS s
   WHERE s.id = 'app'
   FOR SHARE;

  IF NOT FOUND OR v_settings IS NULL OR pg_catalog.jsonb_typeof(v_settings) <> 'object' THEN
    RAISE EXCEPTION 'ISSUER_PROFILE_UNAVAILABLE' USING ERRCODE = '23514';
  END IF;
  SELECT data INTO v_csosn_configuration FROM public.settings
  WHERE id = 'nfe55_hml_csosn_defaults_v1' FOR SHARE;
  IF v_order.order_data ->> 'fiscalScenario' = 'HML_TECHNICAL_V1' AND v_csosn_configuration IS NULL THEN
    RAISE EXCEPTION 'HML_CSOSN_CONFIGURATION_UNAVAILABLE' USING ERRCODE = '23514';
  END IF;

  v_issuer_profile := pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'companyName', v_settings -> 'companyName',
    'companyAddress', v_settings -> 'companyAddress',
    'companyCnpj', v_settings -> 'companyCnpj',
    'companyIE', v_settings -> 'companyIE',
    'companyIM', v_settings -> 'companyIM',
    'companyCRT', v_settings -> 'companyCRT',
    'companyLogradouro', v_settings -> 'companyLogradouro',
    'companyNumero', v_settings -> 'companyNumero',
    'companyBairro', v_settings -> 'companyBairro',
    'companyCEP', v_settings -> 'companyCEP',
    'companyCMun', v_settings -> 'companyCMun',
    'companyXMun', v_settings -> 'companyXMun',
    'companyUF', v_settings -> 'companyUF',
    'companyPhone', v_settings -> 'companyPhone',
    'cscId', v_settings -> 'cscId'
  ));

  IF COALESCE(v_issuer_profile ->> 'companyCMun', '') !~ '^[0-9]{7}$' THEN
    RAISE EXCEPTION 'ISSUER_MUNICIPALITY_UNAVAILABLE' USING ERRCODE = '23514';
  END IF;

  v_fiscal_inputs := jsonb_build_object('products',v_products,'customer',v_customer,
    'contributionDecision',v_contributions,'fiscalDefaults',v_settings->'fiscalDefaults');

  v_captured_at := pg_catalog.date_trunc('second', pg_catalog.clock_timestamp());

  INSERT INTO public.nfe_sequences (modelo, serie, ambiente, ultimo_numero, updated_at)
  VALUES (p_modelo, p_serie, p_ambiente, p_numero_minimo, v_captured_at)
  ON CONFLICT (modelo, serie, ambiente)
  DO UPDATE SET
    ultimo_numero = GREATEST(
      public.nfe_sequences.ultimo_numero + 1,
      EXCLUDED.ultimo_numero
    ),
    updated_at = EXCLUDED.updated_at
  RETURNING ultimo_numero INTO v_number;

  v_snapshot_data := pg_catalog.jsonb_build_object(
    'schemaVersion', 1,
    'capturedAt', v_captured_at,
    'order', pg_catalog.jsonb_build_object(
      'id', v_order.id,
      'type', v_order.order_type,
      'status', v_order.status,
      'deleted', v_order.deleted,
      'version', v_order.version,
      'updatedAt', v_order.updated_at,
      'data', v_order.order_data
    ),
    'issuerProfile', v_issuer_profile,
    'fiscalInputs', v_fiscal_inputs,
    'fiscalConfiguration', v_csosn_configuration,
    'emissionRequest', pg_catalog.jsonb_build_object(
      'id', p_emission_request_id,
      'requestedModel', p_modelo,
      'environment', p_ambiente,
      'series', p_serie,
      'number', v_number,
      'itemCsosnOverrides', p_item_csosn_overrides,
      'itemFiscalSelections', p_item_fiscal_selections
    )
  );
  v_snapshot_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_snapshot_data::text, 'UTF8'), 'sha256'),
    'hex'
  );

  INSERT INTO public.nfe_fiscal_snapshots (
    emission_request_id, order_id, order_version, order_updated_at,
    requested_model, environment, series, reserved_number,
    snapshot_data, snapshot_sha256, captured_at
  ) VALUES (
    p_emission_request_id, v_order.id::text, v_order.version, v_order.updated_at,
    p_modelo, p_ambiente, p_serie, v_number,
    v_snapshot_data, v_snapshot_hash, v_captured_at
  ) RETURNING id INTO v_snapshot_id;

  RETURN pg_catalog.jsonb_build_object(
    'snapshotId', v_snapshot_id,
    'snapshotHash', v_snapshot_hash,
    'number', v_number,
    'issuedAt', v_captured_at,
    'orderVersion', v_order.version
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.prepare_nfe_fiscal_snapshot(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_fiscal_snapshot(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb
) TO service_role;

-- Compatibility callers share the canonical transaction.
CREATE OR REPLACE FUNCTION public.prepare_nfe_fiscal_snapshot(
 p_order_id text, p_emission_request_id uuid, p_modelo varchar(2), p_ambiente integer,
 p_serie varchar(4), p_numero_minimo integer, p_item_csosn_overrides jsonb
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$
 SELECT public.prepare_nfe_fiscal_snapshot(p_order_id,p_emission_request_id,p_modelo,
   p_ambiente,p_serie,p_numero_minimo,p_item_csosn_overrides,'{}'::jsonb);
$function$;
REVOKE ALL ON FUNCTION public.prepare_nfe_fiscal_snapshot(text,uuid,varchar,integer,varchar,integer,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_fiscal_snapshot(text,uuid,varchar,integer,varchar,integer,jsonb)
 TO service_role;
