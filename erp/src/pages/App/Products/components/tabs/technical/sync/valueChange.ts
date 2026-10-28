import type Product from '@/pages/types/product.type';
import { syncProductWithVariations } from './variationSync';
import { cleanupDependentCharacteristicsOnZero } from './dependentCleanup';
import { normalizeTechnicalName } from '../technicalTabUtils';
import { getProductTechnicalRootPatch } from '../../../../../../../../../shared-utils/productTechnicalRootPatch';
import { getProductTechnicalValueCandidateKeys } from '../../../../../../../../../shared-utils/productTechnicalValueAliases';
import {
  getProductTechnicalDimensionField,
  parseProductTechnicalDimension,
} from '../../../../../../../../../shared-utils/productTechnicalDimensions';

/**
 * Atualiza os valores técnicos de um produto, aplicando regras de sincronização
 * de marca, dimensões e variações.
 */
export const applyTechnicalValueChangeToProduct = (
  prev: Partial<Product>,
  fieldName: string,
  value: unknown
): Partial<Product> => {
  const currentTech = { ...(prev.technicalValues || {}) };
  const characteristicAliases = new Set(
    getProductTechnicalValueCandidateKeys(fieldName).map(normalizeTechnicalName)
  );
  Object.keys(currentTech).forEach((name) => {
    if (characteristicAliases.has(normalizeTechnicalName(name))) delete currentTech[name];
  });

  if (value !== undefined) currentTech[fieldName] = value;

  const cleanedTech = cleanupDependentCharacteristicsOnZero(currentTech, fieldName, value);

  const next: Partial<Product> = {
    ...prev,
    technicalValues: cleanedTech,
  };

  if (!next.hasVariations && next.variations?.length === 1) {
    const variation = next.variations[0];
    next.variations = [
      {
        ...variation,
        technicalValues: { ...cleanedTech },
      },
    ];
  }

  Object.assign(next, getProductTechnicalRootPatch(fieldName, value));

  const dimensionField = getProductTechnicalDimensionField(fieldName);
  if (dimensionField) {
    Object.assign(next, {
      [dimensionField]: parseProductTechnicalDimension(value),
      ...(dimensionField === 'depth' ? { depthUseLength: false } : {}),
    });
    return syncProductWithVariations(next);
  }

  const norm = normalizeTechnicalName(fieldName);
  if (norm === 'modelo/linha' || norm === 'linha/modelo') {
    next.line = typeof value === 'string' ? value : String(value ?? '');
  }

  return next;
};
