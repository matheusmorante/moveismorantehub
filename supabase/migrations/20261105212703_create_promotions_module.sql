BEGIN;

CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  conditions text,
  discount_mode text NOT NULL DEFAULT 'general'
    CHECK (discount_mode IN ('general', 'per_variation')),
  general_discount_percent numeric(5,2),
  starts_on date,
  ends_on date,
  timezone_name text NOT NULL DEFAULT 'America/Sao_Paulo',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'interrupted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotions_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT promotions_period_valid CHECK (
    starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on
  ),
  CONSTRAINT promotions_general_percent_valid CHECK (
    general_discount_percent IS NULL OR general_discount_percent BETWEEN 0.01 AND 100
  )
);

CREATE TABLE public.promotion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variation_id uuid REFERENCES public.product_variations(id) ON DELETE CASCADE,
  discount_percent numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promotion_items_percent_valid CHECK (
    discount_percent IS NULL OR discount_percent BETWEEN 0.01 AND 100
  )
);

-- The trigger below returns a friendly conflict message. This exclusion
-- constraint also closes the visibility race between concurrent saves.
ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_no_overlapping_scheduled_periods
  EXCLUDE USING gist (daterange(starts_on, ends_on, '[]') WITH &&)
  WHERE (status = 'scheduled' AND starts_on IS NOT NULL AND ends_on IS NOT NULL);

CREATE UNIQUE INDEX promotion_items_product_unique
  ON public.promotion_items(promotion_id, product_id) WHERE variation_id IS NULL;
CREATE UNIQUE INDEX promotion_items_variation_unique
  ON public.promotion_items(promotion_id, variation_id) WHERE variation_id IS NOT NULL;
CREATE INDEX promotion_items_promotion_id_idx ON public.promotion_items(promotion_id);
CREATE INDEX promotion_items_product_id_idx ON public.promotion_items(product_id);
CREATE INDEX promotion_items_variation_id_idx ON public.promotion_items(variation_id) WHERE variation_id IS NOT NULL;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_items ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;

CREATE OR REPLACE FUNCTION app_private.has_manage_promotions_permission()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = 'off'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_roles text[];
  v_allowed_roles text[];
  v_permission jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;

  SELECT CASE
    WHEN pg_catalog.cardinality(pg_catalog.array_remove(COALESCE(profile.roles, ARRAY[]::text[]), 'pending')) > 0
      THEN pg_catalog.array_remove(COALESCE(profile.roles, ARRAY[]::text[]), 'pending')
    WHEN profile.role IS NOT NULL AND profile.role <> 'pending' THEN ARRAY[profile.role]
    ELSE ARRAY[]::text[]
  END
  INTO v_user_roles
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id;

  IF NOT FOUND OR pg_catalog.cardinality(v_user_roles) = 0 THEN RETURN false; END IF;
  IF v_user_roles && ARRAY['administrator', 'admin', 'master']::text[] THEN RETURN true; END IF;

  SELECT settings.data -> 'rolePermissions' -> 'managePromotions'
  INTO v_permission
  FROM public.settings AS settings
  WHERE settings.id = 'app';

  IF NOT FOUND OR v_permission IS NULL THEN
    v_allowed_roles := ARRAY['manager'];
  ELSIF pg_catalog.jsonb_typeof(v_permission) = 'array' THEN
    SELECT COALESCE(pg_catalog.array_agg(permission_role.role_name), ARRAY[]::text[])
    INTO v_allowed_roles
    FROM pg_catalog.jsonb_array_elements_text(v_permission) AS permission_role(role_name);
  ELSE
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(v_user_roles) AS user_role(role_name)
    JOIN pg_catalog.unnest(v_allowed_roles) AS allowed_role(role_name)
      ON CASE user_role.role_name
        WHEN 'admin' THEN 'administrator'
        WHEN 'master' THEN 'administrator'
        WHEN 'gerente' THEN 'manager'
        WHEN 'vendedor' THEN 'seller'
        ELSE user_role.role_name
      END = CASE allowed_role.role_name
        WHEN 'admin' THEN 'administrator'
        WHEN 'master' THEN 'administrator'
        WHEN 'gerente' THEN 'manager'
        WHEN 'vendedor' THEN 'seller'
        ELSE allowed_role.role_name
      END
  );
END;
$$;
REVOKE ALL ON FUNCTION app_private.has_manage_promotions_permission() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_manage_promotions_permission() TO authenticated;

CREATE POLICY promotions_authenticated_read ON public.promotions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY promotions_authenticated_write ON public.promotions
  FOR ALL TO authenticated
  USING (app_private.has_manage_promotions_permission())
  WITH CHECK (app_private.has_manage_promotions_permission());
CREATE POLICY promotion_items_authenticated_read ON public.promotion_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY promotion_items_authenticated_write ON public.promotion_items
  FOR ALL TO authenticated
  USING (app_private.has_manage_promotions_permission())
  WITH CHECK (app_private.has_manage_promotions_permission());

-- Only currently valid promotions are public; the policy also protects direct table reads.
CREATE POLICY promotions_public_current_read ON public.promotions
  FOR SELECT TO anon USING (
    status = 'scheduled'
    AND starts_on IS NOT NULL
    AND ends_on IS NOT NULL
    AND (now() AT TIME ZONE timezone_name)::date BETWEEN starts_on AND ends_on
  );
CREATE POLICY promotion_items_public_current_read ON public.promotion_items
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1
      FROM public.promotions AS promotion
      WHERE promotion.id = promotion_id
        AND promotion.status = 'scheduled'
        AND promotion.starts_on IS NOT NULL
        AND promotion.ends_on IS NOT NULL
        AND (now() AT TIME ZONE promotion.timezone_name)::date
          BETWEEN promotion.starts_on AND promotion.ends_on
    )
  );

GRANT SELECT ON public.promotions, public.promotion_items TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.promotions, public.promotion_items FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_promotion_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER promotions_touch_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.touch_promotion_updated_at();

CREATE OR REPLACE FUNCTION public.validate_promotion_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_conflict uuid;
  v_new_range tstzrange;
BEGIN
  IF NEW.status <> 'scheduled' THEN
    RETURN NEW;
  END IF;

  IF NEW.starts_on IS NULL OR NEW.ends_on IS NULL THEN
    RAISE EXCEPTION 'PROMOTION_SCHEDULE_REQUIRES_DATES' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_timezone_names AS zone WHERE zone.name = NEW.timezone_name
  ) THEN
    RAISE EXCEPTION 'PROMOTION_TIMEZONE_INVALID' USING ERRCODE = '22023';
  END IF;

  -- Serialize all scheduled-window changes so two concurrent operators cannot overlap campaigns.
  PERFORM pg_catalog.pg_advisory_xact_lock(761204, 1);
  v_new_range := pg_catalog.tstzrange(
    (NEW.starts_on::timestamp AT TIME ZONE NEW.timezone_name),
    ((NEW.ends_on + 1)::timestamp AT TIME ZONE NEW.timezone_name),
    '[)'
  );

  SELECT promotion.id INTO v_conflict
  FROM public.promotions AS promotion
  WHERE promotion.status = 'scheduled'
    AND promotion.id IS DISTINCT FROM NEW.id
    AND promotion.starts_on IS NOT NULL
    AND promotion.ends_on IS NOT NULL
    AND pg_catalog.tstzrange(
      (promotion.starts_on::timestamp AT TIME ZONE promotion.timezone_name),
      ((promotion.ends_on + 1)::timestamp AT TIME ZONE promotion.timezone_name),
      '[)'
    ) && v_new_range
  LIMIT 1;

  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'PROMOTION_PERIOD_OVERLAP' USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER promotions_prevent_overlapping_schedule
  BEFORE INSERT OR UPDATE OF status, starts_on, ends_on, timezone_name ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.validate_promotion_schedule();

CREATE OR REPLACE FUNCTION public.validate_promotion_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_mode text;
  v_product_active boolean;
  v_product_type text;
  v_is_combo boolean;
  v_has_variations boolean;
  v_variation_product uuid;
  v_variation_active boolean;
BEGIN
  SELECT promotion.discount_mode INTO v_mode
  FROM public.promotions AS promotion WHERE promotion.id = NEW.promotion_id;
  IF v_mode IS NULL THEN
    RAISE EXCEPTION 'PROMOTION_NOT_FOUND' USING ERRCODE = '23503';
  END IF;

  IF v_mode = 'general' AND NEW.discount_percent IS NOT NULL THEN
    RAISE EXCEPTION 'PROMOTION_ITEM_PERCENT_NOT_ALLOWED' USING ERRCODE = '22023';
  ELSIF v_mode = 'per_variation' AND (
    NEW.discount_percent IS NULL OR NEW.discount_percent NOT BETWEEN 0.01 AND 100
  ) THEN
    RAISE EXCEPTION 'PROMOTION_ITEM_PERCENT_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT product.active IS TRUE
      AND product.deleted IS NOT TRUE
      AND product.deleted_at IS NULL
      AND product.is_draft IS NOT TRUE,
    product.item_type,
    product.is_combo IS TRUE,
    EXISTS (SELECT 1 FROM public.product_variations AS variation WHERE variation.product_id = product.id)
  INTO v_product_active, v_product_type, v_is_combo, v_has_variations
  FROM public.products AS product WHERE product.id = NEW.product_id;
  IF NOT COALESCE(v_product_active, false) THEN
    RAISE EXCEPTION 'PROMOTION_PRODUCT_NOT_ACTIVE' USING ERRCODE = '22023';
  END IF;
  IF v_product_type IN ('service', 'composition') OR COALESCE(v_is_combo, false) THEN
    RAISE EXCEPTION 'PROMOTION_PRODUCT_TYPE_NOT_SUPPORTED' USING ERRCODE = '22023';
  END IF;

  IF NEW.variation_id IS NULL THEN
    IF v_has_variations THEN
      RAISE EXCEPTION 'PROMOTION_VARIATION_REQUIRED' USING ERRCODE = '22023';
    END IF;
  ELSE
    SELECT variation.product_id, variation.active
      INTO v_variation_product, v_variation_active
    FROM public.product_variations AS variation
    WHERE variation.id = NEW.variation_id;
    IF v_variation_product IS DISTINCT FROM NEW.product_id OR v_variation_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'PROMOTION_VARIATION_NOT_ACTIVE' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER promotion_items_validate
  BEFORE INSERT OR UPDATE ON public.promotion_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_promotion_item();

CREATE OR REPLACE VIEW public.active_campaign_prices
WITH (security_invoker = true)
AS
SELECT
  item.product_id,
  item.variation_id,
  promotion.id AS promotion_id,
  promotion.name AS promotion_name,
  promotion.conditions,
  promotion.starts_on,
  promotion.ends_on,
  COALESCE(promotion.general_discount_percent, item.discount_percent) AS promotion_discount_percent,
  prices.regular_price,
  prices.product_price,
  prices.regular_price - prices.product_price AS product_discount_amount,
  round(prices.product_price * (1 - COALESCE(promotion.general_discount_percent, item.discount_percent) / 100), 2) AS final_price,
  round(prices.product_price * COALESCE(promotion.general_discount_percent, item.discount_percent) / 100, 2) AS promotion_discount_amount
FROM public.promotion_items AS item
JOIN public.promotions AS promotion ON promotion.id = item.promotion_id
JOIN public.products AS product ON product.id = item.product_id
LEFT JOIN public.product_variations AS variation ON variation.id = item.variation_id
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN variation.id IS NOT NULL AND variation.use_parent_price IS FALSE
        THEN COALESCE(variation.price, product.unit_price, product.price, 0)
      ELSE COALESCE(product.unit_price, product.price, variation.price, 0)
    END::numeric AS regular_price,
    CASE
      WHEN COALESCE(base.promo_price, 0) > 0 AND base.promo_price < base.regular_price
        THEN base.promo_price
      ELSE base.regular_price
    END::numeric AS product_price
  FROM LATERAL (
    SELECT
      CASE
        WHEN variation.id IS NOT NULL AND variation.use_parent_promo_price IS FALSE
          THEN COALESCE(variation.promo_price, product.promo_price)
        ELSE product.promo_price
      END::numeric AS promo_price,
      CASE
        WHEN variation.id IS NOT NULL AND variation.use_parent_price IS FALSE
          THEN COALESCE(variation.price, product.unit_price, product.price, 0)
        ELSE COALESCE(product.unit_price, product.price, variation.price, 0)
      END::numeric AS regular_price
  ) AS base
) AS prices
WHERE promotion.status = 'scheduled'
  AND promotion.starts_on IS NOT NULL
  AND promotion.ends_on IS NOT NULL
  AND (now() AT TIME ZONE promotion.timezone_name)::date BETWEEN promotion.starts_on AND promotion.ends_on
  AND product.active IS TRUE
  AND product.deleted IS NOT TRUE
  AND product.deleted_at IS NULL
  AND product.is_draft IS NOT TRUE
  AND product.item_type IS DISTINCT FROM 'service'
  AND product.item_type IS DISTINCT FROM 'composition'
  AND product.is_combo IS NOT TRUE
  AND (variation.id IS NULL OR (
    variation.product_id = item.product_id
    AND variation.active IS TRUE
    AND variation.merged_to_variation_id IS NULL
  ));

GRANT SELECT ON public.active_campaign_prices TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_promotion_items(
  p_search text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  product_id uuid,
  variation_id uuid,
  product_name text,
  variation_name text,
  code text,
  sku text,
  category_id uuid,
  category_name text,
  regular_price numeric,
  product_price numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH source AS (
    SELECT
      product.id AS product_id,
      variation.id AS variation_id,
      product.name AS product_name,
      variation.name AS variation_name,
      product.code,
      variation.sku,
      product.category_id,
      category.name AS category_name,
      CASE
        WHEN variation.id IS NOT NULL AND variation.use_parent_price IS FALSE
          THEN COALESCE(variation.price, product.unit_price, product.price, 0)
        ELSE COALESCE(product.unit_price, product.price, variation.price, 0)
      END::numeric AS regular_price,
      CASE
        WHEN COALESCE(base.promo_price, 0) > 0 AND base.promo_price < base.regular_price
          THEN base.promo_price
        ELSE base.regular_price
      END::numeric AS product_price,
      ARRAY[product.name, variation.name, product.code, variation.sku, category.name] AS search_fields,
      product.supplier_id,
      product.main_supplier_id,
      product.supplier_ids
    FROM public.products AS product
    LEFT JOIN public.product_variations AS variation ON variation.product_id = product.id
    LEFT JOIN public.categories AS category ON category.id = product.category_id
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN variation.id IS NOT NULL AND variation.use_parent_promo_price IS FALSE
            THEN COALESCE(variation.promo_price, product.promo_price)
          ELSE product.promo_price
        END::numeric AS promo_price,
        CASE
          WHEN variation.id IS NOT NULL AND variation.use_parent_price IS FALSE
            THEN COALESCE(variation.price, product.unit_price, product.price, 0)
          ELSE COALESCE(product.unit_price, product.price, variation.price, 0)
        END::numeric AS regular_price
    ) AS base
    WHERE product.active IS TRUE
      AND product.deleted IS NOT TRUE
      AND product.deleted_at IS NULL
      AND product.is_draft IS NOT TRUE
      AND product.item_type IS DISTINCT FROM 'service'
      AND product.item_type IS DISTINCT FROM 'composition'
      AND product.is_combo IS NOT TRUE
      AND (variation.id IS NULL OR (variation.active IS TRUE AND variation.merged_to_variation_id IS NULL))
      AND (p_category_id IS NULL OR product.category_id = p_category_id)
      AND (p_supplier_id IS NULL OR product.supplier_id = p_supplier_id
        OR product.main_supplier_id = p_supplier_id
        OR p_supplier_id = ANY(COALESCE(product.supplier_ids, ARRAY[]::uuid[])))
  ), words AS (
    SELECT regexp_split_to_array(public.immutable_unaccent(btrim(COALESCE(p_search, ''))), '\s+') AS parts
  )
  SELECT source.product_id, source.variation_id, source.product_name, source.variation_name,
    source.code, source.sku, source.category_id, source.category_name, source.regular_price, source.product_price
  FROM source, words
  WHERE btrim(COALESCE(p_search, '')) = '' OR NOT EXISTS (
    SELECT 1 FROM unnest(words.parts) AS word(value)
    WHERE word.value <> '' AND NOT EXISTS (
      SELECT 1 FROM unnest(source.search_fields) AS field(value)
      WHERE public.immutable_unaccent(COALESCE(field.value, '')) ILIKE '%' || word.value || '%'
    )
  )
  ORDER BY source.product_name, source.variation_name NULLS FIRST, source.sku NULLS FIRST, source.product_id, source.variation_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 15), 1), 15)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.search_promotions(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL,
  p_product_search text DEFAULT NULL,
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  conditions text,
  discount_mode text,
  general_discount_percent numeric,
  starts_on date,
  ends_on date,
  timezone_name text,
  status text,
  computed_status text,
  item_count bigint,
  minimum_discount numeric,
  maximum_discount numeric,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH summarized AS (
    SELECT promotion.id, promotion.name, promotion.description, promotion.conditions,
      promotion.discount_mode, promotion.general_discount_percent, promotion.starts_on,
      promotion.ends_on, promotion.timezone_name, promotion.status, promotion.created_at,
      CASE
        WHEN promotion.status = 'draft' THEN 'draft'
        WHEN promotion.status = 'interrupted' THEN 'interrupted'
        WHEN (now() AT TIME ZONE promotion.timezone_name)::date > promotion.ends_on THEN 'ended'
        WHEN (now() AT TIME ZONE promotion.timezone_name)::date < promotion.starts_on THEN 'scheduled'
        ELSE 'active'
      END AS computed_status,
      count(item.id)::bigint AS item_count,
      min(COALESCE(promotion.general_discount_percent, item.discount_percent)) AS minimum_discount,
      max(COALESCE(promotion.general_discount_percent, item.discount_percent)) AS maximum_discount
    FROM public.promotions AS promotion
    LEFT JOIN public.promotion_items AS item ON item.promotion_id = promotion.id
    GROUP BY promotion.id
  ), words AS (
    SELECT regexp_split_to_array(public.immutable_unaccent(btrim(COALESCE(p_search, ''))), '\s+') AS parts,
      regexp_split_to_array(public.immutable_unaccent(btrim(COALESCE(p_product_search, ''))), '\s+') AS product_parts
  ), filtered AS (
    SELECT summarized.*
    FROM summarized, words
    WHERE (p_status IS NULL OR p_status = '' OR p_status = 'all' OR summarized.computed_status = p_status)
      AND (p_period_start IS NULL OR summarized.ends_on >= p_period_start)
      AND (p_period_end IS NULL OR summarized.starts_on <= p_period_end)
      AND (btrim(COALESCE(p_search, '')) = '' OR NOT EXISTS (
        SELECT 1 FROM unnest(words.parts) AS word(value)
        WHERE word.value <> '' AND (
          public.immutable_unaccent(summarized.name) NOT ILIKE '%' || word.value || '%'
          AND public.immutable_unaccent(COALESCE(summarized.description, '')) NOT ILIKE '%' || word.value || '%'
          AND public.immutable_unaccent(COALESCE(summarized.conditions, '')) NOT ILIKE '%' || word.value || '%'
        )
      ))
      AND (btrim(COALESCE(p_product_search, '')) = '' OR EXISTS (
        SELECT 1
        FROM public.promotion_items AS item
        JOIN public.products AS product ON product.id = item.product_id
        LEFT JOIN public.product_variations AS variation ON variation.id = item.variation_id
        WHERE item.promotion_id = summarized.id
          AND NOT EXISTS (
            SELECT 1 FROM unnest(words.product_parts) AS word(value)
            WHERE word.value <> ''
              AND public.immutable_unaccent(COALESCE(product.name, '') || ' ' || COALESCE(variation.name, '') || ' ' || COALESCE(product.code, '') || ' ' || COALESCE(variation.sku, '')) NOT ILIKE '%' || word.value || '%'
          )
      ))
  )
  SELECT filtered.id, filtered.name, filtered.description, filtered.conditions, filtered.discount_mode,
    filtered.general_discount_percent, filtered.starts_on, filtered.ends_on, filtered.timezone_name,
    filtered.status, filtered.computed_status, filtered.item_count, filtered.minimum_discount,
    filtered.maximum_discount, count(*) OVER ()::bigint AS total_count
  FROM filtered
  ORDER BY filtered.created_at DESC NULLS LAST, filtered.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 15), 1), 15)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.search_catalog_with_campaign_prices(
  p_query text,
  p_limit integer DEFAULT 15
)
RETURNS TABLE (
  key text,
  entity_type text,
  product_id uuid,
  variation_id uuid,
  composition_id uuid,
  composition_variation_id uuid,
  parent_name text,
  variation_name text,
  display_name text,
  code text,
  sku text,
  category text,
  unit_price numeric,
  cost_price numeric,
  match_score integer,
  product_item_type text,
  product_is_combo boolean,
  product_promo_price numeric,
  final_unit_price numeric,
  promotion_id uuid,
  promotion_name text,
  promotion_discount_percent numeric,
  promotion_discount_amount numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT result.key, result.entity_type, result.product_id, result.variation_id,
    result.composition_id, result.composition_variation_id, result.parent_name,
    result.variation_name, result.display_name, result.code, result.sku, result.category,
    COALESCE(base.regular_price, result.unit_price) AS unit_price,
    result.cost_price, result.match_score,
    product.item_type AS product_item_type, COALESCE(product.is_combo, false) AS product_is_combo,
    CASE WHEN base.product_price < base.regular_price THEN base.product_price ELSE NULL END AS product_promo_price,
    COALESCE(prices.final_price, base.product_price, result.unit_price) AS final_unit_price,
    prices.promotion_id, prices.promotion_name, prices.promotion_discount_percent,
    prices.promotion_discount_amount
  FROM public.search_catalog_shallow(p_query, LEAST(GREATEST(COALESCE(p_limit, 15), 1), 15)) AS result
  LEFT JOIN public.products AS product ON product.id = result.product_id
  LEFT JOIN public.product_variations AS variation ON variation.id = result.variation_id
  LEFT JOIN LATERAL (
    SELECT
      CASE
        WHEN variation.id IS NOT NULL AND variation.use_parent_price IS FALSE
          THEN COALESCE(variation.price, product.unit_price, product.price, result.unit_price)
        ELSE COALESCE(product.unit_price, product.price, variation.price, result.unit_price)
      END::numeric AS regular_price,
      CASE
        WHEN variation.id IS NOT NULL AND variation.use_parent_promo_price IS FALSE
          THEN COALESCE(variation.promo_price, product.promo_price)
        ELSE product.promo_price
      END::numeric AS raw_promo_price
  ) AS source_price ON true
  LEFT JOIN LATERAL (
    SELECT source_price.regular_price,
      CASE WHEN source_price.raw_promo_price > 0 AND source_price.raw_promo_price < source_price.regular_price
        THEN source_price.raw_promo_price ELSE source_price.regular_price END::numeric AS product_price
  ) AS base ON true
  LEFT JOIN public.active_campaign_prices AS prices
    ON prices.product_id = result.product_id
    AND prices.variation_id IS NOT DISTINCT FROM result.variation_id;
$$;

CREATE OR REPLACE FUNCTION public.mutate_promotion(
  p_action text,
  p_promotion_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_source public.promotions%ROWTYPE;
  v_name text;
  v_description text;
  v_conditions text;
  v_mode text;
  v_percent numeric;
  v_starts date;
  v_ends date;
  v_timezone text;
  v_status text;
  v_items jsonb;
  v_computed_status text;
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.has_manage_promotions_permission() THEN
    RAISE EXCEPTION 'PROMOTION_PERMISSION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'duplicate' THEN
    SELECT * INTO v_source FROM public.promotions WHERE id = p_promotion_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'PROMOTION_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
    INSERT INTO public.promotions (name, description, conditions, discount_mode, general_discount_percent, timezone_name)
    VALUES (left(v_source.name, 112) || ' (Cópia)', v_source.description, v_source.conditions,
      v_source.discount_mode, v_source.general_discount_percent, v_source.timezone_name)
    RETURNING id INTO v_id;
    INSERT INTO public.promotion_items (promotion_id, product_id, variation_id, discount_percent)
    SELECT v_id, item.product_id, item.variation_id, item.discount_percent
    FROM public.promotion_items AS item WHERE item.promotion_id = p_promotion_id;
    RETURN v_id;
  ELSIF p_action = 'interrupt' THEN
    UPDATE public.promotions SET status = 'interrupted'
    WHERE id = p_promotion_id AND status = 'scheduled'
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'PROMOTION_CANNOT_INTERRUPT' USING ERRCODE = '22023'; END IF;
    RETURN v_id;
  ELSIF p_action = 'resume' THEN
    UPDATE public.promotions SET status = 'scheduled'
    WHERE id = p_promotion_id AND status = 'interrupted'
      AND starts_on IS NOT NULL AND ends_on IS NOT NULL
      AND (now() AT TIME ZONE timezone_name)::date BETWEEN starts_on AND ends_on
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'PROMOTION_CANNOT_RESUME_OUTSIDE_PERIOD' USING ERRCODE = '22023'; END IF;
    RETURN v_id;
  ELSIF p_action = 'delete' THEN
    SELECT * INTO v_source FROM public.promotions WHERE id = p_promotion_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PROMOTION_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
    v_computed_status := CASE
      WHEN v_source.status = 'draft' THEN 'draft'
      WHEN v_source.status = 'interrupted' THEN 'interrupted'
      WHEN (now() AT TIME ZONE v_source.timezone_name)::date > v_source.ends_on THEN 'ended'
      ELSE v_source.status
    END;
    IF v_computed_status NOT IN ('draft', 'interrupted', 'ended') THEN
      RAISE EXCEPTION 'PROMOTION_MUST_BE_INTERRUPTED_BEFORE_DELETE' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.promotions WHERE id = p_promotion_id;
    RETURN p_promotion_id;
  ELSIF p_action <> 'save' THEN
    RAISE EXCEPTION 'PROMOTION_ACTION_INVALID' USING ERRCODE = '22023';
  END IF;

  v_name := btrim(COALESCE(p_payload->>'name', ''));
  v_description := NULLIF(btrim(p_payload->>'description'), '');
  v_conditions := NULLIF(btrim(p_payload->>'conditions'), '');
  v_mode := COALESCE(p_payload->>'discount_mode', 'general');
  v_percent := NULLIF(p_payload->>'general_discount_percent', '')::numeric;
  v_starts := NULLIF(p_payload->>'starts_on', '')::date;
  v_ends := NULLIF(p_payload->>'ends_on', '')::date;
  v_timezone := COALESCE(NULLIF(p_payload->>'timezone_name', ''), 'America/Sao_Paulo');
  v_status := COALESCE(NULLIF(p_payload->>'status', ''), 'draft');
  v_items := COALESCE(p_payload->'items', '[]'::jsonb);

  IF length(v_name) = 0 OR length(v_name) > 120 OR length(COALESCE(v_description, '')) > 3000
    OR length(COALESCE(v_conditions, '')) > 2000
    OR v_mode NOT IN ('general', 'per_variation')
    OR v_status NOT IN ('draft', 'scheduled')
    OR jsonb_typeof(v_items) <> 'array'
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names AS zone WHERE zone.name = v_timezone)
  THEN
    RAISE EXCEPTION 'PROMOTION_FORM_INVALID' USING ERRCODE = '22023';
  END IF;
  IF v_starts IS NOT NULL AND v_ends IS NOT NULL AND v_starts > v_ends THEN
    RAISE EXCEPTION 'PROMOTION_PERIOD_INVALID' USING ERRCODE = '22023';
  END IF;
  IF v_mode = 'general' AND v_percent IS NOT NULL AND v_percent NOT BETWEEN 0.01 AND 100 THEN
    RAISE EXCEPTION 'PROMOTION_PERCENT_INVALID' USING ERRCODE = '22023';
  END IF;
  IF v_status = 'scheduled' AND (
    v_starts IS NULL OR v_ends IS NULL OR jsonb_array_length(v_items) = 0
    OR (v_mode = 'general' AND (v_percent IS NULL OR v_percent NOT BETWEEN 0.01 AND 100))
  ) THEN
    RAISE EXCEPTION 'PROMOTION_SCHEDULE_INCOMPLETE' USING ERRCODE = '22023';
  END IF;

  IF p_promotion_id IS NULL THEN
    INSERT INTO public.promotions (name, description, conditions, discount_mode, general_discount_percent, starts_on, ends_on, timezone_name)
    VALUES (v_name, v_description, v_conditions, v_mode,
      CASE WHEN v_mode = 'general' THEN v_percent ELSE NULL END,
      v_starts, v_ends, v_timezone)
    RETURNING id INTO v_id;
  ELSE
    SELECT id INTO v_id FROM public.promotions WHERE id = p_promotion_id FOR UPDATE;
    IF v_id IS NULL THEN RAISE EXCEPTION 'PROMOTION_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
    UPDATE public.promotions SET status = 'draft', name = v_name, description = v_description,
      conditions = v_conditions, discount_mode = v_mode,
      general_discount_percent = CASE WHEN v_mode = 'general' THEN v_percent ELSE NULL END,
      starts_on = v_starts, ends_on = v_ends, timezone_name = v_timezone
    WHERE id = v_id;
    DELETE FROM public.promotion_items WHERE promotion_id = v_id;
  END IF;

  INSERT INTO public.promotion_items (promotion_id, product_id, variation_id, discount_percent)
  SELECT v_id, entry.product_id, entry.variation_id,
    CASE WHEN v_mode = 'per_variation' THEN entry.discount_percent ELSE NULL END
  FROM jsonb_to_recordset(v_items) AS entry(product_id uuid, variation_id uuid, discount_percent numeric);

  IF v_mode = 'per_variation' AND EXISTS (
    SELECT 1 FROM jsonb_to_recordset(v_items) AS entry(product_id uuid, variation_id uuid, discount_percent numeric)
    WHERE entry.discount_percent IS NULL OR entry.discount_percent NOT BETWEEN 0.01 AND 100
  ) THEN
    RAISE EXCEPTION 'PROMOTION_ITEM_PERCENT_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF v_status = 'scheduled' THEN
    UPDATE public.promotions SET status = 'scheduled' WHERE id = v_id;
  END IF;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.search_promotion_items(text, uuid, uuid, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_promotions(text, text, date, date, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_catalog_with_campaign_prices(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mutate_promotion(text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_promotion_items(text, uuid, uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_promotions(text, text, date, date, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_catalog_with_campaign_prices(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_promotion(text, uuid, jsonb) TO authenticated;

COMMENT ON TABLE public.promotions IS 'Campanhas temporárias de desconto; o preço cadastrado do produto não é alterado.';
COMMENT ON TABLE public.promotion_items IS 'Produtos simples ou variações incluídos em uma promoção.';
COMMENT ON VIEW public.active_campaign_prices IS 'Preço atual de participantes elegíveis, calculado em tempo real sobre o preço após o desconto normal do produto.';

-- Promotions: current catalog prices and campaign-aware public pages
-- Promotions: current catalog prices and campaign-aware public pages
CREATE OR REPLACE VIEW public.catalog_current_prices
WITH (security_invoker = true)
AS
WITH source AS (
  SELECT product.id AS product_id, NULL::uuid AS variation_id,
    COALESCE(product.unit_price, product.price, 0)::numeric AS regular_price,
    product.promo_price::numeric AS raw_promo_price
  FROM public.products AS product
  WHERE product.status = 'published' AND product.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.product_variations AS variation WHERE variation.product_id = product.id)
  UNION ALL
  SELECT product.id AS product_id, variation.id AS variation_id,
    CASE WHEN variation.use_parent_price IS FALSE
      THEN COALESCE(variation.price, product.unit_price, product.price, 0)
      ELSE COALESCE(product.unit_price, product.price, variation.price, 0) END::numeric AS regular_price,
    CASE WHEN variation.use_parent_promo_price IS FALSE
      THEN COALESCE(variation.promo_price, product.promo_price)
      ELSE product.promo_price END::numeric AS raw_promo_price
  FROM public.products AS product
  JOIN public.product_variations AS variation ON variation.product_id = product.id
  WHERE product.status = 'published' AND product.deleted_at IS NULL AND variation.status = 'published'
), priced AS (
  SELECT source.*,
    CASE WHEN source.raw_promo_price > 0 AND source.raw_promo_price < source.regular_price
      THEN source.raw_promo_price ELSE source.regular_price END::numeric AS product_price
  FROM source
)
SELECT priced.product_id, priced.variation_id,
  COALESCE(campaign.regular_price, priced.regular_price) AS regular_price,
  COALESCE(campaign.product_price, priced.product_price) AS product_price,
  COALESCE(campaign.final_price, priced.product_price) AS effective_price,
  campaign.promotion_id, campaign.promotion_name,
  campaign.promotion_discount_percent,
  campaign.conditions AS promotion_conditions,
  campaign.promotion_discount_amount
FROM priced
LEFT JOIN public.active_campaign_prices AS campaign
  ON campaign.product_id = priced.product_id
  AND campaign.variation_id IS NOT DISTINCT FROM priced.variation_id;
GRANT SELECT ON public.catalog_current_prices TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.search_catalog_product_page(p_search text, p_category_ids uuid[] DEFAULT NULL::uuid[], p_environment_category_ids uuid[] DEFAULT NULL::uuid[], p_type text DEFAULT 'all'::text, p_min_price numeric DEFAULT 0, p_max_price numeric DEFAULT 10000, p_page integer DEFAULT 1, p_page_size integer DEFAULT 15, p_sort_by text DEFAULT 'newest'::text)
 RETURNS TABLE(product_id uuid, match_rank integer, match_score real, matched_terms integer, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH
  input AS (
    SELECT public.normalize_catalog_search(p_search) AS query
  ),
  variants AS (
    SELECT input.query AS query, false AS is_alias
    FROM input
    WHERE char_length(input.query) >= 3

    UNION

    SELECT alias.normalized_canonical, true
    FROM input
    JOIN public.catalog_search_aliases alias
      ON alias.active
     AND alias.normalized_alias = input.query

    UNION

    SELECT alias.normalized_alias, true
    FROM input
    JOIN public.catalog_search_aliases alias
      ON alias.active
     AND alias.normalized_canonical = input.query
  ),
  variant_tokens AS (
    SELECT DISTINCT variants.query, variants.is_alias, token.value AS token
    FROM variants
    CROSS JOIN LATERAL regexp_split_to_table(variants.query, '[[:space:]]+') AS token(value)
    WHERE char_length(token.value) >= 3
      AND token.value NOT IN ('de', 'da', 'do', 'dos', 'das', 'para', 'com', 'em', 'e')
  ),
  search_terms AS (
    SELECT variants.query AS variant, variants.is_alias, variants.query AS term, true AS is_phrase
    FROM variants

    UNION

    SELECT variant_tokens.query, variant_tokens.is_alias, variant_tokens.token, false
    FROM variant_tokens
  ),
  params AS (
    SELECT
      greatest(coalesce(p_page, 1), 1)::bigint AS page,
      least(greatest(coalesce(p_page_size, 15), 1), 30)::bigint AS page_size,
      coalesce(p_sort_by, 'newest') AS sort_by
  ),
  eligible_products AS NOT MATERIALIZED (
    SELECT p.id, p.name, p.price, p.promo_price,
           prices.effective_price,
           p.is_salvado, p.opportunity_id, p.created_at
    FROM public.products p
    CROSS JOIN LATERAL (
      SELECT min(current_price.effective_price) AS effective_price
      FROM public.catalog_current_prices AS current_price
      WHERE current_price.product_id = p.id
    ) AS prices
    WHERE p.status = 'published'
      AND p.deleted_at IS NULL
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.product_variations pv_any WHERE pv_any.product_id = p.id
        )
        OR EXISTS (
          SELECT 1 FROM public.product_variations pv_public
          WHERE pv_public.product_id = p.id AND pv_public.status = 'published'
        )
      )
      AND (
        coalesce(cardinality(p_category_ids), 0) = 0
        OR EXISTS (
          SELECT 1 FROM public.product_categories pc
          WHERE pc.product_id = p.id AND pc.category_id = ANY (p_category_ids)
        )
      )
      AND (
        coalesce(cardinality(p_environment_category_ids), 0) = 0
        OR EXISTS (
          SELECT 1 FROM public.product_categories pc
          WHERE pc.product_id = p.id AND pc.category_id = ANY (p_environment_category_ids)
        )
      )
      AND (
        coalesce(p_type, 'all') = 'all'
        OR (p_type = 'salvados' AND p.is_salvado IS TRUE)
        OR (p_type = 'promotion' AND (p.promo_price IS NOT NULL OR EXISTS (SELECT 1 FROM public.catalog_current_prices AS campaign_price WHERE campaign_price.product_id = p.id AND campaign_price.promotion_id IS NOT NULL)))
        OR (p_type NOT IN ('salvados', 'promotion') AND p.opportunity_id::text = p_type)
      )
      AND EXISTS (
        SELECT 1
        FROM public.catalog_current_prices AS current_price
        WHERE current_price.product_id = p.id
          AND current_price.effective_price
            BETWEEN coalesce(p_min_price, 0) AND coalesce(p_max_price, 10000)
      )
  ),
  raw_hits AS (
    SELECT ep.id AS product_id, st.variant, st.is_alias, st.term, st.is_phrase,
           'name'::text AS source, public.normalize_catalog_search(ep.name) AS field_value
    FROM eligible_products ep
    CROSS JOIN search_terms st
    WHERE public.normalize_catalog_search(ep.name) = st.term
       OR public.normalize_catalog_search(ep.name) LIKE st.term || '%'
       OR public.normalize_catalog_search(ep.name) LIKE '%' || st.term || '%'
       OR (st.term !~ '[[:space:]]' AND char_length(st.term) >= 4
           AND public.word_similarity(st.term, public.normalize_catalog_search(ep.name)) >= 0.45)

  ),
  typed_hits AS (
    SELECT raw_hits.*,
           CASE
             WHEN field_value = term THEN 0
             WHEN field_value LIKE term || '%' THEN 1
             WHEN field_value LIKE '%' || term || '%' THEN 2
             ELSE 4
           END AS hit_rank,
           CASE
             WHEN field_value = term THEN 1.0::real
             WHEN field_value LIKE term || '%' THEN 0.95::real
             WHEN field_value LIKE '%' || term || '%' THEN 0.85::real
             ELSE 0.0::real
           END AS direct_score
    FROM raw_hits
  ),
  valid_hits AS (
    SELECT typed_hits.*,
           CASE WHEN typed_hits.hit_rank < 4 THEN typed_hits.direct_score ELSE (
             SELECT max(similarity(typed_hits.term, word.value))::real
             FROM regexp_split_to_table(typed_hits.field_value, '[[:space:]]+') AS word(value)
             WHERE char_length(typed_hits.term) >= 4
               AND abs(char_length(typed_hits.term) - char_length(word.value)) <= 1
               AND similarity(typed_hits.term, word.value) >= CASE
                 WHEN char_length(typed_hits.term) = 4 THEN 0.30
                 WHEN char_length(typed_hits.term) = 5 THEN 0.40
                 ELSE 0.35
               END
           ) END AS hit_score
    FROM typed_hits
    WHERE typed_hits.hit_rank < 4
       OR (
         typed_hits.term !~ '[[:space:]]'
         AND EXISTS (
           SELECT 1
           FROM regexp_split_to_table(typed_hits.field_value, '[[:space:]]+') AS word(value)
           WHERE char_length(typed_hits.term) >= 4
             AND abs(char_length(typed_hits.term) - char_length(word.value)) <= 1
             AND similarity(typed_hits.term, word.value) >= CASE
               WHEN char_length(typed_hits.term) = 4 THEN 0.30
               WHEN char_length(typed_hits.term) = 5 THEN 0.40
               ELSE 0.35
             END
         )
       )
  ),
  variant_scores AS (
    SELECT vh.product_id, vh.variant, vh.is_alias,
           count(DISTINCT vh.term) FILTER (WHERE NOT vh.is_phrase)::integer AS matched_terms,
           count(DISTINCT vt.token)::integer AS total_terms,
           bool_or(vh.source = 'name' AND vh.is_phrase AND vh.hit_rank = 0 AND NOT vh.is_alias) AS exact_name,
           bool_or(vh.source = 'name' AND vh.is_phrase AND vh.hit_rank = 1 AND NOT vh.is_alias) AS prefix_name,
           bool_or(vh.source = 'name' AND vh.is_phrase AND vh.hit_rank = 2 AND NOT vh.is_alias) AS partial_name,
           bool_or(vh.is_alias AND vh.hit_rank < 4) AS alias_match,
           bool_or(vh.hit_rank = 4) AS fuzzy_match,
           max(vh.hit_score)::real AS score
    FROM valid_hits vh
    JOIN variant_tokens vt ON vt.query = vh.variant AND vt.is_alias = vh.is_alias
    GROUP BY vh.product_id, vh.variant, vh.is_alias
  ),
  product_scores AS (
    SELECT vs.product_id,
           CASE
             WHEN bool_or(vs.exact_name) THEN 0
             WHEN bool_or(vs.prefix_name) THEN 1
             WHEN bool_or(vs.partial_name) THEN 2
             WHEN bool_or(vs.alias_match) THEN 3
             WHEN bool_or(vs.fuzzy_match) THEN 4
             ELSE 5
           END AS rank,
           max(vs.score)::real AS score,
           max(vs.matched_terms)::integer AS matched_terms
    FROM variant_scores vs
    WHERE vs.matched_terms >= greatest(1, ceil(vs.total_terms / 2.0)::integer)
    GROUP BY vs.product_id
  ),
  ordered AS (
    SELECT ps.product_id, ps.rank, ps.score, ps.matched_terms,
           count(*) OVER () AS result_count,
           row_number() OVER (
             ORDER BY ps.rank ASC, ps.matched_terms DESC, ps.score DESC,
               CASE WHEN (SELECT sort_by FROM params) = 'price-asc' THEN ep.effective_price END ASC NULLS LAST,
               CASE WHEN (SELECT sort_by FROM params) = 'price-desc' THEN ep.effective_price END DESC NULLS LAST,
               CASE WHEN (SELECT sort_by FROM params) = 'title-asc' THEN ep.name END ASC NULLS LAST,
               ep.created_at DESC,
               ps.product_id
           ) AS row_number
    FROM product_scores ps
    JOIN eligible_products ep ON ep.id = ps.product_id
  )
  SELECT ordered.product_id, ordered.rank, ordered.score, ordered.matched_terms, ordered.result_count
  FROM ordered
  CROSS JOIN params
  WHERE ordered.row_number > (params.page - 1) * params.page_size
    AND ordered.row_number <= params.page * params.page_size
  ORDER BY ordered.row_number;
$function$;
CREATE OR REPLACE FUNCTION public.catalog_product_card_page(
  p_search text DEFAULT '', p_category_ids uuid[] DEFAULT NULL,
  p_environment_category_ids uuid[] DEFAULT NULL, p_type text DEFAULT 'all',
  p_min_price numeric DEFAULT 0, p_max_price numeric DEFAULT 10000,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 15, p_sort_by text DEFAULT 'newest'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  ids uuid[]; total bigint; cards jsonb;
  page_size integer := least(greatest(coalesce(p_page_size,15),1),30);
BEGIN
  IF nullif(btrim(p_search),'') IS NOT NULL THEN
    SELECT array_agg(s.product_id ORDER BY s.ordinality), coalesce(max(s.total_count),0)
    INTO ids,total
    FROM public.search_catalog_product_page(p_search,p_category_ids,p_environment_category_ids,
      p_type,p_min_price,p_max_price,p_page,page_size,p_sort_by) WITH ORDINALITY s;
    IF ids IS NULL AND coalesce(p_page,1)>1 THEN
      SELECT coalesce(max(s.total_count),0) INTO total FROM public.search_catalog_product_page(
        p_search,p_category_ids,p_environment_category_ids,p_type,p_min_price,p_max_price,1,1,p_sort_by) s;
    END IF;
  ELSE
    WITH eligible AS (
      SELECT p.id,p.name,p.created_at,prices.effective_price
      FROM public.products p
      CROSS JOIN LATERAL (
        SELECT min(current_price.effective_price) AS effective_price
        FROM public.catalog_current_prices AS current_price
        WHERE current_price.product_id = p.id
      ) AS prices
      WHERE p.status='published' AND p.deleted_at IS NULL
        AND (NOT EXISTS(SELECT 1 FROM public.product_variations v WHERE v.product_id=p.id)
          OR EXISTS(SELECT 1 FROM public.product_variations v WHERE v.product_id=p.id AND v.status='published'))
        AND (coalesce(cardinality(p_category_ids),0)=0 OR EXISTS(SELECT 1 FROM public.product_categories c WHERE c.product_id=p.id AND c.category_id=ANY(p_category_ids)))
        AND (coalesce(cardinality(p_environment_category_ids),0)=0 OR EXISTS(SELECT 1 FROM public.product_categories c WHERE c.product_id=p.id AND c.category_id=ANY(p_environment_category_ids)))
        AND (coalesce(p_type,'all')='all' OR (p_type='salvados' AND p.is_salvado IS TRUE)
          OR (p_type='promotion' AND (p.promo_price IS NOT NULL OR EXISTS(SELECT 1 FROM public.catalog_current_prices AS campaign_price WHERE campaign_price.product_id=p.id AND campaign_price.promotion_id IS NOT NULL)))
          OR (p_type NOT IN ('salvados','promotion') AND p.opportunity_id::text=p_type))
        AND EXISTS (
          SELECT 1 FROM public.catalog_current_prices AS current_price
          WHERE current_price.product_id=p.id
            AND current_price.effective_price BETWEEN coalesce(p_min_price,0) AND coalesce(p_max_price,10000)
        )
    ), ordered AS (
      SELECT e.*,row_number() OVER(ORDER BY
        CASE WHEN p_sort_by='price-asc' THEN effective_price END ASC NULLS LAST,
        CASE WHEN p_sort_by='price-desc' THEN effective_price END DESC NULLS LAST,
        CASE WHEN p_sort_by='title-asc' THEN name END ASC NULLS LAST,created_at DESC,id) position
      FROM eligible e
    )
    SELECT array_agg(id ORDER BY position) FILTER(WHERE position>(greatest(coalesce(p_page,1),1)-1)::bigint*page_size AND position<=greatest(coalesce(p_page,1),1)::bigint*page_size),count(*)
    INTO ids,total FROM ordered;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.name,'slug',p.slug,'code',p.code,
    'price',coalesce((SELECT current_price.regular_price FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id IS NULL),p.unit_price,p.price),
    'promo_price',(SELECT CASE WHEN current_price.product_price < current_price.regular_price THEN current_price.product_price ELSE NULL END FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id IS NULL),
    'promotion',(SELECT jsonb_build_object('id',current_price.promotion_id,'name',current_price.promotion_name,'discount_percent',current_price.promotion_discount_percent,'final_price',current_price.effective_price,'conditions',current_price.promotion_conditions) FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id IS NULL AND current_price.promotion_id IS NOT NULL),
    'status',p.status,'is_salvado',p.is_salvado,'opportunity_id',p.opportunity_id,
    'product_images',coalesce((SELECT jsonb_agg(jsonb_build_object('image_url',i.image_url,'is_main',i.is_main)) FROM
      (SELECT image_url,is_main FROM public.product_images WHERE product_id=p.id ORDER BY is_main DESC NULLS LAST,created_at,id LIMIT 1) i),'[]'::jsonb),
    'product_variations',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id',v.id,'name',v.name,'sku',v.sku,
      'price',(SELECT current_price.regular_price FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id=v.id),
      'promo_price',(SELECT CASE WHEN current_price.product_price < current_price.regular_price THEN current_price.product_price ELSE NULL END FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id=v.id),
      'promotion',(SELECT jsonb_build_object('id',current_price.promotion_id,'name',current_price.promotion_name,'discount_percent',current_price.promotion_discount_percent,'final_price',current_price.effective_price,'conditions',current_price.promotion_conditions) FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id=v.id AND current_price.promotion_id IS NOT NULL),
      'image_url',split_part(v.image_url,',',1),'attributes',v.attributes,'use_parent_name',v.use_parent_name,
      'use_parent_price',v.use_parent_price,'use_parent_promo_price',v.use_parent_promo_price,'status',v.status
    ) ORDER BY v.created_at,v.id) FROM public.product_variations v WHERE v.product_id=p.id AND v.status='published'
      AND EXISTS (SELECT 1 FROM public.catalog_current_prices AS current_price
        WHERE current_price.product_id=p.id AND current_price.variation_id=v.id
          AND current_price.effective_price BETWEEN coalesce(p_min_price,0) AND coalesce(p_max_price,10000))),'[]'::jsonb),
    'product_categories',coalesce((SELECT jsonb_agg(jsonb_build_object('category_id',c.category_id,'categories',jsonb_build_object('name',cat.name))) FROM public.product_categories c JOIN public.categories cat ON cat.id=c.category_id WHERE c.product_id=p.id),'[]'::jsonb),
    'opportunities',(SELECT jsonb_build_object('name',o.name,'slug',o.slug,'badge_color',o.badge_color,'border_color',o.border_color,'border_style',o.border_style,'badge_animation',o.badge_animation,'title_color',o.title_color) FROM public.opportunities o WHERE o.id=p.opportunity_id)
  ) ORDER BY array_position(ids,p.id)),'[]'::jsonb) INTO cards
  FROM public.products p WHERE p.id=ANY(ids) AND p.status='published' AND p.deleted_at IS NULL;
  RETURN jsonb_build_object('products',cards,'total',total);
END;
$$;
CREATE OR REPLACE FUNCTION public.public_catalog_product_detail_with_campaign(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH detail AS (SELECT public.public_catalog_product_detail(p_slug) AS payload),
  selected_product AS (
    SELECT product.id, COALESCE(product.unit_price, product.price, 0)::numeric AS regular_price
    FROM public.products AS product
    WHERE product.slug = p_slug AND product.status = 'published' AND product.deleted_at IS NULL LIMIT 1
  )
  SELECT detail.payload || jsonb_build_object(
    'price', COALESCE(parent_price.regular_price, selected_product.regular_price),
    'promo_price', CASE WHEN parent_price.product_price < parent_price.regular_price THEN parent_price.product_price ELSE NULL END,
    'promotion', CASE WHEN parent_price.promotion_id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', parent_price.promotion_id, 'name', parent_price.promotion_name,
      'discount_percent', parent_price.promotion_discount_percent,
      'final_price', parent_price.effective_price, 'conditions', parent_price.promotion_conditions) END,
    'product_variations', COALESCE((
      SELECT jsonb_agg(variation.value || jsonb_build_object(
        'price', COALESCE(variation_price.regular_price, (variation.value->>'price')::numeric),
        'promo_price', CASE WHEN variation_price.product_price < variation_price.regular_price THEN variation_price.product_price ELSE NULL END,
        'promotion', CASE WHEN variation_price.promotion_id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', variation_price.promotion_id, 'name', variation_price.promotion_name,
          'discount_percent', variation_price.promotion_discount_percent,
          'final_price', variation_price.effective_price, 'conditions', variation_price.promotion_conditions) END
      ) ORDER BY variation.ordinality)
      FROM jsonb_array_elements(COALESCE(detail.payload->'product_variations', '[]'::jsonb)) WITH ORDINALITY AS variation(value, ordinality)
      LEFT JOIN public.catalog_current_prices AS variation_price
        ON variation_price.product_id = selected_product.id
        AND variation_price.variation_id = (variation.value->>'id')::uuid
    ), '[]'::jsonb)
  )
  FROM detail CROSS JOIN selected_product
  LEFT JOIN public.catalog_current_prices AS parent_price
    ON parent_price.product_id = selected_product.id AND parent_price.variation_id IS NULL;
$$;
REVOKE ALL ON FUNCTION public.public_catalog_product_detail_with_campaign(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_catalog_product_detail_with_campaign(text) TO anon, authenticated, service_role;

COMMIT;
