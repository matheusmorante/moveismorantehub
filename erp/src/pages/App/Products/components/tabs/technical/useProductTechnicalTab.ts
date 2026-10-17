import React, { useEffect, useState } from 'react';
import { Product } from '../../../../../types/product.type';
import {
  TechnicalFieldDefinition,
  getApplicableTechnicalFields,
  groupTechnicalFields,
  mergeCharacteristicGroups,
  CharacteristicTopicGroupDefinition,
  isDoorQuantityCharacteristic,
  isDoorDependentCharacteristic,
  isDrawerQuantityCharacteristic,
  isDrawerDependentCharacteristic,
} from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../../../services/technicalFieldService';
import {
  SYNCED_FIELDS,
  normalizeTechnicalName,
  normalizeSearchTerm,
  getToggledDepthLengthTarget,
  isOptionalFieldSelected,
} from './technicalTabUtils';
import {
  syncProductWithVariations,
  applyTechnicalValueChangeToProduct,
  applyDepthLengthToggleToProduct,
  populateInitialTechnicalValues,
} from './technicalSyncUtils';
import {
  getDisplayedOptionalFields,
  getMatchingOptionalFields,
  getMatchingTopicGroups,
} from './technicalSearchUtils';

export interface UseProductTechnicalTabParams {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly requiredFieldsOnly?: boolean;
}

export const useProductTechnicalTab = ({
  formData,
  setFormData,
  requiredFieldsOnly = false,
}: UseProductTechnicalTabParams) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [allTechnicalFields, setAllTechnicalFields] = useState<TechnicalFieldDefinition[]>([]);
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [characteristicSearchTerm, setCharacteristicSearchTerm] = useState('');
  const [debouncedCharacteristicSearchTerm, setDebouncedCharacteristicSearchTerm] = useState('');

  // Sincroniza campos canônicos gerais (ex: descrição) com as variações
  const handleFieldChange = <K extends keyof Product>(field: K, value: Product[K]) => {
    setFormData((prev) => {
      const next: Partial<Product> = { ...prev, [field]: value };
      return SYNCED_FIELDS.has(field) ? syncProductWithVariations(next) : next;
    });
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedCharacteristicSearchTerm(characteristicSearchTerm),
      300
    );
    return () => window.clearTimeout(timeoutId);
  }, [characteristicSearchTerm]);

  // Carregar Informações Técnicas cadastradas e seus vínculos de categoria
  useEffect(() => {
    let isMounted = true;

    const loadFields = async () => {
      setLoadingFields(true);
      try {
        const mapped = await fetchTechnicalFieldDefinitions('product-form');
        if (!isMounted) return;

        setAllTechnicalFields(mapped);
        setFormData((prev) => populateInitialTechnicalValues(prev, mapped));
      } catch (err) {
        console.error('Erro ao carregar Características:', err);
      } finally {
        if (isMounted) setLoadingFields(false);
      }
    };

    loadFields();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, setFormData]);

  // Exibe características vinculadas às categorias selecionadas, preservando dados existentes.
  const applicableFields = getApplicableTechnicalFields(
    allTechnicalFields,
    formData.categoryIds || [],
    formData.technicalValues || {},
    manualFieldNames
  );

  const visibleFields = requiredFieldsOnly
    ? applicableFields.filter((field) => field.isRequired)
    : applicableFields;

  const requiredFields = visibleFields.filter((field) => field.isRequired);
  const requiredFieldGroups = groupTechnicalFields(requiredFields);
  const optionalFields = visibleFields.filter((field) => !field.isRequired);

  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);

  // Características selecionadas ou preenchidas pelo usuário (ou adicionadas manualmente)
  const filledOrManualOptionalFields = optionalFields.filter((field) =>
    isOptionalFieldSelected(field, formData, manualFieldNames)
  );

  const displayedOptionalFields = getDisplayedOptionalFields({
    requiredFieldsOnly,
    optionalFields,
    allTechnicalFields,
    filledOrManualOptionalFields,
    normalizedSearchTerm,
  });

  const matchingOptionalFields = getMatchingOptionalFields(
    allTechnicalFields,
    requiredFields,
    displayedOptionalFields,
    requiredFieldsOnly,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm
  );

  const matchingGroups = getMatchingTopicGroups(
    requiredFieldsOnly,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm
  );

  const fieldGroups = requiredFieldsOnly
    ? requiredFieldGroups
    : mergeCharacteristicGroups([
        ...requiredFieldGroups,
        ...groupTechnicalFields(displayedOptionalFields),
      ]);

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

  const openAttributeModal = () => setIsAttributeModalOpen(true);
  const closeAttributeModal = () => {
    setIsAttributeModalOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return {
    loadingFields,
    visibleFields,
    fieldGroups,
    requiredFieldGroups,
    manualFieldNames,
    characteristicSearchTerm,
    debouncedCharacteristicSearchTerm,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm,
    matchingOptionalFields,
    matchingGroups,
    isAttributeModalOpen,
    setCharacteristicSearchTerm,
    handleFieldChange,
    handleTechnicalValueChange,
    handleAddManualField,
    handleAddGroup,
    handleRemoveManualField,
    handleToggleDepthLength,
    openAttributeModal,
    closeAttributeModal,
  };
};
