import React from 'react';
import type Product from '@/pages/types/product.type';
import {
  TechnicalFieldDefinition,
  CharacteristicTopicGroupDefinition,
  isQuantityCharacteristic,
  isDoorQuantityCharacteristic,
  isDrawerQuantityCharacteristic,
} from '@/pages/utils/technicalValuesService';
import {
  SYNCED_FIELDS,
  normalizeTechnicalName,
} from '../technicalTabUtils';
import {
  syncProductWithVariations,
  applyTechnicalValueChangeToProduct,
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
      const isDoorOrDrawerQuantity =
        isDoorQuantityCharacteristic(fieldName) || isDrawerQuantityCharacteristic(fieldName);
      if (
        isQuantityCharacteristic(fieldName) &&
        (value === '' || value === undefined || value === null) &&
        hasCurrentQuantity &&
        !isDoorOrDrawerQuantity
      ) return current;
      if (isQuantityCharacteristic(fieldName) && value === null && !hasCurrentQuantity) {
        return {
          ...current,
          technicalValues: {
            ...(current.technicalValues || {}),
            [fieldName]: isDoorOrDrawerQuantity ? '' : null,
          },
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
    const normalizedNames = new Set(names.map(normalizeTechnicalName));
    const booleanFields = allTechnicalFields.filter(
      (field) => field.dataType === 'boolean' && normalizedNames.has(normalizeTechnicalName(field.name))
    );
    if (booleanFields.length > 0) {
      setFormData((current) => {
        const technicalValues = { ...(current.technicalValues || {}) };
        booleanFields.forEach((field) => {
          const value = technicalValues[field.name];
          if (value === undefined || value === null || value === '') technicalValues[field.name] = null;
        });
        return { ...current, technicalValues };
      });
    }
    setCharacteristicSearchTerm('');
  };

  const handleAddGroup = (group: CharacteristicTopicGroupDefinition) => {
    const matchingGroupFields = allTechnicalFields.filter((f) =>
      group.fieldNames.some((fn) => normalizeTechnicalName(fn) === normalizeTechnicalName(f.name))
    );
    addTechnicalFieldNames(matchingGroupFields.map((f) => f.name));
  };

  const handleAddManualField = (field: TechnicalFieldDefinition) => {
    addTechnicalFieldNames([field.name]);
  };

  const handleRemoveManualField = (fieldName: string) => {
    setManualFieldNames((prev) => prev.filter((name) => name !== fieldName));
    handleTechnicalValueChange(fieldName, undefined);
  };

  return {
    handleFieldChange,
    handleTechnicalValueChange,
    handleAddGroup,
    handleAddManualField,
    handleRemoveManualField,
  };
};
