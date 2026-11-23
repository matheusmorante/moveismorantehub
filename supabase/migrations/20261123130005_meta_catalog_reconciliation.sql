CREATE TABLE public.meta_catalog_sync_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  lease_token uuid,
  lease_until timestamptz,
  last_run jsonb,
  last_product_failure jsonb,
  CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);

-- Vínculos de itens legados com origem conferida no Commerce Manager.
-- O ID interno da Meta impede a adoção de um cadastro que reutilizou o mesmo SKU.
CREATE TABLE public.meta_catalog_verified_items (
  catalog_id text NOT NULL CHECK (catalog_id ~ '^[0-9]{1,32}$'),
  retailer_id text NOT NULL CHECK (length(retailer_id) BETWEEN 1 AND 100),
  meta_item_id text NOT NULL CHECK (meta_item_id ~ '^[0-9]{1,32}$'),
  product_id uuid NOT NULL,
  evidence text NOT NULL CHECK (length(btrim(evidence)) > 0),
  PRIMARY KEY (catalog_id, retailer_id),
  UNIQUE (catalog_id, meta_item_id)
);

CREATE INDEX meta_catalog_verified_items_product_idx
  ON public.meta_catalog_verified_items (product_id, catalog_id);

ALTER TABLE public.meta_catalog_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_catalog_verified_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.meta_catalog_sync_state, public.meta_catalog_verified_items
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.meta_catalog_sync_state, public.meta_catalog_verified_items
  TO service_role;

CREATE FUNCTION public.claim_meta_catalog_sync(p_token uuid)
RETURNS boolean
LANGUAGE sql
SET search_path = ''
AS $$
  WITH claimed AS (
    INSERT INTO public.meta_catalog_sync_state AS state (singleton, lease_token, lease_until)
    VALUES (true, p_token, clock_timestamp() + interval '6 minutes')
    ON CONFLICT (singleton) DO UPDATE
      SET lease_token = EXCLUDED.lease_token, lease_until = EXCLUDED.lease_until
      WHERE state.lease_until IS NULL OR state.lease_until <= clock_timestamp()
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

CREATE FUNCTION public.finish_meta_catalog_sync(
  p_token uuid,
  p_run jsonb,
  p_full boolean,
  p_failed boolean,
  p_retain_lease boolean
)
RETURNS boolean
LANGUAGE sql
SET search_path = ''
AS $$
  WITH finished AS (
    UPDATE public.meta_catalog_sync_state
    SET lease_token = CASE WHEN p_retain_lease THEN lease_token END,
        lease_until = CASE WHEN p_retain_lease THEN lease_until END,
        last_run = CASE WHEN p_full THEN p_run ELSE last_run END,
        last_product_failure = CASE WHEN NOT p_full AND p_failed THEN p_run ELSE last_product_failure END
    WHERE singleton AND lease_token = p_token AND lease_until > clock_timestamp()
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM finished);
$$;

REVOKE ALL ON FUNCTION public.claim_meta_catalog_sync(uuid),
  public.finish_meta_catalog_sync(uuid, jsonb, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_meta_catalog_sync(uuid),
  public.finish_meta_catalog_sync(uuid, jsonb, boolean, boolean, boolean) TO service_role;
