BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE OR REPLACE FUNCTION public.reserve_next_inventory_codes(
  p_reserved_codes text[],
  p_count integer
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_index integer;
  v_candidate text;
  v_code text;
  v_codes text[] := ARRAY[]::text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A autenticação é necessária para reservar códigos de inventário.'
      USING ERRCODE = '42501';
  END IF;

  IF p_count IS NULL OR p_count < 1 OR p_count > 1000 THEN
    RAISE EXCEPTION 'A quantidade de códigos a reservar deve ficar entre 1 e 1.000.'
      USING ERRCODE = '22023';
  END IF;

  IF p_reserved_codes IS NULL
     OR pg_catalog.cardinality(p_reserved_codes) > 1000
     OR EXISTS (
       SELECT 1
         FROM pg_catalog.unnest(p_reserved_codes) AS reserved(code)
        WHERE reserved.code IS NULL OR reserved.code !~ '^[0-9]{6}$'
     ) THEN
    RAISE EXCEPTION 'A lista de códigos reservados para a sessão é inválida.'
      USING ERRCODE = '22023';
  END IF;

  SELECT allocator.last_code
    INTO v_code
    FROM public.inventory_audit_code_allocator_state AS allocator
   WHERE allocator.singleton = true
   FOR UPDATE;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'O contador de códigos de inventário não está inicializado.';
  END IF;

  FOR v_index IN 1..p_count LOOP
    LOOP
      v_code := v_code + 1;
      IF v_code > 999999 THEN
        RAISE EXCEPTION 'O limite de códigos de inventário de seis dígitos foi atingido.';
      END IF;

      v_candidate := pg_catalog.lpad(v_code::text, 6, '0');
      EXIT WHEN NOT (v_candidate = ANY(p_reserved_codes));
    END LOOP;

    v_codes := pg_catalog.array_append(v_codes, v_candidate);
  END LOOP;

  UPDATE public.inventory_audit_code_allocator_state
     SET last_code = v_code
   WHERE singleton = true;

  RETURN v_codes;
END;
$function$;

COMMENT ON FUNCTION public.reserve_next_inventory_codes(text[], integer)
  IS 'Reserva atomicamente vários códigos únicos para corrigir rascunhos locais de inventário e atualiza o contador uma vez por lote.';

REVOKE ALL ON FUNCTION public.reserve_next_inventory_codes(text[], integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_next_inventory_codes(text[], integer)
  TO authenticated;

COMMIT;
