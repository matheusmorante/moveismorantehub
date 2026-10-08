CREATE INDEX IF NOT EXISTS idx_inbound_manifestation_events_invoice_id
  ON public.inbound_manifestation_events(inbound_invoice_id)
  WHERE inbound_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_manifestation_events_requested_by
  ON public.inbound_manifestation_events(requested_by)
  WHERE requested_by IS NOT NULL;
