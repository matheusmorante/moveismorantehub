-- Notify authenticated ERP/app sessions that the shared inbound-invoice list needs a refresh.
-- The message contains no invoice data; the client reloads rows through its normal RLS-protected query.
CREATE OR REPLACE FUNCTION private.broadcast_inbound_invoice_list_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM realtime.send(
    jsonb_build_object('refresh', true),
    'refresh',
    'inbound-invoice-list-refresh',
    true
  );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.broadcast_inbound_invoice_list_refresh()
  FROM PUBLIC, anon, authenticated;

CREATE POLICY "Authenticated users can receive inbound invoice list refresh"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (realtime.topic() = 'inbound-invoice-list-refresh');

CREATE TRIGGER inbound_invoice_list_refresh_after_invoice_write
  AFTER INSERT OR UPDATE ON public.inbound_invoices
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.broadcast_inbound_invoice_list_refresh();

CREATE TRIGGER inbound_invoice_list_refresh_after_item_write
  AFTER INSERT OR UPDATE OR DELETE ON public.inbound_invoice_items
  FOR EACH STATEMENT
  EXECUTE FUNCTION private.broadcast_inbound_invoice_list_refresh();
