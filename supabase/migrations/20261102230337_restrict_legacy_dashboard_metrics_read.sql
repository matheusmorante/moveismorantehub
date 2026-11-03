SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='dashboard_daily_metrics' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Legacy dashboard metrics table or RLS was not found';
  END IF;

  IF to_regprocedure('public.get_dashboard_daily_metrics(date,date)') IS NULL THEN
    RAISE EXCEPTION 'Legacy dashboard metrics read function was not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname='public' AND p.tablename='dashboard_daily_metrics'
      AND p.policyname='dashboard_daily_metrics_read_authenticated'
      AND p.roles=ARRAY['authenticated']::name[] AND p.qual='true'
  ) THEN
    RAISE EXCEPTION 'Legacy dashboard metrics read policy changed; review before restricting access';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid='public.profiles'::pg_catalog.regclass
      AND a.attname='role' AND NOT a.attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid='public.profiles'::pg_catalog.regclass
      AND a.attname='roles' AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'Profile role columns changed; review dashboard access policy';
  END IF;
END;
$$;

-- Match the Dashboard's existing administrator/manager gate for the legacy read path.
ALTER POLICY dashboard_daily_metrics_read_authenticated
  ON public.dashboard_daily_metrics
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND CASE WHEN COALESCE(pg_catalog.cardinality(p.roles), 0) > 0
          THEN p.roles && ARRAY['administrator', 'manager']::text[]
          ELSE p.role IN ('administrator', 'manager')
        END
    )
  );

REVOKE ALL ON FUNCTION public.get_dashboard_daily_metrics(date, date)
  FROM PUBLIC, anon;
