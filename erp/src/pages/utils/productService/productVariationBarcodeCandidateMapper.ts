import type Product from '../../types/product.type';
import type { Variation } from '../../types/product.type';
import { toTitleCase } from '../textUtils';
import { getVariationDetails } from './productDraftSnapshot';

export const PRODUCT_VARIATION_BARCODE_CANDIDATE_COLUMNS =
  'id, name, marketplace_title, description, is_draft, status, variation_details:technical_specs->variationDetails, product_variations(id,product_id,name,sku,use_parent_name)';

export type ProductVariationBarcodeMatch = {
  product: Pick<Product, 'id' | 'name' | 'title'>;
  variation: Pick<Variation, 'id' | 'name'>;
};

export const mapProductVariationBarcodeCandidate = (
  row: any,
  normalizedBarcode: string,
): ProductVariationBarcodeMatch | null => {
  const rawName =
    row.name ||
    row.title ||
    (row.description ? row.description.split('\n')[0].substring(0, 120) : '');
  const variationRecords = Array.isArray(row.product_variations) ? row.product_variations : [];
  const productForVariations = { technical_specs: { variationDetails: row.variation_details } };
  const hasConfirmedVariation = variationRecords.some(
    (variation: any) => !String(variation.sku || '').toUpperCase().startsWith('DEFAULT-'),
  );
  const isDraftProduct = Boolean(row.is_draft) || row.status === 'draft';
  const visibleVariations = variationRecords.filter((variation: any) => {
    const isGeneratedPlaceholder = String(variation.sku || '').toUpperCase().startsWith('DEFAULT-');
    return !isGeneratedPlaceholder || (!isDraftProduct && !hasConfirmedVariation);
  });
  const variation = visibleVariations.find((candidate: any) => {
    if (!candidate.product_id) return false;
    const details = getVariationDetails(productForVariations, String(candidate.id));
    return String(details.barcode || '').replace(/\D/g, '') === normalizedBarcode;
  });

  if (!row.id || !variation?.id) return null;

  const variationName = toTitleCase(
    (visibleVariations.length <= 1 && variation.use_parent_name === true
      ? row.name || row.title
      : variation.name) ||
      row.name ||
      row.title ||
      '',
  );

  return {
    product: {
      id: String(row.id),
      name: rawName,
      title: row.marketplace_title || row.title || rawName,
    },
    variation: {
      id: String(variation.id),
      name: variationName,
    },
  };
};
