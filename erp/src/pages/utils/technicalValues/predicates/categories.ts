/**
 * Predicados de domínio específicos por categoria (Colchões, Pias, etc.).
 */

import { MATTRESS_CATEGORY_ID, SINK_CATEGORY_ID } from '../constants';
import { normalizeCharacteristicName } from './normalization';
import type { TechnicalFieldDefinition } from '../types';

// --- Colchões ---

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

// --- Pias ---

export const isSinkCategory = (
  categoryIds: readonly string[] = [],
  allFields?: readonly TechnicalFieldDefinition[]
): boolean => {
  if (categoryIds.includes(SINK_CATEGORY_ID)) return true;
  if (allFields) {
    const sinkField = allFields.find(
      (f) => isSinkMaterialCharacteristic(f.name) || isConcretadaCharacteristic(f.name)
    );
    if (sinkField?.categoryIds?.some((cid) => categoryIds.includes(cid))) {
      return true;
    }
  }
  return false;
};

export const isStructureMaterialCharacteristic = (name: string): boolean =>
  normalizeCharacteristicName(name) === 'material da estrutura';

export const isSinkMaterialCharacteristic = (name: string): boolean =>
  normalizeCharacteristicName(name) === 'material da pia';

export const isConcretadaCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name).replace(/\?/g, '').trim();
  return norm === 'concretada';
};

export const isValveCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name).replace(/\?/g, '').trim();
  return (
    norm === 'possui válvula' ||
    norm === 'possui valvula' ||
    norm === 'inclui válvula' ||
    norm === 'inclui valvula' ||
    norm === 'acompanha válvula' ||
    norm === 'acompanha valvula'
  );
};

export const isHasInoxBowlCharacteristic = (name: string): boolean => {
  const norm = normalizeCharacteristicName(name).replace(/\?/g, '').trim();
  return (
    norm === 'possui cuba de inox' ||
    norm === 'possui cuba inox' ||
    norm === 'cuba de inox' ||
    norm === 'cuba inox'
  );
};

export const isSinkMaterialInox = (technicalValues: Record<string, any> = {}): boolean => {
  for (const [key, val] of Object.entries(technicalValues)) {
    if (isSinkMaterialCharacteristic(key)) {
      if (val === undefined || val === null) return false;
      return normalizeCharacteristicName(String(val)).includes('inox');
    }
  }
  return false;
};

export const isSinkMaterialWithInoxBowlEligible = (
  technicalValues: Record<string, any> = {}
): boolean => {
  for (const [key, val] of Object.entries(technicalValues)) {
    if (isSinkMaterialCharacteristic(key)) {
      if (val === undefined || val === null) return false;
      const norm = normalizeCharacteristicName(String(val)).trim();
      if (norm === 'granito com cuba de inox') return false;
      if (
        norm.includes('mármore sintético') ||
        norm.includes('marmore sintetico') ||
        norm.includes('marmorite')
      ) {
        return true;
      }
      if (norm === 'granito') {
        return true;
      }
      if (norm === 'mármore' || norm === 'marmore') {
        return true;
      }
      return false;
    }
  }
  return false;
};
