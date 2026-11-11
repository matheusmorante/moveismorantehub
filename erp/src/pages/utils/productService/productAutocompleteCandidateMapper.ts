import type { Product, Variation } from '../../types/product.type';
import { resolveProductUnitPrice } from '../../../../../shared-utils/productUnitPrice';
import { getProductKind, isNonConventionalProduct } from '../productKindRules';
import { createDefaultVariation, mapDbVariations } from './productVariationMapper';

/**
 * Projection used only by the ERP composition-component autocomplete.
 * Product and variation images, categories, technical specs and unrelated
 * commercial fields are not displayed or consumed by this selector.
 */
export const PRODUCT_COMPONENT_AUTOCOMPLETE_COLUMNS = [
  'id',
  'name',
  'marketplace_title',
  'code',
  'description',
  'unit_price',
  'price',
  'promo_price',
  'stock',
  'active',
  'is_draft',
  'status',
  'deleted',
  'supplier_id',
  'main_supplier_id',
  'supplier_ids',
  'product_kind',
  'condition',
  'is_salvado',
  'item_type',
  'is_combo',
  'product_variations(id,product_id,sku,name,stock,price,promo_price,active,status,merged_to_variation_id,attributes,use_parent_name,use_parent_price,use_parent_promo_price)',
].join(',');

const compactVariation = (variation: Variation): Variation => ({
  id: variation.id,
  isVirtual: variation.isVirtual,
  mergedToVariationId: variation.mergedToVariationId,
  sku: variation.sku,
  name: variation.name,
  stock: variation.stock,
  unitPrice: variation.unitPrice,
  promoPrice: variation.promoPrice,
  active: variation.active,
  status: variation.status,
  attributes: variation.attributes || [],
});

/** Maps only the contract consumed by ProductAutocomplete and its selection callback. */
export const mapProductComponentAutocompleteCandidate = (
  row: any,
  index = 0,
): Product => {
  const rawName =
    row.name ||
    row.title ||
    (row.description ? String(row.description).split('\n')[0].substring(0, 120) : '');
  const fallbackCode = String(index + 1).padStart(6, '0');
  const parentCode = row.code || row.sku || fallbackCode;
  const isDraftProduct = Boolean(row.is_draft ?? row.isDraft) || row.status === 'draft';
  const productKind = getProductKind({
    productKind: row.product_kind,
    product_kind: row.product_kind,
    condition: row.condition,
    is_salvado: row.is_salvado,
  });
  const mappedVariations = mapDbVariations(
    row.product_variations || row.variations || [],
    row,
    parentCode,
  );
  const mappedFinalVariations =
    !isDraftProduct &&
    mappedVariations.length === 0 &&
    (!row.item_type || row.item_type === 'product')
      ? createDefaultVariation(row, parentCode, rawName, [])
      : mappedVariations;
  const finalVariations = mappedFinalVariations.map(compactVariation);
  const nonConventional = isNonConventionalProduct({ productKind });
  const variations = nonConventional
    ? finalVariations.map((variation) => ({ ...variation, active: false }))
    : finalVariations;
  const isDraft = Boolean(row.is_draft ?? row.isDraft) || row.status === 'draft';

  return {
    productKind,
    id: String(row.id),
    sku: row.sku || parentCode,
    code: parentCode,
    name: rawName,
    title: row.marketplace_title || row.title || rawName,
    marketplaceTitle: row.marketplace_title || row.title || rawName,
    description: '',
    unitPrice: resolveProductUnitPrice(row),
    promoPrice:
      row.promo_price !== null && row.promo_price !== undefined
        ? Number(row.promo_price)
        : undefined,
    stock: Number(row.stock || 0),
    unit: 'UN',
    active: nonConventional
      ? false
      : variations.length > 0
        ? variations.some((variation) => variation.active)
        : Boolean(row.active),
    isDraft,
    deleted: row.deleted ?? false,
    can_trash: false,
    trash_block_reason: isDraft
      ? 'Rascunhos devem ser descartados diretamente'
      : 'Validando elegibilidade...',
    supplierId: row.supplier_id || row.main_supplier_id || '',
    mainSupplierId: row.main_supplier_id || row.supplier_id || '',
    supplierIds: Array.isArray(row.supplier_ids)
      ? row.supplier_ids
      : row.supplier_id
        ? [row.supplier_id]
        : row.main_supplier_id
          ? [row.main_supplier_id]
          : [],
    variations,
    itemType: row.item_type || 'product',
    isCombo: row.is_combo || false,
    status: row.status || (isDraft ? 'draft' : 'hidden'),
  };
};
