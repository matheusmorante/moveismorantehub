-- Keep a CPF correction inside the immutable fiscal emission snapshot. The
-- order/customer rows remain untouched, and retries must reuse the same CPF.
CREATE OR REPLACE FUNCTION public.capture_nfe_recipient_cpf(
  p_reservation jsonb,
  p_recipient_cpf text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_snapshot_id uuid;
  v_snapshot_hash text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'FISCAL_SERVICE_ROLE_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_recipient_cpf IS NULL OR p_recipient_cpf <> '' AND p_recipient_cpf !~ '^[0-9]{11}$' THEN
    RAISE EXCEPTION 'INVALID_RECIPIENT_CPF' USING ERRCODE = '22023';
  END IF;
  BEGIN
    v_snapshot_id := (p_reservation->>'snapshotId')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'INVALID_FISCAL_SNAPSHOT_RESERVATION' USING ERRCODE = '22023';
  END;

  UPDATE public.nfe_fiscal_snapshots
     SET snapshot_data = pg_catalog.jsonb_set(
           snapshot_data, '{emissionRequest,recipientCpf}', pg_catalog.to_jsonb(p_recipient_cpf), true
         ),
         snapshot_sha256 = pg_catalog.encode(extensions.digest(
           pg_catalog.convert_to(pg_catalog.jsonb_set(
             snapshot_data, '{emissionRequest,recipientCpf}', pg_catalog.to_jsonb(p_recipient_cpf), true
           )::text, 'UTF8'), 'sha256'
         ), 'hex')
   WHERE id = v_snapshot_id
     AND (snapshot_data #>> '{emissionRequest,recipientCpf}' IS NULL
          OR snapshot_data #>> '{emissionRequest,recipientCpf}' = p_recipient_cpf)
   RETURNING snapshot_sha256 INTO v_snapshot_hash;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = '23505';
  END IF;
  RETURN pg_catalog.jsonb_set(p_reservation, '{snapshotHash}', pg_catalog.to_jsonb(v_snapshot_hash), true);
END;
$function$;
REVOKE ALL ON FUNCTION public.capture_nfe_recipient_cpf(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_nfe_recipient_cpf(jsonb, text) TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_nfe_fiscal_snapshot_with_recipient(
  p_order_id text,
  p_emission_request_id uuid,
  p_modelo varchar(2),
  p_ambiente integer,
  p_serie varchar(4),
  p_numero_minimo integer,
  p_item_csosn_overrides jsonb,
  p_item_fiscal_selections jsonb,
  p_recipient_cpf text
) RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT public.capture_nfe_recipient_cpf(
    public.prepare_nfe_fiscal_snapshot(
      p_order_id, p_emission_request_id, p_modelo, p_ambiente, p_serie,
      p_numero_minimo, p_item_csosn_overrides, p_item_fiscal_selections
    ), p_recipient_cpf
  );
$function$;
REVOKE ALL ON FUNCTION public.prepare_nfe_fiscal_snapshot_with_recipient(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_fiscal_snapshot_with_recipient(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_numbered_nfe_fiscal_snapshot_with_recipient(
  p_order_id text,
  p_emission_request_id uuid,
  p_modelo varchar(2),
  p_ambiente integer,
  p_serie varchar(4),
  p_numero_minimo integer,
  p_item_csosn_overrides jsonb,
  p_item_fiscal_selections jsonb,
  p_requested_number integer,
  p_recipient_cpf text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_reservation jsonb;
BEGIN
  IF pg_catalog.to_regprocedure(
    'public.prepare_numbered_nfe_fiscal_snapshot(text,uuid,character varying,integer,character varying,integer,jsonb,jsonb,integer)'
  ) IS NULL THEN
    RAISE EXCEPTION 'MANUAL_NFE_NUMBER_RPC_DEPENDENCY_PENDING: 20260930234000_nfe_manual_number_and_duplicate_recovery'
      USING ERRCODE = '0A000';
  END IF;

  EXECUTE 'SELECT public.prepare_numbered_nfe_fiscal_snapshot($1,$2,$3,$4,$5,$6,$7,$8,$9)'
    INTO v_reservation
    USING p_order_id, p_emission_request_id, p_modelo, p_ambiente, p_serie,
      p_numero_minimo, p_item_csosn_overrides, p_item_fiscal_selections, p_requested_number;

  RETURN public.capture_nfe_recipient_cpf(v_reservation, p_recipient_cpf);
END;
$function$;
REVOKE ALL ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot_with_recipient(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, integer, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot_with_recipient(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, integer, text
) TO service_role;
