/**
 * Predicados de medidas e dimensões para Especificações Técnicas.
 */

import { normalizeCharacteristicName } from './normalization';

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

export const isDimensionCharacteristicName = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name);
  return (
    isHeightCharacteristic(norm) ||
    isWidthCharacteristic(norm) ||
    isDepthCharacteristic(norm) ||
    isLengthCharacteristic(norm) ||
    isThicknessCharacteristic(norm) ||
    norm === 'profundidade fechado' ||
    norm === 'profundidade aberto' ||
    norm === 'altura do assento ao chao' ||
    norm === 'altura do assento ao chão' ||
    norm === 'altura do chao ate o assento' ||
    norm === 'altura do chão até o assento' ||
    norm.startsWith('altura') ||
    norm.startsWith('largura') ||
    norm.startsWith('profundidade') ||
    norm.startsWith('comprimento') ||
    norm.startsWith('espessura')
  );
};
