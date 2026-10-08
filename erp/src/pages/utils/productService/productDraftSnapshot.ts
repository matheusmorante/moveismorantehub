import type Product from '../../types/product.type';
import type { Variation } from '../../types/product.type';
import { restoreProductDraftSnapshot } from '../../../../../shared-utils/productDraftSnapshot';

export const isProductDraft = (product: Partial<Product>): boolean =>
  Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';

export function removeInitialStockFields<T extends object>(data: T): T {
  const result = { ...data } as T & Record<string, unknown>;
  for (const field of ['launchInitialStock', 'initialStock', 'initialCost', 'initialStockEntries']) {
    delete result[field];
  }
  return result;
}

export function createProductDraftSnapshot(product: Product): Product {
  const snapshot = removeInitialStockFields(product);
  delete snapshot.technicalSpecs;
  delete (snapshot as any).technical_specs;
  return JSON.parse(JSON.stringify({
    ...snapshot,
    isDraft: true,
    active: false,
    status: 'draft',
    variations: product.variations?.map((variation) => ({
      ...removeInitialStockFields(variation),
      active: false,
      status: variation.status || 'draft',
    })),
  })) as Product;
}

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
