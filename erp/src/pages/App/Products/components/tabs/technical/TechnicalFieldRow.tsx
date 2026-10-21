import React from 'react';
import { Globe, Layers2 } from 'lucide-react';
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
import { isYesNoCharacteristic } from '@/pages/utils/technicalValuesService';

export interface TechnicalFieldRowProps {
  readonly field: TechnicalFieldDefinition;
  readonly formData: Partial<Product>;
  readonly manualFieldNames: string[];
  readonly validationErrors?: Record<string, boolean>;
  readonly isVariable?: boolean;
  readonly onToggleVariable?: (fieldName: string) => void;
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
  } = computeTechnicalFieldItemState(field, formData, manualFieldNames, validationErrors);

  const normName = normalizeTechnicalName(field.name);
  const isYesNoField = isYesNoCharacteristic(field);
  const displayName = /^retr[aá]til\??$/i.test(field.name.trim()) ? 'É Retrátil?' : field.name;
  const isOpenClosedSofaDepth =
    normName === 'profundidade aberto' || normName === 'profundidade fechado';
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
      className={`flex w-[280px] max-w-full ${isYesNoField ? 'flex-row items-center justify-between gap-3' : 'flex-col gap-1.5'} p-1 transition-all ${
        isFieldDisabled ? 'opacity-70' : ''
      }`}
    >
      <div className={`flex items-center justify-between gap-2 ${isYesNoField ? 'min-w-0 flex-1' : 'w-full'}`}>
        <label
          className={`min-w-0 flex-1 text-[10px] font-black uppercase tracking-widest truncate flex items-center gap-1.5 transition-colors ${
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
        <div className="flex items-center gap-1.5">
          {onToggleVariable && (
            <div
              role="group"
              aria-label={`Escopo da característica ${field.name}`}
              className="inline-flex min-w-[158px] shrink-0 rounded-xl bg-slate-200/70 p-0.5 text-[10px] font-bold dark:bg-slate-800"
            >
              <button
                type="button"
                aria-pressed={!isVariable}
                aria-label={`Global — ${field.name}`}
                title="Global — todas as variações herdam o valor do produto pai"
                onClick={() => {
                  if (isVariable) onToggleVariable(field.name);
                }}
                className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 transition-all ${
                  !isVariable
                    ? 'bg-white font-black text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <Globe size={13} aria-hidden="true" />
                  Global
                </span>
              </button>
              <button
                type="button"
                aria-pressed={isVariable}
                aria-label={`Por variação — ${field.name}`}
                title="Por variação — cada variação pode ter seu próprio valor"
                onClick={() => {
                  if (!isVariable) onToggleVariable(field.name);
                }}
                className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 transition-all ${
                  isVariable
                    ? 'bg-white font-black text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <Layers2 size={13} aria-hidden="true" />
                  Por variação
                </span>
              </button>
            </div>
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

      {!isVariable && (
        <div className={isYesNoField ? 'shrink-0' : 'w-full'}>
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
              compact={isYesNoField}
              onChange={(selectedVal) => onValueChange(field.name, selectedVal)}
            />
          </DisabledFieldWrapper>
        </div>
      )}
    </div>
  );
};

