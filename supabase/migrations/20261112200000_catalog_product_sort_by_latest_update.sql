-- A vitrine fixa a ordem pela alteração mais recente; produtos sem updated_at
-- usam created_at como fallback. Busca textual mantém a relevância como critério
-- principal e continua usando a data como desempate dentro do RPC de busca.
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
      p_type,p_min_price,p_max_price,p_page,page_size,'newest') WITH ORDINALITY s;
    IF ids IS NULL AND coalesce(p_page,1)>1 THEN
      SELECT coalesce(max(s.total_count),0) INTO total FROM public.search_catalog_product_page(
        p_search,p_category_ids,p_environment_category_ids,p_type,p_min_price,p_max_price,1,1,'newest') s;
    END IF;
  ELSE
    WITH eligible AS (
      SELECT p.id,p.name,p.created_at,p.updated_at,prices.effective_price
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
        CASE WHEN p_sort_by='title-asc' THEN name END ASC NULLS LAST,
        coalesce(updated_at,created_at) DESC NULLS LAST,created_at DESC,id) position
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
