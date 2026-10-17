/**
 * Predicados de domínio e normalizadores de valores para Especificações Técnicas.
 */

import {
  GLOBAL_REQUIRED_ATTRIBUTE_NAMES,
  PRIMARY_CHARACTERISTIC_NAMES,
  MATTRESS_CATEGORY_ID,
} from './constants';
import type { TechnicalFieldDefinition } from './types';

export const normalizeCharacteristicName = (name: string): string =>
  name.trim().toLocaleLowerCase('pt-BR');

export const isDepthCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'profundidade' || norm === 'profundidade total';
};

export const isLengthCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'comprimento' || norm === 'comprimento total';
};

export const isHeightCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'altura' || norm === 'altura total';
};

export const isWidthCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'largura' || norm === 'largura total';
};

export const isThicknessCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return norm === 'espessura' || norm === 'espessura do colchão';
};

export const isWeightCharacteristicName = (name: string): boolean =>
  normalizeCharacteristicName(name) === 'peso';

export const isExcludedCharacteristic = (name: string): boolean =>
  /^reclin[aá]vel$/i.test(name.trim());

export const isMattressCategory = (
  categoryIds: readonly string[] = [],
  allFields?: readonly TechnicalFieldDefinition[]
): boolean => {
  if (categoryIds.includes(MATTRESS_CATEGORY_ID)) return true;
  if (allFields) {
    const espessuraField = allFields.find(
      (f) => normalizeCharacteristicName(f.name) === 'espessura do colchão'
    );
    if (espessuraField?.categoryIds?.some((cid) => categoryIds.includes(cid))) {
      return true;
    }
  }
  return false;
};

export const isModelCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return (
    norm === 'modelo' ||
    norm === 'modelo/linha' ||
    norm === 'modelo / linha' ||
    norm === 'modelo e linha' ||
    norm === 'modelo ou linha' ||
    norm === 'linha'
  );
};

export const isRequiredCharacteristicName = (name: string): boolean => {
  const normalized = normalizeCharacteristicName(name);
  if (isLengthCharacteristic(name)) return true;
  if (isModelCharacteristic(name)) return true;
  return GLOBAL_REQUIRED_ATTRIBUTE_NAMES.some(
    (requiredName) => normalizeCharacteristicName(requiredName) === normalized
  );
};

export const isPrimaryCharacteristicName = (name: string): boolean => {
  if (isModelCharacteristic(name)) return true;
  return PRIMARY_CHARACTERISTIC_NAMES.some(
    (primaryName) => normalizeCharacteristicName(primaryName) === normalizeCharacteristicName(name)
  );
};

/**
 * Retorna se um valor é semanticamente definido (não é undefined ou null).
 * Preserva 0, false e strings vazias intencionais.
 */
export const isDefined = (val: any): boolean => {
  return val !== undefined && val !== null;
};

export const isHasDoorsCharacteristic = (name: string): boolean =>
  /^possui\s+portas?$/i.test(name.trim());

export const isDoorQuantityCharacteristic = (name: string): boolean =>
  /quantidade\s+de\s+portas?/i.test(name.trim());

export const isDoorDependentCharacteristic = (name: string): boolean =>
  /porta/i.test(name) && !isHasDoorsCharacteristic(name);

export const parseDoorQuantityValue = (values: Record<string, any> = {}): number | null => {
  for (const [key, val] of Object.entries(values)) {
    if (isDoorQuantityCharacteristic(key)) {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'number') return Number.isFinite(val) ? val : null;
      const str = String(val).trim();
      if (!str) return null;
      const match = str.match(/\d+/);
      if (match) {
        return parseInt(match[0], 10);
      }
      return null;
    }
  }
  return null;
};

export const isHasDoorsActive = (values: Record<string, any> = {}): boolean => {
  for (const [key, val] of Object.entries(values)) {
    if (isHasDoorsCharacteristic(key)) {
      return isYesNoValueActive(val);
    }
  }
  // Compatibilidade com cadastros legados que possuem quantidade informada
  const doorQty = parseDoorQuantityValue(values);
  return doorQty !== null && doorQty > 0;
};

export const isHasDrawersCharacteristic = (name: string): boolean =>
  /^possui\s+gavetas?$/i.test(name.trim());

export const isDrawerQuantityCharacteristic = (name: string): boolean =>
  /quantidade\s+de\s+gavetas?/i.test(name.trim());

export const isSlideCharacteristic = (name: string): boolean =>
  /corredi[çc]a/i.test(name);

export const isDrawerDependentCharacteristic = (name: string): boolean =>
  isSlideCharacteristic(name) || (/gaveta/i.test(name) && !isHasDrawersCharacteristic(name));

export const parseDrawerQuantityValue = (values: Record<string, any> = {}): number | null => {
  for (const [key, val] of Object.entries(values)) {
    if (isDrawerQuantityCharacteristic(key)) {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'number') return Number.isFinite(val) ? val : null;
      const str = String(val).trim();
      if (!str) return null;
      const match = str.match(/\d+/);
      if (match) {
        return parseInt(match[0], 10);
      }
      return null;
    }
  }
  return null;
};

export const isHasDrawersActive = (values: Record<string, any> = {}): boolean => {
  for (const [key, val] of Object.entries(values)) {
    if (isHasDrawersCharacteristic(key)) {
      return isYesNoValueActive(val);
    }
  }
  // Compatibilidade com cadastros legados
  const drawerQty = parseDrawerQuantityValue(values);
  return drawerQty !== null && drawerQty > 0;
};

export const isHasFeetCharacteristic = (name: string): boolean =>
  /^possui\s+p[eé]s?$/i.test(name.trim());

export const isFeetQuantityCharacteristic = (name: string): boolean =>
  /quantidade\s+de\s+p[eé]s?/i.test(name.trim());

export const isFeetDependentCharacteristic = (name: string): boolean =>
  /p[eé]s?/i.test(name) && !isHasFeetCharacteristic(name);

export const parseFeetQuantityValue = (values: Record<string, any> = {}): number | null => {
  for (const [key, val] of Object.entries(values)) {
    if (isFeetQuantityCharacteristic(key)) {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'number') return Number.isFinite(val) ? val : null;
      const str = String(val).trim();
      if (!str) return null;
      const match = str.match(/\d+/);
      if (match) {
        return parseInt(match[0], 10);
      }
      return null;
    }
  }
  return null;
};

export const isHasFeetActive = (values: Record<string, any> = {}): boolean => {
  for (const [key, val] of Object.entries(values)) {
    if (isHasFeetCharacteristic(key)) {
      return isYesNoValueActive(val);
    }
  }
  // Compatibilidade com cadastros legados
  const feetQty = parseFeetQuantityValue(values);
  if (feetQty !== null && feetQty > 0) return true;
  if (values['Material dos pés']) return true;
  return false;
};

export interface CharacteristicDependencyState {
  isDependent: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  masterFieldLabel?: string;
  masterQuantity?: number | null;
}

export const getCharacteristicDependencyState = (
  fieldName: string,
  technicalValues: Record<string, any> = {}
): CharacteristicDependencyState => {
  if (isDoorDependentCharacteristic(fieldName)) {
    const isDoorsActive = isHasDoorsActive(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isDoorsActive,
      disabledReason: 'Disponível apenas quando Possui portas for Sim.',
      masterFieldLabel: 'Possui portas',
      masterQuantity: parseDoorQuantityValue(technicalValues),
    };
  }

  if (isDrawerDependentCharacteristic(fieldName)) {
    const isDrawersActive = isHasDrawersActive(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isDrawersActive,
      disabledReason: 'Disponível apenas quando Possui gavetas for Sim.',
      masterFieldLabel: 'Possui gavetas',
      masterQuantity: parseDrawerQuantityValue(technicalValues),
    };
  }

  if (isFeetDependentCharacteristic(fieldName)) {
    const isFeetActive = isHasFeetActive(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isFeetActive,
      disabledReason: 'Disponível apenas quando Possui pés for Sim.',
      masterFieldLabel: 'Possui pés',
      masterQuantity: parseFeetQuantityValue(technicalValues),
    };
  }

  return {
    isDependent: false,
    isDisabled: false,
  };
};

/**
 * Determina se a característica representa uma escolha binária Sim / Não (booleano ou rádio Sim/Não).
 */
export const isYesNoCharacteristic = (field: TechnicalFieldDefinition): boolean => {
  if (field.dataType === 'boolean') {
    return true;
  }
  const options = field.options || [];
  if (options.length >= 1 && options.length <= 3) {
    const normalizedOptions = options.map((opt) =>
      normalizeCharacteristicName(opt.value || '').trim()
    );
    const hasSim = normalizedOptions.includes('sim');
    const hasNao = normalizedOptions.includes('nao') || normalizedOptions.includes('não');
    const allAreYesNoOrNA = normalizedOptions.every(
      (opt) =>
        opt === 'sim' ||
        opt === 'nao' ||
        opt === 'não' ||
        opt === 'não se aplica' ||
        opt === 'nao se aplica' ||
        opt === ''
    );
    if ((hasSim || hasNao) && allAreYesNoOrNA) {
      return true;
    }
  }

  // Atributos binários clássicos com opções vazias ou não carregadas
  if (/^possui\s+/i.test(field.name.trim()) && options.length <= 2) {
    if (options.length === 0) return true;
    const normalizedOptions = options.map((opt) =>
      normalizeCharacteristicName(opt.value || '').trim()
    );
    if (
      normalizedOptions.every(
        (opt) => opt === 'sim' || opt === 'nao' || opt === 'não' || opt === ''
      )
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Normaliza e identifica se o valor atual de uma característica Sim/Não está no estado ativo/ligado.
 */
export const isYesNoValueActive = (value: unknown): boolean => {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  if (typeof value === 'string') {
    const norm = normalizeCharacteristicName(value);
    return norm === 'sim' || norm === 's' || norm === 'yes' || norm === 'ligado';
  }
  return false;
};


