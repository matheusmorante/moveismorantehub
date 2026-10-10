-- Finance is administrator-only in the ERP. The authenticated Payables UI edits
-- rows with PostgREST PATCH, so its UPDATE permission must also be enforced by RLS.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'accounts_payable'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Expected RLS enabled on public.accounts_payable';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.accounts_payable', 'UPDATE') THEN
    RAISE EXCEPTION 'Expected UPDATE table grant for authenticated on public.accounts_payable';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts_payable'
      AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'Unexpected existing UPDATE policy on public.accounts_payable; inspect before applying';
  END IF;
END;
$preflight$;

CREATE POLICY "Administrators update accounts_payable"
  ON public.accounts_payable
  FOR UPDATE
  TO authenticated
  USING (public.is_administrator())
  WITH CHECK (public.is_administrator());

COMMIT;
