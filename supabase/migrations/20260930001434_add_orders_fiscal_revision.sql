-- Corrective prerequisite for 20260930001435_nfe_fiscal_snapshot.sql.
-- The remote schema has no orders.version or equivalent monotonic revision.
-- Keep this migration focused on the fiscal snapshot dependency; the historical
-- offline-sync RPC and financial_transactions versioning need a separate review.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Repair a partially-created nullable column without changing non-NULL revisions.
DO $repair$
BEGIN
  -- Avoid firing statement-level commercial triggers when there is nothing to repair.
  IF EXISTS (SELECT 1 FROM public.orders WHERE version IS NULL) THEN
    UPDATE public.orders SET version = 1 WHERE version IS NULL;
  END IF;
END;
$repair$;

ALTER TABLE public.orders
  ALTER COLUMN version SET DEFAULT 1,
  ALTER COLUMN version SET NOT NULL;

CREATE OR REPLACE FUNCTION public.increment_entity_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_increment_orders_version ON public.orders;
CREATE TRIGGER trg_increment_orders_version
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_entity_version();

COMMENT ON COLUMN public.orders.version IS
  'Revisão monotônica para snapshots fiscais; o histórico começa em 1 nesta migration.';
