import type Product from '../../types/product.type';
import type { Variation } from '../../types/product.type';

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
  const snapshot = product.technicalSpecs?.draftProduct as Partial<Product> | undefined;
  if (!isProductDraft(product) || !snapshot || String(snapshot.id) !== product.id) return product;
  const stocks = new Map(product.variations?.map((variation) => [variation.id, variation.stock]));
  return {
    ...product,
    ...snapshot,
    category: product.category || snapshot.category || '',
    id: product.id,
    updatedAt: product.updatedAt,
    createdAt: product.createdAt,
    technicalSpecs: product.technicalSpecs,
    stock: product.stock,
    isDraft: true,
    active: false,
    status: 'draft',
    variations: snapshot.variations?.map((variation) => ({
      ...removeInitialStockFields(variation),
      stock: stocks.get(variation.id) ?? 0,
      active: false,
      status: variation.status || 'draft',
    })),
  };
}

/** Fields without dedicated columns survive completion of a draft, by variation UUID. */
export function getVariationDetails(product: any, id: string): Partial<Variation> {
  const details = product.technical_specs?.variationDetails;
  return Array.isArray(details)
    ? removeInitialStockFields(details.find((variation: Variation) => variation.id === id) || {})
    : {};
}
