/**
 * Predicados para características de escolha binária Sim / Não.
 */

import { normalizeCharacteristicName } from './normalization';
import type { TechnicalFieldDefinition } from '../types';
import { isProductTechnicalFieldYesNo } from '../../../../../../shared-utils/productTechnicalFieldYesNo';

/**
 * Determina se a característica representa uma escolha binária Sim / Não (booleano ou rádio Sim/Não).
 */
export const isYesNoCharacteristic = (field: TechnicalFieldDefinition): boolean =>
  isProductTechnicalFieldYesNo({
    name: field.name,
    dataType: field.dataType,
    options: field.options,
  });

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
