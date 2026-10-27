import type Product from '../../types/product.type';
import type { Variation } from '../../types/product.type';
import {
  createProductDraftSnapshot,
  isProductDraft,
  removeInitialStockFields,
  restoreProductDraftSnapshot,
} from '../../../../../shared-utils/productDraftSnapshot';

export { createProductDraftSnapshot, isProductDraft, removeInitialStockFields };

export function restoreProductDraft(product: Product): Product {
  return restoreProductDraftSnapshot(product);
}

/** Fields without dedicated columns survive completion of a draft, by variation UUID. */
export function getVariationDetails(product: any, id: string): Partial<Variation> {
  const details = product.technical_specs?.variationDetails;
  return Array.isArray(details)
    ? removeInitialStockFields(details.find((variation: Variation) => variation.id === id) || {})
    : {};
}
