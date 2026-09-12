-- =============================================================================
-- Migration: 20260912162000_create_order_fallback_telemetry.sql
-- Objetivo: Criar tabela de telemetria leve (1 linha) para registrar quando o
--           trigger fallback realmente precisa atuar (quando faltam itens ou pagamentos).
--           Updates puramente operacionais que não necessitam de fallback
--           são 100% NO-OP e NÃO incrementam a telemetria.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.order_fallback_telemetry (
    id integer PRIMARY KEY DEFAULT 1,
    execution_count bigint DEFAULT 0,
    items_fallback_count bigint DEFAULT 0,
    payments_fallback_count bigint DEFAULT 0,
    last_triggered_at timestamptz,
    last_order_id text
);

INSERT INTO public.order_fallback_telemetry (id, execution_count, items_fallback_count, payments_fallback_count)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_order_items_fallback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_in_tx text;
    v_item record;
    v_payment record;
    v_idx integer := 0;
    v_needed_items boolean := false;
    v_needed_payments boolean := false;
BEGIN
    -- 1. Se a transação moderna RPC estiver ativa, sai imediatamente
    BEGIN
        v_in_tx := current_setting('morante.in_order_transaction', true);
    EXCEPTION WHEN OTHERS THEN
        v_in_tx := 'false';
    END;

    IF v_in_tx = 'true' THEN
        RETURN NEW;
    END IF;

    -- 2. Rede de segurança INDEPENDENTE para ITENS:
    IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = NEW.id) THEN
        IF NEW.items IS NOT NULL AND jsonb_typeof(NEW.items) = 'array' AND jsonb_array_length(NEW.items) > 0 THEN
            v_idx := 0;
            FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
                v_idx := v_idx + 1;
                INSERT INTO public.order_items (
                    order_id, item_index, product_id, variation_id,
                    code, description, quantity, unit_price,
                    unit_discount, discount_type, cost_price,
                    condition, handling_type, observation,
                    is_temporary_product, item_snapshot, created_at
                ) VALUES (
                    NEW.id,
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
                    now()
                )
                ON CONFLICT (order_id, item_index) DO UPDATE SET
                    description = EXCLUDED.description,
                    quantity = EXCLUDED.quantity,
                    unit_price = EXCLUDED.unit_price,
                    item_snapshot = EXCLUDED.item_snapshot;
            END LOOP;
            v_needed_items := true;
        END IF;
    END IF;

    -- 3. Rede de segurança INDEPENDENTE para PAGAMENTOS:
    IF NOT EXISTS (SELECT 1 FROM public.order_payments WHERE order_id = NEW.id) THEN
        IF NEW.order_data->'payments' IS NOT NULL AND jsonb_typeof(NEW.order_data->'payments') = 'array' AND jsonb_array_length(NEW.order_data->'payments') > 0 THEN
            v_idx := 0;
            FOR v_payment IN SELECT * FROM jsonb_array_elements(NEW.order_data->'payments') LOOP
                v_idx := v_idx + 1;
                INSERT INTO public.order_payments (
                    order_id, payment_index, payment_method,
                    amount, fee, fee_type, status, installments,
                    paid_at, created_at
                ) VALUES (
                    NEW.id,
                    v_idx,
                    v_payment.value->>'method',
                    COALESCE((v_payment.value->>'amount')::numeric, 0),
                    COALESCE((v_payment.value->>'fee')::numeric, 0),
                    COALESCE(v_payment.value->>'feeType', 'fixed'),
                    COALESCE(v_payment.value->>'status', 'PAGO'),
                    COALESCE((v_payment.value->>'installments')::integer, 1),
                    CASE WHEN (v_payment.value->>'date') IS NOT NULL THEN (v_payment.value->>'date')::timestamptz ELSE now() END,
                    now()
                )
                ON CONFLICT (order_id, payment_index) DO UPDATE SET
                    amount = EXCLUDED.amount,
                    status = EXCLUDED.status;
            END LOOP;
            v_needed_payments := true;
        END IF;
    END IF;

    -- 4. Telemetria Leve: Registra se e somente se o fallback atuou
    IF v_needed_items OR v_needed_payments THEN
        UPDATE public.order_fallback_telemetry
        SET execution_count = execution_count + 1,
            items_fallback_count = items_fallback_count + CASE WHEN v_needed_items THEN 1 ELSE 0 END,
            payments_fallback_count = payments_fallback_count + CASE WHEN v_needed_payments THEN 1 ELSE 0 END,
            last_triggered_at = now(),
            last_order_id = NEW.id
        WHERE id = 1;
    END IF;

    RETURN NEW;
END;
$function$;
