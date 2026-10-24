/**
 * Predicados de normalização e verificações gerais de nomes para Especificações Técnicas.
 */

import {
  GLOBAL_REQUIRED_ATTRIBUTE_NAMES,
  PRIMARY_CHARACTERISTIC_NAMES,
} from '../constants';

export const normalizeCharacteristicName = (name: string): string =>
  name.trim().toLocaleLowerCase('pt-BR');

export const isQuantityCharacteristic = (name: string): boolean =>
  /\bquantidade\s+de\b/i.test(name.trim());

/**
 * Retorna se um valor é semanticamente definido (não é undefined ou null).
 * Preserva 0, false e strings vazias intencionais.
 */
export const isDefined = (val: unknown): boolean => {
  return val !== undefined && val !== null;
};

export const isExcludedCharacteristic = (name: string): boolean =>
  /^(reclin[aá]vel|linha|modelo)$/i.test(name.trim());

export const isModelCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return (
    norm === 'modelo' ||
    norm === 'modelo/linha' ||
    norm === 'modelo / linha' ||
    norm === 'linha/modelo' ||
    norm === 'linha / modelo' ||
    norm === 'modelo e linha' ||
    norm === 'modelo ou linha' ||
    norm === 'linha'
  );
};

export const isRequiredCharacteristicName = (name: string): boolean => {
  const normalized = normalizeCharacteristicName(name);
  if (normalized === 'comprimento' || normalized === 'comprimento total') return true;
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
