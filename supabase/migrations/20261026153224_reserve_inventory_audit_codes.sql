BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

CREATE TABLE IF NOT EXISTS public.inventory_audit_code_allocator_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  last_code integer NOT NULL CHECK (last_code >= 0)
);

ALTER TABLE public.inventory_audit_code_allocator_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_audit_code_allocator_state_deny_api
  ON public.inventory_audit_code_allocator_state
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);
REVOKE ALL ON TABLE public.inventory_audit_code_allocator_state
  FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO public.inventory_audit_code_allocator_state (singleton, last_code)
SELECT true, COALESCE(MAX(marker_code.code_text::integer), 0)
  FROM (
    SELECT COALESCE(
      CASE
        WHEN pg_catalog.pg_input_is_valid(observation, 'jsonb')
          THEN observation::jsonb->>'inventoryCode'
      END,
      substring(label FROM '^Inventário #([0-9]+)')
    ) AS code_text
      FROM public.inventory_moves
     WHERE label ILIKE 'Inventário #%'
  ) AS marker_code
 WHERE marker_code.code_text ~ '^[0-9]{1,6}$'
ON CONFLICT (singleton) DO UPDATE
  SET last_code = GREATEST(
    public.inventory_audit_code_allocator_state.last_code,
    EXCLUDED.last_code
  );

CREATE OR REPLACE FUNCTION public.reserve_next_inventory_code(
  p_reserved_codes text[] DEFAULT ARRAY[]::text[]
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_code integer;
  v_candidate text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A autenticação é necessária para reservar código de inventário.'
      USING ERRCODE = '42501';
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

  UPDATE public.inventory_audit_code_allocator_state
     SET last_code = last_code + 1
   WHERE singleton = true
   RETURNING last_code INTO v_code;

  LOOP
    IF v_code IS NULL THEN
      RAISE EXCEPTION 'O contador de códigos de inventário não está inicializado.';
    END IF;
    IF v_code > 999999 THEN
      RAISE EXCEPTION 'O limite de códigos de inventário de seis dígitos foi atingido.';
    END IF;

    v_candidate := pg_catalog.lpad(v_code::text, 6, '0');
    EXIT WHEN NOT (v_candidate = ANY(p_reserved_codes));

    UPDATE public.inventory_audit_code_allocator_state
       SET last_code = last_code + 1
     WHERE singleton = true
     RETURNING last_code INTO v_code;
  END LOOP;

  RETURN v_candidate;
END;
$function$;

COMMENT ON FUNCTION public.reserve_next_inventory_code(text[])
  IS 'Reserva atomicamente um código único para um inventário e pula códigos já usados por rascunhos locais informados pelo dispositivo.';

REVOKE ALL ON FUNCTION public.reserve_next_inventory_code(text[])
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_next_inventory_code(text[])
  TO authenticated;

COMMIT;
