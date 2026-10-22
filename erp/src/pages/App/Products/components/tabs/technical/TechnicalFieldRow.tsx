import React from 'react';
import type { Product } from '../../../../../types/product.type';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { TechnicalFieldInput } from './TechnicalFieldInput';
import {
  DisabledFieldWrapper,
  DisabledFieldInfoButton,
} from './DisabledFieldWrapper';
import {
  computeTechnicalFieldItemState,
  normalizeTechnicalName,
} from './technicalTabUtils';

export interface TechnicalFieldRowProps {
  readonly field: TechnicalFieldDefinition;
  readonly formData: Partial<Product>;
  readonly manualFieldNames: string[];
  readonly validationErrors?: Record<string, boolean>;
  readonly isVariable?: boolean;
  readonly onToggleVariable?: (
    fieldName: string,
    scope?: 'not_inform' | 'global' | 'variation'
  ) => void;
  readonly onValueChange: (fieldName: string, value: unknown) => void;
  readonly onOpenAttributeModal: () => void;
  readonly onToggleDepthLength: (field: TechnicalFieldDefinition) => void;
  readonly onRemoveManualField: (fieldName: string) => void;
}

export const TechnicalFieldRow: React.FC<TechnicalFieldRowProps> = ({
  field,
  formData,
  manualFieldNames,
  validationErrors,
  isVariable = false,
  onToggleVariable,
  onValueChange,
  onOpenAttributeModal,
  onToggleDepthLength,
  onRemoveManualField,
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const {
    rawValue,
    isManual,
    isRequiredField,
    isFieldInvalid,
    isColorField,
    isDepthOrLengthField,
    isFieldDisabled,
    disabledReason,
    hasConfiguredValue,
  } = computeTechnicalFieldItemState(field, formData, manualFieldNames, validationErrors);

  const normName = normalizeTechnicalName(field.name);
  const displayName = /^retr[aá]til\??$/i.test(field.name.trim()) ? 'É Retrátil?' : field.name;
  const isOpenClosedSofaDepth =
    normName === 'profundidade aberto' || normName === 'profundidade fechado';
  const scope = isVariable
    ? 'variation'
    : hasConfiguredValue
      ? 'global'
      : 'not_inform';
  const toggleDepthLengthTooltip = normName.includes('profundidade')
    ? normName.includes('total')
      ? 'Alternar para Comprimento total'
      : 'Alternar para Comprimento'
    : normName.includes('total')
      ? 'Alternar para Profundidade total'
      : 'Alternar para Profundidade';

  return (
    <div
      id={`technical-field-${field.name}`}
      className={`flex w-[280px] max-w-full flex-col gap-1.5 p-1 transition-all ${
        isFieldDisabled ? 'opacity-70' : ''
      }`}
    >
      <div className="flex w-full flex-col items-start gap-2">
        <label
          className={`w-full text-[10px] font-black uppercase tracking-widest truncate flex items-center gap-1.5 transition-colors ${
            isFieldInvalid
              ? 'text-red-600 dark:text-red-400'
              : isFieldDisabled
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <span>
            {displayName}
            {field.unit ? ` (${field.unit})` : ''}
            {isRequiredField && !isFieldDisabled && !isVariable && (
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            )}
          </span>
          {isFieldDisabled && (
            <DisabledFieldInfoButton
              disabledReason={disabledReason}
              onClick={() => setShowTooltip((prev) => !prev)}
            />
          )}
        </label>
        <div className="flex w-full items-center gap-1.5">
          {onToggleVariable && (
            <select
              aria-label={`Escopo da característica ${field.name}`}
              title="Escolha onde esta característica será informada"
              value={scope}
              onChange={(event) =>
                onToggleVariable(
                  field.name,
                  event.target.value as 'not_inform' | 'global' | 'variation'
                )
              }
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-blue-900/40"
            >
              <option value="not_inform">Não informar</option>
              <option value="global">Global</option>
              <option value="variation">Por variação</option>
            </select>
          )}
          {isColorField && (
            <span className="inline-flex shrink-0 rounded-lg border border-blue-200 bg-blue-50 p-0.5 dark:border-blue-900 dark:bg-blue-950/40">
              <button
                type="button"
                title="Gerenciar cores"
                aria-label="Gerenciar cores"
                onClick={onOpenAttributeModal}
                className="inline-flex items-center rounded-md px-1.5 py-1 text-[9px] font-black normal-case tracking-normal text-blue-700 transition-colors hover:bg-white dark:text-blue-300 dark:hover:bg-blue-900/60"
              >
                Gerenciar
              </button>
            </span>
          )}
          {isDepthOrLengthField && !isOpenClosedSofaDepth && (
            <button
              type="button"
              title={toggleDepthLengthTooltip}
              aria-label={toggleDepthLengthTooltip}
              onClick={() => onToggleDepthLength(field)}
              className="text-slate-400 hover:text-blue-600 transition-colors ml-1"
            >
              <i className="bi bi-arrow-left-right" />
            </button>
          )}

          {isManual && (
            <button
              type="button"
              onClick={() => onRemoveManualField(field.name)}
              title={`Remover ${field.name}`}
              aria-label={`Remover campo ${field.name}`}
              className="text-slate-400 hover:text-red-500 p-0.5 text-xs transition-colors ml-1"
            >
              <i className="bi bi-trash3" />
            </button>
          )}
        </div>
      </div>

      {scope === 'global' && (
        <div className="w-full">
          <DisabledFieldWrapper
            isDisabled={isFieldDisabled}
            disabledReason={disabledReason}
            showTooltip={showTooltip}
            onToggleTooltip={() => setShowTooltip((prev) => !prev)}
            onShowTooltip={() => setShowTooltip(true)}
            onHideTooltip={() => setShowTooltip(false)}
          >
            <TechnicalFieldInput
              field={field}
              value={
                rawValue !== undefined &&
                rawValue !== null &&
                rawValue !== 'Não se aplica' &&
                rawValue !== 'N/A'
                  ? rawValue
                  : ''
              }
              isInvalid={isFieldInvalid}
              disabled={isFieldDisabled}
              onChange={(selectedVal) => onValueChange(field.name, selectedVal)}
            />
          </DisabledFieldWrapper>
        </div>
      )}
    </div>
  );
};

