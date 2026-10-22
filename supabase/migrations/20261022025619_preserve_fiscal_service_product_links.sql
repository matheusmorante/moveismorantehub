-- Keep service-to-product links immutable once a fiscal document exists.
-- The links determine which merchandise rows receive each service value.
CREATE OR REPLACE FUNCTION public.fiscal_order_edit_projection(p_data jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object(
  'items',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'orderItemId',i->'orderItemId',
    'productId',i->'productId','variationId',i->'variationId','code',i->'code',
    'description',i->'description','quantity',i->'quantity','unitPrice',i->'unitPrice',
    'unitDiscount',i->'unitDiscount','discountType',i->'discountType','itemType',i->'itemType',
    'linkedProductOrderItemIds',i->'linkedProductOrderItemIds',
    'linkedProductOrderItemId',i->'linkedProductOrderItemId',
    'condition',i->'condition','fiscal',i->'fiscal') ORDER BY n),'[]'::jsonb)
    FROM jsonb_array_elements(coalesce(p_data->'items','[]')) WITH ORDINALITY t(i,n)),
  'customer',(p_data->'customerData') - ARRAY['phone','noPhone','email','additionalContacts','marketingOrigin'],
  'shipping',jsonb_build_object('value',p_data#>'{shipping,value}',
    'deliveryMethod',p_data#>'{shipping,deliveryMethod}',
    'freightMode',p_data#>'{shipping,freightMode}',
    'transporter',p_data#>'{shipping,transporter}',
    'useCustomerAddress',p_data#>'{shipping,useCustomerAddress}',
    'deliveryAddress',p_data#>'{shipping,deliveryAddress}'),
  'payments',(SELECT coalesce(jsonb_agg(p - ARRAY['fee','feeType','observation','id'] ORDER BY n),'[]'::jsonb)
    FROM jsonb_array_elements(coalesce(p_data->'payments','[]')) WITH ORDINALITY t(p,n)),
  'total',p_data#>'{paymentsSummary,totalOrderValue}','fiscalContext',p_data->'fiscalContext');
$$;
