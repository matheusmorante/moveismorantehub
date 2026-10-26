import type Product from '@/pages/types/product.type';
import { syncProductWithVariations } from './variationSync';
import { cleanupDependentCharacteristicsOnZero } from './dependentCleanup';
import {
  normalizeTechnicalName,
  parseNumericDimension,
} from '../technicalTabUtils';
import { getProductTechnicalRootPatch } from '../../../../../../../../../shared-utils/productTechnicalRootPatch';

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

  const norm = normalizeTechnicalName(fieldName);
  let dimensionChanged = false;

  if (norm === 'peso') {
    next.weight = parseNumericDimension(value);
    return syncProductWithVariations(next);
  }

  if (norm === 'altura' || norm === 'altura total') {
    next.height = parseNumericDimension(value);
    dimensionChanged = true;
  } else if (norm === 'largura' || norm === 'largura total') {
    next.width = parseNumericDimension(value);
    dimensionChanged = true;
  } else if (
    norm === 'profundidade' ||
    norm === 'profundidade total' ||
    norm === 'comprimento' ||
    norm === 'comprimento total'
  ) {
    next.depth = parseNumericDimension(value);
    dimensionChanged = true;
  } else if (norm === 'modelo/linha' || norm === 'linha/modelo') {
    next.line = typeof value === 'string' ? value : String(value ?? '');
  }

  if (dimensionChanged) {
    return syncProductWithVariations(next);
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
