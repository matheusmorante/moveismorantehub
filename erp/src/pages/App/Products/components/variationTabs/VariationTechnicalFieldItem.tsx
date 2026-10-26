import React from 'react';
import {
  TechnicalFieldDefinition,
  getEffectiveTechnicalValue,
  hasVariationOverride,
  isDepthCharacteristic,
  isLengthCharacteristic,
  getCharacteristicDependencyState,
  isShelfWeightCapacityCharacteristic,
  isQuantityCharacteristic,
} from '@/pages/utils/technicalValuesService';
import { TechnicalFieldInput } from '../tabs/technical/TechnicalFieldInput';
import {
  DisabledFieldWrapper,
  DisabledFieldInfoButton,
} from '../tabs/technical/DisabledFieldWrapper';

export interface ResolvedVariationFieldState {
  isOverridden: boolean;
  effectiveVal: any;
  isInheritedFromParent: boolean;
  isApplicable: boolean;
  canEditApplicability: boolean;
  normalizedEffectiveValue: string;
}

/**
 * Resolve os estados de sincronização, herança e aplicabilidade para um campo na variação.
 */
export const resolveVariationFieldState = (
  field: TechnicalFieldDefinition,
  parentNormalizedValues: Record<string, any>,
  variationAttributeValues: Record<string, any>,
  formDataTechnicalValues: Record<string, any> = {},
  isVariable = false
): ResolvedVariationFieldState => {
  const fieldLower = field.name.trim().toLowerCase();
  const hasExplicitOverride = hasVariationOverride(formDataTechnicalValues, field.name);
  const hasAttributeValue =
    variationAttributeValues[field.name] !== undefined ||
    variationAttributeValues[fieldLower] !== undefined;
  const isOverridden = hasExplicitOverride || hasAttributeValue;

  const rawEffectiveVal = getEffectiveTechnicalValue(
    isVariable ? {} : parentNormalizedValues,
    { ...variationAttributeValues, ...formDataTechnicalValues },
    field.name
  );
  const effectiveVal =
    rawEffectiveVal !== undefined ? rawEffectiveVal : variationAttributeValues[fieldLower];

  const parentVal = parentNormalizedValues[field.name];
  const parentText = String(parentVal ?? '').trim();
  const parentIsZero =
    ['integer', 'number', 'decimal', 'measure'].includes(field.dataType) &&
    Number(parentText.replace(',', '.')) === 0;
  const hasMeaningfulParentValue =
    parentText !== '' &&
    parentText.toLocaleLowerCase('pt-BR') !== 'não se aplica' &&
    !parentIsZero;
  const isInheritedFromParent = !isVariable && !isOverridden && hasMeaningfulParentValue;
  const isAlwaysApplicable = field.isRequired;

  const normalizedEffectiveValue = String(effectiveVal ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR');

  const isApplicable =
    isAlwaysApplicable ||
    (isOverridden
      ? normalizedEffectiveValue !== 'não se aplica'
      : Object.prototype.hasOwnProperty.call(parentNormalizedValues, field.name) &&
        normalizedEffectiveValue !== 'não se aplica');

  const canEditApplicability = !isAlwaysApplicable && isOverridden;

  return {
    isOverridden,
    effectiveVal,
    isInheritedFromParent,
    isApplicable,
    canEditApplicability,
    normalizedEffectiveValue,
  };
};

export interface VariationTechnicalFieldItemProps {
  readonly field: TechnicalFieldDefinition;
  readonly parentNormalizedValues: Record<string, any>;
  readonly variationAttributeValues: Record<string, any>;
  readonly dependencyValues?: Record<string, any>;
  readonly formDataTechnicalValues?: Record<string, any>;
  readonly isManual: boolean;
  readonly isVariable?: boolean;
  readonly isSingleVariation?: boolean;
  readonly onSetOverride: (fieldName: string, value: any) => void;
  readonly onRemoveManualField: (fieldName: string) => void;
  readonly onToggleDepthLength: (field: TechnicalFieldDefinition) => void;
  readonly onOpenAttributeModal: () => void;
}

export const VariationTechnicalFieldItem: React.FC<VariationTechnicalFieldItemProps> = ({
  field,
  parentNormalizedValues,
  variationAttributeValues,
  dependencyValues,
  formDataTechnicalValues = {},
  isManual,
  isVariable = false,
  isSingleVariation = false,
  onSetOverride,
  onRemoveManualField,
  onToggleDepthLength,
  onOpenAttributeModal,
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const { effectiveVal, normalizedEffectiveValue } = resolveVariationFieldState(
    field,
    parentNormalizedValues,
    variationAttributeValues,
    formDataTechnicalValues,
    isVariable
  );

  const combinedValues = {
    ...parentNormalizedValues,
    ...variationAttributeValues,
    ...formDataTechnicalValues,
  };
  const effectiveDependencyValues = dependencyValues || combinedValues;
  const dep = getCharacteristicDependencyState(field.name, effectiveDependencyValues);
  const isDependencyDisabled = dep.isDisabled;
  const isDependencySatisfied = dep.isDependent && !dep.isDisabled;
  const isExplicitlyNotApplicable = [
    'não se aplica',
    'nao se aplica',
    'n/a',
    'não informar',
  ].includes(normalizedEffectiveValue);
  const isActuallyDisabled = isSingleVariation || isDependencyDisabled;
  const isQuantityField = isQuantityCharacteristic(field.name);
  const isDepthOrLength =
    isDepthCharacteristic(field.name) || isLengthCharacteristic(field.name);
  const isDepth = isDepthCharacteristic(field.name);
  const isTotal = field.name.toLowerCase().includes('total');
  const displayName = isShelfWeightCapacityCharacteristic(field.name)
    ? 'Peso suportado por prateleira'
    : field.name;
  const alternateLabel = isDepth
    ? isTotal
      ? 'Comprimento total'
      : 'Comprimento'
    : isTotal
      ? 'Profundidade total'
      : 'Profundidade';

  return (
    <div
      className={`flex flex-col gap-1.5 p-1 transition-all min-w-0 ${
        isDependencyDisabled ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <label
          className={`text-[10px] font-black uppercase tracking-widest truncate min-w-0 ${
            isDependencyDisabled
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-600 dark:text-slate-300'
          }`}
          title={displayName}
        >
          {displayName}
          {isDependencyDisabled && (
            <DisabledFieldInfoButton
              disabledReason={dep.disabledReason}
              onClick={() => setShowTooltip((prev) => !prev)}
              className="ml-1.5"
            />
          )}
          {field.name.toLowerCase() === 'cor' && (
            <button
              type="button"
              title="Gerenciar cores"
              aria-label="Gerenciar cores"
              onClick={onOpenAttributeModal}
              className="ml-1.5 inline-flex shrink-0 items-center rounded-lg px-1.5 py-0.5 text-[10px] font-black normal-case tracking-normal text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-955/40 cursor-pointer"
            >
              Gerenciar
            </button>
          )}
          {isDepthOrLength && (
            <button
              type="button"
              disabled={isSingleVariation}
              title={`Alternar para ${alternateLabel}`}
              onClick={() => onToggleDepthLength(field)}
              className="text-slate-400 hover:text-blue-600 transition-colors ml-1 disabled:opacity-50 cursor-pointer"
            >
              <i className="bi bi-arrow-left-right" />
            </button>
          )}
        </label>

        <div className="flex items-center gap-1 shrink-0">
          {isManual && !isQuantityField && !isDependencySatisfied && (
            <button
              type="button"
              onClick={() => onRemoveManualField(field.name)}
              title={`Remover campo ${field.name}`}
              className="text-slate-400 hover:text-red-500 text-xs p-0.5 cursor-pointer"
            >
              <i className="bi bi-trash3" />
            </button>
          )}
          {isQuantityField && !field.isRequired && !field.isRequiredForCatalog && (
            <button
              type="button"
              role="switch"
              aria-checked="true"
              aria-label={`Exibir característica ${field.name}`}
              onClick={() => onRemoveManualField(field.name)}
              className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <span className="inline-block h-4 w-4 translate-x-4 transform rounded-full bg-white shadow transition-transform" />
            </button>
          )}
        </div>
      </div>

      <DisabledFieldWrapper
        isDisabled={isDependencyDisabled}
        disabledReason={dep.disabledReason}
        showTooltip={showTooltip}
        onToggleTooltip={() => setShowTooltip((prev) => !prev)}
        onShowTooltip={() => setShowTooltip(true)}
        onHideTooltip={() => setShowTooltip(false)}
      >
        <TechnicalFieldInput
          field={field}
          value={
            effectiveVal !== undefined &&
            effectiveVal !== null &&
            !isExplicitlyNotApplicable
              ? effectiveVal
              : ''
          }
          disabled={
            isActuallyDisabled
          }
          onChange={(selectedVal) => onSetOverride(field.name, selectedVal)}
        />
      </DisabledFieldWrapper>
    </div>
  );
};
