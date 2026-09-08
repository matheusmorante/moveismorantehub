-- Projeção de leitura para listas de pedidos.
-- Mantém order_data completo apenas para detalhes e edição, reduzindo o payload
-- transferido pelos cards de ERP e Mobile sem alterar os dados históricos.
CREATE OR REPLACE VIEW public.order_list_items
WITH (security_invoker = true)
AS
SELECT
    o.id,
    o.order_number,
    o.created_at,
    o.updated_at,
    COALESCE(o.order_data ->> 'status', o.status, 'pending') AS status,
    COALESCE(o.order_data ->> 'orderType', o.order_data ->> 'order_type', 'sale') AS order_type,
    COALESCE(o.order_data ->> 'orderIndex', o.order_data ->> 'order_index', o.order_number, '') AS order_index,
    COALESCE(o.order_data #>> '{customerData,fullName}', o.customer_name, '') AS customer_name,
    COALESCE((o.order_data #>> '{paymentsSummary,totalOrderValue}')::numeric, o.total_amount, 0) AS total_value,
    COALESCE(o.order_data #>> '{shipping,deliveryMethod}', o.order_data ->> 'deliveryMethod', '') AS delivery_method,
    COALESCE(o.order_data #>> '{shipping,scheduling,date}', o.order_data #>> '{schedule,date}', '') AS scheduled_date,
    COALESCE(o.order_data #>> '{shipping,scheduling,startTime}', o.order_data #>> '{schedule,startTime}', '') AS schedule_start_time,
    COALESCE(o.order_data #>> '{shipping,scheduling,endTime}', o.order_data #>> '{schedule,endTime}', '') AS schedule_end_time,
    COALESCE((o.order_data #>> '{shipping,scheduling,pendingScheduling}')::boolean, false) AS pending_scheduling,
    COALESCE(o.order_data ->> 'handlingType', o.order_data ->> 'handling', '') AS handling_type,
    COALESCE(o.order_data ->> 'deliveryStatus', '') AS delivery_status,
    COALESCE(o.order_data ->> 'deliveryArrivedAt', '') AS delivery_arrived_at,
    COALESCE(o.order_data ->> 'deliveryStartedAt', '') AS delivery_started_at,
    COALESCE(o.order_data ->> 'unattendedReason', '') AS unattended_reason,
    COALESCE(o.order_data ->> 'marketingOrigin', o.order_data #>> '{customerData,marketingOrigin}', '') AS marketing_origin,
    COALESCE((o.order_data ->> 'isStockChecked')::boolean, false) AS is_stock_checked,
    COALESCE((o.order_data ->> 'isRegisteredInBling')::boolean, false) AS is_registered_in_bling,
    COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
            'handlingType', item ->> 'handlingType',
            'handling', item ->> 'handling'
        ))
        FROM jsonb_array_elements(COALESCE(o.order_data -> 'items', '[]'::jsonb)) AS item
    ), '[]'::jsonb) AS item_handling
FROM public.orders AS o;

GRANT SELECT ON public.order_list_items TO anon, authenticated;
