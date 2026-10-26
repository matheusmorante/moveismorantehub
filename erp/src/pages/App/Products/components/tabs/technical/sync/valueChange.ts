import type Product from '@/pages/types/product.type';
import { syncProductWithVariations } from './variationSync';
import { cleanupDependentCharacteristicsOnZero } from './dependentCleanup';
import { normalizeTechnicalName } from '../technicalTabUtils';
import { getProductTechnicalRootPatch } from '../../../../../../../../../shared-utils/productTechnicalRootPatch';
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

  if (value === undefined || value === null) {
    delete currentTech[fieldName];
  } else {
    currentTech[fieldName] = value;
  }

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
    Object.assign(next, { [dimensionField]: parseProductTechnicalDimension(value) });
    return syncProductWithVariations(next);
  }

  const norm = normalizeTechnicalName(fieldName);
  if (norm === 'modelo/linha' || norm === 'linha/modelo') {
    next.line = typeof value === 'string' ? value : String(value ?? '');
  }

  return next;
};

/**
 * Alterna a dimensão entre Profundidade e Comprimento, migrando o valor
 * e sincronizando as variações.
 */
export const applyDepthLengthToggleToProduct = (
  prev: Partial<Product>,
  oldName: string,
  actualNewName: string
): Partial<Product> => {
  const tv = { ...(prev.technicalValues || {}) };
  const currentValue = tv[oldName];

  if (currentValue !== undefined) {
    tv[actualNewName] = currentValue;
  } else {
    tv[actualNewName] = '';
  }
  delete tv[oldName];

  const next: Partial<Product> = {
    ...prev,
    technicalValues: tv,
    depth: parseNumericDimension(currentValue),
  };

  return syncProductWithVariations(next);
};
