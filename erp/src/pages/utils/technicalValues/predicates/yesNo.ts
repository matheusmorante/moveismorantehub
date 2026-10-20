/**
 * Predicados para características de escolha binária Sim / Não.
 */

import { normalizeCharacteristicName } from './normalization';
import type { TechnicalFieldDefinition } from '../types';

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
