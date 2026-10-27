/**
 * Regras de validação e verificação de campos/dimensões obrigatórios pendentes.
 */

import { REQUIRED_CHARACTERISTIC_NAMES } from './constants';
import {
  normalizeCharacteristicName,
  getCharacteristicDependencyState,
  isHasDoorsActive,
  isHasDrawersActive,
  isHasFeetActive,
  parseDoorQuantityValue,
  parseDrawerQuantityValue,
  parseFeetQuantityValue,
  isDoorQuantityCharacteristic,
  isDrawerQuantityCharacteristic,
  isFeetQuantityCharacteristic,
} from './predicates';
import type { TechnicalValuesMap } from './types';

export const getMissingRequiredCharacteristics = (values: TechnicalValuesMap = {}): string[] => {
  const valuesByName = new Map<string, unknown>();
  Object.entries(values).forEach(([name, value]) => {
    valuesByName.set(normalizeCharacteristicName(name), value);
  });

  return REQUIRED_CHARACTERISTIC_NAMES.filter((name) => {
    let rawValue = valuesByName.get(normalizeCharacteristicName(name));
    if (name === 'Modelo' && !rawValue) {
      rawValue =
        valuesByName.get('modelo/linha') ??
        valuesByName.get('modelo / linha') ??
        valuesByName.get('modelo e linha') ??
        valuesByName.get('modelo ou linha') ??
        valuesByName.get('linha');
    }
    const value = String(rawValue ?? '')
      .trim()
      .toLocaleLowerCase('pt-BR');
    return !value || ['não se aplica', 'nao se aplica', 'n/a'].includes(value);
  });
};

export const getMissingRequiredDimensions = (
  values: TechnicalValuesMap = {},
  directDimensions?: { width?: number; height?: number; depth?: number; weight?: number },
  options?: { isMattress?: boolean }
): string[] => {
  const valuesByName = new Map<string, unknown>();
  Object.entries(values).forEach(([name, value]) => {
    valuesByName.set(normalizeCharacteristicName(name), value);
  });

  const isPositive = (val: unknown): boolean => {
    if (typeof val === 'number') return Number.isFinite(val) && val > 0;
    if (typeof val === 'string' && val.trim()) {
      const num = Number(val.replace(',', '.'));
      return Number.isFinite(num) && num > 0;
    }
    return false;
  };

  const missing: string[] = [];
  if (!options?.isMattress) {
    if (
      !isPositive(directDimensions?.height) &&
      !isPositive(valuesByName.get('altura total')) &&
      !isPositive(valuesByName.get('altura'))
    ) {
      missing.push('Altura total');
    }
  } else {
    // Para colchões, a altura não é solicitada; exige-se a espessura do colchão
    if (
      !isPositive(directDimensions?.height) &&
      !isPositive(valuesByName.get('espessura do colchão')) &&
      !isPositive(valuesByName.get('espessura'))
    ) {
      missing.push('Espessura do colchão');
    }
  }
  if (
    !isPositive(directDimensions?.width) &&
    !isPositive(valuesByName.get('largura total')) &&
    !isPositive(valuesByName.get('largura'))
  ) {
    missing.push('Largura total');
  }
  if (
    !isPositive(directDimensions?.depth) &&
    !isPositive(valuesByName.get('profundidade total')) &&
    !isPositive(valuesByName.get('profundidade')) &&
    !isPositive(valuesByName.get('comprimento total')) &&
    !isPositive(valuesByName.get('comprimento'))
  ) {
    missing.push('Profundidade total');
  }
  if (!isPositive(directDimensions?.weight) && !isPositive(valuesByName.get('peso'))) {
    missing.push('Peso');
  }
  return missing;
};

export const getMissingRequiredTechnicalFields = (
  requiredFieldNames: readonly string[],
  values: TechnicalValuesMap = {}
): string[] => {
  const missing = requiredFieldNames.filter((name) => {
    const dep = getCharacteristicDependencyState(name, values);
    if (dep.isDisabled) {
      return false;
    }
    return !String(values[name] ?? '').trim();
  });

  if (isHasDoorsActive(values)) {
    const doorQty = parseDoorQuantityValue(values);
    if (doorQty === null || doorQty <= 0) {
      if (!missing.some((m) => isDoorQuantityCharacteristic(m))) {
        missing.push('Quantidade de portas');
      }
    }
  }

  if (isHasDrawersActive(values)) {
    const drawerQty = parseDrawerQuantityValue(values);
    if (drawerQty === null || drawerQty <= 0) {
      if (!missing.some((m) => isDrawerQuantityCharacteristic(m))) {
        missing.push('Quantidade de gavetas');
      }
    }
  }

  if (isHasFeetActive(values)) {
    const feetQty = parseFeetQuantityValue(values);
    if (feetQty === null || feetQty <= 0) {
      if (!missing.some((m) => isFeetQuantityCharacteristic(m))) {
        missing.push('Quantidade de pés');
      }
    }
  }

  return missing;
};

