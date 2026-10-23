import { fetchMobileProductsPage } from './mobileProductFetchService';

export interface MobileProductCompositionCandidate {
  id: string;
  name: string;
  code?: string | null;
  price?: number | null;
  unit_price?: number | null;
  stock?: number | null;
  variationId?: string;
  variationName?: string | null;
  variationSku?: string | null;
  variationPrice?: number | null;
  variationStock?: number | null;
}

export const searchMobileProductCompositionCandidates = async (
  searchTerm: string,
  supplierId?: string
): Promise<MobileProductCompositionCandidate[]> => {
  const selectedSupplierId = supplierId?.trim();
  if (selectedSupplierId && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(selectedSupplierId)) return [];

  const { data } = await fetchMobileProductsPage(1, 25, {
    search: searchTerm,
    statusFilter: 'active',
    includeMerged: false,
    itemType: 'standard',
    supplierId: selectedSupplierId,
    throwOnError: true,
  });

  return data
    .filter((product: any) =>
      product.itemType !== 'composition' &&
      product.itemType !== 'combo' &&
      product.isCombo !== true &&
      product.is_combo !== true &&
      !product.isDraft &&
      product.active !== false
    )
    .flatMap((product: any) => {
      const variations = (Array.isArray(product.variations) ? product.variations : []).filter(
        (variation: any) =>
          variation.active !== false &&
          variation.status !== 'merged' &&
          !variation.mergedToVariationId &&
          !variation.merged_to_variation_id
      );
      if (variations.length > 0) {
        const realVariations = variations.filter((variation: any) => !variation.isVirtual);
        if (!realVariations.length) {
          return [{
            id: String(product.id),
            name: String(product.name || ''),
            code: product.code,
            price: Number(product.unitPrice ?? product.price ?? 0),
            unit_price: Number(product.unitPrice ?? product.price ?? 0),
            stock: Number(product.stock ?? 0),
          }];
        }

        return realVariations.map((variation: any) => ({
          id: String(product.id),
          name: String(product.name || ''),
          code: product.code,
          price: Number(product.unitPrice ?? product.price ?? 0),
          unit_price: Number(product.unitPrice ?? product.price ?? 0),
          stock: Number(product.stock ?? 0),
          variationId: String(variation.id),
          variationName: variation.name,
          variationSku: variation.sku,
          variationPrice: variation.unitPrice ?? variation.price ?? variation.unit_price ?? 0,
          variationStock: Number(variation.stock ?? 0),
        }));
      }

      return [{
        id: String(product.id),
        name: String(product.name || ''),
        code: product.code,
        price: Number(product.unitPrice ?? product.price ?? 0),
        unit_price: Number(product.unitPrice ?? product.price ?? 0),
        stock: Number(product.stock ?? 0),
      }];
    })
    .slice(0, 5);
};
