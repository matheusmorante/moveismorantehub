import type { Product, Variation } from '@/pages/types/product.type';
import {
  getEffectiveVariationTechnicalValues,
  getMissingRequiredCharacteristics,
} from '@/pages/utils/technicalValuesService';
import { hasDuplicateVariationAttributeCombination } from '@/pages/utils/productVariationDefaults';
import { checkERPLegibility } from './productLegibilityRules';
import type { VariationTabId } from '../hooks/variation/variationForm.types';

export function resolveVariationDimensions(parent: Partial<Product>, variation: Variation) {
  const values = getEffectiveVariationTechnicalValues(parent.technicalValues || {}, variation);
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
    return { message: 'Já existe outra variação com a mesma combinação de atributos e valores.', tab: 'identificacao' };
  }
  if (parent.variations?.some((item) => item.id !== variation.id &&
    item.sku?.toUpperCase() === variation.sku?.toUpperCase())) {
    return { message: `O SKU "${variation.sku}" já está em uso em outra variação.`, tab: 'identificacao' };
  }

  const dimensions = resolveVariationDimensions(parent, variation);
  const missingDimensions = (['width', 'height', 'depth'] as const)
    .filter((field) => dimensions[field] <= 0)
    .map((field) => ({ width: 'Largura', height: 'Altura', depth: 'Profundidade' })[field]);
  if (missingDimensions.length) {
    return {
      message: `Informe valores maiores que zero para as dimensões obrigatórias: ${missingDimensions.join(', ')}.`,
      tab: 'tecnico',
    };
  }
  const missing = getMissingRequiredCharacteristics(
    getEffectiveVariationTechnicalValues(parent.technicalValues || {}, variation)
  );
  if (missing.length) {
    return { message: `Preencha as características obrigatórias da variação: ${missing.join(', ')}.`, tab: 'tecnico' };
  }

  // A origem controla a ativação do canal ERP; o cadastro usa os requisitos comuns.
  const eligibility = checkERPLegibility({
    ...parent,
    name: variation.name,
    hasVariations: false,
    unitPrice: variation.syncUnitPrice !== false ? parent.unitPrice : variation.unitPrice,
    promoPrice: variation.syncPromoPrice !== false && variation.syncUnitPrice !== false
      ? parent.promoPrice : variation.promoPrice,
    mainSupplierId: parent.mainSupplierId || parent.supplierId,
    merchandiseOrigin: parent.merchandiseOrigin || parent.fiscal?.merchandiseOrigin,
    isOwnProduction: parent.isOwnProduction ?? (parent.merchandiseOrigin === 'own_production' || parent.fiscal?.merchandiseOrigin === 'own_production'),
    productKind: 'normal',
  });
  if (!eligibility.isLegible) {
    return { message: eligibility.errors[0], tab:
      !eligibility.checks.description || !eligibility.checks.categories || !eligibility.checks.supplier
        ? 'identificacao' : 'estoque' };
  }
  return null;
}
