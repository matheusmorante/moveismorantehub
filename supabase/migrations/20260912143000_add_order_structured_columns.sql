-- =============================================================================
-- Migration: 20260912143000_add_order_structured_columns.sql
-- Objetivo: Adicionar colunas físicas estruturadas à tabela orders para permitir
--           filtros B-Tree, ordenação e paginação sem full-scan de JSONB.
-- Operação: 100% aditiva, segura e idempotente.
-- Preservação: order_data é mantido 100% intacto como fonte legada e de snapshots.
-- =============================================================================

-- Passo 1: Adicionar colunas caso não existam
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'sale';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_index integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_start_time text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_end_time text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_arrived_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_started_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_finished_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS marketing_origin text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items_subtotal numeric(14,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_discount numeric(14,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_cost numeric(14,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_processed boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_stock_checked boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_registered_in_bling boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_order_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS linked_order_id text;

-- Passo 2: Backfill seguro a partir de order_data
UPDATE public.orders o
SET
    order_type = COALESCE(
        o.order_type,
        o.order_data->>'orderType',
        o.order_data->>'order_type',
        'sale'
    ),
    order_index = COALESCE(
        o.order_index,
        CASE 
            WHEN (o.order_data->>'orderIndex') ~ '^[0-9]+$' THEN (o.order_data->>'orderIndex')::integer
            WHEN (o.order_data->>'order_index') ~ '^[0-9]+$' THEN (o.order_data->>'order_index')::integer
            WHEN (o.order_number) ~ '^[0-9]+$' THEN (o.order_number)::integer
            ELSE NULL
        END
    ),
    scheduled_date = COALESCE(
        o.scheduled_date,
        CASE 
            WHEN (o.order_data#>>'{shipping,scheduling,date}') ~ '^\d{4}-\d{2}-\d{2}$' 
                THEN (o.order_data#>>'{shipping,scheduling,date}')::date
            WHEN (o.order_data#>>'{schedule,date}') ~ '^\d{4}-\d{2}-\d{2}$' 
                THEN (o.order_data#>>'{schedule,date}')::date
            WHEN (o.order_data->>'scheduledDate') ~ '^\d{4}-\d{2}-\d{2}$' 
                THEN (o.order_data->>'scheduledDate')::date
            ELSE NULL
        END
    ),
    scheduled_start_time = COALESCE(
        o.scheduled_start_time,
        o.order_data#>>'{shipping,scheduling,startTime}',
        o.order_data#>>'{schedule,startTime}'
    ),
    scheduled_end_time = COALESCE(
        o.scheduled_end_time,
        o.order_data#>>'{shipping,scheduling,endTime}',
        o.order_data#>>'{schedule,endTime}'
    ),
    delivery_method = COALESCE(
        o.delivery_method,
        o.order_data#>>'{shipping,deliveryMethod}',
        o.order_data->>'deliveryMethod'
    ),
    delivery_status = COALESCE(
        o.delivery_status,
        o.order_data->>'deliveryStatus'
    ),
    marketing_origin = COALESCE(
        o.marketing_origin,
        o.order_data->>'marketingOrigin',
        o.order_data#>>'{customerData,marketingOrigin}'
    ),
    items_subtotal = COALESCE(
        o.items_subtotal,
        NULLIF(o.order_data#>>'{itemsSummary,itemsSubtotal}', '')::numeric,
        0
    ),
    total_discount = COALESCE(
        o.total_discount,
        NULLIF(o.order_data#>>'{itemsSummary,totalFixedDiscount}', '')::numeric,
        0
    ),
    total_cost = COALESCE(
        o.total_cost,
        NULLIF(o.order_data#>>'{itemsSummary,totalItemsCost}', '')::numeric,
        0
    ),
    stock_processed = COALESCE(
        o.stock_processed,
        (o.order_data->>'stockProcessed')::boolean,
        false
    ),
    is_stock_checked = COALESCE(
        o.is_stock_checked,
        (o.order_data->>'isStockChecked')::boolean,
        false
    ),
    is_registered_in_bling = COALESCE(
        o.is_registered_in_bling,
        (o.order_data->>'isRegisteredInBling')::boolean,
        false
    ),
    deleted = COALESCE(
        o.deleted,
        (o.order_data->>'deleted')::boolean,
        false
    ),
    deleted_at = COALESCE(
        o.deleted_at,
        CASE 
            WHEN (o.order_data->>'deletedAt') ~ '^\d{2}/\d{2}/\d{4}' 
                THEN to_timestamp(o.order_data->>'deletedAt', 'DD/MM/YYYY, HH24:MI:SS')
            WHEN (o.order_data->>'deletedAt') ~ '^\d{4}-\d{2}-\d{2}' 
                THEN (o.order_data->>'deletedAt')::timestamptz 
            ELSE NULL 
        END
    ),
    return_order_id = COALESCE(
        o.return_order_id,
        o.order_data->>'returnOrderId'
    ),
    linked_order_id = COALESCE(
        o.linked_order_id,
        o.order_data->>'linkedOrderId'
    )
WHERE o.order_data IS NOT NULL 
  AND jsonb_typeof(o.order_data) = 'object';

-- Passo 3: Criar índices B-Tree especializados para filtros frequentes
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_index ON public.orders(order_index);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date ON public.orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON public.orders(delivery_method);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON public.orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_stock_processed ON public.orders(stock_processed);
CREATE INDEX IF NOT EXISTS idx_orders_deleted ON public.orders(deleted);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
