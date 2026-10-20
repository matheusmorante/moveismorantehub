/**
 * Resolução de estados de dependência de características (portas, gavetas, pés, pias).
 */

import {
  isDoorDependentCharacteristic,
  isHasDoorsActive,
  parseDoorQuantityValue,
  isDrawerDependentCharacteristic,
  isHasDrawersActive,
  parseDrawerQuantityValue,
  isFeetDependentCharacteristic,
  isHasFeetActive,
  parseFeetQuantityValue,
} from './furniture';
import {
  isConcretadaCharacteristic,
  isSinkMaterialInox,
  isHasInoxBowlCharacteristic,
  isSinkMaterialWithInoxBowlEligible,
} from './categories';

export interface CharacteristicDependencyState {
  isDependent: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  masterFieldLabel?: string;
  masterQuantity?: number | null;
}

export const getCharacteristicDependencyState = (
  fieldName: string,
  technicalValues: Record<string, any> = {}
): CharacteristicDependencyState => {
  if (isDoorDependentCharacteristic(fieldName)) {
    const isDoorsActive = isHasDoorsActive(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isDoorsActive,
      disabledReason: 'Disponível apenas quando Possui portas for Sim.',
      masterFieldLabel: 'Possui portas',
      masterQuantity: parseDoorQuantityValue(technicalValues),
    };
  }

  if (isDrawerDependentCharacteristic(fieldName)) {
    const isDrawersActive = isHasDrawersActive(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isDrawersActive,
      disabledReason: 'Disponível apenas quando Possui gavetas for Sim.',
      masterFieldLabel: 'Possui gavetas',
      masterQuantity: parseDrawerQuantityValue(technicalValues),
    };
  }

  if (isFeetDependentCharacteristic(fieldName)) {
    const isFeetActive = isHasFeetActive(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isFeetActive,
      disabledReason: 'Disponível apenas quando Possui pés for Sim.',
      masterFieldLabel: 'Possui pés',
      masterQuantity: parseFeetQuantityValue(technicalValues),
    };
  }

  if (isConcretadaCharacteristic(fieldName)) {
    const isInox = isSinkMaterialInox(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isInox,
      disabledReason: 'Disponível apenas quando Material da pia for Inox.',
      masterFieldLabel: 'Material da pia',
    };
  }

  if (isHasInoxBowlCharacteristic(fieldName)) {
    const isEligible = isSinkMaterialWithInoxBowlEligible(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isEligible,
      disabledReason:
        'Disponível apenas quando Material da pia for Mármore Sintético, Mármore ou Granito.',
      masterFieldLabel: 'Material da pia',
    };
  }

  return {
    isDependent: false,
    isDisabled: false,
  };
};
