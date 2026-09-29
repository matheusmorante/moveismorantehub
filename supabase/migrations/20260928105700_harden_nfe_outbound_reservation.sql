-- Keep the SQL/API RPC contract explicit, serialize only the same fiscal scope,
-- and remove the permissive policies created by the original NF-e migration.
DO $$
BEGIN
  IF to_regclass('public.nfe_documents') IS NULL
     OR to_regclass('public.nfe_sequences') IS NULL THEN
    RAISE EXCEPTION 'Pré-requisito ausente: aplique primeiro a migration base de NF-e.';
  END IF;
  IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'nfe_documents'
          AND column_name = 'document_type'
     ) OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'nfe_documents'
          AND column_name = 'emission_request_id'
     ) OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'nfe_documents'
          AND column_name = 'finalidade'
     ) THEN
    RAISE EXCEPTION 'Pré-requisito ausente: linhagem e idempotência fiscal não foram aplicadas.';
  END IF;
  IF to_regprocedure('public.get_next_nfe_number(character varying,character varying,integer)') IS NULL THEN
    RAISE EXCEPTION 'Pré-requisito ausente: função legada de sequência fiscal não existe.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_nfe_outbound_emission(
    p_order_id text,
    p_modelo varchar(2),
    p_ambiente integer,
    p_emission_request_id uuid,
    p_chave_acesso varchar(44),
    p_xml_nfe text,
    p_numero_nfe integer,
    p_serie varchar(4)
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id uuid;
    v_existing_status varchar;
    v_new_id uuid;
BEGIN
    IF p_order_id IS NULL
       OR p_modelo IS NULL OR p_modelo NOT IN ('55', '65')
       OR p_ambiente IS NULL OR p_ambiente NOT IN (1, 2)
       OR p_emission_request_id IS NULL
       OR COALESCE(p_chave_acesso, '') !~ '^[0-9]{44}$'
       OR COALESCE(p_xml_nfe, '') = ''
       OR p_numero_nfe IS NULL OR p_numero_nfe NOT BETWEEN 1 AND 999999999
       OR COALESCE(p_serie, '') !~ '^[0-9]{1,3}$'
       OR substring(p_chave_acesso FROM 21 FOR 2) <> p_modelo
       OR substring(p_chave_acesso FROM 23 FOR 3) <> lpad(p_serie, 3, '0')
       OR substring(p_chave_acesso FROM 26 FOR 9) <> lpad(p_numero_nfe::text, 9, '0')
       OR position(('Id="NFe' || p_chave_acesso || '"') IN p_xml_nfe) = 0 THEN
        RAISE EXCEPTION 'Envelope inválido para reserva de emissão fiscal.';
    END IF;

    -- Unique active attempts are scoped by order, model, and environment.
    PERFORM pg_advisory_xact_lock(hashtextextended(
        'nfe_emit:' || p_order_id::text || ':' || p_modelo || ':' || p_ambiente::text,
        0
    ));

    IF EXISTS (
        SELECT 1 FROM public.nfe_documents
         WHERE emission_request_id = p_emission_request_id
    ) THEN
        RAISE EXCEPTION 'DUPLICATE_IDEMPOTENCY_KEY';
    END IF;

    SELECT id, status INTO v_existing_id, v_existing_status
      FROM public.nfe_documents
     WHERE order_id = p_order_id
       AND modelo = p_modelo
       AND ambiente = p_ambiente
       AND document_type = 'outbound'
       AND status IN ('pendente', 'processando')
     LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'ALREADY_ACTIVE:%:%', v_existing_id, v_existing_status;
    END IF;

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
$$;

REVOKE ALL ON FUNCTION public.reserve_nfe_outbound_emission(
    text, varchar, integer, uuid, varchar, text, integer, varchar
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_nfe_outbound_emission(
    text, varchar, integer, uuid, varchar, text, integer, varchar
) TO service_role;

-- This legacy SECURITY DEFINER function has no current application callers.
-- Keep it unavailable to browser roles and pin its name resolution.
ALTER FUNCTION public.get_next_nfe_number(varchar, varchar, integer)
    SET search_path = public;
REVOKE ALL ON FUNCTION public.get_next_nfe_number(varchar, varchar, integer)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_nfe_number(varchar, varchar, integer)
    TO service_role;

-- The ERP fiscal list is read-only. Fiscal writes stay behind the authenticated
-- backend using service_role; anonymous users never receive XML or recipient data.
DROP POLICY IF EXISTS "Permitir leitura para autenticados e anon em nfe_documents"
    ON public.nfe_documents;
DROP POLICY IF EXISTS "Permitir inserção e atualização em nfe_documents"
    ON public.nfe_documents;
DROP POLICY IF EXISTS "Permitir tudo em nfe_sequences"
    ON public.nfe_sequences;
DROP POLICY IF EXISTS nfe_documents_authenticated_read
    ON public.nfe_documents;

CREATE POLICY nfe_documents_authenticated_read
    ON public.nfe_documents
    FOR SELECT TO authenticated
    USING (true);

ALTER TABLE public.nfe_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_sequences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nfe_documents, public.nfe_sequences
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.nfe_documents TO authenticated;
GRANT ALL ON TABLE public.nfe_documents, public.nfe_sequences TO service_role;
