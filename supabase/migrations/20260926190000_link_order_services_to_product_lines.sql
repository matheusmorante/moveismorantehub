-- Persist explicit service -> order line relation. No production apply is implied.
ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS order_item_key uuid,
    ADD COLUMN IF NOT EXISTS linked_product_item_key uuid;

UPDATE public.order_items
SET order_item_key = gen_random_uuid()
WHERE order_item_key IS NULL;

UPDATE public.order_items
SET item_snapshot = jsonb_set(
    COALESCE(item_snapshot, '{}'::jsonb),
    '{orderItemId}',
    to_jsonb(order_item_key::text),
    true
)
WHERE COALESCE(item_snapshot->>'orderItemId', '') = '';

ALTER TABLE public.order_items
    ALTER COLUMN order_item_key SET DEFAULT gen_random_uuid(),
    ALTER COLUMN order_item_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_items_order_item_key
    ON public.order_items(order_item_key);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_linked_product_item'
    ) THEN
        ALTER TABLE public.order_items
            ADD CONSTRAINT fk_order_items_linked_product_item
            FOREIGN KEY (linked_product_item_key)
            REFERENCES public.order_items(order_item_key)
            ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_order_item_line_keys()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.order_item_key := COALESCE(
        NULLIF(NEW.item_snapshot->>'orderItemId', '')::uuid,
        NEW.order_item_key,
        gen_random_uuid()
    );
    NEW.linked_product_item_key := NULLIF(NEW.item_snapshot->>'linkedProductOrderItemId', '')::uuid;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_item_line_keys ON public.order_items;
CREATE TRIGGER trg_sync_order_item_line_keys
BEFORE INSERT OR UPDATE OF item_snapshot ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.sync_order_item_line_keys();

-- Backfill a pre-existing snapshot link if the feature is re-applied after a partial deployment.
UPDATE public.order_items
SET item_snapshot = item_snapshot
WHERE COALESCE(item_snapshot->>'linkedProductOrderItemId', '') <> '';

CREATE OR REPLACE FUNCTION public.validate_order_item_service_link()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_target public.order_items%ROWTYPE;
BEGIN
    IF NEW.linked_product_item_key IS NULL THEN RETURN NEW; END IF;

    SELECT * INTO v_target
    FROM public.order_items
    WHERE order_item_key = NEW.linked_product_item_key;

    IF NOT FOUND OR v_target.order_id <> NEW.order_id
       OR COALESCE(v_target.item_snapshot->>'itemType', 'product') = 'service'
       OR COALESCE(NEW.item_snapshot->>'itemType', '') <> 'service' THEN
        RAISE EXCEPTION 'Vínculo fiscal inválido: serviço e produto devem pertencer ao mesmo pedido.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_item_service_link ON public.order_items;
CREATE CONSTRAINT TRIGGER trg_validate_order_item_service_link
AFTER INSERT OR UPDATE ON public.order_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_order_item_service_link();
