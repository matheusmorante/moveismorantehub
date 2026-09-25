CREATE OR REPLACE FUNCTION public.touch_inventory_catalog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_inventory_catalog_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO public.inventory_catalog_deletions(entity_type, entity_id)
    VALUES (TG_ARGV[0], OLD.id::text);
    RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_inventory_catalog_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_inventory_catalog_deletion() FROM PUBLIC, anon, authenticated;
