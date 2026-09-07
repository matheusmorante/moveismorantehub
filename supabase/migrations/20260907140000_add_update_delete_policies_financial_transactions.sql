-- Migration: 20260907140000_add_update_delete_policies_financial_transactions.sql
-- Habilita políticas de UPDATE e DELETE permissivas para financial_transactions no App Mobile e ERP

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_transactions' AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "Atualização permissiva financial_transactions"
      ON public.financial_transactions FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_transactions' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Exclusão permissiva financial_transactions"
      ON public.financial_transactions FOR DELETE
      USING (true);
  END IF;
END $$;
