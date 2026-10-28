/**
 * Predicados de domínio para móveis com portas, gavetas e pés.
 */

import { isYesNoValueActive } from './yesNo';

// --- Portas ---

export const isHasDoorsCharacteristic = (name: string): boolean =>
  /^possui\s+portas?\??$/i.test(name.trim());

export const isDoorQuantityCharacteristic = (name: string): boolean =>
  /quantidade\s+de\s+portas?/i.test(name.trim());

export const isDoorDependentCharacteristic = (name: string): boolean =>
  /(?:^|[^a-z0-9])portas?(?=$|[^a-z0-9])/i.test(name.trim()) &&
  !isHasDoorsCharacteristic(name) &&
  !isDoorQuantityCharacteristic(name);

export const parseDoorQuantityValue = (values: Record<string, any> = {}): number | null => {
  for (const [key, val] of Object.entries(values)) {
    if (isDoorQuantityCharacteristic(key)) {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'number') {
        return Number.isSafeInteger(val) && val >= 0 ? val : null;
      }
      const str = String(val).trim();
      if (!str) return null;
      const match = str.match(/^(\d+)(?:[.,]0+)?(?:\s+.*)?$/);
      if (match) {
        const quantity = Number(match[1]);
        return Number.isSafeInteger(quantity) ? quantity : null;
      }
      return null;
    }
  }
  return null;
};

export const isHasDoorsActive = (values: Record<string, any> = {}): boolean => {
  if (Object.keys(values).some(isDoorQuantityCharacteristic)) {
    const doorQty = parseDoorQuantityValue(values);
    return doorQty !== null && doorQty > 0;
  }

  for (const [key, val] of Object.entries(values)) {
    if (isHasDoorsCharacteristic(key)) {
      return isYesNoValueActive(val);
    }
  }
  return false;
};

// --- Gavetas ---

export const isHasDrawersCharacteristic = (name: string): boolean =>
  /^possui\s+gavetas?\??$/i.test(name.trim());

export const isDrawerQuantityCharacteristic = (name: string): boolean =>
  /quantidade\s+de\s+gavetas?/i.test(name.trim());

export const isSlideCharacteristic = (name: string): boolean =>
  /corredi[çc]a/i.test(name);

export const isDrawerDependentCharacteristic = (name: string): boolean =>
  !isDrawerQuantityCharacteristic(name) &&
  (isSlideCharacteristic(name) || (/gaveta/i.test(name) && !isHasDrawersCharacteristic(name)));

export const parseDrawerQuantityValue = (values: Record<string, any> = {}): number | null => {
  for (const [key, val] of Object.entries(values)) {
    if (isDrawerQuantityCharacteristic(key)) {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'number') {
        return Number.isSafeInteger(val) && val >= 0 ? val : null;
      }
      const str = String(val).trim();
      if (!str) return null;
      const match = str.match(/^(\d+)(?:[.,]0+)?(?:\s+.*)?$/);
      if (match) {
        const quantity = Number(match[1]);
        return Number.isSafeInteger(quantity) ? quantity : null;
      }
      return null;
    }
  }
  return null;
};

export const isHasDrawersActive = (values: Record<string, any> = {}): boolean => {
  if (Object.keys(values).some(isDrawerQuantityCharacteristic)) {
    const drawerQty = parseDrawerQuantityValue(values);
    return drawerQty !== null && drawerQty > 0;
  }

  for (const [key, val] of Object.entries(values)) {
    if (isHasDrawersCharacteristic(key)) {
      return isYesNoValueActive(val);
    }
  }
  return false;
};

// --- Pés ---

export const isHasFeetCharacteristic = (name: string): boolean =>
  /^possui\s+p[eé]s?\??$/i.test(name.trim());

export const isFeetQuantityCharacteristic = (name: string): boolean =>
  /quantidade\s+de\s+p[eé]s?/i.test(name.trim());

export const isFeetDependentCharacteristic = (name: string): boolean =>
  (/(?:^|[^a-z0-9])p[eé]s?(?=$|[^a-z0-9])/i.test(name) || /rod[ií]zios?/i.test(name)) &&
  !isHasFeetCharacteristic(name);

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
