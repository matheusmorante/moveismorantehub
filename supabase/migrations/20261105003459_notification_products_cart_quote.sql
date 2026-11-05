CREATE OR REPLACE FUNCTION public.notification_product_summaries(p_conditions text[] DEFAULT ARRAY['novo'])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'description',p.description,'stock',p.stock,'min_stock',p.min_stock,'unit',p.unit,
    'active',p.active,'deleted',p.deleted,'has_variations',p.has_variations,'item_type',p.item_type,
    'condition',p.condition,'notification_config',p.notification_config,
    'variations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'stock',v.stock)) FROM public.product_variations v WHERE v.product_id=p.id),'[]'::jsonb)
  ) ORDER BY p.id),'[]'::jsonb)
  FROM public.products p
  WHERE p.active IS TRUE AND p.deleted_at IS NULL AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND (EXISTS(SELECT 1 FROM public.desire_matches m WHERE m.product_id=p.id AND m.notified IS FALSE)
      OR (p.deleted IS NOT TRUE AND coalesce(nullif(p.item_type,''),'product')='product'
        AND coalesce(nullif(p.condition,''),'novo')=ANY(coalesce(p_conditions,ARRAY['novo']))
        AND p.notification_config->'enabled' IS DISTINCT FROM 'false'::jsonb
        AND ((p.has_variations IS TRUE AND p.notification_config->'notifyZeroStock' IS DISTINCT FROM 'false'::jsonb
              AND EXISTS(SELECT 1 FROM public.product_variations v WHERE v.product_id=p.id AND coalesce(v.stock,0)=0))
          OR (p.has_variations IS NOT TRUE AND (
            (p.notification_config->'notifyZeroStock' IS DISTINCT FROM 'false'::jsonb AND coalesce(p.stock,0)=0)
            OR (p.notification_config->'notifyMinStock' IS DISTINCT FROM 'false'::jsonb AND p.min_stock>0 AND p.stock>0 AND p.stock<=p.min_stock))))));
$$;
REVOKE ALL ON FUNCTION public.notification_product_summaries(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.notification_product_summaries(text[]) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.catalog_cart_quote(p_item_ids text[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',requested.id,'price',coalesce(
      CASE WHEN v.use_parent_promo_price IS FALSE AND nullif(v.promo_price,0) IS NOT NULL THEN v.promo_price ELSE nullif(p.promo_price,0) END,
      CASE WHEN v.use_parent_price IS FALSE AND nullif(v.price,0) IS NOT NULL THEN v.price ELSE p.price END),
    'stock',CASE WHEN v.id IS NOT NULL THEN v.stock ELSE p.stock END
  )),'[]'::jsonb)
  FROM (SELECT DISTINCT unnest(p_item_ids) id) requested
  JOIN public.products p ON p.id::text=left(requested.id,36)
  LEFT JOIN public.product_variations v ON v.product_id=p.id AND requested.id=p.id::text||'-'||v.id::text
  WHERE p.status='published' AND p.deleted_at IS NULL
    AND ((v.id IS NOT NULL AND v.status='published') OR (requested.id=p.id::text AND NOT EXISTS(SELECT 1 FROM public.product_variations any_v WHERE any_v.product_id=p.id)))
    AND coalesce(cardinality(p_item_ids),0)<=100;
$$;
REVOKE ALL ON FUNCTION public.catalog_cart_quote(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_cart_quote(text[]) TO anon,authenticated,service_role;
COMMENT ON FUNCTION public.catalog_cart_quote(text[]) IS 'Current public price/stock for the selected cart IDs only. Does not reserve stock, create orders or send messages.';
