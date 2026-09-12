-- =============================================================================
-- Migration: 20260912145000_create_order_payments.sql
-- Objetivo: Criar tabela order_payments para normalizar parcelas e formas de pagamento
--           a partir de orders.order_data->'payments' (array JSONB).
-- Operação: 100% aditiva, idempotente e reversível.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.order_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_index integer NOT NULL DEFAULT 0,
    payment_method text,
    amount numeric(14,2) NOT NULL DEFAULT 0,
    fee numeric(14,2) DEFAULT 0,
    fee_type text DEFAULT 'fixed',
    status text DEFAULT 'PAGO',
    installments integer DEFAULT 1,
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_order_payments_order_payment UNIQUE (order_id, payment_index)
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_payment_method ON public.order_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_order_payments_status ON public.order_payments(status);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_payments' AND policyname = 'Permitir leitura de order_payments para anon e autenticado'
    ) THEN
        CREATE POLICY "Permitir leitura de order_payments para anon e autenticado"
            ON public.order_payments FOR SELECT
            TO anon, authenticated, service_role
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_payments' AND policyname = 'Permitir escrita de order_payments'
    ) THEN
        CREATE POLICY "Permitir escrita de order_payments"
            ON public.order_payments FOR ALL
            TO anon, authenticated, service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

GRANT ALL ON public.order_payments TO anon, authenticated, service_role;

-- Backfill idempotente a partir de orders.order_data->'payments'
INSERT INTO public.order_payments (
    order_id,
    payment_index,
    payment_method,
    amount,
    fee,
    fee_type,
    status,
    installments
)
SELECT
    o.id AS order_id,
    elem.ord::integer AS payment_index,
    COALESCE(elem.payment->>'method', elem.payment->>'paymentMethod', o.payment_method, 'Outro') AS payment_method,
    COALESCE(NULLIF(elem.payment->>'amount', '')::numeric, 0) AS amount,
    COALESCE(NULLIF(elem.payment->>'fee', '')::numeric, 0) AS fee,
    COALESCE(elem.payment->>'feeType', 'fixed') AS fee_type,
    COALESCE(elem.payment->>'status', 'PAGO') AS status,
    COALESCE(NULLIF(elem.payment->>'installments', '')::integer, 1) AS installments
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(o.order_data->'payments') WITH ORDINALITY AS elem(payment, ord)
WHERE o.order_data->'payments' IS NOT NULL 
  AND jsonb_typeof(o.order_data->'payments') = 'array' 
  AND jsonb_array_length(o.order_data->'payments') > 0
ON CONFLICT (order_id, payment_index) DO NOTHING;
