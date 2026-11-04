import { findProductTechnicalValueEntry } from '../../../../../shared-utils/productTechnicalValueAliases';
import { REQUIRED_CHARACTERISTIC_NAMES } from './productCharacteristicDefinitions';

export const getTechnicalValue = (values: Record<string, unknown> = {}, name: string) => {
  return findProductTechnicalValueEntry(values, name)?.value;
};

export const getMissingRequiredCharacteristics = (values: Record<string, unknown> = {}) => {
  return REQUIRED_CHARACTERISTIC_NAMES.filter((name) => {
    let raw = getTechnicalValue(values, name);
    if (name === 'Modelo' && (raw === undefined || raw === null || String(raw).trim() === '')) {
      raw =
        getTechnicalValue(values, 'modelo/linha') ??
        getTechnicalValue(values, 'modelo / linha') ??
        getTechnicalValue(values, 'linha/modelo') ??
        getTechnicalValue(values, 'linha / modelo') ??
        getTechnicalValue(values, 'linha');
    }
    const value = String(raw ?? '')
      .trim()
      .toLocaleLowerCase('pt-BR');
    return !value || ['não se aplica', 'nao se aplica', 'n/a'].includes(value);
  });
};

export const getMissingRequiredDimensions = (
  values: Record<string, unknown> = {},
  directDimensions?: { width?: number; height?: number; depth?: number; weight?: number },
  options?: { isMattress?: boolean; isHeightRequired?: boolean }
) => {
  const isPositive = (val: unknown): boolean => {
    if (typeof val === 'number') return Number.isFinite(val) && val > 0;
    if (typeof val === 'string' && val.trim()) {
      const num = Number(val.replace(',', '.'));
      return Number.isFinite(num) && num > 0;
    }
    return false;
  };

  const missing: string[] = [];
  if (options?.isHeightRequired !== false) {
    if (
      !isPositive(directDimensions?.height) &&
      !isPositive(getTechnicalValue(values, 'altura total')) &&
      !isPositive(getTechnicalValue(values, 'altura'))
    ) {
      missing.push('Altura total');
    }
  }
  if (
    !isPositive(directDimensions?.width) &&
    !isPositive(getTechnicalValue(values, 'largura total')) &&
    !isPositive(getTechnicalValue(values, 'largura'))
  ) {
    missing.push('Largura total');
  }
  if (
    !isPositive(directDimensions?.depth) &&
    !isPositive(getTechnicalValue(values, 'profundidade total')) &&
    !isPositive(getTechnicalValue(values, 'profundidade')) &&
    !isPositive(getTechnicalValue(values, 'comprimento total')) &&
    !isPositive(getTechnicalValue(values, 'comprimento'))
  ) {
    missing.push('Profundidade total');
  }
  return missing;
};
