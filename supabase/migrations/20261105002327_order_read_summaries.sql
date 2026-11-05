-- Compact read model. Full fiscal/customer/item snapshots remain in orders and
-- are read by ID before details, editing or actions; never persist this model.
CREATE OR REPLACE FUNCTION public.read_order_summaries(p_ids text[])
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT (to_jsonb(o)-'items'-'order_data') || jsonb_build_object(
    '__orderSummary',true,
    'order_data',(coalesce(o.order_data,'{}'::jsonb)-'items'-'shipping'-'fiscalContext'-'fiscalSnapshot'-'nfeXml'-'xml') || jsonb_build_object(
      '__orderSummary',true,'shipping',coalesce(o.order_data->'shipping','{}'::jsonb)-'routeGeoJSON'),
    'items',coalesce((SELECT jsonb_agg(
      (coalesce(i.item_snapshot,'{}'::jsonb)-'fiscal'-'images'-'technicalSpecs'-'fiscalSnapshot') || jsonb_strip_nulls(jsonb_build_object(
        'id',i.id,'orderItemId',i.id,'productId',i.product_id,'variationId',i.variation_id,
        'code',i.code,'description',i.description,'quantity',i.quantity,'unitPrice',i.unit_price,
        'unitDiscount',i.unit_discount,'discountType',i.discount_type,'costPrice',i.cost_price,
        'condition',i.condition,'handlingType',i.handling_type,'observation',i.observation,
        'isTemporaryProduct',i.is_temporary_product,'returnedQuantity',i.returned_quantity,
        'returnedUnitPrice',i.returned_unit_price,'returnedTotalValue',i.returned_total_value,
        'originalUnitPrice',i.original_unit_price,'originalTotalValue',i.original_total_value
      )) ORDER BY i.item_index,i.id) FROM public.order_items i WHERE i.order_id=o.id),
      (SELECT jsonb_agg(j.value-'fiscal'-'images'-'technicalSpecs'-'fiscalSnapshot' ORDER BY j.ordinality)
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(o.items)='array' AND jsonb_array_length(o.items)>0 THEN o.items
          WHEN jsonb_typeof(o.order_data->'items')='array' THEN o.order_data->'items' ELSE '[]'::jsonb END) WITH ORDINALITY j),
      '[]'::jsonb)
  )
  FROM public.orders o WHERE o.id=ANY(p_ids)
  ORDER BY array_position(p_ids,o.id);
$$;
REVOKE ALL ON FUNCTION public.read_order_summaries(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_order_summaries(text[]) TO authenticated,service_role;
COMMENT ON FUNCTION public.read_order_summaries(text[]) IS 'Invoker RLS; only explicit selected IDs. Excludes route geometry, item fiscal snapshots and duplicate item arrays. Must hydrate before actions.';

