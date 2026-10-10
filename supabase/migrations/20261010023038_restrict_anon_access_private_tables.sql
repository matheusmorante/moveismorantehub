-- Keep private finance, purchase, and receipt data behind authenticated ERP sessions.
-- Preserve authenticated/service_role grants and current authenticated policy expressions.
-- Reversing this migration would reopen sensitive rows to unauthenticated clients and
-- must be handled only as a separately reviewed security change.
BEGIN;

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('accounts_payable'), ('purchases'), ('purchase_items'),
      ('goods_receipts'), ('goods_receipt_items')
    ) AS target(table_name)
    LEFT JOIN pg_catalog.pg_namespace AS n
      ON n.nspname = 'public'
    LEFT JOIN pg_catalog.pg_class AS c
      ON c.relnamespace = n.oid AND c.relname = target.table_name
    WHERE c.oid IS NULL OR n.oid IS NULL OR NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Expected public private-ledger tables with RLS enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts_payable'
      AND policyname = 'Escrita permissiva accounts_payable'
      AND cmd = 'INSERT'
      AND roles = ARRAY['public']::name[]
      AND with_check = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts_payable'
      AND policyname = 'Leitura permissiva accounts_payable'
      AND cmd = 'SELECT'
      AND roles = ARRAY['public']::name[]
      AND qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'purchases'
      AND policyname = 'Allow all access to purchases'
      AND cmd = 'ALL'
      AND roles = ARRAY['public']::name[]
      AND qual = 'true'
      AND with_check = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'goods_receipts'
      AND policyname = 'Allow all access to goods receipts'
      AND cmd = 'ALL'
      AND roles = ARRAY['public']::name[]
      AND qual = 'true'
      AND with_check = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'purchase_items'
      AND policyname = 'Permitir escrita de purchase_items'
      AND cmd = 'ALL'
      AND roles @> ARRAY['anon', 'authenticated', 'service_role']::name[]
      AND cardinality(roles) = 3
      AND qual = 'true'
      AND with_check = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'purchase_items'
      AND policyname = 'Permitir leitura de purchase_items'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['anon', 'authenticated', 'service_role']::name[]
      AND cardinality(roles) = 3
      AND qual = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'goods_receipt_items'
      AND policyname = 'Permitir escrita de goods_receipt_items'
      AND cmd = 'ALL'
      AND roles @> ARRAY['anon', 'authenticated', 'service_role']::name[]
      AND cardinality(roles) = 3
      AND qual = 'true'
      AND with_check = 'true'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'goods_receipt_items'
      AND policyname = 'Permitir leitura de goods_receipt_items para anon e autenticado'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['anon', 'authenticated', 'service_role']::name[]
      AND cardinality(roles) = 3
      AND qual = 'true'
  ) THEN
    RAISE EXCEPTION 'Expected public permissive policies changed; inspect before applying';
  END IF;
END;
$preflight$;

ALTER POLICY "Escrita permissiva accounts_payable"
  ON public.accounts_payable TO authenticated;
ALTER POLICY "Leitura permissiva accounts_payable"
  ON public.accounts_payable TO authenticated;
ALTER POLICY "Allow all access to purchases"
  ON public.purchases TO authenticated;
ALTER POLICY "Allow all access to goods receipts"
  ON public.goods_receipts TO authenticated;
ALTER POLICY "Permitir escrita de purchase_items"
  ON public.purchase_items TO authenticated, service_role;
ALTER POLICY "Permitir leitura de purchase_items"
  ON public.purchase_items TO authenticated, service_role;
ALTER POLICY "Permitir escrita de goods_receipt_items"
  ON public.goods_receipt_items TO authenticated, service_role;
ALTER POLICY "Permitir leitura de goods_receipt_items para anon e autenticado"
  ON public.goods_receipt_items TO authenticated, service_role;

REVOKE ALL PRIVILEGES ON TABLE
  public.accounts_payable,
  public.purchases,
  public.purchase_items,
  public.goods_receipts,
  public.goods_receipt_items
FROM anon, PUBLIC;

COMMIT;
