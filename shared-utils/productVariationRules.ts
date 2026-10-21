import type { Product, Variation } from '../erp/src/pages/types/product.type';
import { getEffectiveVariationTechnicalValues } from '../erp/src/pages/utils/technicalValuesService';
import { hasDuplicateVariationAttributeCombination } from '../erp/src/pages/utils/productVariationDefaults';
import { checkProductErpLegibility as checkERPLegibility } from './productErpLegibility';
import type { VariationTabId } from '../erp/src/pages/App/Products/hooks/variation/variationForm.types';

export function resolveVariationDimensions(parent: Partial<Product>, variation: Variation) {
  const values = getEffectiveVariationTechnicalValues(
    parent.technicalValues || {},
    variation,
    parent.variableTechnicalFields
  );
  const dimension = (
    field: 'width' | 'height' | 'depth',
    sync: boolean | undefined,
    names: string[]
  ) => {
    const value = Number((sync !== false ? parent[field] : variation[field]) || 0);
    if (Number.isFinite(value) && value > 0) return value;
    for (const name of names) {
      const technicalValue = Number(String(values[name] || '').replace(',', '.'));
      if (Number.isFinite(technicalValue) && technicalValue > 0) return technicalValue;
    }
    return 0;
  };
  return {
    width: dimension('width', variation.syncWidth, ['Largura']),
    height: dimension('height', variation.syncHeight, ['Altura']),
    depth: dimension('depth', variation.syncDepth, ['Profundidade', 'Comprimento']),
  };
}

export function getVariationRegistrationIssue(
  parent: Partial<Product>,
  variation: Variation
): { message: string; tab: VariationTabId } | null {
  if (hasDuplicateVariationAttributeCombination(variation, parent.variations || [])) {
    return {
      message: 'Já existe outra variação com a mesma combinação de atributos e valores.',
      tab: 'identificacao',
    };
  }
  if (
    parent.variations?.some(
      (item) => item && item.id !== variation.id && item.sku?.toUpperCase() === variation.sku?.toUpperCase()
    )
  ) {
    return {
      message: `O SKU "${variation.sku}" já está em uso em outra variação.`,
      tab: 'identificacao',
    };
  }



  // A origem controla a ativação do canal ERP; o cadastro usa os requisitos comuns.
  // A variação aponta para o fornecedor do pai, portanto o fornecedor do pai não é obrigatório para cadastrar/editar a variação.
  const eligibility = checkERPLegibility({
    ...parent,
    name: variation.name,
    hasVariations: false,
    unitPrice: variation.syncUnitPrice !== false ? parent.unitPrice : variation.unitPrice,
    promoPrice:
      variation.syncPromoPrice !== false && variation.syncUnitPrice !== false
        ? parent.promoPrice
        : variation.promoPrice,
    mainSupplierId: parent.mainSupplierId || parent.supplierId || 'inherited-from-parent',
    isOwnProduction:
      parent.isOwnProduction ??
      (parent.merchandiseOrigin === 'own_production' ||
        parent.fiscal?.merchandiseOrigin === 'own_production'),
    productKind: 'normal',
  });
  const variationErrors = eligibility.errors.filter(
    (err) => !err.toLowerCase().includes('fornecedor')
  );
  if (variationErrors.length > 0) {
    return {
      message: variationErrors[0],
      tab:
        !eligibility.checks.description || !eligibility.checks.categories
          ? 'identificacao'
          : 'estoque',
    };
  }
  return null;
}
