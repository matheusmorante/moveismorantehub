CREATE OR REPLACE FUNCTION public.reserve_nfe_outbound_emission(
    p_order_id text,
    p_modelo varchar(2),
    p_ambiente integer,
    p_emission_request_id uuid,
    p_chave_acesso varchar(44),
    p_xml_nfe text,
    p_numero_nfe integer,
    p_serie varchar(4)
) RETURNS uuid AS $$
DECLARE
    v_existing_id uuid;
    v_existing_status varchar;
    v_new_id uuid;
BEGIN
    -- Adquire lock no pedido para garantir serialização de tentativas na mesma operação fiscal
    PERFORM pg_advisory_xact_lock(hashtext('nfe_emit_order_' || p_order_id::text));
    
    -- Verifica se já existe uma tentativa ativa (pendente ou processando)
    SELECT id, status INTO v_existing_id, v_existing_status
    FROM public.nfe_documents
    WHERE order_id = p_order_id
      AND document_type = 'outbound'
      AND status IN ('pendente', 'processando')
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'ALREADY_ACTIVE:%:%', v_existing_id, v_existing_status;
    END IF;

    -- Impede reuso do mesmo emission_request_id
    IF EXISTS (SELECT 1 FROM public.nfe_documents WHERE emission_request_id = p_emission_request_id) THEN
        RAISE EXCEPTION 'DUPLICATE_IDEMPOTENCY_KEY';
    END IF;

    -- Reserva a nova emissão
    INSERT INTO public.nfe_documents (
        order_id, numero_nfe, serie, chave_acesso,
        modelo, ambiente, status, document_type, finalidade,
        emission_request_id, motivo_status, xml_nfe, created_at, updated_at
    ) VALUES (
        p_order_id, p_numero_nfe, p_serie, p_chave_acesso,
        p_modelo, p_ambiente, 'processando', 'outbound', 1,
        p_emission_request_id, 'Transmissão em andamento', p_xml_nfe, now(), now()
    ) RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
