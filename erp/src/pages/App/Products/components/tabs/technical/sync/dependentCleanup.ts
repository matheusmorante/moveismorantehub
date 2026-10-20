import {
  isDoorQuantityCharacteristic,
  isDoorDependentCharacteristic,
  isHasDoorsCharacteristic,
  isDrawerQuantityCharacteristic,
  isDrawerDependentCharacteristic,
  isHasDrawersCharacteristic,
  isFeetQuantityCharacteristic,
  isFeetDependentCharacteristic,
  isHasFeetCharacteristic,
  isSinkMaterialCharacteristic,
  isConcretadaCharacteristic,
  isSinkMaterialWithInoxBowlEligible,
  isHasInoxBowlCharacteristic,
  normalizeCharacteristicName,
} from '@/pages/utils/technicalValuesService';

/**
 * Limpa características dependentes quando a quantidade principal for alterada para 0,
 * quando o switch mestre ("Possui portas/gavetas/pés") for desligado ("Não"),
 * ou quando o Material da pia for alterado para opção não compatível com Concretada ou Cuba de Inox.
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
      Object.keys(updated).forEach((k) => {
        if (isConcretadaCharacteristic(k)) {
          updated[k] = '';
        }
      });
    }

    const isBowlEligible = isSinkMaterialWithInoxBowlEligible({ [fieldName]: value });
    if (!isBowlEligible) {
      Object.keys(updated).forEach((k) => {
        if (isHasInoxBowlCharacteristic(k)) {
          updated[k] = '';
        }
      });
    }
    return updated;
  }

  const isZeroOrNo =
    value === 0 ||
    value === '0' ||
    value === false ||
    (typeof value === 'string' && /^n[aã]o$/i.test(value.trim()));

  if (!isZeroOrNo) {
    return technicalValues;
  }

  if (isDoorQuantityCharacteristic(fieldName) || isHasDoorsCharacteristic(fieldName)) {
    Object.keys(updated).forEach((k) => {
      if (k !== fieldName && isDoorDependentCharacteristic(k)) {
        updated[k] = '';
      }
    });
  }

  if (isDrawerQuantityCharacteristic(fieldName) || isHasDrawersCharacteristic(fieldName)) {
    Object.keys(updated).forEach((k) => {
      if (k !== fieldName && isDrawerDependentCharacteristic(k)) {
        updated[k] = Array.isArray(updated[k]) ? [] : '';
      }
    });
  }

  if (isFeetQuantityCharacteristic(fieldName) || isHasFeetCharacteristic(fieldName)) {
    Object.keys(updated).forEach((k) => {
      if (k !== fieldName && isFeetDependentCharacteristic(k)) {
        updated[k] = Array.isArray(updated[k]) ? [] : '';
      }
    });
  }

  return updated;
};
