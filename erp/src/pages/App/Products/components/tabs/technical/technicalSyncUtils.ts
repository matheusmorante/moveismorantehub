import { Product } from '../../../../../types/product.type';
import { syncVariationsWithParent } from '../../../domain/variationParentSync';
import {
  isDoorQuantityCharacteristic,
  isDoorDependentCharacteristic,
  isHasDoorsCharacteristic,
  isDrawerQuantityCharacteristic,
  isDrawerDependentCharacteristic,
  isHasDrawersCharacteristic,
  isFeetQuantityCharacteristic,
  isFeetDependentCharacteristic,
  isHasFeetCharacteristic,
  parseDoorQuantityValue,
  parseDrawerQuantityValue,
  parseFeetQuantityValue,
  isMattressCategory,
  TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
import {
  normalizeTechnicalName,
  parseNumericDimension,
} from './technicalTabUtils';

/**
 * Sincroniza variações de um produto com os dados herdadíveis do pai, caso haja variações.
 */
export const syncProductWithVariations = (product: Partial<Product>): Partial<Product> => {
  if (!product.variations?.length) {
    return product;
  }

  return {
    ...product,
    variations: syncVariationsWithParent(product.variations, {
      description: product.description,
      width: product.width,
      height: product.height,
      depth: product.depth,
      weight: product.weight,
    }),
  };
};

/**
 * Limpa características dependentes quando a quantidade principal for alterada para 0
 * ou quando o switch mestre ("Possui portas/gavetas/pés") for desligado ("Não").
 */
export const cleanupDependentCharacteristicsOnZero = (
  technicalValues: Record<string, unknown>,
  fieldName: string,
  value: unknown
): Record<string, unknown> => {
  const isZeroOrNo =
    value === 0 ||
    value === '0' ||
    value === false ||
    (typeof value === 'string' && /^n[aã]o$/i.test(value.trim()));

  if (!isZeroOrNo) {
    return technicalValues;
  }

  const updated = { ...technicalValues };

  if (isDoorQuantityCharacteristic(fieldName) || isHasDoorsCharacteristic(fieldName)) {
    Object.keys(updated).forEach((k) => {
      if (k !== fieldName && isDoorDependentCharacteristic(k)) {
        updated[k] = '';
      }
    });
  }

  if (isDrawerQuantityCharacteristic(fieldName) || isHasDrawersCharacteristic(fieldName)) {
    Object.keys(updated).forEach((k) => {
      if (k !== fieldName && isDrawerDependentCharacteristic(k)) {
        updated[k] = Array.isArray(updated[k]) ? [] : '';
      }
    });
  }

  if (isFeetQuantityCharacteristic(fieldName) || isHasFeetCharacteristic(fieldName)) {
    Object.keys(updated).forEach((k) => {
      if (k !== fieldName && isFeetDependentCharacteristic(k)) {
        updated[k] = Array.isArray(updated[k]) ? [] : '';
      }
    });
  }

  return updated;
};

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

  if (/^marca$/i.test(fieldName.trim())) {
    next.brand = typeof value === 'string' ? value : String(value ?? '');
  }

  const norm = normalizeTechnicalName(fieldName);
  let dimensionChanged = false;

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

/**
 * Preenche valores técnicos iniciais com dimensões do produto quando as características
 * obrigatórias ainda não constam no formulário.
 */
export const populateInitialTechnicalValues = (
  prev: Partial<Product>,
  fieldDefinitions: readonly TechnicalFieldDefinition[]
): Partial<Product> => {
  const technicalValues = { ...(prev.technicalValues || {}) };
  let changed = false;
  const isMattress = isMattressCategory(prev.categoryIds, fieldDefinitions);

  fieldDefinitions
    .filter((field) => {
      if (isMattress && normalizeTechnicalName(field.name) === 'altura') return false;
      const isReq =
        field.isRequired ||
        (isMattress && normalizeTechnicalName(field.name) === 'espessura do colchão');
      return isReq && field.active !== false;
    })
    .forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(technicalValues, field.name)) {
        const norm = normalizeTechnicalName(field.name);
        if (norm === 'altura' && prev.height) {
          technicalValues[field.name] = prev.height;
        } else if (norm === 'espessura do colchão' && prev.height) {
          technicalValues[field.name] = prev.height;
        } else if (norm === 'largura' && prev.width) {
          technicalValues[field.name] = prev.width;
        } else if ((norm === 'profundidade' || norm === 'comprimento') && prev.depth) {
          technicalValues[field.name] = prev.depth;
        } else {
          technicalValues[field.name] = '';
        }
        changed = true;
      }
    });

  // Normalização de quantidades legadas (ex: "3 portas" -> 3)
  if (technicalValues['Quantidade de portas'] !== undefined && typeof technicalValues['Quantidade de portas'] === 'string') {
    const parsed = parseDoorQuantityValue(technicalValues);
    if (parsed !== null) {
      technicalValues['Quantidade de portas'] = parsed;
      changed = true;
    }
  }

  if (technicalValues['Quantidade de gavetas'] !== undefined && typeof technicalValues['Quantidade de gavetas'] === 'string') {
    const parsed = parseDrawerQuantityValue(technicalValues);
    if (parsed !== null) {
      technicalValues['Quantidade de gavetas'] = parsed;
      changed = true;
    }
  }

  if (technicalValues['Quantidade de pés'] !== undefined && typeof technicalValues['Quantidade de pés'] === 'string') {
    const parsed = parseFeetQuantityValue(technicalValues);
    if (parsed !== null) {
      technicalValues['Quantidade de pés'] = parsed;
      changed = true;
    }
  }

  // Normalização de multi_select legados (string -> array)
  if (technicalValues['Tipo de portas'] !== undefined) {
    const val = technicalValues['Tipo de portas'];
    if (typeof val === 'string' && val.trim()) {
      const parts = val.includes('+')
        ? val.split('+').map((s) => s.trim()).filter(Boolean)
        : [val.trim()];
      technicalValues['Tipo de portas'] = parts;
      changed = true;
    }
  }

  if (technicalValues['Tipo/Material das corrediças'] !== undefined) {
    const val = technicalValues['Tipo/Material das corrediças'];
    if (typeof val === 'string' && val.trim()) {
      technicalValues['Tipo/Material das corrediças'] = [val.trim()];
      changed = true;
    }
  }

  // Inferência automática e compatibilidade de switches mestres
  if (!Object.prototype.hasOwnProperty.call(technicalValues, 'Possui portas')) {
    const doorQty = parseDoorQuantityValue(technicalValues);
    if (
      (doorQty !== null && doorQty > 0) ||
      technicalValues['Tipo de portas'] ||
      technicalValues['Material das portas']
    ) {
      technicalValues['Possui portas'] = 'Sim';
      changed = true;
    }
  }

  if (!Object.prototype.hasOwnProperty.call(technicalValues, 'Possui gavetas')) {
    const drawerQty = parseDrawerQuantityValue(technicalValues);
    if (
      (drawerQty !== null && drawerQty > 0) ||
      technicalValues['Tipo/Material das corrediças'] ||
      technicalValues['Materiais das corrediças'] ||
      technicalValues['Material das gavetas']
    ) {
      technicalValues['Possui gavetas'] = 'Sim';
      changed = true;
    }
  }

  if (!Object.prototype.hasOwnProperty.call(technicalValues, 'Possui pés')) {
    const feetQty = parseFeetQuantityValue(technicalValues);
    if (
      (feetQty !== null && feetQty > 0) ||
      technicalValues['Material dos pés'] ||
      technicalValues['Pés reguláveis']
    ) {
      technicalValues['Possui pés'] = 'Sim';
      changed = true;
    }
  }

  // Consolidação de Modelo e Linha legados em Modelo/Linha para manter compatibilidade
  const legacyModelOrLine =
    technicalValues['Modelo/Linha'] ??
    technicalValues['Linha/Modelo'] ??
    technicalValues['Modelo'] ??
    technicalValues['Linha'] ??
    technicalValues['modelo'] ??
    technicalValues['linha'] ??
    prev.line;

  if (
    legacyModelOrLine !== undefined &&
    legacyModelOrLine !== null &&
    String(legacyModelOrLine).trim() !== ''
  ) {
    if (!technicalValues['Modelo/Linha'] || String(technicalValues['Modelo/Linha']).trim() === '') {
      technicalValues['Modelo/Linha'] = legacyModelOrLine;
      changed = true;
    }
  }
  if ('Modelo' in technicalValues) {
    delete technicalValues['Modelo'];
    changed = true;
  }
  if ('modelo' in technicalValues) {
    delete technicalValues['modelo'];
    changed = true;
  }
  if ('Linha' in technicalValues) {
    delete technicalValues['Linha'];
    changed = true;
  }
  if ('linha' in technicalValues) {
    delete technicalValues['linha'];
    changed = true;
  }

  return changed ? { ...prev, technicalValues } : prev;
};

