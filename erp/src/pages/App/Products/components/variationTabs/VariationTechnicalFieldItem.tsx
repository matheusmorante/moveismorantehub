import React from 'react';
import {
  TechnicalFieldDefinition,
  getEffectiveTechnicalValue,
  hasVariationOverride,
  isDepthCharacteristic,
  isLengthCharacteristic,
} from '@/pages/utils/technicalValuesService';
import { TechnicalFieldInput } from '../tabs/technical/TechnicalFieldInput';

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
  formDataTechnicalValues: Record<string, any> = {}
): ResolvedVariationFieldState => {
  const fieldLower = field.name.trim().toLowerCase();
  const hasExplicitOverride = hasVariationOverride(formDataTechnicalValues, field.name);
  const hasAttributeValue =
    variationAttributeValues[field.name] !== undefined ||
    variationAttributeValues[fieldLower] !== undefined;
  const isOverridden = hasExplicitOverride || hasAttributeValue;

  const rawEffectiveVal = getEffectiveTechnicalValue(
    parentNormalizedValues,
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
  const isInheritedFromParent = !isOverridden && hasMeaningfulParentValue;
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
  readonly formDataTechnicalValues?: Record<string, any>;
  readonly isManual: boolean;
  readonly isSingleVariation?: boolean;
  readonly onSetOverride: (fieldName: string, value: any) => void;
  readonly onRemoveOverride: (fieldName: string) => void;
  readonly onRemoveManualField: (fieldName: string) => void;
  readonly onToggleDepthLength: (field: TechnicalFieldDefinition) => void;
  readonly onOpenAttributeModal: () => void;
}

export const VariationTechnicalFieldItem: React.FC<VariationTechnicalFieldItemProps> = ({
  field,
  parentNormalizedValues,
  variationAttributeValues,
  formDataTechnicalValues = {},
  isManual,
  isSingleVariation = false,
  onSetOverride,
  onRemoveOverride,
  onRemoveManualField,
  onToggleDepthLength,
  onOpenAttributeModal,
}) => {
  const {
    isOverridden,
    effectiveVal,
    isInheritedFromParent,
    isApplicable,
    canEditApplicability,
    normalizedEffectiveValue,
  } = resolveVariationFieldState(
    field,
    parentNormalizedValues,
    variationAttributeValues,
    formDataTechnicalValues
  );

  const isDepthOrLength =
    isDepthCharacteristic(field.name) || isLengthCharacteristic(field.name);
  const isDepth = isDepthCharacteristic(field.name);
  const isTotal = field.name.toLowerCase().includes('total');
  const alternateLabel = isDepth
    ? isTotal
      ? 'Comprimento total'
      : 'Comprimento'
    : isTotal
      ? 'Profundidade total'
      : 'Profundidade';

  const handleApplicabilityToggle = () => {
    if (!canEditApplicability || isSingleVariation) return;
    const valueToApply = isApplicable
      ? 'Não se aplica'
      : normalizedEffectiveValue === 'não se aplica'
        ? ''
        : (effectiveVal ?? '');
    onSetOverride(field.name, valueToApply);
  };

  const handleSyncToggle = () => {
    if (isSingleVariation) return;
    if (isOverridden) {
      onRemoveOverride(field.name);
    } else {
      onSetOverride(field.name, effectiveVal ?? '');
    }
  };

  return (
    <div className="flex flex-col gap-1.5 p-1 transition-all min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <label
          className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 truncate min-w-0"
          title={field.name}
        >
          {field.name}
          {field.isRequired && isApplicable && (
            <span className="ml-1 text-red-500" aria-label="Obrigatório">
              *
            </span>
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
          {!field.isRequired && (
            <button
              type="button"
              role="switch"
              aria-checked={isApplicable}
              onClick={handleApplicabilityToggle}
              disabled={!canEditApplicability || isSingleVariation}
              className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors ${canEditApplicability ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${isApplicable ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              title={
                field.isRequired
                  ? 'Esta característica é obrigatória'
                  : isOverridden
                    ? isApplicable
                      ? 'Aplica-se — clique para marcar Não se aplica'
                      : 'Não se aplica — clique para reativar'
                    : 'Sincronizado com o pai — dessincronize para alterar'
              }
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition ${isApplicable ? 'translate-x-3' : 'translate-x-0'}`}
              />
            </button>
          )}

          {/* Ícone sync: verde=sincronizado (corrente ligada), cinza=manual (corrente quebrada) */}
          <button
            type="button"
            disabled={isSingleVariation}
            onClick={handleSyncToggle}
            className={`p-1 rounded-lg flex items-center transition-all ${isSingleVariation ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
              isOverridden
                ? 'text-slate-400 hover:text-slate-600'
                : 'text-emerald-500 hover:text-emerald-600'
            }`}
            title={
              isOverridden
                ? 'Manual — clique para sincronizar com o pai'
                : 'Sincronizado com o pai — clique para personalizar'
            }
          >
            <i
              className={`bi ${isOverridden ? 'bi-link-45deg' : 'bi-link'} text-sm`}
            />
          </button>

          {isManual && (
            <button
              type="button"
              onClick={() => onRemoveManualField(field.name)}
              title={`Remover campo ${field.name}`}
              className="text-slate-400 hover:text-red-500 text-xs p-0.5 cursor-pointer"
            >
              <i className="bi bi-trash3" />
            </button>
          )}
        </div>
      </div>

      <TechnicalFieldInput
        field={field}
        value={effectiveVal !== undefined && effectiveVal !== null ? effectiveVal : ''}
        disabled={isSingleVariation || isInheritedFromParent}
        onChange={(selectedVal) => onSetOverride(field.name, selectedVal)}
      />
    </div>
  );
};
