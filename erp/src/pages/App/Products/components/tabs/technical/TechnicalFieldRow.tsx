import React from 'react';
import { Check, ChevronDown, CircleMinus, Globe, Layers2 } from 'lucide-react';
import type { Product } from '../../../../../types/product.type';
import {
  isCharacteristicDependent,
  isShelfWeightCapacityCharacteristic,
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
import { getTechnicalFieldDisplayName } from '../../../../../../../../shared-utils/productTechnicalFieldScope';

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
  readonly isHighlighted?: boolean;
  readonly isVariable?: boolean;
  readonly isDependencyVariable?: boolean;
  readonly isSimpleProduct?: boolean;
  readonly showSimpleFieldToggle?: boolean;
  readonly onToggleVariable?: (
    fieldName: string,
    scope?: 'not_inform' | 'global' | 'variation'
  ) => void;
  readonly onToggleCharacteristic?: (field: TechnicalFieldDefinition) => void;
  readonly onValueChange: (fieldName: string, value: unknown) => void;
  readonly onOpenAttributeModal: () => void;
  readonly onRemoveManualField: (fieldName: string) => void;
}

export const TechnicalFieldRow: React.FC<TechnicalFieldRowProps> = ({
  field,
  formData,
  manualFieldNames,
  validationErrors,
  isHighlighted = false,
  isVariable = false,
  isDependencyVariable = false,
  isSimpleProduct = false,
  showSimpleFieldToggle = true,
  onToggleVariable,
  onToggleCharacteristic,
  onValueChange,
  onOpenAttributeModal,
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
    isFieldInvalid,
    isColorField,
    isFieldDisabled,
    disabledReason,
    hasConfiguredValue,
  } = computeTechnicalFieldItemState(field, formData, manualFieldNames, validationErrors);

  const displayName = isShelfWeightCapacityCharacteristic(field.name)
    ? 'Peso suportado por prateleira'
    : getTechnicalFieldDisplayName(field.name);
  const isCategoryMandatory = Boolean(field.isRequired || field.isRequiredForCatalog);
  const isMandatory = Boolean(field.isRequiredForProductEntry ?? isCategoryMandatory);
  const hasCharacteristicActivation = Boolean(
    onToggleCharacteristic &&
    field.characteristicActive !== undefined &&
    !field.characteristicToggleDisabled
  );
  const isCharacteristicInactive = hasCharacteristicActivation && !field.characteristicActive;
  const isDependentCharacteristic = Boolean(field.dependency) || isCharacteristicDependent(field.name);
  const isDependencySatisfied = isDependentCharacteristic && !isFieldDisabled;
  const isExplicitlyNotApplicable = ['não se aplica', 'nao se aplica', 'n/a', 'não informar'].includes(
    normalizeTechnicalName(String(rawValue ?? ''))
  );
  const effectiveIsVariable = isVariable && !isSimpleProduct;
  const shouldDefaultToGlobal =
    field.characteristicActive === true ||
    hasConfiguredValue ||
    isMandatory ||
    isDependencySatisfied;
  const scope = effectiveIsVariable
    ? 'variation'
    : isExplicitlyNotApplicable
      ? 'not_inform'
      : shouldDefaultToGlobal
        ? 'global'
        : 'not_inform';
  const availableScopeOptions = isCategoryMandatory || hasCharacteristicActivation
    ? REQUIRED_TECHNICAL_FIELD_SCOPES
    : TECHNICAL_FIELD_SCOPES;
  const selectedScope = TECHNICAL_FIELD_SCOPES.find((option) => option.value === scope)!;

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
      } ${isHighlighted ? 'bg-amber-50/80 outline outline-2 outline-amber-300 dark:bg-amber-950/30 dark:outline-amber-700' : ''}`}
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
            {isMandatory && (
              <span aria-label="Obrigatória" className="shrink-0 text-red-500">*</span>
            )}
            {isFieldDisabled && (
              <DisabledFieldInfoButton
                disabledReason={disabledReason}
                onClick={() => setShowTooltip((prev) => !prev)}
              />
            )}
          </label>
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
          {hasCharacteristicActivation && (
            <button
              type="button"
              role="switch"
              aria-label={`Ativar característica ${field.name}`}
              aria-checked={Boolean(field.characteristicActive)}
              disabled={isFieldDisabled || field.characteristicToggleDisabled}
              title={field.characteristicToggleDisabled ? 'Característica obrigatória' : isFieldDisabled ? disabledReason : undefined}
              onClick={() => onToggleCharacteristic?.(field)}
              className={`relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-slate-900 ${
                field.characteristicActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span className={`absolute left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
                field.characteristicActive ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          )}
          {onToggleVariable &&
            isSimpleProduct &&
            showSimpleFieldToggle &&
            !hasCharacteristicActivation &&
            !isMandatory &&
            !isDependencyVariable &&
            !isDependentCharacteristic && (
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
          {onToggleVariable &&
            !isSimpleProduct &&
            !isCharacteristicInactive &&
            (
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
          {manualFieldNames.includes(field.name) && (
            <button
              type="button"
              aria-label={`Remover campo ${field.name}`}
              title="Remover característica deste produto"
              onClick={() => onRemoveManualField(field.name)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
            >
              <CircleMinus aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

      </div>

      {(scope === 'global' || scope === 'variation') && !isCharacteristicInactive && (
        <div className="w-full">
          <DisabledFieldWrapper
            isDisabled={
              isFieldDisabled ||
              effectiveIsVariable
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
                !isExplicitlyNotApplicable
                  ? rawValue
                  : ''
              }
              isInvalid={isFieldInvalid}
              disabled={
                isFieldDisabled ||
                effectiveIsVariable
              }
              placeholder={scope === 'variation' ? 'Defina na variação...' : undefined}
              onChange={(selectedVal) => onValueChange(field.name, selectedVal)}
            />
          </DisabledFieldWrapper>
        </div>
      )}
    </div>
  );
};

