export const PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER =
  'item_type.eq.product,item_type.eq.composition,item_type.is.null';

/** Product rows without a type are legacy products; callers must gate compositions separately. */
export const PRODUCT_LIST_PRODUCT_AND_LEGACY_ITEM_TYPE_FILTER =
  'item_type.eq.product,item_type.is.null';
