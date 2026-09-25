-- Timestamps estáveis para sincronização incremental do índice local de inventário.
ALTER TABLE public.product_variations
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.inventory_labels
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.products SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL;
UPDATE public.product_variations SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL;
UPDATE public.inventory_labels SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL;
UPDATE public.people SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.touch_inventory_catalog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS products_inventory_catalog_updated_idx
    ON public.products(updated_at, id);

DROP TRIGGER IF EXISTS products_inventory_catalog_updated_at ON public.products;
CREATE TRIGGER products_inventory_catalog_updated_at
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_inventory_catalog_updated_at();

DROP TRIGGER IF EXISTS product_variations_inventory_catalog_updated_at ON public.product_variations;
CREATE TRIGGER product_variations_inventory_catalog_updated_at
BEFORE INSERT OR UPDATE ON public.product_variations
FOR EACH ROW EXECUTE FUNCTION public.touch_inventory_catalog_updated_at();

DROP TRIGGER IF EXISTS inventory_labels_inventory_catalog_updated_at ON public.inventory_labels;
CREATE TRIGGER inventory_labels_inventory_catalog_updated_at
BEFORE INSERT OR UPDATE ON public.inventory_labels
FOR EACH ROW EXECUTE FUNCTION public.touch_inventory_catalog_updated_at();

DROP TRIGGER IF EXISTS people_inventory_catalog_updated_at ON public.people;
CREATE TRIGGER people_inventory_catalog_updated_at
BEFORE INSERT OR UPDATE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.touch_inventory_catalog_updated_at();

CREATE INDEX IF NOT EXISTS product_variations_inventory_catalog_updated_idx
    ON public.product_variations(updated_at, id);
CREATE INDEX IF NOT EXISTS inventory_labels_inventory_catalog_updated_idx
    ON public.inventory_labels(updated_at, id);
CREATE INDEX IF NOT EXISTS people_inventory_catalog_updated_idx
    ON public.people(updated_at, id);

CREATE TABLE IF NOT EXISTS public.inventory_catalog_deletions (
    sequence_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_type text NOT NULL CHECK (entity_type IN ('product', 'variation', 'label', 'supplier')),
    entity_id text NOT NULL,
    deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_catalog_deletions_sequence_idx
    ON public.inventory_catalog_deletions(sequence_id);

ALTER TABLE public.inventory_catalog_deletions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_catalog_deletions_authenticated_read ON public.inventory_catalog_deletions;
CREATE POLICY inventory_catalog_deletions_authenticated_read
    ON public.inventory_catalog_deletions FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.inventory_catalog_deletions TO authenticated;
REVOKE ALL ON public.inventory_catalog_deletions FROM anon;

CREATE OR REPLACE FUNCTION public.log_inventory_catalog_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.inventory_catalog_deletions(entity_type, entity_id)
    VALUES (TG_ARGV[0], OLD.id::text);
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS products_inventory_catalog_delete ON public.products;
CREATE TRIGGER products_inventory_catalog_delete
AFTER DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_catalog_deletion('product');

DROP TRIGGER IF EXISTS product_variations_inventory_catalog_delete ON public.product_variations;
CREATE TRIGGER product_variations_inventory_catalog_delete
AFTER DELETE ON public.product_variations
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_catalog_deletion('variation');

DROP TRIGGER IF EXISTS inventory_labels_inventory_catalog_delete ON public.inventory_labels;
CREATE TRIGGER inventory_labels_inventory_catalog_delete
AFTER DELETE ON public.inventory_labels
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_catalog_deletion('label');

DROP TRIGGER IF EXISTS people_inventory_catalog_delete ON public.people;
CREATE TRIGGER people_inventory_catalog_delete
AFTER DELETE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_catalog_deletion('supplier');
