-- Reserve the next document number atomically, respecting the configured minimum.
CREATE OR REPLACE FUNCTION public.reserve_next_nfe_number(
    p_modelo VARCHAR(2),
    p_serie VARCHAR(4),
    p_ambiente INTEGER,
    p_numero_minimo INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_num INTEGER;
BEGIN
    IF p_modelo NOT IN ('55', '65') OR p_ambiente NOT IN (1, 2)
       OR COALESCE(p_serie, '') = '' OR COALESCE(p_numero_minimo, 0) < 1 THEN
        RAISE EXCEPTION 'Parâmetros inválidos para reserva de numeração fiscal.';
    END IF;

    INSERT INTO public.nfe_sequences (modelo, serie, ambiente, ultimo_numero, updated_at)
    VALUES (p_modelo, p_serie, p_ambiente, p_numero_minimo, now())
    ON CONFLICT (modelo, serie, ambiente)
    DO UPDATE SET
        ultimo_numero = GREATEST(
            public.nfe_sequences.ultimo_numero + 1,
            EXCLUDED.ultimo_numero
        ),
        updated_at = now()
    RETURNING ultimo_numero INTO v_next_num;

    RETURN v_next_num;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_next_nfe_number(VARCHAR, VARCHAR, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_next_nfe_number(VARCHAR, VARCHAR, INTEGER, INTEGER) TO authenticated;
