import {
  isConcretadaCharacteristic,
  isDoorDependentCharacteristic,
  isDoorQuantityCharacteristic,
  isDrawerDependentCharacteristic,
  isDrawerQuantityCharacteristic,
  isFeetDependentCharacteristic,
  isFeetQuantityCharacteristic,
  isHasDoorsCharacteristic,
  isHasDrawersCharacteristic,
  isHasFeetCharacteristic,
  isHasInoxBowlCharacteristic,
  isSinkMaterialCharacteristic,
  isSinkMaterialWithInoxBowlEligible,
  normalizeCharacteristicName,
} from './productCharacteristicDependencies';

/**
 * Clears dependent technical values when a master field is disabled or its
 * quantity reaches zero, matching the ERP product and variation forms.
 */
export const cleanupDependentCharacteristicsOnZero = (
  technicalValues: Record<string, unknown>,
  fieldName: string,
  value: unknown
): Record<string, unknown> => {
  const updated = { ...technicalValues };

  if (isSinkMaterialCharacteristic(fieldName)) {
    const isInox = Boolean(
      value !== undefined &&
        value !== null &&
        normalizeCharacteristicName(String(value)).includes('inox')
    );
    if (!isInox) {
      Object.keys(updated).forEach((key) => {
        if (isConcretadaCharacteristic(key)) updated[key] = '';
      });
    }

    const isBowlEligible = isSinkMaterialWithInoxBowlEligible({ [fieldName]: value });
    if (!isBowlEligible) {
      Object.keys(updated).forEach((key) => {
        if (isHasInoxBowlCharacteristic(key)) updated[key] = '';
      });
    }
    return updated;
  }

  const isDoorQuantityChange = isDoorQuantityCharacteristic(fieldName);
  const isDrawerQuantityChange = isDrawerQuantityCharacteristic(fieldName);
  if (isDoorQuantityChange) {
    Object.keys(updated).forEach((key) => {
      if (isHasDoorsCharacteristic(key)) delete updated[key];
    });
  }
  if (isDrawerQuantityChange) {
    Object.keys(updated).forEach((key) => {
      if (isHasDrawersCharacteristic(key)) delete updated[key];
    });
  }

  const isZeroOrNo =
    value === undefined ||
    value === null ||
    value === '' ||
    value === 0 ||
    value === '0' ||
    value === false ||
    (typeof value === 'string' && /^n[aã]o$/i.test(value.trim()));

  if (!isZeroOrNo) {
    return isDoorQuantityChange || isDrawerQuantityChange ? updated : technicalValues;
  }

  if (isDoorQuantityCharacteristic(fieldName) || isHasDoorsCharacteristic(fieldName)) {
    Object.keys(updated).forEach((key) => {
      if (key !== fieldName && isDoorDependentCharacteristic(key)) updated[key] = '';
    });
  }

  if (isDrawerQuantityCharacteristic(fieldName) || isHasDrawersCharacteristic(fieldName)) {
    Object.keys(updated).forEach((key) => {
      if (key !== fieldName && isDrawerDependentCharacteristic(key)) {
        updated[key] = Array.isArray(updated[key]) ? [] : '';
      }
    });
  }

  if (isFeetQuantityCharacteristic(fieldName) || isHasFeetCharacteristic(fieldName)) {
    Object.keys(updated).forEach((key) => {
      if (key !== fieldName && isFeetDependentCharacteristic(key)) {
        updated[key] = Array.isArray(updated[key]) ? [] : '';
      }
    });
  }

  return updated;
};

/** Keeps the variation's legacy attributes in sync with ERP quantity cleanup. */
export const cleanupDependentVariationAttributesOnQuantityChange = <
  T extends { readonly name?: string | null },
>(
  attributes: readonly T[],
  fieldName: string,
  value: unknown
): T[] => {
  const isDoorQuantity = isDoorQuantityCharacteristic(fieldName);
  const isDrawerQuantity = isDrawerQuantityCharacteristic(fieldName);
  if (!isDoorQuantity && !isDrawerQuantity) return [...attributes];

  const isZero = value === 0 || (typeof value === 'string' && value.trim() === '0');
  return attributes.filter((attribute) => {
    const name = attribute.name || '';
    if (isDoorQuantity && isHasDoorsCharacteristic(name)) return false;
    if (isDrawerQuantity && isHasDrawersCharacteristic(name)) return false;
    if (isZero && isDoorQuantity && isDoorDependentCharacteristic(name)) return false;
    if (isZero && isDrawerQuantity && isDrawerDependentCharacteristic(name)) return false;
    return true;
  });
};
