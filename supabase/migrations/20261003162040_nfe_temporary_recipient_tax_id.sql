-- Bind a modal-only recipient identifier to the immutable fiscal snapshot.
-- This never updates people or orders. The caller validates CPF/CNPJ checksums
-- before invoking this service-role-only reservation boundary.
CREATE OR REPLACE FUNCTION public.apply_nfe_snapshot_recipient_tax_id(
  p_reservation jsonb,
  p_emission_request_id uuid,
  p_recipient_tax_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_snapshot public.nfe_fiscal_snapshots%ROWTYPE;
  v_tax_id text;
  v_result jsonb := p_reservation;
BEGIN
  v_tax_id := pg_catalog.regexp_replace(COALESCE(p_recipient_tax_id, ''), '\D', '', 'g');
  IF v_tax_id = '' OR v_tax_id !~ '^(\d{11}|\d{14})$' THEN
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
REVOKE ALL ON FUNCTION public.apply_nfe_snapshot_recipient_tax_id(jsonb, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_nfe_snapshot_recipient_tax_id(jsonb, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_nfe_fiscal_snapshot(
  p_order_id text,
  p_emission_request_id uuid,
  p_modelo varchar(2),
  p_ambiente integer,
  p_serie varchar(4),
  p_numero_minimo integer,
  p_item_csosn_overrides jsonb,
  p_item_fiscal_selections jsonb,
  p_recipient_tax_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_reservation jsonb;
BEGIN
  v_reservation := public.prepare_nfe_fiscal_snapshot(
    p_order_id, p_emission_request_id, p_modelo, p_ambiente, p_serie,
    p_numero_minimo, p_item_csosn_overrides, p_item_fiscal_selections);
  RETURN public.apply_nfe_snapshot_recipient_tax_id(
    v_reservation, p_emission_request_id, p_recipient_tax_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.prepare_nfe_fiscal_snapshot(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_fiscal_snapshot(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_numbered_nfe_fiscal_snapshot(
  p_order_id text,
  p_emission_request_id uuid,
  p_modelo varchar(2),
  p_ambiente integer,
  p_serie varchar(4),
  p_numero_minimo integer,
  p_item_csosn_overrides jsonb,
  p_item_fiscal_selections jsonb,
  p_requested_number integer,
  p_recipient_tax_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_reservation jsonb;
BEGIN
  v_reservation := public.prepare_numbered_nfe_fiscal_snapshot(
    p_order_id, p_emission_request_id, p_modelo, p_ambiente, p_serie,
    p_numero_minimo, p_item_csosn_overrides, p_item_fiscal_selections, p_requested_number);
  RETURN public.apply_nfe_snapshot_recipient_tax_id(
    v_reservation, p_emission_request_id, p_recipient_tax_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, integer, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_numbered_nfe_fiscal_snapshot(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, integer, text
) TO service_role;
