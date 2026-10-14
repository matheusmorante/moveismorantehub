BEGIN;

SELECT plan(3);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM cron.job
     WHERE jobname = 'auto-fulfill-scheduled-orders'
       AND schedule = '*/2 * * * *'
       AND active
       AND command = 'SELECT public.auto_fulfill_scheduled_orders();'
  ),
  'the active Supabase Cron runs every 2 minutes'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM pg_proc AS p
     WHERE p.oid = 'public.auto_fulfill_scheduled_orders()'::regprocedure
       AND p.prosecdef
       AND p.proconfig @> ARRAY['search_path=pg_catalog, public, extensions']
  ),
  'the scheduled function is security definer with a fixed search path'
);

SELECT ok(
  position(
    'store_collection' IN pg_get_functiondef('public.auto_fulfill_scheduled_orders()'::regprocedure)
  ) > 0
  AND position(
    'update_order_with_inventory_transaction_if_version'
    IN pg_get_functiondef('public.auto_fulfill_scheduled_orders()'::regprocedure)
  ) > 0,
  'return collection fulfillment uses the version-guarded inventory transaction'
);

SELECT * FROM finish();
ROLLBACK;
