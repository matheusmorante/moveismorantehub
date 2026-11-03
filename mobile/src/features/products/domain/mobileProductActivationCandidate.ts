import type { ProductActivationProduct } from '../../../../../shared-utils/productActivationValidation';

export const toMobileProductActivationCandidate = (
  targetProd: any
): ProductActivationProduct => ({
  ...targetProd,
  id: String(targetProd.id),
  name: targetProd.name || targetProd.title || '',
  unitPrice: Number(targetProd.unitPrice ?? targetProd.unit_price ?? targetProd.price ?? 0),
  categoryIds:
    targetProd.categoryIds ||
    (Array.isArray(targetProd.product_categories)
      ? targetProd.product_categories.map((relation: any) => relation.category_id).filter(Boolean)
      : targetProd.category_id
        ? [targetProd.category_id]
        : []),
  supplierId: targetProd.supplierId || targetProd.supplier_id || '',
  mainSupplierId: targetProd.mainSupplierId || targetProd.main_supplier_id || '',
  isDraft: Boolean(targetProd.isDraft || targetProd.is_draft || targetProd.status === 'draft'),
  isCombo: Boolean(targetProd.isCombo || targetProd.is_combo),
  comboItems: targetProd.comboItems || targetProd.combo_items || [],
  variations: (targetProd.allVariations || targetProd.variations || []).map((variation: any) => ({
    ...variation,
    syncUnitPrice: variation.syncUnitPrice !== false,
    unitPrice: Number(variation.unitPrice ?? variation.price ?? variation.unit_price ?? 0),
    comboItems: variation.comboItems || variation.combo_items || [],
  })),
});
