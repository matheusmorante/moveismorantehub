import React from 'react';
import type Product from '@/pages/types/product.type';
import {
  TechnicalFieldDefinition,
  CharacteristicTopicGroupDefinition,
  isQuantityCharacteristic,
  isDoorQuantityCharacteristic,
  isDoorDependentCharacteristic,
  isDrawerQuantityCharacteristic,
  isDrawerDependentCharacteristic,
  isSinkMaterialCharacteristic,
  isConcretadaCharacteristic,
  isHasInoxBowlCharacteristic,
  resolveVariableTechnicalFieldNames,
} from '@/pages/utils/technicalValuesService';
import {
  SYNCED_FIELDS,
  normalizeTechnicalName,
  getToggledDepthLengthTarget,
} from '../technicalTabUtils';
import {
  syncProductWithVariations,
  applyTechnicalValueChangeToProduct,
  applyDepthLengthToggleToProduct,
} from '../technicalSyncUtils';

export interface UseTechnicalFieldActionsParams {
  readonly allTechnicalFields: readonly TechnicalFieldDefinition[];
  readonly manualFieldNames: readonly string[];
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly setManualFieldNames: React.Dispatch<React.SetStateAction<string[]>>;
  readonly setCharacteristicSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}

export const useTechnicalFieldActions = ({
  allTechnicalFields,
  manualFieldNames,
  setFormData,
  setManualFieldNames,
  setCharacteristicSearchTerm,
}: UseTechnicalFieldActionsParams) => {
  const handleFieldChange = <K extends keyof Product>(field: K, value: Product[K]) => {
    setFormData((prev) => {
      const next: Partial<Product> = { ...prev, [field]: value };
      return SYNCED_FIELDS.has(field) ? syncProductWithVariations(next) : next;
    });
  };

  const handleTechnicalValueChange = (fieldName: string, value: unknown) => {
    setFormData((current) => {
      const currentValue = current.technicalValues?.[fieldName];
      const hasCurrentQuantity =
        currentValue !== undefined &&
        currentValue !== null &&
        String(currentValue).trim() !== '' &&
        Number.isFinite(Number(String(currentValue).replace(',', '.')));
      if (
        isQuantityCharacteristic(fieldName) &&
        (value === '' || value === undefined || value === null) &&
        hasCurrentQuantity
      ) return current;
      if (isQuantityCharacteristic(fieldName) && value === null && !hasCurrentQuantity) {
        return {
          ...current,
          technicalValues: { ...(current.technicalValues || {}), [fieldName]: null },
        };
      }
      return applyTechnicalValueChangeToProduct(current, fieldName, value);
    });
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      setManualFieldNames((prev) => (prev.includes(fieldName) ? prev : [...prev, fieldName]));
    }
  };

  const addTechnicalFieldNames = (names: string[]) => {
    if (names.length === 0) return;
    setManualFieldNames((prev) => Array.from(new Set([...prev, ...names])));
    setCharacteristicSearchTerm('');
  };

  const handleAddGroup = (group: CharacteristicTopicGroupDefinition) => {
    const matchingGroupFields = allTechnicalFields.filter((f) =>
      group.fieldNames.some((fn) => normalizeTechnicalName(fn) === normalizeTechnicalName(f.name))
    );
    addTechnicalFieldNames(matchingGroupFields.map((f) => f.name));
  };

  const handleAddManualField = (field: TechnicalFieldDefinition) => {
    const extraNames: string[] = [];
    if (isDoorDependentCharacteristic(field.name)) {
      const master = allTechnicalFields.find((f) => isDoorQuantityCharacteristic(f.name));
      if (master && !manualFieldNames.includes(master.name)) {
        extraNames.push(master.name);
      }
    } else if (isDrawerDependentCharacteristic(field.name)) {
      const master = allTechnicalFields.find((f) => isDrawerQuantityCharacteristic(f.name));
      if (master && !manualFieldNames.includes(master.name)) {
        extraNames.push(master.name);
      }
    } else if (isConcretadaCharacteristic(field.name) || isHasInoxBowlCharacteristic(field.name)) {
      const master = allTechnicalFields.find((f) => isSinkMaterialCharacteristic(f.name));
      if (master && !manualFieldNames.includes(master.name)) {
        extraNames.push(master.name);
      }
    }
    addTechnicalFieldNames(Array.from(new Set([field.name, ...extraNames])));
  };

  const handleRemoveManualField = (fieldName: string) => {
    setManualFieldNames((prev) => prev.filter((name) => name !== fieldName));
    handleTechnicalValueChange(fieldName, undefined);
  };

  const handleToggleDepthLength = (currentField: TechnicalFieldDefinition) => {
    const target = getToggledDepthLengthTarget(currentField.name, allTechnicalFields);
    if (!target) {
      console.warn('Campo compatível não encontrado no cadastro global de características.');
      return;
    }

    const oldName = currentField.name;
    const actualNewName = target.name;

    setFormData((prev) => {
      const variableFieldNames = resolveVariableTechnicalFieldNames(
        prev.variableTechnicalFields,
        prev.variations || []
      );
      const normalizedOldName = normalizeTechnicalName(oldName);
      const wasVariable = variableFieldNames.some(
        (name) => normalizeTechnicalName(name) === normalizedOldName
      );
      const toggledNames = new Set(
        [oldName, actualNewName].map(normalizeTechnicalName)
      );
      const nextVariableTechnicalFields = variableFieldNames.filter(
        (name) => !toggledNames.has(normalizeTechnicalName(name))
      );
      if (wasVariable) nextVariableTechnicalFields.push(actualNewName);

      return applyDepthLengthToggleToProduct(
        { ...prev, variableTechnicalFields: nextVariableTechnicalFields },
        oldName,
        actualNewName
      );
    });
    setManualFieldNames((prev) => {
      const filtered = prev.filter((n) => n !== oldName && n !== actualNewName);
      return [...filtered, actualNewName];
    });
  };

  return {
    handleFieldChange,
    handleTechnicalValueChange,
    handleAddGroup,
    handleAddManualField,
    handleRemoveManualField,
    handleToggleDepthLength,
  };
};
