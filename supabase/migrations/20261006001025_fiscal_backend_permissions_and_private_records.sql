-- The fiscal API authenticates the operator and checks environment, permissions
-- and idempotency. Browser roles can read fiscal facts, but cannot forge or reserve
-- them through direct DML or SECURITY DEFINER RPCs.
DO $migration$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace AND p.proname IN (
      'get_next_nfe_number','reserve_next_nfe_number',
      'prepare_nfe_fiscal_snapshot','prepare_nfe_fiscal_snapshot_internal',
      'prepare_nfe_fiscal_snapshot_with_context','prepare_nfe_fiscal_snapshot_with_recipient',
      'prepare_numbered_nfe_fiscal_snapshot','prepare_numbered_nfe_fiscal_snapshot_with_context',
      'prepare_numbered_nfe_fiscal_snapshot_with_recipient','capture_nfe_recipient_cpf',
      'reserve_nfe_outbound_emission','reserve_nfe_cce_event',
      'persist_authorized_nfe_operation_draft','prepare_nfe_operation_draft',
      'save_nfe_operation_draft_review'
    )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END;
$migration$;

REVOKE ALL ON public.nfe_documents,public.nfe_document_items,public.nfe_fiscal_snapshots,
  public.nfe_sequences FROM PUBLIC,anon;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON
  public.nfe_documents,public.nfe_document_items,public.nfe_fiscal_snapshots,
  public.nfe_sequences FROM authenticated;
GRANT SELECT ON public.nfe_documents,public.nfe_document_items,public.nfe_fiscal_snapshots,
  public.nfe_sequences TO authenticated;
GRANT ALL ON public.nfe_documents,public.nfe_document_items,public.nfe_fiscal_snapshots,
  public.nfe_sequences TO service_role;

-- Operational customer/order/stock/finance records have no anonymous storefront
-- consumer. Authenticated ERP access and backend transactions retain their grants.
REVOKE ALL ON public.orders,public.order_items,public.order_payments,
  public.inventory_moves,public.financial_transactions,public.accounts_receivable
  FROM PUBLIC,anon;

ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_receivable_authenticated_access ON public.accounts_receivable
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.accounts_receivable TO authenticated;
GRANT ALL ON public.accounts_receivable TO service_role;

ALTER TABLE public.product_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_materials_public_read ON public.product_materials FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY product_materials_authenticated_write ON public.product_materials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.product_materials FROM PUBLIC,anon;
GRANT SELECT ON public.product_materials TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.product_materials TO authenticated;
GRANT ALL ON public.product_materials TO service_role;

ALTER TABLE public.order_fallback_telemetry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_fallback_telemetry FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.order_fallback_telemetry TO service_role;

-- Public catalog remains readable. Product changes require an authenticated user.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.products,public.product_variations
  FROM PUBLIC,anon;
ALTER POLICY allow_all_products ON public.products TO authenticated;
ALTER POLICY allow_all_product_variations ON public.product_variations TO authenticated;
ALTER POLICY "Allow all access to inventory_moves" ON public.inventory_moves TO authenticated;
ALTER POLICY "Escrita permissiva inventory_moves" ON public.inventory_moves TO authenticated;
ALTER POLICY "Leitura permissiva inventory_moves" ON public.inventory_moves TO authenticated;
ALTER POLICY "Escrita permissiva accounts_receivable" ON public.accounts_receivable TO authenticated;
ALTER POLICY "Leitura permissiva accounts_receivable" ON public.accounts_receivable TO authenticated;
ALTER VIEW public.inventory_move_identity_audit SET (security_invoker=true);
REVOKE ALL ON public.inventory_move_identity_audit FROM PUBLIC,anon;
GRANT SELECT ON public.inventory_move_identity_audit TO authenticated,service_role;
