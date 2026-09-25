-- Resgate único dos itens que ainda existem apenas no snapshot JSONB legado.
-- Depois desta migration, order_items é a única fonte consultada pelo ERP para
-- vínculos de produto com pedidos. order_data permanece apenas como cópia
-- histórica/read-only e não participa mais da verificação operacional.

WITH legacy_items AS (
    SELECT
        o.id AS order_id,
        item.ordinality::integer AS item_index,
        item.value AS item_snapshot,
        false AS is_assistance
    FROM public.orders AS o
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(o.order_data->'items') = 'array' THEN o.order_data->'items'
            ELSE '[]'::jsonb
        END
    ) WITH ORDINALITY AS item(value, ordinality)

    UNION ALL

    SELECT
        o.id AS order_id,
        (1000000 + item.ordinality)::integer AS item_index,
        item.value AS item_snapshot,
        true AS is_assistance
    FROM public.orders AS o
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(o.order_data->'assistanceItems') = 'array' THEN o.order_data->'assistanceItems'
            ELSE '[]'::jsonb
        END
    ) WITH ORDINALITY AS item(value, ordinality)
), normalized_payload AS (
    SELECT
        order_id,
        item_index,
        CASE
            WHEN is_assistance THEN COALESCE(
                NULLIF(item_snapshot->>'productId', ''),
                NULLIF(item_snapshot->>'id', '')
            )
            ELSE NULLIF(item_snapshot->>'productId', '')
        END AS product_id,
        NULLIF(item_snapshot->>'variationId', '') AS variation_id,
        NULLIF(item_snapshot->>'code', '') AS code,
        COALESCE(NULLIF(item_snapshot->>'description', ''), 'Item sem descrição') AS description,
        CASE
            WHEN item_snapshot->>'quantity' ~ '^-?[0-9]+([.][0-9]+)?$'
                THEN (item_snapshot->>'quantity')::numeric
            ELSE 1
        END AS quantity,
        CASE
            WHEN item_snapshot->>'unitPrice' ~ '^-?[0-9]+([.][0-9]+)?$'
                THEN (item_snapshot->>'unitPrice')::numeric
            ELSE 0
        END AS unit_price,
        CASE
            WHEN item_snapshot->>'unitDiscount' ~ '^-?[0-9]+([.][0-9]+)?$'
                THEN (item_snapshot->>'unitDiscount')::numeric
            ELSE 0
        END AS unit_discount,
        COALESCE(NULLIF(item_snapshot->>'discountType', ''), 'fixed') AS discount_type,
        CASE
            WHEN item_snapshot->>'costPrice' ~ '^-?[0-9]+([.][0-9]+)?$'
                THEN (item_snapshot->>'costPrice')::numeric
            ELSE 0
        END AS cost_price,
        COALESCE(NULLIF(item_snapshot->>'condition', ''), 'novo') AS condition,
        NULLIF(item_snapshot->>'handlingType', '') AS handling_type,
        NULLIF(item_snapshot->>'observation', '') AS observation,
        CASE
            WHEN lower(item_snapshot->>'isTemporaryProduct') IN ('true', 'false')
                THEN (item_snapshot->>'isTemporaryProduct')::boolean
            ELSE false
        END AS is_temporary_product,
        item_snapshot
    FROM legacy_items
)
INSERT INTO public.order_items AS target (
    order_id,
    item_index,
    product_id,
    variation_id,
    code,
    description,
    quantity,
    unit_price,
    unit_discount,
    discount_type,
    cost_price,
    condition,
    handling_type,
    observation,
    is_temporary_product,
    item_snapshot
)
SELECT
    order_id,
    item_index,
    product_id,
    variation_id,
    code,
    description,
    quantity,
    unit_price,
    unit_discount,
    discount_type,
    cost_price,
    condition,
    handling_type,
    observation,
    is_temporary_product,
    item_snapshot
FROM normalized_payload
ON CONFLICT (order_id, item_index) DO UPDATE SET
    product_id = COALESCE(NULLIF(target.product_id, ''), EXCLUDED.product_id),
    variation_id = COALESCE(NULLIF(target.variation_id, ''), EXCLUDED.variation_id),
    code = COALESCE(NULLIF(target.code, ''), EXCLUDED.code),
    description = COALESCE(NULLIF(target.description, ''), EXCLUDED.description),
    quantity = COALESCE(target.quantity, EXCLUDED.quantity),
    unit_price = COALESCE(target.unit_price, EXCLUDED.unit_price),
    unit_discount = COALESCE(target.unit_discount, EXCLUDED.unit_discount),
    discount_type = COALESCE(NULLIF(target.discount_type, ''), EXCLUDED.discount_type),
    cost_price = COALESCE(target.cost_price, EXCLUDED.cost_price),
    condition = COALESCE(NULLIF(target.condition, ''), EXCLUDED.condition),
    handling_type = COALESCE(NULLIF(target.handling_type, ''), EXCLUDED.handling_type),
    observation = COALESCE(NULLIF(target.observation, ''), EXCLUDED.observation),
    item_snapshot = COALESCE(target.item_snapshot, '{}'::jsonb) || EXCLUDED.item_snapshot;

-- O trigger antigo consultava/grava dados do JSONB em tempo de operação.
-- Ele deixa de existir depois do resgate único acima.
DROP TRIGGER IF EXISTS trg_sync_order_items_fallback ON public.orders;
DROP FUNCTION IF EXISTS public.sync_order_items_fallback();
