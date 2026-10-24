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
  isCharacteristicDependentOnVariableField,
} from '@/pages/utils/technicalValuesService';
import { TechnicalFieldRow } from './TechnicalFieldRow';
import { isTechnicalFieldVariable } from '@/pages/utils/technicalValuesService';

export interface TechnicalFieldGroupSectionProps {
  readonly group: CharacteristicGroup<TechnicalFieldDefinition>;
  readonly formData: Partial<Product>;
  readonly manualFieldNames: string[];
  readonly validationErrors?: Record<string, boolean>;
  readonly variableTechnicalFieldNames?: readonly string[];
  readonly isSimpleProduct?: boolean;
  readonly hideHeading?: boolean;
  readonly onToggleVariableField?: (
    fieldName: string,
    scope?: 'not_inform' | 'global' | 'variation'
  ) => void;
  readonly onValueChange: (fieldName: string, value: unknown) => void;
  readonly onOpenAttributeModal: () => void;
  readonly onToggleDepthLength: (field: TechnicalFieldDefinition) => void;
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
 * Renderiza uma seção temática de características técnicas em grid responsivo.
 * Mantém os campos dependentes visíveis e os habilita quando o campo mestre é válido.
 */
export const TechnicalFieldGroupSection: React.FC<TechnicalFieldGroupSectionProps> = ({
  group,
  formData,
  manualFieldNames,
  validationErrors,
  variableTechnicalFieldNames = [],
  isSimpleProduct = false,
  hideHeading = false,
  onToggleVariableField,
  onValueChange,
  onOpenAttributeModal,
  onToggleDepthLength,
  onRemoveManualField,
}) => {
  const isPortasGroup = group.title === 'Portas';
  const isGavetasGroup = group.title === 'Gavetas';
  const isPesGroup = group.title === 'Pés';
  const isDimensionsGroup = group.title === 'Dimensões e Peso';
  const isVariableField = (fieldName: string) =>
    isTechnicalFieldVariable(fieldName, variableTechnicalFieldNames) ||
    isCharacteristicDependentOnVariableField(fieldName, variableTechnicalFieldNames);

  const effectiveFields = [...group.fields];
  const hasDoorQuantityField = effectiveFields.some((field) =>
    isDoorQuantityCharacteristic(field.name)
  );
  const hasDrawerQuantityField = effectiveFields.some((field) =>
    isDrawerQuantityCharacteristic(field.name)
  );

  if (
    isPortasGroup &&
    !hasDoorQuantityField &&
    !effectiveFields.some((field) => isHasDoorsCharacteristic(field.name))
  ) {
    effectiveFields.unshift(DEFAULT_POSSUI_PORTAS);
  }
  if (
    isGavetasGroup &&
    !hasDrawerQuantityField &&
    !effectiveFields.some((field) => isHasDrawersCharacteristic(field.name))
  ) {
    effectiveFields.unshift(DEFAULT_POSSUI_GAVETAS);
  }
  if (isPesGroup && !effectiveFields.some((f) => isHasFeetCharacteristic(f.name))) {
    effectiveFields.unshift(DEFAULT_POSSUI_PES);
  }

  const displayedFields = effectiveFields.filter((field) => {
    if (isPortasGroup) {
      if (isHasDoorsCharacteristic(field.name)) return !hasDoorQuantityField;
      if (isDoorQuantityCharacteristic(field.name)) return true;
      return true;
    }
    if (isGavetasGroup) {
      if (isHasDrawersCharacteristic(field.name)) return !hasDrawerQuantityField;
      if (isDrawerQuantityCharacteristic(field.name)) return true;
      return true;
    }
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
          isVariable={isVariableField(field.name)}
          isDependencyVariable={isCharacteristicDependentOnVariableField(
            field.name,
            variableTechnicalFieldNames
          )}
          isSimpleProduct={isSimpleProduct}
          onToggleVariable={onToggleVariableField}
          onValueChange={onValueChange}
          onOpenAttributeModal={onOpenAttributeModal}
          onToggleDepthLength={onToggleDepthLength}
          onRemoveManualField={onRemoveManualField}
        />
      ))}
    </div>
  );

  const headingClassName =
    'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2';

  if (isDimensionsGroup) {
    return (
      <details aria-labelledby={`technical-group-${group.title}`} className="group flex flex-col gap-3">
        <summary id={`technical-group-${group.title}`} className={`${headingClassName} cursor-pointer`}>
          <i className="bi bi-chevron-right transition-transform group-open:rotate-90" aria-hidden="true" />
          {group.title}
        </summary>
        {fieldGrid}
      </details>
    );
  }

  if (hideHeading) {
    return <div className="flex flex-col gap-3">{fieldGrid}</div>;
  }

  return (
    <section aria-labelledby={`technical-group-${group.title}`} className="flex flex-col gap-3">
      <h4 id={`technical-group-${group.title}`} className={headingClassName}>
        {group.title}
      </h4>
      {fieldGrid}
    </section>
  );
};
