BEGIN;

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
  prices.product_price AS final_price,
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

COMMENT ON VIEW public.active_campaign_prices IS
  'Campanhas vigentes e seus descontos informativos; final_price mantém o preço cadastrado e não aplica o desconto condicional.';

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
  priced.regular_price,
  priced.product_price,
  priced.product_price AS effective_price,
  campaign.promotion_id, campaign.promotion_name,
  campaign.promotion_discount_percent,
  campaign.conditions AS promotion_conditions,
  campaign.promotion_discount_amount
FROM priced
LEFT JOIN public.active_campaign_prices AS campaign
  ON campaign.product_id = priced.product_id
  AND campaign.variation_id IS NOT DISTINCT FROM priced.variation_id;

COMMENT ON VIEW public.catalog_current_prices IS
  'Preços atuais cadastrados para catálogo; campanhas associadas são informativas e não alteram product_price/effective_price.';

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
    COALESCE(base.product_price, result.unit_price) AS final_unit_price,
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

-- Keep existing product price fields intact. The campaign object is only a notice;
-- a null final_price makes older storefront clients fall back to the registered price.
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
    'promotion',(SELECT jsonb_build_object('id',current_price.promotion_id,'name',current_price.promotion_name,'discount_percent',current_price.promotion_discount_percent,'final_price',NULL,'conditions',current_price.promotion_conditions) FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id IS NULL AND current_price.promotion_id IS NOT NULL),
    'status',p.status,'is_salvado',p.is_salvado,'opportunity_id',p.opportunity_id,
    'product_images',coalesce((SELECT jsonb_agg(jsonb_build_object('image_url',i.image_url,'is_main',i.is_main)) FROM
      (SELECT image_url,is_main FROM public.product_images WHERE product_id=p.id ORDER BY is_main DESC NULLS LAST,created_at,id LIMIT 1) i),'[]'::jsonb),
    'product_variations',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id',v.id,'name',v.name,'sku',v.sku,
      'price',(SELECT current_price.regular_price FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id=v.id),
      'promo_price',(SELECT CASE WHEN current_price.product_price < current_price.regular_price THEN current_price.product_price ELSE NULL END FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id=v.id),
      'promotion',(SELECT jsonb_build_object('id',current_price.promotion_id,'name',current_price.promotion_name,'discount_percent',current_price.promotion_discount_percent,'final_price',NULL,'conditions',current_price.promotion_conditions) FROM public.catalog_current_prices AS current_price WHERE current_price.product_id=p.id AND current_price.variation_id=v.id AND current_price.promotion_id IS NOT NULL),
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
      'final_price', NULL, 'conditions', parent_price.promotion_conditions) END,
    'product_variations', COALESCE((
      SELECT jsonb_agg(variation.value || jsonb_build_object(
        'price', COALESCE(variation_price.regular_price, (variation.value->>'price')::numeric),
        'promo_price', CASE WHEN variation_price.product_price < variation_price.regular_price THEN variation_price.product_price ELSE NULL END,
        'promotion', CASE WHEN variation_price.promotion_id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', variation_price.promotion_id, 'name', variation_price.promotion_name,
          'discount_percent', variation_price.promotion_discount_percent,
          'final_price', NULL, 'conditions', variation_price.promotion_conditions) END
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

COMMENT ON FUNCTION public.search_catalog_with_campaign_prices(text, integer) IS
  'Busca itens comerciais e retorna o preço cadastrado vigente; metadados de campanha são informativos e não alteram o preço.';
COMMENT ON FUNCTION public.public_catalog_product_detail_with_campaign(text) IS
  'Detalhe do catálogo com metadados e condições de campanha informativos; o preço do produto não recebe desconto automático da campanha.';

COMMIT;
