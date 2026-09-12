-- =============================================================================
-- Migration: 20260912160000_create_save_order_transaction_rpc.sql
-- Objetivo: Criar função RPC transacional atômica para salvar pedidos no PostgreSQL.
--           Persiste simultaneamente:
--             1. public.orders (cabeçalho normalizado)
--             2. public.order_items (itens normalizados como Master)
--             3. public.order_payments (pagamentos normalizados como Master)
--             4. order_data (snapshot de compatibilidade temporário)
--           Garante ROLLBACK total se qualquer etapa falhar.
-- Operação: 100% aditiva, idempotente e reversível.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.save_order_transaction(
    p_order_id text,
    p_order_payload jsonb,
    p_items jsonb DEFAULT '[]'::jsonb,
    p_payments jsonb DEFAULT '[]'::jsonb,
    p_is_update boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_order_id text := COALESCE(p_order_id, p_order_payload->>'id', gen_random_uuid()::text);
    v_order_number text;
    v_order_index integer;
    v_status text;
    v_order_type text;
    v_customer_id text;
    v_customer_name text;
    v_seller_id text;
    v_seller_name text;
    v_total_amount numeric(14,2);
    v_items_subtotal numeric(14,2);
    v_total_discount numeric(14,2);
    v_total_cost numeric(14,2);
    v_scheduled_date date;
    v_scheduled_start_time text;
    v_scheduled_end_time text;
    v_delivery_method text;
    v_delivery_status text;
    v_marketing_origin text;
    v_payment_method text;
    v_channel text;
    v_notes text;
    v_stock_processed boolean;
    v_is_stock_checked boolean;
    v_is_registered_in_bling boolean;
    v_deleted boolean;
    v_deleted_at timestamptz;
    v_return_order_id text;
    v_linked_order_id text;
    v_order_data jsonb;
    v_now timestamptz := now();
    v_item record;
    v_payment record;
    v_idx integer := 0;
    v_result jsonb;
BEGIN
    -- 1. Extração e sanitização dos campos de cabeçalho
    v_order_number := COALESCE(p_order_payload->>'order_number', v_order_id);
    IF (p_order_payload->>'order_index') ~ '^[0-9]+$' THEN
        v_order_index := (p_order_payload->>'order_index')::integer;
    ELSE
        v_order_index := NULL;
    END IF;

    v_status := COALESCE(p_order_payload->>'status', 'draft');
    v_order_type := COALESCE(p_order_payload->>'order_type', 'sale');
    v_customer_id := p_order_payload->>'customer_id';
    v_customer_name := p_order_payload->>'customer_name';
    v_seller_id := p_order_payload->>'seller_id';
    v_seller_name := p_order_payload->>'seller_name';
    v_total_amount := COALESCE((p_order_payload->>'total_amount')::numeric, 0);
    v_items_subtotal := COALESCE((p_order_payload->>'items_subtotal')::numeric, v_total_amount);
    v_total_discount := COALESCE((p_order_payload->>'total_discount')::numeric, 0);
    v_total_cost := COALESCE((p_order_payload->>'total_cost')::numeric, 0);

    IF (p_order_payload->>'scheduled_date') ~ '^\d{4}-\d{2}-\d{2}' THEN
        v_scheduled_date := (substring(p_order_payload->>'scheduled_date' from 1 for 10))::date;
    ELSE
        v_scheduled_date := NULL;
    END IF;

    v_scheduled_start_time := p_order_payload->>'scheduled_start_time';
    v_scheduled_end_time := p_order_payload->>'scheduled_end_time';
    v_delivery_method := p_order_payload->>'delivery_method';
    v_delivery_status := p_order_payload->>'delivery_status';
    v_marketing_origin := p_order_payload->>'marketing_origin';
    v_payment_method := p_order_payload->>'payment_method';
    v_channel := COALESCE(p_order_payload->>'channel', 'Catálogo Digital');
    v_notes := p_order_payload->>'notes';
    v_stock_processed := COALESCE((p_order_payload->>'stock_processed')::boolean, false);
    v_is_stock_checked := COALESCE((p_order_payload->>'is_stock_checked')::boolean, false);
    v_is_registered_in_bling := COALESCE((p_order_payload->>'is_registered_in_bling')::boolean, false);
    v_deleted := COALESCE((p_order_payload->>'deleted')::boolean, false);

    IF p_order_payload->>'deleted_at' IS NOT NULL THEN
        v_deleted_at := (p_order_payload->>'deleted_at')::timestamptz;
    ELSE
        v_deleted_at := NULL;
    END IF;

    v_return_order_id := p_order_payload->>'return_order_id';
    v_linked_order_id := p_order_payload->>'linked_order_id';

    -- Sincronização do JSONB legado como cópia de compatibilidade
    v_order_data := COALESCE(p_order_payload->'order_data', '{}'::jsonb);
    v_order_data := jsonb_set(v_order_data, '{id}', to_jsonb(v_order_id), true);
    v_order_data := jsonb_set(v_order_data, '{status}', to_jsonb(v_status), true);
    v_order_data := jsonb_set(v_order_data, '{orderType}', to_jsonb(v_order_type), true);
    IF v_order_index IS NOT NULL THEN
        v_order_data := jsonb_set(v_order_data, '{orderIndex}', to_jsonb(v_order_index), true);
        v_order_data := jsonb_set(v_order_data, '{orderNumber}', to_jsonb(v_order_index), true);
    END IF;
    IF jsonb_typeof(p_items) = 'array' THEN
        v_order_data := jsonb_set(v_order_data, '{items}', p_items, true);
    END IF;
    IF jsonb_typeof(p_payments) = 'array' THEN
        v_order_data := jsonb_set(v_order_data, '{payments}', p_payments, true);
    END IF;

    -- Marcador interno na sessão para o trigger saber que foi a RPC que executou (evita re-trabalho)
    PERFORM set_config('morante.in_order_transaction', 'true', true);

    -- 2. Upsert na tabela de cabeçalho (orders)
    INSERT INTO public.orders (
        id, order_number, order_index, status, order_type,
        customer_id, customer_name, seller_id, seller_name,
        total_amount, items_subtotal, total_discount, total_cost,
        scheduled_date, scheduled_start_time, scheduled_end_time,
        delivery_method, delivery_status, marketing_origin,
        payment_method, channel, notes,
        stock_processed, is_stock_checked, is_registered_in_bling,
        deleted, deleted_at, return_order_id, linked_order_id,
        items, order_data, updated_at
    ) VALUES (
        v_order_id, v_order_number, v_order_index, v_status, v_order_type,
        v_customer_id, v_customer_name, v_seller_id, v_seller_name,
        v_total_amount, v_items_subtotal, v_total_discount, v_total_cost,
        v_scheduled_date, v_scheduled_start_time, v_scheduled_end_time,
        v_delivery_method, v_delivery_status, v_marketing_origin,
        v_payment_method, v_channel, v_notes,
        v_stock_processed, v_is_stock_checked, v_is_registered_in_bling,
        v_deleted, v_deleted_at, v_return_order_id, v_linked_order_id,
        COALESCE(p_items, '[]'::jsonb), v_order_data, v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        order_number = EXCLUDED.order_number,
        order_index = COALESCE(EXCLUDED.order_index, public.orders.order_index),
        status = EXCLUDED.status,
        order_type = EXCLUDED.order_type,
        customer_id = EXCLUDED.customer_id,
        customer_name = EXCLUDED.customer_name,
        seller_id = EXCLUDED.seller_id,
        seller_name = EXCLUDED.seller_name,
        total_amount = EXCLUDED.total_amount,
        items_subtotal = EXCLUDED.items_subtotal,
        total_discount = EXCLUDED.total_discount,
        total_cost = EXCLUDED.total_cost,
        scheduled_date = EXCLUDED.scheduled_date,
        scheduled_start_time = EXCLUDED.scheduled_start_time,
        scheduled_end_time = EXCLUDED.scheduled_end_time,
        delivery_method = EXCLUDED.delivery_method,
        delivery_status = EXCLUDED.delivery_status,
        marketing_origin = EXCLUDED.marketing_origin,
        payment_method = EXCLUDED.payment_method,
        channel = EXCLUDED.channel,
        notes = EXCLUDED.notes,
        stock_processed = EXCLUDED.stock_processed,
        is_stock_checked = EXCLUDED.is_stock_checked,
        is_registered_in_bling = EXCLUDED.is_registered_in_bling,
        deleted = EXCLUDED.deleted,
        deleted_at = EXCLUDED.deleted_at,
        return_order_id = EXCLUDED.return_order_id,
        linked_order_id = EXCLUDED.linked_order_id,
        items = EXCLUDED.items,
        order_data = EXCLUDED.order_data,
        updated_at = v_now;

    -- 3. Persistência atômica dos itens na tabela normalizada (order_items)
    -- Se for atualização ou se a lista de itens foi passada, sincroniza de forma limpa
    IF jsonb_typeof(p_items) = 'array' THEN
        -- Remove itens antigos deste pedido que não constem no novo payload
        DELETE FROM public.order_items WHERE order_id = v_order_id;

        v_idx := 0;
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
            v_idx := v_idx + 1;
            INSERT INTO public.order_items (
                order_id, item_index, product_id, variation_id,
                code, description, quantity, unit_price,
                unit_discount, discount_type, cost_price,
                condition, handling_type, observation,
                is_temporary_product, item_snapshot, created_at
            ) VALUES (
                v_order_id,
                v_idx,
                NULLIF(v_item.value->>'productId', ''),
                NULLIF(v_item.value->>'variationId', ''),
                v_item.value->>'code',
                COALESCE(v_item.value->>'description', 'Item sem descrição'),
                COALESCE((v_item.value->>'quantity')::numeric, 1),
                COALESCE((v_item.value->>'unitPrice')::numeric, 0),
                COALESCE((v_item.value->>'unitDiscount')::numeric, 0),
                COALESCE(v_item.value->>'discountType', 'fixed'),
                COALESCE((v_item.value->>'costPrice')::numeric, 0),
                COALESCE(v_item.value->>'condition', 'novo'),
                v_item.value->>'handlingType',
                v_item.value->>'observation',
                COALESCE((v_item.value->>'isTemporaryProduct')::boolean, false),
                v_item.value,
                v_now
            );
        END LOOP;
    END IF;

    -- 4. Persistência atômica dos pagamentos na tabela normalizada (order_payments)
    IF jsonb_typeof(p_payments) = 'array' THEN
        DELETE FROM public.order_payments WHERE order_id = v_order_id;

        v_idx := 0;
        FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
            v_idx := v_idx + 1;
            INSERT INTO public.order_payments (
                order_id, payment_index, payment_method,
                amount, fee, fee_type, status, installments,
                paid_at, created_at
            ) VALUES (
                v_order_id,
                v_idx,
                v_payment.value->>'method',
                COALESCE((v_payment.value->>'amount')::numeric, 0),
                COALESCE((v_payment.value->>'fee')::numeric, 0),
                COALESCE(v_payment.value->>'feeType', 'fixed'),
                COALESCE(v_payment.value->>'status', 'PAGO'),
                COALESCE((v_payment.value->>'installments')::integer, 1),
                CASE WHEN (v_payment.value->>'date') IS NOT NULL THEN (v_payment.value->>'date')::timestamptz ELSE v_now END,
                v_now
            );
        END LOOP;
    END IF;

    -- Monta retorno com os dados persistidos
    v_result := jsonb_build_object(
        'id', v_order_id,
        'order_number', v_order_number,
        'order_index', v_order_index,
        'status', v_status,
        'order_type', v_order_type,
        'total_amount', v_total_amount,
        'order_data', v_order_data,
        'updated_at', v_now
    );

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_order_transaction TO anon, authenticated, service_role;
