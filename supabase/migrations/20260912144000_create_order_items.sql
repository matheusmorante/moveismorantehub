-- =============================================================================
-- Migration: 20260912144000_create_order_items.sql
-- Objetivo: Criar tabela order_items para normalizar itens de pedidos de venda
--           a partir de orders.items (array JSONB de 1.508 itens).
-- Operação: 100% aditiva, idempotente e reversível.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_index integer NOT NULL DEFAULT 0,
    product_id text,
    variation_id text,
    code text,
    description text NOT NULL,
    quantity numeric(14,4) NOT NULL DEFAULT 1,
    unit_price numeric(14,2) NOT NULL DEFAULT 0,
    unit_discount numeric(14,2) DEFAULT 0,
    discount_type text DEFAULT 'fixed',
    cost_price numeric(14,2) DEFAULT 0,
    condition text DEFAULT 'novo',
    handling_type text,
    observation text,
    is_temporary_product boolean DEFAULT false,
    item_snapshot jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_order_items_order_item UNIQUE (order_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variation_id ON public.order_items(variation_id);
CREATE INDEX IF NOT EXISTS idx_order_items_code ON public.order_items(code);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' AND policyname = 'Permitir leitura de order_items para anon e autenticado'
    ) THEN
        CREATE POLICY "Permitir leitura de order_items para anon e autenticado"
            ON public.order_items FOR SELECT
            TO anon, authenticated, service_role
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' AND policyname = 'Permitir escrita de order_items'
    ) THEN
        CREATE POLICY "Permitir escrita de order_items"
            ON public.order_items FOR ALL
            TO anon, authenticated, service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

GRANT ALL ON public.order_items TO anon, authenticated, service_role;

-- Backfill idempotente a partir de orders.items
INSERT INTO public.order_items (
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
    o.id AS order_id,
    elem.ord::integer AS item_index,
    elem.item->>'productId' AS product_id,
    elem.item->>'variationId' AS variation_id,
    elem.item->>'code' AS code,
    COALESCE(elem.item->>'description', 'Item de Pedido') AS description,
    COALESCE(NULLIF(elem.item->>'quantity', '')::numeric, 1) AS quantity,
    COALESCE(NULLIF(elem.item->>'unitPrice', '')::numeric, 0) AS unit_price,
    COALESCE(NULLIF(elem.item->>'unitDiscount', '')::numeric, 0) AS unit_discount,
    COALESCE(elem.item->>'discountType', 'fixed') AS discount_type,
    COALESCE(NULLIF(elem.item->>'costPrice', '')::numeric, 0) AS cost_price,
    COALESCE(elem.item->>'condition', 'novo') AS condition,
    elem.item->>'handlingType' AS handling_type,
    elem.item->>'observation' AS observation,
    COALESCE((elem.item->>'isTemporaryProduct')::boolean, false) AS is_temporary_product,
    elem.item AS item_snapshot
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(o.items) WITH ORDINALITY AS elem(item, ord)
WHERE o.items IS NOT NULL 
  AND jsonb_typeof(o.items) = 'array' 
  AND jsonb_array_length(o.items) > 0
ON CONFLICT (order_id, item_index) DO NOTHING;
