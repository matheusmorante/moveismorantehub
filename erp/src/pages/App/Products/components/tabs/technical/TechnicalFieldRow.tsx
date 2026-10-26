import React from 'react';
import { Check, ChevronDown, CircleMinus, Globe, Layers2 } from 'lucide-react';
import type { Product } from '../../../../../types/product.type';
import {
  isDoorDrawerDependentCharacteristicActive,
  isCharacteristicDependent,
  isQuantityCharacteristic,
  isWeightCharacteristicName,
  type TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
import { TechnicalFieldInput } from './TechnicalFieldInput';
import {
  DisabledFieldWrapper,
  DisabledFieldInfoButton,
} from './DisabledFieldWrapper';
import {
  computeTechnicalFieldItemState,
  normalizeTechnicalName,
} from './technicalTabUtils';

const TECHNICAL_FIELD_SCOPES = [
  { value: 'global', label: 'Global', Icon: Globe },
  { value: 'variation', label: 'Por variação', Icon: Layers2 },
  { value: 'not_inform', label: 'Não informar', Icon: CircleMinus },
] as const;
const REQUIRED_TECHNICAL_FIELD_SCOPES = TECHNICAL_FIELD_SCOPES.filter(
  (option) => option.value !== 'not_inform'
);

export interface TechnicalFieldRowProps {
  readonly field: TechnicalFieldDefinition;
  readonly formData: Partial<Product>;
  readonly manualFieldNames: string[];
  readonly validationErrors?: Record<string, boolean>;
  readonly isVariable?: boolean;
  readonly isDependencyVariable?: boolean;
  readonly isSimpleProduct?: boolean;
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
  isDependencyVariable = false,
  isSimpleProduct = false,
  onToggleVariable,
  onValueChange,
  onOpenAttributeModal,
  onToggleDepthLength,
  onRemoveManualField,
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [isScopeMenuOpen, setIsScopeMenuOpen] = React.useState(false);
  const scopeControlRef = React.useRef<HTMLDivElement | null>(null);
  const scopeTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const scopeOptionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const scopeMenuId = React.useId();

  const {
    rawValue,
    isManual,
    isFieldInvalid,
    isColorField,
    isDepthOrLengthField,
    isFieldDisabled,
    disabledReason,
    hasConfiguredValue,
  } = computeTechnicalFieldItemState(field, formData, manualFieldNames, validationErrors);

  const normName = normalizeTechnicalName(field.name);
  const displayName = /^retr[aá]til\??$/i.test(field.name.trim()) ? 'É Retrátil?' : field.name;
  const isMandatory = Boolean(field.isRequired || field.isRequiredForCatalog);
  const isQuantityField = isQuantityCharacteristic(field.name);
  const isWeightField = isWeightCharacteristicName(field.name);
  const hasExplicitValue = Object.prototype.hasOwnProperty.call(
    formData.technicalValues || {},
    field.name
  );
  const isAutomaticallyActiveByQuantity = isDoorDrawerDependentCharacteristicActive(
    field.name,
    formData.technicalValues || {}
  );
  const isDependentCharacteristic = isCharacteristicDependent(field.name);
  const isDependencySatisfied = isDependentCharacteristic && !isFieldDisabled;
  const isExplicitlyNotApplicable = ['não se aplica', 'nao se aplica', 'n/a', 'não informar'].includes(
    normalizeTechnicalName(String(rawValue ?? ''))
  );
  const isOpenClosedSofaDepth =
    normName === 'profundidade aberto' || normName === 'profundidade fechado';
  const effectiveIsVariable = isVariable && !isSimpleProduct;
  const shouldDefaultToGlobal =
    hasConfiguredValue ||
    hasExplicitValue ||
    isManual ||
    isMandatory ||
    isDependencySatisfied ||
    isWeightField;
  const scope = effectiveIsVariable
    ? 'variation'
    : isExplicitlyNotApplicable
      ? 'not_inform'
      : shouldDefaultToGlobal
        ? 'global'
        : 'not_inform';
  const availableScopeOptions = isMandatory
    ? REQUIRED_TECHNICAL_FIELD_SCOPES
    : TECHNICAL_FIELD_SCOPES;
  const selectedScope = TECHNICAL_FIELD_SCOPES.find((option) => option.value === scope)!;
  const toggleDepthLengthTooltip = normName.includes('profundidade')
    ? normName.includes('total')
      ? 'Alternar para Comprimento total'
      : 'Alternar para Comprimento'
    : normName.includes('total')
      ? 'Alternar para Profundidade total'
      : 'Alternar para Profundidade';

  React.useEffect(() => {
    if (isFieldDisabled) setIsScopeMenuOpen(false);
  }, [isFieldDisabled]);

  React.useEffect(() => {
    if (!isScopeMenuOpen) return;

    const selectedIndex = availableScopeOptions.findIndex((option) => option.value === scope);
    scopeOptionRefs.current[selectedIndex]?.focus();
  }, [availableScopeOptions, isScopeMenuOpen, scope]);

  React.useEffect(() => {
    if (!isScopeMenuOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!scopeControlRef.current?.contains(event.target as Node)) {
        setIsScopeMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isScopeMenuOpen]);

  const handleScopeOptionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % availableScopeOptions.length;
    if (event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + availableScopeOptions.length) % availableScopeOptions.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = availableScopeOptions.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      scopeOptionRefs.current[nextIndex]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsScopeMenuOpen(false);
      scopeTriggerRef.current?.focus();
    }
  };

  return (
    <div
      id={`technical-field-${field.name}`}
      className={`flex w-[280px] max-w-full flex-col gap-1.5 p-1 transition-all ${
        isFieldDisabled ? 'opacity-70' : ''
      }`}
    >
      <div className="flex w-full flex-col gap-2">
        <div
          className={`flex w-full min-w-0 flex-nowrap items-center gap-2 ${
            isSimpleProduct ? 'min-h-5' : 'min-h-11'
          }`}
        >
          <label
            className={`min-w-0 flex-1 whitespace-nowrap text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
              isFieldInvalid
                ? 'text-red-600 dark:text-red-400'
                : isFieldDisabled
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className="min-w-0 truncate">
              {displayName}
              {field.unit ? ` (${field.unit})` : ''}
            </span>
            {isFieldDisabled && (
              <DisabledFieldInfoButton
                disabledReason={disabledReason}
                onClick={() => setShowTooltip((prev) => !prev)}
              />
            )}
          </label>
          {isDepthOrLengthField && !isOpenClosedSofaDepth && (
            <button
              type="button"
              title={toggleDepthLengthTooltip}
              aria-label={toggleDepthLengthTooltip}
              onClick={() => onToggleDepthLength(field)}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 transition-colors hover:text-blue-600"
            >
              <i className="bi bi-arrow-left-right" />
            </button>
          )}
          {isColorField && (
            <span className="inline-flex h-5 shrink-0 rounded-lg border border-blue-200 bg-blue-50 p-0.5 dark:border-blue-900 dark:bg-blue-950/40">
              <button
                type="button"
                title="Gerenciar cores"
                aria-label="Gerenciar cores"
                onClick={onOpenAttributeModal}
                className="inline-flex h-full items-center rounded-md px-1.5 text-[9px] font-black normal-case tracking-normal text-blue-700 transition-colors hover:bg-white dark:text-blue-300 dark:hover:bg-blue-900/60"
              >
                Gerenciar
              </button>
            </span>
          )}
          {isManual && !isQuantityField && !isAutomaticallyActiveByQuantity && (
            <button
              type="button"
              onClick={() => onRemoveManualField(field.name)}
              title={`Remover ${field.name}`}
              aria-label={`Remover campo ${field.name}`}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-xs text-slate-400 transition-colors hover:text-red-500"
            >
              <i className="bi bi-trash3" />
            </button>
          )}
          {onToggleVariable && isSimpleProduct && !isMandatory && !isDependencyVariable && (
            <button
              type="button"
              role="switch"
              aria-label={`Exibir característica ${field.name}`}
              aria-checked={scope === 'global'}
              disabled={isFieldDisabled}
              title={isFieldDisabled ? disabledReason : undefined}
              onClick={() =>
                onToggleVariable(field.name, scope === 'global' ? 'not_inform' : 'global')
              }
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900 ${
                scope === 'global' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  scope === 'global' ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          )}
          {onToggleVariable && !isSimpleProduct && !isDependencyVariable && (
            <div ref={scopeControlRef} className="relative shrink-0">
              <button
                ref={scopeTriggerRef}
                type="button"
                aria-label={`Escopo da característica ${field.name}: ${selectedScope.label}`}
                aria-haspopup="menu"
                aria-expanded={isScopeMenuOpen}
                aria-controls={scopeMenuId}
                title={isFieldDisabled ? disabledReason : selectedScope.label}
                disabled={isFieldDisabled}
                onClick={() => setIsScopeMenuOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    setIsScopeMenuOpen(true);
                  } else if (event.key === 'Escape') {
                    setIsScopeMenuOpen(false);
                  }
                }}
                className="inline-flex h-11 w-12 items-center justify-center gap-1 rounded-lg text-slate-600 outline-none transition-colors hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:text-blue-300"
              >
                <selectedScope.Icon aria-hidden="true" className="h-4 w-4" />
                <ChevronDown aria-hidden="true" className="h-3 w-3" />
              </button>

              <div
                id={scopeMenuId}
                role="menu"
                aria-label={`Escopo da característica ${field.name}`}
                hidden={!isScopeMenuOpen || isFieldDisabled}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setIsScopeMenuOpen(false);
                  }
                }}
                className="absolute right-0 top-full z-50 mt-1 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
              >
                {availableScopeOptions.map(({ value, label, Icon }, index) => (
                  <button
                    key={value}
                    ref={(element) => { scopeOptionRefs.current[index] = element; }}
                    type="button"
                    role="menuitemradio"
                    aria-checked={scope === value}
                    onKeyDown={(event) => handleScopeOptionKeyDown(event, index)}
                    onClick={() => {
                      onToggleVariable(field.name, value);
                      setIsScopeMenuOpen(false);
                      scopeTriggerRef.current?.focus();
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      scope === value
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {scope === value && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {(scope === 'global' || isDependentCharacteristic) && (
        <div className="w-full">
          <DisabledFieldWrapper
            isDisabled={
              isFieldDisabled ||
              effectiveIsVariable ||
              (isDependentCharacteristic && scope === 'not_inform')
            }
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
              disabled={
                isFieldDisabled ||
                effectiveIsVariable ||
                (isDependentCharacteristic && scope === 'not_inform')
              }
              onChange={(selectedVal) => onValueChange(field.name, selectedVal)}
            />
          </DisabledFieldWrapper>
        </div>
      )}
    </div>
  );
};

