export const PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER =
  'item_type.eq.product,item_type.eq.composition,item_type.is.null';

/** Product rows without a type are legacy products; callers must gate compositions separately. */
export const PRODUCT_LIST_PRODUCT_AND_LEGACY_ITEM_TYPE_FILTER =
  'item_type.eq.product,item_type.is.null';

/** Keeps rows whose combo flag is false or unset, matching the client-side truthy check. */
export const PRODUCT_LIST_NON_COMBO_FLAG_FILTER =
  'is_combo.eq.false,is_combo.is.null';

/** Excludes combo/composition types while retaining legacy rows with no item_type. */
export const PRODUCT_LIST_NON_COMBO_ITEM_TYPE_FILTER =
  'item_type.is.null,item_type.not.in.(combo,composition)';
