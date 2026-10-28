import React from 'react';
import type { Product } from '../../../../../types/product.type';
import type {
  CharacteristicGroup,
  TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
import {
  isHasDoorsCharacteristic,
  isHasDrawersCharacteristic,
  isHasFeetCharacteristic,
  isDoorQuantityCharacteristic,
  isDrawerQuantityCharacteristic,
  isCharacteristicDependent,
  isCharacteristicDependentOnVariableField,
} from '@/pages/utils/technicalValuesService';
import { TechnicalFieldRow } from './TechnicalFieldRow';
import { isTechnicalFieldVariable } from '@/pages/utils/technicalValuesService';

export interface TechnicalFieldGroupSectionProps {
  readonly group: CharacteristicGroup<TechnicalFieldDefinition>;
  readonly headingAccessory?: React.ReactNode;
  readonly collapsible?: boolean;
  readonly expanded?: boolean;
  readonly onToggleExpanded?: () => void;
  readonly allDisplayedFields?: readonly TechnicalFieldDefinition[];
  readonly formData: Partial<Product>;
  readonly manualFieldNames: string[];
  readonly validationErrors?: Record<string, boolean>;
  readonly highlightedFieldName?: string | null;
  readonly variableTechnicalFieldNames?: readonly string[];
  readonly isSimpleProduct?: boolean;
  readonly suppressImplicitFields?: boolean;
  readonly hideSimpleFieldToggles?: boolean;
  readonly hideHeading?: boolean;
  readonly onToggleVariableField?: (
    fieldName: string,
    scope?: 'not_inform' | 'global' | 'variation'
  ) => void;
  readonly onToggleCharacteristic?: (field: TechnicalFieldDefinition) => void;
  readonly onValueChange: (fieldName: string, value: unknown) => void;
  readonly onOpenAttributeModal: () => void;
  readonly onRemoveManualField: (fieldName: string) => void;
}

const DEFAULT_POSSUI_PORTAS: TechnicalFieldDefinition = {
  id: 'e3f1a001-1111-4000-8000-000000000001',
  name: 'Possui portas',
  dataType: 'radio',
  options: [
    { id: 'nao', value: 'Não' },
    { id: 'sim', value: 'Sim' },
  ],
  isRequired: false,
};

const DEFAULT_POSSUI_GAVETAS: TechnicalFieldDefinition = {
  id: 'e3f1a002-2222-4000-8000-000000000002',
  name: 'Possui gavetas',
  dataType: 'radio',
  options: [
    { id: 'nao', value: 'Não' },
    { id: 'sim', value: 'Sim' },
  ],
  isRequired: false,
};

const DEFAULT_POSSUI_PES: TechnicalFieldDefinition = {
  id: 'a1f3e792-0790-4554-b269-e3b0b707896e',
  name: 'Possui pés',
  dataType: 'radio',
  options: [
    { id: 'nao', value: 'Não' },
    { id: 'sim', value: 'Sim' },
  ],
  isRequired: false,
};

/**
 * Renderiza uma seção temática e evita repetir o controle booleano quando a quantidade já é exibida.
 */
export const TechnicalFieldGroupSection: React.FC<TechnicalFieldGroupSectionProps> = ({
  group,
  headingAccessory,
  collapsible = false,
  expanded = true,
  onToggleExpanded,
  allDisplayedFields = [],
  formData,
  manualFieldNames,
  validationErrors,
  highlightedFieldName,
  variableTechnicalFieldNames = [],
  isSimpleProduct = false,
  suppressImplicitFields = false,
  hideSimpleFieldToggles = false,
  hideHeading = false,
  onToggleVariableField,
  onToggleCharacteristic,
  onValueChange,
  onOpenAttributeModal,
  onRemoveManualField,
}) => {
  const isPortasGroup = group.title === 'Portas';
  const isGavetasGroup = group.title === 'Gavetas';
  const isPesGroup = group.title === 'Pés';
  const isDimensionsGroup =
    group.title === 'Dimensões' || group.title === 'Dimensões e Peso';
  const isVariableField = (field: TechnicalFieldDefinition) =>
    field.dependency
      ? isTechnicalFieldVariable(field.name, variableTechnicalFieldNames)
      : isCharacteristicDependent(field.name)
        ? isCharacteristicDependentOnVariableField(field.name, variableTechnicalFieldNames)
        : isTechnicalFieldVariable(field.name, variableTechnicalFieldNames);

  const effectiveFields = [...group.fields];
  const hasDoorQuantityField = [...effectiveFields, ...allDisplayedFields].some((field) =>
    isDoorQuantityCharacteristic(field.name)
  );
  const hasDrawerQuantityField = [...effectiveFields, ...allDisplayedFields].some((field) =>
    isDrawerQuantityCharacteristic(field.name)
  );

  if (!suppressImplicitFields && (
    isPortasGroup &&
    !hasDoorQuantityField &&
    !effectiveFields.some((field) => isHasDoorsCharacteristic(field.name))
  )) {
    effectiveFields.unshift(DEFAULT_POSSUI_PORTAS);
  }
  if (!suppressImplicitFields && (
    isGavetasGroup &&
    !hasDrawerQuantityField &&
    !effectiveFields.some((field) => isHasDrawersCharacteristic(field.name))
  )) {
    effectiveFields.unshift(DEFAULT_POSSUI_GAVETAS);
  }
  if (!suppressImplicitFields && isPesGroup && !effectiveFields.some((f) => isHasFeetCharacteristic(f.name))) {
    effectiveFields.unshift(DEFAULT_POSSUI_PES);
  }

  const displayedFields = effectiveFields.filter((field) => {
    // O formulário pode agrupar opcionais em uma seção genérica; ainda assim,
    // a presença da quantidade torna redundante o controle booleano mestre.
    if (isHasDoorsCharacteristic(field.name)) return !hasDoorQuantityField;
    if (isDoorQuantityCharacteristic(field.name)) return true;
    if (isHasDrawersCharacteristic(field.name)) return !hasDrawerQuantityField;
    if (isDrawerQuantityCharacteristic(field.name)) return true;
    if (isPesGroup) {
      if (isHasFeetCharacteristic(field.name)) return true;
      return true;
    }
    return true;
  });

  const fieldGrid = (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,280px))] gap-x-5 gap-y-4">
      {displayedFields.map((field) => (
        <TechnicalFieldRow
          key={field.id}
          field={field}
          formData={formData}
          manualFieldNames={manualFieldNames}
          validationErrors={validationErrors}
          isHighlighted={highlightedFieldName === field.name}
          isVariable={isVariableField(field)}
          isDependencyVariable={isCharacteristicDependentOnVariableField(
            field.name,
            variableTechnicalFieldNames
          ) || Boolean(field.dependencyReferenceIsVariable)}
          isSimpleProduct={isSimpleProduct}
          showSimpleFieldToggle={!hideSimpleFieldToggles}
          onToggleVariable={onToggleVariableField}
          onToggleCharacteristic={onToggleCharacteristic}
          onValueChange={onValueChange}
          onOpenAttributeModal={onOpenAttributeModal}
          onRemoveManualField={onRemoveManualField}
        />
      ))}
    </div>
  );

  const headingTextClassName =
    'flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300';
  const headingClassName =
    `${headingTextClassName} border-b border-slate-200 dark:border-slate-800 pb-2`;
  const groupTitle = collapsible ? (
    <h4 id={`technical-group-${group.title}`} className={headingTextClassName}>
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        aria-controls={`technical-group-fields-${group.title}`}
        className="flex min-w-0 items-center gap-2 text-left"
      >
        <i className={`bi ${expanded ? 'bi-chevron-down' : 'bi-chevron-right'} text-xs text-slate-400`} aria-hidden="true" />
        <span className="truncate">{group.title}</span>
      </button>
    </h4>
  ) : (
    <h4 id={`technical-group-${group.title}`} className={headingTextClassName}>
      {group.title}
    </h4>
  );
  const groupHeadingContent = <div className="flex min-w-0 flex-1">{groupTitle}</div>;

  const heading = headingAccessory ? (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-slate-200 pb-2 dark:border-slate-800">
      {groupHeadingContent}
      <div className="w-full max-w-xl flex-[1_0_18rem]">{headingAccessory}</div>
    </div>
  ) : (
    <div className={`${headingClassName} flex items-center justify-between gap-3`}>
      {groupHeadingContent}
    </div>
  );

  const groupContent = (
    <div
      id={`technical-group-fields-${group.title}`}
      hidden={collapsible && !expanded}
    >
      {fieldGrid}
    </div>
  );

  if (isDimensionsGroup) {
    return (
      <section aria-labelledby={`technical-group-${group.title}`} className="flex flex-col gap-3">
        {heading}
        {groupContent}
      </section>
    );
  }

  if (hideHeading) {
    return <div className="flex flex-col gap-3">{fieldGrid}</div>;
  }

  return (
    <section aria-labelledby={`technical-group-${group.title}`} className="flex flex-col gap-3">
      {heading}
      {groupContent}
    </section>
  );
};
