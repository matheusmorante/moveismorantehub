-- The authoritative number check remains after the sequence row lock below.
CREATE OR REPLACE FUNCTION public.reserve_nfe_outbound_number(
 p_issuer_cnpj text,p_model text,p_environment integer,p_series text,p_minimum integer,p_expected_number integer
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_number integer; v_is_legacy boolean;
BEGIN
 INSERT INTO public.nfe_establishment_sequences(issuer_cnpj,model,environment,series)
 VALUES(p_issuer_cnpj,p_model,p_environment,p_series) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.nfe_establishment_sequences WHERE issuer_cnpj=p_issuer_cnpj AND
  model=p_model AND environment=p_environment AND series=p_series FOR UPDATE;
 SELECT EXISTS(SELECT 1 FROM public.nfe_legacy_sequence_scope WHERE issuer_cnpj=p_issuer_cnpj) INTO v_is_legacy;
 IF v_is_legacy THEN
  INSERT INTO public.nfe_sequences(modelo,serie,ambiente,ultimo_numero,updated_at)
   VALUES(p_model,p_series,p_environment,0,now()) ON CONFLICT(modelo,serie,ambiente) DO NOTHING;
  PERFORM 1 FROM public.nfe_sequences WHERE modelo=p_model AND serie=p_series AND ambiente=p_environment FOR UPDATE;
 END IF;
 v_number := public.peek_nfe_outbound_number(p_issuer_cnpj,p_model,p_environment,p_series,p_minimum);
 IF p_expected_number IS DISTINCT FROM v_number THEN
  RAISE EXCEPTION 'FISCAL_SEQUENCE_CHANGED' USING ERRCODE='23514';
 END IF;
 UPDATE public.nfe_establishment_sequences SET last_number=v_number,updated_at=clock_timestamp()
  WHERE issuer_cnpj=p_issuer_cnpj AND model=p_model AND environment=p_environment AND series=p_series;
 IF v_is_legacy THEN
  UPDATE public.nfe_sequences SET ultimo_numero=v_number,updated_at=clock_timestamp()
   WHERE modelo=p_model AND serie=p_series AND ambiente=p_environment;
 END IF;
 RETURN v_number;
END; $fn$;
