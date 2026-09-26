-- Only one in-flight outbound document per order/model/environment.
-- Authorized invoices are intentionally not unique here: partial billing may
-- require several invoices for the same order. Do not rewrite fiscal history.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.nfe_documents
        WHERE order_id IS NOT NULL
          AND status IN ('pendente', 'processando')
        GROUP BY order_id, modelo, ambiente
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Há pedidos com emissões fiscais em andamento duplicadas. Reconcilie antes de criar o índice anti-duplicidade.';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_documents_inflight_order_model_environment
    ON public.nfe_documents(order_id, modelo, ambiente)
    WHERE order_id IS NOT NULL
      AND status IN ('pendente', 'processando');
