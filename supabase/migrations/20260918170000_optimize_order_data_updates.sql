-- Otimização: Prevenir a explosão de Realtime Updates no `order_data` 
-- quando o JSON não foi modificado.

CREATE OR REPLACE FUNCTION public.sync_order_items_to_order_data()
RETURNS trigger AS $$
DECLARE
    v_order_id uuid;
    v_new_items jsonb;
    v_new_payments jsonb;
    v_old_order_data jsonb;
    v_new_order_data jsonb;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_order_id := OLD.order_id;
    ELSE
        v_order_id := NEW.order_id;
    END IF;

    -- Extrai o estado atual do pedido
    SELECT order_data INTO v_old_order_data
    FROM public.orders
    WHERE id = v_order_id;

    -- Constrói a nova listagem de itens da base normalizada
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'productId', product_id,
            'variationId', variation_id,
            'name', name,
            'sku', sku,
            'quantity', quantity,
            'unitPrice', unit_price,
            'discount', discount,
            'subtotal', subtotal,
            'notes', notes,
            'isComposition', is_composition,
            'compositionId', composition_id,
            'parentCompositionId', parent_composition_id
        )
    ), '[]'::jsonb)
    INTO v_new_items
    FROM public.order_items
    WHERE order_id = v_order_id;

    -- Constrói a nova listagem de pagamentos
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'method', method,
            'amount', amount,
            'installments', installments,
            'status', status,
            'dueDate', due_date,
            'paymentDate', payment_date
        )
    ), '[]'::jsonb)
    INTO v_new_payments
    FROM public.order_payments
    WHERE order_id = v_order_id;

    v_new_order_data := jsonb_set(
        COALESCE(v_old_order_data, '{}'::jsonb),
        '{items}',
        v_new_items,
        true
    );

    v_new_order_data := jsonb_set(
        v_new_order_data,
        '{payments}',
        v_new_payments,
        true
    );

    -- ATENÇÃO: AQUI ESTÁ A CORREÇÃO (IS DISTINCT FROM)
    -- Isso garante que se o trigger for chamado devido a um detalhe trivial que não muda a estrutura de itens/pagamentos, o update real não vai pro banco, evitando Realtime.
    IF v_old_order_data IS DISTINCT FROM v_new_order_data THEN
        UPDATE public.orders
        SET order_data = v_new_order_data,
            updated_at = NOW()
        WHERE id = v_order_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
