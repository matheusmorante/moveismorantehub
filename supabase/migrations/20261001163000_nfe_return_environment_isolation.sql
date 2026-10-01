-- Allow fiscal allocations for both environments while preserving strict environment and test-run isolation.
CREATE OR REPLACE FUNCTION public.create_return_order_with_fiscal_capacity(
  p_order_id text,
  p_order_payload jsonb,
  p_items jsonb,
  p_payments jsonb,
  p_fiscal_allocations jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $function$
DECLARE
  v_source_id text := COALESCE(p_order_payload->>'linked_order_id', p_order_payload->'order_data'->>'linkedOrderId');
  v_source public.orders%ROWTYPE;
  v_allocation jsonb;
  v_item jsonb;
  v_source_item jsonb;
  v_invoice_line public.nfe_document_items%ROWTYPE;
  v_document public.nfe_documents%ROWTYPE;
  v_existing_order public.orders%ROWTYPE;
  v_return_index integer;
  v_original_index integer;
  v_quantity numeric;
  v_already_allocated numeric;
  v_request_line_quantity numeric;
  v_item_allocated numeric;
  v_expected_quantity numeric;
  v_existing_allocations integer;
  v_requested_allocations integer := jsonb_array_length(p_fiscal_allocations);
  v_selected_environment integer;
  v_source_test_run_id text;
  v_input_test_run_id text;
  v_input_test_environment text;
  v_return_payload jsonb := p_order_payload;
  v_result jsonb;
BEGIN
  IF v_source_id IS NULL OR jsonb_typeof(p_fiscal_allocations) <> 'array' OR jsonb_array_length(p_fiscal_allocations) = 0 THEN
    RAISE EXCEPTION 'Alocações fiscais inválidas para a devolução';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_source_id));
  SELECT * INTO v_source FROM public.orders WHERE id::text = v_source_id FOR UPDATE;
  IF NOT FOUND OR v_source.order_type <> 'sale' OR v_source.status = 'cancelled' THEN
    RAISE EXCEPTION 'Venda original inválida para devolução fiscal';
  END IF;
  IF COALESCE(p_order_payload->>'order_type', p_order_payload->'order_data'->>'orderType') <> 'return' THEN
    RAISE EXCEPTION 'O pedido precisa ser uma devolução comercial';
  END IF;

  SELECT * INTO v_existing_order FROM public.orders WHERE id::text = p_order_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing_order.order_type <> 'return'
       OR (v_existing_order.linked_order_id <> v_source_id AND v_existing_order.order_data->>'linkedOrderId' <> v_source_id)
       OR v_existing_order.order_data->>'returnRequestId' <> p_order_payload->'order_data'->>'returnRequestId' THEN
      RAISE EXCEPTION 'Identificador da devolução já utilizado por outra solicitação';
    END IF;
    SELECT count(*) INTO v_existing_allocations FROM public.nfe_return_item_allocations
     WHERE return_order_id = p_order_id;
    IF v_existing_allocations <> v_requested_allocations OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_fiscal_allocations) requested(value)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.nfe_return_item_allocations saved
          WHERE saved.return_order_id = p_order_id
            AND saved.return_item_index = (requested.value->>'returnItemIndex')::integer
            AND saved.original_document_id = (requested.value->>'originalDocumentId')::uuid
            AND saved.original_item_number = (requested.value->>'originalItemNumber')::integer
            AND saved.quantity = (requested.value->>'quantity')::numeric
       )
    ) THEN
      RAISE EXCEPTION 'Repetição da devolução contém alocações fiscais diferentes da solicitação original';
    END IF;
    -- A replay may not use the idempotency key to relabel an existing return
    -- or bypass the original document's environment/test-run boundary.
    IF EXISTS (
      SELECT 1
        FROM public.nfe_return_item_allocations saved
        JOIN public.nfe_documents original ON original.id = saved.original_document_id
       WHERE saved.return_order_id = p_order_id
         AND (
           (original.ambiente = 2 AND (
             v_existing_order.order_data->>'is_test' IS DISTINCT FROM 'true'
             OR v_existing_order.order_data->>'test_environment' IS DISTINCT FROM 'homologation'
             OR NULLIF(v_existing_order.order_data->>'testRunId', '') IS DISTINCT FROM NULLIF(v_source.order_data->>'testRunId', '')
             OR COALESCE(p_order_payload->'order_data'->>'testRunId', p_order_payload->>'testRunId', v_source.order_data->>'testRunId')
                  IS DISTINCT FROM v_source.order_data->>'testRunId'
             OR COALESCE(p_order_payload->'order_data'->>'test_environment', p_order_payload->>'test_environment', 'homologation') <> 'homologation'
             OR COALESCE(p_order_payload->'order_data'->>'is_test', p_order_payload->>'is_test', 'true') <> 'true'
           ))
           OR (original.ambiente = 1 AND (
             COALESCE(p_order_payload->'order_data'->>'test_environment', p_order_payload->>'test_environment') = 'homologation'
             OR COALESCE(p_order_payload->'order_data'->>'is_test', p_order_payload->>'is_test') = 'true'
             OR COALESCE(p_order_payload->'order_data'->>'testRunId', p_order_payload->>'testRunId') IS NOT NULL
           ))
           OR original.ambiente NOT IN (1, 2)
         )
    ) THEN
      RAISE EXCEPTION 'Repetição da devolução viola o isolamento do ambiente ou do testRunId fiscal';
    END IF;
    RETURN jsonb_build_object('id', v_existing_order.id, 'order_index', v_existing_order.order_index,
      'order_data', v_existing_order.order_data, 'status', v_existing_order.status,
      'stock_processed', v_existing_order.stock_processed, 'idempotent_replay', true);
  END IF;

  FOR v_allocation IN SELECT value FROM jsonb_array_elements(p_fiscal_allocations) LOOP
    v_return_index := NULLIF(v_allocation->>'returnItemIndex', '')::integer;
    v_original_index := NULLIF(v_allocation->>'originalOrderItemIndex', '')::integer;
    v_quantity := NULLIF(v_allocation->>'quantity', '')::numeric;
    IF v_return_index IS NULL OR v_original_index IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Alocação de item fiscal incompleta ou inválida';
    END IF;
    v_item := p_items->v_return_index;
    IF v_item IS NULL OR v_item = 'null'::jsonb OR NULLIF(v_item->>'originalOrderItemIndex', '')::integer IS DISTINCT FROM v_original_index THEN
      RAISE EXCEPTION 'Alocação não corresponde ao item comercial devolvido';
    END IF;
    v_source_item := v_source.items->v_original_index;
    IF v_source_item IS NULL OR v_source_item = 'null'::jsonb THEN
      RAISE EXCEPTION 'Linha original da venda não encontrada';
    END IF;

    SELECT * INTO v_document FROM public.nfe_documents
     WHERE id = NULLIF(v_allocation->>'originalDocumentId', '')::uuid
       AND order_id::text = v_source_id AND document_type = 'outbound'
       AND ambiente IN (1, 2)
       AND status = CASE ambiente WHEN 1 THEN 'autorizada' WHEN 2 THEN 'homologada' END
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A linha deve pertencer a um documento fiscal original autorizado no ambiente correspondente';
    END IF;
    IF v_selected_environment IS NULL THEN
      v_selected_environment := v_document.ambiente;
    ELSIF v_selected_environment <> v_document.ambiente THEN
      RAISE EXCEPTION 'Uma devolução não pode misturar documentos fiscais de Produção e Homologação';
    END IF;

    v_input_test_run_id := NULLIF(COALESCE(
      p_order_payload->'order_data'->>'testRunId', p_order_payload->>'testRunId'), '');
    v_input_test_environment := COALESCE(
      p_order_payload->'order_data'->>'test_environment', p_order_payload->>'test_environment');
    IF v_document.ambiente = 2 THEN
      v_source_test_run_id := NULLIF(v_source.order_data->>'testRunId', '');
      IF v_source.order_data->>'is_test' IS DISTINCT FROM 'true'
         OR v_source.order_data->>'test_environment' IS DISTINCT FROM 'homologation'
         OR v_source_test_run_id IS NULL THEN
        RAISE EXCEPTION 'Devolução HML exige pedido de venda identificado como teste de homologação';
      END IF;
      IF (v_input_test_run_id IS NOT NULL AND v_input_test_run_id IS DISTINCT FROM v_source_test_run_id)
         OR (v_input_test_environment IS NOT NULL AND v_input_test_environment <> 'homologation')
         OR ((p_order_payload->'order_data' ? 'is_test')
             AND p_order_payload->'order_data'->>'is_test' IS DISTINCT FROM 'true')
         OR ((p_order_payload ? 'is_test') AND p_order_payload->>'is_test' IS DISTINCT FROM 'true') THEN
        RAISE EXCEPTION 'A devolução HML precisa permanecer no mesmo testRunId da venda original';
      END IF;
      v_return_payload := jsonb_set(
        p_order_payload, '{order_data}',
        COALESCE(p_order_payload->'order_data', '{}'::jsonb) ||
          jsonb_build_object('testRunId', v_source_test_run_id, 'test_run_id', v_source_test_run_id,
            'is_test', true, 'test_environment', 'homologation'), true);
    ELSIF v_source.order_data->>'test_environment' = 'homologation'
       OR v_source.order_data->>'is_test' = 'true'
       OR NULLIF(v_source.order_data->>'testRunId', '') IS NOT NULL
       OR v_input_test_environment = 'homologation'
       OR COALESCE(p_order_payload->'order_data'->>'is_test', p_order_payload->>'is_test') = 'true'
       OR v_input_test_run_id IS NOT NULL THEN
      RAISE EXCEPTION 'Uma devolução identificada como teste HML não pode usar NF-e de Produção';
    END IF;
    SELECT * INTO v_invoice_line FROM public.nfe_document_items
     WHERE document_id = v_document.id
       AND item_number = NULLIF(v_allocation->>'originalItemNumber', '')::integer;
    IF NOT FOUND THEN RAISE EXCEPTION 'Linha fiscal autorizada não disponível; sincronize os itens do XML antes'; END IF;

    IF v_invoice_line.product_code NOT IN (
        COALESCE(v_source_item->>'code', ''), COALESCE(v_source_item->>'productId', ''),
        (v_original_index + 1)::text
       ) AND lower(btrim(v_invoice_line.description)) <> lower(btrim(COALESCE(v_source_item->>'description', ''))) THEN
      RAISE EXCEPTION 'Linha fiscal não corresponde ao item original da venda';
    END IF;
    IF v_invoice_line.product_code <> COALESCE(v_item->>'code', v_invoice_line.product_code)
       AND lower(btrim(v_invoice_line.description)) <> lower(btrim(COALESCE(v_item->>'description', ''))) THEN
      RAISE EXCEPTION 'A devolução não corresponde ao produto da linha fiscal';
    END IF;

    SELECT COALESCE(sum(allocation.quantity), 0) INTO v_already_allocated
      FROM public.nfe_return_item_allocations allocation
      JOIN public.orders returned ON returned.id = allocation.return_order_id
     WHERE allocation.original_document_id = v_document.id
       AND allocation.original_item_number = v_invoice_line.item_number
       AND returned.status <> 'cancelled';
    -- A mesma linha da NF-e pode aparecer em mais de um item da devolução.
    -- Conferir o total desta requisição, não cada alocação isoladamente.
    SELECT COALESCE(sum((requested.value->>'quantity')::numeric), 0)
      INTO v_request_line_quantity
      FROM jsonb_array_elements(p_fiscal_allocations) AS requested(value)
     WHERE requested.value->>'originalDocumentId' = v_document.id::text
       AND (requested.value->>'originalItemNumber')::integer = v_invoice_line.item_number;
    IF v_already_allocated + v_request_line_quantity > v_invoice_line.billed_quantity THEN
      RAISE EXCEPTION 'Quantidade acima do saldo faturado: faturado %, já reservada %, solicitada %',
        v_invoice_line.billed_quantity, v_already_allocated, v_request_line_quantity;
    END IF;
  END LOOP;

  FOR v_return_index IN 0..jsonb_array_length(p_items) - 1 LOOP
    v_item := p_items->v_return_index;
    SELECT COALESCE(sum(NULLIF(value->>'quantity', '')::numeric), 0)
      INTO v_item_allocated
      FROM jsonb_array_elements(p_fiscal_allocations) WHERE (value->>'returnItemIndex')::integer = v_return_index;
    v_expected_quantity := COALESCE(NULLIF(v_item->>'returnedQuantity', '')::numeric, NULLIF(v_item->>'quantity', '')::numeric, 0);
    IF v_item_allocated <> v_expected_quantity THEN
      RAISE EXCEPTION 'Toda quantidade do item devolvido precisa estar vinculada às linhas fiscais de origem';
    END IF;
  END LOOP;

  v_result := public.create_return_order_with_capacity(p_order_id, v_return_payload, p_items, p_payments);
  IF COALESCE((v_result->>'idempotent_replay')::boolean, false) THEN
    SELECT count(*) INTO v_existing_allocations FROM public.nfe_return_item_allocations
     WHERE return_order_id = v_result->>'id';
    IF v_existing_allocations <> v_requested_allocations OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_fiscal_allocations) requested(value)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.nfe_return_item_allocations saved
          WHERE saved.return_order_id = v_result->>'id'
            AND saved.return_item_index = (requested.value->>'returnItemIndex')::integer
            AND saved.original_document_id = (requested.value->>'originalDocumentId')::uuid
            AND saved.original_item_number = (requested.value->>'originalItemNumber')::integer
            AND saved.quantity = (requested.value->>'quantity')::numeric
       )
    ) THEN
      RAISE EXCEPTION 'Repetição da devolução contém alocações fiscais diferentes da solicitação original';
    END IF;
    RETURN v_result;
  END IF;
  FOR v_allocation IN SELECT value FROM jsonb_array_elements(p_fiscal_allocations) LOOP
    INSERT INTO public.nfe_return_item_allocations(
      return_order_id, return_item_index, original_document_id, original_item_number, quantity
    ) VALUES (
      v_result->>'id',
      (v_allocation->>'returnItemIndex')::integer,
      (v_allocation->>'originalDocumentId')::uuid,
      (v_allocation->>'originalItemNumber')::integer,
      (v_allocation->>'quantity')::numeric
    );
  END LOOP;
  RETURN v_result;
END;
$function$;
