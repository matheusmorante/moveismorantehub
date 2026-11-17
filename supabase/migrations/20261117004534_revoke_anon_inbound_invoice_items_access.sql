BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.inbound_invoice_items FROM anon;

ALTER POLICY "Permitir escrita para autenticado e service_role"
  ON public.inbound_invoice_items
  TO authenticated, service_role;

ALTER POLICY "Permitir leitura para anon e autenticado"
  ON public.inbound_invoice_items
  TO authenticated, service_role;

COMMIT;
