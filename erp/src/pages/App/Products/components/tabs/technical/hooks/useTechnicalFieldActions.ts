import React from 'react';
import { Product } from '@/types/product.type';
import {
  TechnicalFieldDefinition,
  CharacteristicTopicGroupDefinition,
  isDoorQuantityCharacteristic,
  isDoorDependentCharacteristic,
  isDrawerQuantityCharacteristic,
  isDrawerDependentCharacteristic,
  isSinkMaterialCharacteristic,
  isConcretadaCharacteristic,
  isHasInoxBowlCharacteristic,
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
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      setManualFieldNames((prev) => (prev.includes(fieldName) ? prev : [...prev, fieldName]));
    }
    setFormData((prev) => applyTechnicalValueChangeToProduct(prev, fieldName, value));
  };

  const addTechnicalFieldNames = (names: string[]) => {
    if (names.length === 0) return;
    setManualFieldNames((prev) => Array.from(new Set([...prev, ...names])));
    setFormData((prev) => {
      const currentTech = { ...(prev.technicalValues || {}) };
      names.forEach((name) => {
        if (!Object.prototype.hasOwnProperty.call(currentTech, name)) {
          currentTech[name] = '';
        }
      });
      return { ...prev, technicalValues: currentTech };
    });
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

    setFormData((prev) => applyDepthLengthToggleToProduct(prev, oldName, actualNewName));
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
