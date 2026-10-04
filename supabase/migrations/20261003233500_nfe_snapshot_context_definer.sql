-- nfe_fiscal_snapshots is intentionally immutable for service_role (SELECT/INSERT only).
-- The functions that freeze retail context / recipient tax id into a fresh snapshot
-- must therefore run as owner, following the original prepare_* snapshot functions.
-- EXECUTE stays restricted to service_role; search_path stays empty.

ALTER FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, text, boolean, boolean, boolean, jsonb, integer
) SECURITY DEFINER SET search_path = '';

ALTER FUNCTION public.apply_nfe_snapshot_recipient_tax_id(jsonb, uuid, text)
  SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, text, boolean, boolean, boolean, jsonb, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_nfe_fiscal_snapshot_with_context(
  text, uuid, varchar, integer, varchar, integer, jsonb, jsonb, text, boolean, boolean, boolean, jsonb, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.apply_nfe_snapshot_recipient_tax_id(jsonb, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_nfe_snapshot_recipient_tax_id(jsonb, uuid, text) TO service_role;
