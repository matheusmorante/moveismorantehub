-- Preserve rejected XML/protocol as a historical attempt while allowing a new
-- draft for the same source/return. No existing fiscal record is backfilled.
DROP INDEX IF EXISTS public.uq_nfe_estorno_draft_source;
DROP INDEX IF EXISTS public.uq_nfe_return_draft_source_order;

CREATE UNIQUE INDEX uq_nfe_estorno_draft_source
  ON public.nfe_operation_drafts(original_document_id, environment)
  WHERE operation_kind = 'estorno' AND status <> 'rejected';
CREATE UNIQUE INDEX uq_nfe_return_draft_source_order
  ON public.nfe_operation_drafts(original_document_id, return_order_id, environment)
  WHERE operation_kind = 'return' AND status <> 'rejected';

-- A return allocation may be linked to more than one historical rejected
-- draft. Only the active draft can authorize it; fiscal_return_document_id
-- remains the authoritative one-time consumption guard.
ALTER TABLE public.nfe_operation_draft_allocations
  DROP CONSTRAINT IF EXISTS nfe_operation_draft_allocations_allocation_id_key;

CREATE OR REPLACE FUNCTION public.prepare_nfe_operation_draft(
  p_kind text,
  p_original_document_id uuid,
  p_return_order_id uuid,
  p_environment smallint,
  p_reason text,
  p_user_id uuid
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE
  v_source public.nfe_documents%ROWTYPE;
  v_sale public.orders%ROWTYPE;
  v_return public.orders%ROWTYPE;
  v_existing_id uuid;
  v_draft_id uuid;
  v_source_line record;
  v_quantity numeric;
  v_item_number integer := 0;
BEGIN
  IF p_kind NOT IN ('estorno', 'return') OR p_environment NOT IN (1, 2) THEN
    RAISE EXCEPTION 'Tipo ou ambiente fiscal inválido';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_original_document_id::text));
  SELECT * INTO v_source FROM public.nfe_documents
   WHERE id = p_original_document_id FOR UPDATE;
  IF NOT FOUND OR v_source.document_type <> 'outbound'
     OR v_source.ambiente <> p_environment
     OR v_source.status <> (CASE WHEN p_environment = 1 THEN 'autorizada' ELSE 'homologada' END)
     OR v_source.modelo <> '55'
     OR COALESCE(v_source.numero_protocolo, '') !~ '^[0-9]{15}$'
     OR v_source.chave_acesso !~ '^[0-9]{44}$' THEN
    RAISE EXCEPTION 'Documento fiscal original não autorizado no ambiente selecionado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.nfe_document_items WHERE document_id = v_source.id) THEN
    RAISE EXCEPTION 'NF-e original sem linhas fiscais conferidas; reconciliação manual necessária';
  END IF;
  SELECT * INTO v_sale FROM public.orders WHERE id = v_source.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda original não encontrada'; END IF;

  SELECT id INTO v_existing_id FROM public.nfe_operation_drafts
   WHERE operation_kind = p_kind AND original_document_id = p_original_document_id
     AND environment = p_environment
     AND return_order_id IS NOT DISTINCT FROM p_return_order_id
     AND status <> 'rejected'
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN v_existing_id; END IF;

  IF p_kind = 'estorno' THEN
    IF p_return_order_id IS NOT NULL OR length(btrim(COALESCE(p_reason, ''))) < 15 THEN
      RAISE EXCEPTION 'Estorno exige justificativa e não pode apontar uma devolução';
    END IF;
    IF v_sale.status IN ('fulfilled', 'atendido') THEN
      RAISE EXCEPTION 'Venda atendida não é elegível a estorno fiscal; verifique devolução';
    END IF;
  ELSE
    IF p_return_order_id IS NULL THEN RAISE EXCEPTION 'Devolução comercial obrigatória'; END IF;
    SELECT * INTO v_return FROM public.orders WHERE id = p_return_order_id FOR UPDATE;
    IF NOT FOUND OR v_return.order_type <> 'return' OR v_return.status <> 'fulfilled'
       OR (v_return.linked_order_id IS DISTINCT FROM v_source.order_id::text
           AND v_return.order_data->>'linkedOrderId' IS DISTINCT FROM v_source.order_id::text) THEN
      RAISE EXCEPTION 'A devolução precisa estar atendida e vinculada à venda faturada';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.nfe_return_item_allocations
       WHERE return_order_id = p_return_order_id AND original_document_id = p_original_document_id
         AND fiscal_return_document_id IS NULL
    ) THEN RAISE EXCEPTION 'Devolução sem itens fiscais ainda disponíveis para vincular à NF-e'; END IF;
  END IF;

  INSERT INTO public.nfe_operation_drafts(
    operation_kind, finalidade, original_document_id, original_access_key,
    return_order_id, environment, reason, created_by
  ) VALUES (
    p_kind, CASE WHEN p_kind = 'estorno' THEN 3 ELSE 4 END,
    v_source.id, v_source.chave_acesso, p_return_order_id, p_environment,
    NULLIF(btrim(p_reason), ''), p_user_id
  ) RETURNING id INTO v_draft_id;

  FOR v_source_line IN SELECT * FROM public.nfe_document_items
                         WHERE document_id = v_source.id ORDER BY item_number LOOP
    IF p_kind = 'estorno' THEN
      v_quantity := v_source_line.billed_quantity;
    ELSE
      SELECT COALESCE(sum(quantity), 0) INTO v_quantity
        FROM public.nfe_return_item_allocations
       WHERE return_order_id = p_return_order_id
         AND original_document_id = v_source.id
         AND original_item_number = v_source_line.item_number
         AND fiscal_return_document_id IS NULL;
    END IF;
    IF v_quantity = 0 THEN CONTINUE; END IF;
    IF v_quantity > v_source_line.billed_quantity THEN
      RAISE EXCEPTION 'Quantidade da devolução acima da linha faturada';
    END IF;
    v_item_number := v_item_number + 1;
    INSERT INTO public.nfe_operation_draft_lines(
      draft_id, original_document_item_id, fiscal_item_number, quantity,
      gross_value, discount_value
    ) VALUES (
      v_draft_id, v_source_line.id, v_item_number, v_quantity,
      round(v_source_line.gross_value * v_quantity / v_source_line.billed_quantity, 2),
      round(v_source_line.discount_value * v_quantity / v_source_line.billed_quantity, 2)
    );
  END LOOP;
  IF v_item_number = 0 THEN RAISE EXCEPTION 'Rascunho fiscal sem itens devolvidos'; END IF;

  IF p_kind = 'return' THEN
    INSERT INTO public.nfe_operation_draft_allocations(draft_line_id, allocation_id)
    SELECT line.id, allocation.id
      FROM public.nfe_operation_draft_lines AS line
      JOIN public.nfe_document_items AS source_line ON source_line.id = line.original_document_item_id
      JOIN public.nfe_return_item_allocations AS allocation
        ON allocation.original_document_id = source_line.document_id
       AND allocation.original_item_number = source_line.item_number
     WHERE line.draft_id = v_draft_id AND allocation.return_order_id = p_return_order_id
       AND allocation.fiscal_return_document_id IS NULL;
  END IF;
  RETURN v_draft_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.prepare_nfe_operation_draft(text,uuid,uuid,smallint,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_operation_draft(text,uuid,uuid,smallint,text,uuid)
  TO service_role;

-- The authorization RPC must persist only the exact key and signed XML that
-- were durably claimed before the network call. A trigger makes this invariant
-- hold even if another backend path calls the privileged RPC incorrectly.
CREATE OR REPLACE FUNCTION public.enforce_nfe_draft_authorized_attempt_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $function$
BEGIN
  IF NEW.status = 'authorized' AND OLD.status IN ('transmitting', 'unknown')
     AND (OLD.access_key IS NULL OR NEW.access_key IS DISTINCT FROM OLD.access_key
       OR OLD.signed_xml IS NULL OR NEW.signed_xml IS DISTINCT FROM OLD.signed_xml) THEN
    RAISE EXCEPTION 'Documento autorizado diverge da chave/XML persistidos da tentativa';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_nfe_draft_authorized_attempt_match ON public.nfe_operation_drafts;
CREATE TRIGGER trg_nfe_draft_authorized_attempt_match
  BEFORE UPDATE ON public.nfe_operation_drafts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_nfe_draft_authorized_attempt_match();
