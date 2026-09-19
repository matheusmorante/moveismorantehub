-- Adiciona a coluna last_label_sequence na tabela product_variations
ALTER TABLE public.product_variations
ADD COLUMN IF NOT EXISTS last_label_sequence INTEGER DEFAULT 0;

-- Cria ou substitui a função RPC para incrementar o sequencial
CREATE OR REPLACE FUNCTION public.allocate_label_sequences(p_variation_id UUID, p_count INT)
RETURNS TABLE (
    start_sequence INT,
    end_sequence INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_sequence INT;
    v_new_sequence INT;
BEGIN
    -- Bloqueia a linha da variação para atualização garantindo atomicidade (Evita Race Conditions)
    SELECT last_label_sequence INTO v_current_sequence
    FROM public.product_variations
    WHERE id = p_variation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Variação com ID % não encontrada', p_variation_id;
    END IF;

    -- Se o valor atual for nulo (não deveria por causa do DEFAULT, mas previne erros)
    IF v_current_sequence IS NULL THEN
        v_current_sequence := 0;
    END IF;

    -- Calcula o novo sequencial
    v_new_sequence := v_current_sequence + p_count;

    -- Atualiza a variação com o novo sequencial
    UPDATE public.product_variations
    SET last_label_sequence = v_new_sequence
    WHERE id = p_variation_id;

    -- Retorna os valores
    start_sequence := v_current_sequence + 1;
    end_sequence := v_new_sequence;
    RETURN NEXT;
END;
$$;
