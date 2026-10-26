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
import { isShelfWeightCapacityCharacteristic } from './dimensions';

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
  if (isShelfWeightCapacityCharacteristic(fieldName)) {
    return { isDependent: false, isDisabled: false };
  }

  if (isDoorDependentCharacteristic(fieldName)) {
    const isDoorsActive = isHasDoorsActive(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isDoorsActive,
      disabledReason: 'Disponível apenas quando a quantidade de portas for maior que zero.',
      masterFieldLabel: 'Quantidade de portas',
      masterQuantity: parseDoorQuantityValue(technicalValues),
    };
  }

  if (isDrawerDependentCharacteristic(fieldName)) {
    const isDrawersActive = isHasDrawersActive(technicalValues);
    return {
      isDependent: true,
      isDisabled: !isDrawersActive,
      disabledReason: 'Disponível apenas quando a quantidade de gavetas for maior que zero.',
      masterFieldLabel: 'Quantidade de gavetas',
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

export const isDoorDrawerDependentCharacteristic = (fieldName: string): boolean =>
  isDoorDependentCharacteristic(fieldName) || isDrawerDependentCharacteristic(fieldName);

export const isCharacteristicDependent = (fieldName: string): boolean =>
  getCharacteristicDependencyState(fieldName).isDependent;

export const isCharacteristicDependentOnVariableField = (
  fieldName: string,
  variableFieldNames: readonly string[] = []
): boolean => {
  const dependency = getCharacteristicDependencyState(fieldName);
  const masterName = dependency.masterFieldLabel?.trim().toLocaleLowerCase('pt-BR');
  return Boolean(
    dependency.isDependent &&
      masterName &&
      variableFieldNames.some((name) => name.trim().toLocaleLowerCase('pt-BR') === masterName)
  );
};

export const isDoorDrawerDependentCharacteristicActive = (
  fieldName: string,
  technicalValues: Record<string, any> = {}
): boolean => {
  const dependency = getCharacteristicDependencyState(fieldName, technicalValues);
  const masterFieldName = dependency.masterFieldLabel?.trim().toLocaleLowerCase('pt-BR');
  return (
    isDoorDrawerDependentCharacteristic(fieldName) &&
    dependency.isDependent &&
    !dependency.isDisabled &&
    (masterFieldName === 'quantidade de portas' || masterFieldName === 'quantidade de gavetas')
  );
};
