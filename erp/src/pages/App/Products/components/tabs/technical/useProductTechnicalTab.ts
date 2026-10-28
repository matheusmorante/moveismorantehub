import React, { useCallback, useEffect, useState } from 'react';
import type Product from '@/pages/types/product.type';
import type { CharacteristicGroup as PersistedCharacteristicGroup } from '@/pages/types/variation.type';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../../../services/technicalFieldService';
import { fetchCharacteristicGroups } from '@/pages/utils/characteristicGroupService';
import {
  getSavedCharacteristicIds,
} from './productCharacteristicGroupRules';
import { populateInitialTechnicalValues } from './technicalSyncUtils';
import { useSofaDescriptionSync } from './hooks/useSofaDescriptionSync';
import { useTechnicalFieldApplicability } from './hooks/useTechnicalFieldApplicability';
import { useTechnicalFieldActions } from './hooks/useTechnicalFieldActions';
import {
  getCharacteristicDependencyState,
  isQuantityCharacteristic,
  isTechnicalFieldVariable,
  resolveVariableTechnicalFieldNames,
} from '@/pages/utils/technicalValuesService';
import { applyTechnicalValueChangeToProduct } from './technicalSyncUtils';
import { getCharacteristicDependencies } from '../../../../../../../../shared-utils/characteristicDependencyRules';
import {
  hasCharacteristicValue,
  normalizeTechnicalName,
} from './technicalTabUtils';

export interface UseProductTechnicalTabParams {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly categoryName?: string;
  readonly requiredFieldsOnly?: boolean;
}

export const useProductTechnicalTab = ({
  formData,
  setFormData,
  categoryName = '',
  requiredFieldsOnly = false,
}: UseProductTechnicalTabParams) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [allTechnicalFields, setAllTechnicalFields] = useState<TechnicalFieldDefinition[]>([]);
  const [characteristicGroups, setCharacteristicGroups] = useState<PersistedCharacteristicGroup[]>([]);
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [characteristicSearchTerm, setCharacteristicSearchTerm] = useState('');
  const [debouncedCharacteristicSearchTerm, setDebouncedCharacteristicSearchTerm] = useState('');

  // Debounce do termo de pesquisa de características
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
        const [mapped, groupData] = await Promise.all([
          fetchTechnicalFieldDefinitions('product-form'),
          fetchCharacteristicGroups(),
        ]);
        if (!isMounted) return;

        const fieldsWithGroupNames = mapped.map((field) => ({
          ...field,
          groupName: groupData.groups.find((group) => group.id === field.groupId)?.name,
        }));
        setCharacteristicGroups(groupData.groups);
        setAllTechnicalFields(fieldsWithGroupNames);
        setFormData((prev) => {
          const populated = populateInitialTechnicalValues(prev, fieldsWithGroupNames);
          const inferredCharacteristicIds = getSavedCharacteristicIds(fieldsWithGroupNames, populated);
          return {
            ...populated,
            selectedCharacteristicIds:
              populated.selectedCharacteristicIds ?? inferredCharacteristicIds,
            activeCharacteristicIds:
              populated.activeCharacteristicIds ?? populated.selectedCharacteristicIds ?? inferredCharacteristicIds,
          };
        });
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

  // Sub-hook: Resolução de campos aplicáveis, visibilidade e agrupamento
  const applicability = useTechnicalFieldApplicability({
    allTechnicalFields,
    characteristicGroups,
    formData,
    categoryName,
    selectedCharacteristicIds: formData.selectedCharacteristicIds,
    activeCharacteristicIds: formData.activeCharacteristicIds,
    manualFieldNames,
    requiredFieldsOnly,
    characteristicSearchTerm,
    debouncedCharacteristicSearchTerm,
  });

  // Sub-hook: Sincronização inteligente de características a partir da descrição de sofás
  useSofaDescriptionSync({
    formData,
    setFormData,
    isSofaCategorySelected: applicability.isSofaCategorySelected,
    allTechnicalFields,
  });

  // Sub-hook: Manipuladores de valor e adição/remoção manual de características.
  const actions = useTechnicalFieldActions({
    allTechnicalFields,
    manualFieldNames,
    setFormData,
    setManualFieldNames,
    setCharacteristicSearchTerm,
  });

  const handleAddCharacteristicGroup = useCallback(
    (groupId: string, characteristicName?: string) => {
      if (!characteristicName) return;
      const groupFields = applicability.sofaTechnicalFields.filter(
        (field) => field.groupId === groupId && field.active !== false
      );
      const selectedFields = new Map<string, TechnicalFieldDefinition>();
      const visit = (field: TechnicalFieldDefinition) => {
        if (selectedFields.has(field.id)) return;
        selectedFields.set(field.id, field);
        const references = getCharacteristicDependencies(field).map((dependency) =>
          applicability.sofaTechnicalFields.find((candidate) => candidate.id === dependency.referenceAttributeId)
        ).filter((candidate): candidate is TechnicalFieldDefinition => Boolean(candidate));
        const reference = references.find((candidate) => candidate.isRequired ||
          (formData.activeCharacteristicIds ?? formData.selectedCharacteristicIds ?? []).includes(candidate.id)) ?? references[0];
        if (reference) visit(reference);
      };
      groupFields
        .filter((field) => !characteristicName || field.name === characteristicName)
        .forEach(visit);

      setFormData((prev) => {
        const selectedCharacteristicIds = new Set(prev.selectedCharacteristicIds || []);
        const activeCharacteristicIds = new Set(prev.activeCharacteristicIds ?? prev.selectedCharacteristicIds ?? []);
        const technicalValues = { ...(prev.technicalValues || {}) };
        for (const field of selectedFields.values()) {
          selectedCharacteristicIds.add(field.id);
          activeCharacteristicIds.add(field.id);
          if (!Object.prototype.hasOwnProperty.call(technicalValues, field.name)) {
            technicalValues[field.name] = field.dataType === 'boolean' ? null : '';
          }
        }
        return {
          ...prev,
          selectedCharacteristicIds: Array.from(selectedCharacteristicIds),
          activeCharacteristicIds: Array.from(activeCharacteristicIds),
          technicalValues,
        };
      });
      setCharacteristicSearchTerm('');
    },
    [applicability.sofaTechnicalFields, formData.activeCharacteristicIds, formData.selectedCharacteristicIds, setFormData]
  );

  const handleToggleCharacteristic = useCallback(
    (field: TechnicalFieldDefinition) => {
      if (field.characteristicToggleDisabled) return;
      setFormData((prev) => {
        const selectedIds = new Set(prev.selectedCharacteristicIds || []);
        const activeIds = new Set(prev.activeCharacteristicIds ?? prev.selectedCharacteristicIds ?? []);
        const technicalValues = { ...(prev.technicalValues || {}) };
        const isActive = activeIds.has(field.id);
        if (isActive) {
          selectedIds.delete(field.id);
          activeIds.delete(field.id);
        } else {
          selectedIds.add(field.id);
          activeIds.add(field.id);
          if (
            field.dataType === 'boolean' &&
            (technicalValues[field.name] === undefined || technicalValues[field.name] === null || technicalValues[field.name] === '')
          ) {
            technicalValues[field.name] = null;
          }
        }
        return {
          ...prev,
          selectedCharacteristicIds: Array.from(selectedIds),
          activeCharacteristicIds: Array.from(activeIds),
          technicalValues,
        };
      });
    },
    [setFormData]
  );

  const handleAddCharacteristicFromSearch = useCallback(
    (field: TechnicalFieldDefinition) => {
      if (!field.groupId && !field.dependency) {
        actions.handleAddManualField(field);
        return;
      }

      const selectedFields = new Map<string, TechnicalFieldDefinition>();
      const visit = (candidate: TechnicalFieldDefinition) => {
        if (selectedFields.has(candidate.id)) return;
        selectedFields.set(candidate.id, candidate);
        const references = getCharacteristicDependencies(candidate).map((dependency) =>
          applicability.sofaTechnicalFields.find((item) => item.id === dependency.referenceAttributeId)
        ).filter((item): item is TechnicalFieldDefinition => Boolean(item));
        const reference = references.find((item) => item.isRequired ||
          (formData.activeCharacteristicIds ?? formData.selectedCharacteristicIds ?? []).includes(item.id)) ?? references[0];
        if (reference) visit(reference);
      };
      visit(field);

      setFormData((prev) => {
        const selectedCharacteristicIds = new Set(prev.selectedCharacteristicIds || []);
        const activeCharacteristicIds = new Set(prev.activeCharacteristicIds ?? prev.selectedCharacteristicIds ?? []);
        const technicalValues = { ...(prev.technicalValues || {}) };
        for (const selected of selectedFields.values()) {
          selectedCharacteristicIds.add(selected.id);
          activeCharacteristicIds.add(selected.id);
          if (!Object.prototype.hasOwnProperty.call(technicalValues, selected.name)) {
            technicalValues[selected.name] = selected.dataType === 'boolean' ? null : '';
          }
        }
        return {
          ...prev,
          selectedCharacteristicIds: Array.from(selectedCharacteristicIds),
          activeCharacteristicIds: Array.from(activeCharacteristicIds),
          technicalValues,
        };
      });
      const legacyDependencyNames = Array.from(selectedFields.values())
        .filter((selected) => !selected.groupId)
        .map((selected) => selected.name);
      if (legacyDependencyNames.length > 0) {
        setManualFieldNames((previous) => Array.from(new Set([...previous, ...legacyDependencyNames])));
      }
      setCharacteristicSearchTerm('');
    },
    [
      actions,
      applicability.sofaTechnicalFields,
      formData.activeCharacteristicIds,
      formData.selectedCharacteristicIds,
      setFormData,
      setManualFieldNames,
      setCharacteristicSearchTerm,
    ]
  );

  const handleToggleVariableField = useCallback(
    (
      fieldName: string,
      scope?: 'not_inform' | 'global' | 'variation'
    ) => {
      if (scope === 'not_inform') {
        setManualFieldNames((prev) =>
          prev.filter(
            (name) =>
              name.trim().toLocaleLowerCase('pt-BR') !==
              fieldName.trim().toLocaleLowerCase('pt-BR')
          )
        );
      }

      setFormData((prev) => {
        const applicableField = applicability.visibleFields.find(
          (field) => field.name.trim().toLocaleLowerCase('pt-BR') === fieldName.trim().toLocaleLowerCase('pt-BR')
        );
        const isRequiredForCatalog = Boolean(applicableField?.isRequiredForCatalog);
        if (scope === 'not_inform' && (isRequiredForCatalog || applicableField?.isRequired)) return prev;

        const variableFields = resolveVariableTechnicalFieldNames(
          prev.variableTechnicalFields,
          prev.variations || []
        );
        const isVariable = isTechnicalFieldVariable(fieldName, variableFields);
        const nextScope = scope || (isVariable ? 'global' : 'variation');
        const nextVariableFields = nextScope === 'variation'
          ? isVariable
            ? variableFields
            : [...variableFields, fieldName]
          : variableFields.filter((name) => !isTechnicalFieldVariable(fieldName, [name]));
        const next = { ...prev, variableTechnicalFields: nextVariableFields };
        const selectedCharacteristicIds = new Set(prev.selectedCharacteristicIds || []);
        const activeCharacteristicIds = new Set(
          prev.activeCharacteristicIds ?? prev.selectedCharacteristicIds ?? []
        );
        const characteristic = allTechnicalFields.find((field) =>
          field.name.trim().toLocaleLowerCase('pt-BR') ===
          fieldName.trim().toLocaleLowerCase('pt-BR')
        );
        if (characteristic) {
          if (nextScope === 'not_inform') {
            selectedCharacteristicIds.delete(characteristic.id);
            activeCharacteristicIds.delete(characteristic.id);
          } else {
            selectedCharacteristicIds.add(characteristic.id);
            activeCharacteristicIds.add(characteristic.id);
          }
        }
        const nextWithCharacteristicState = characteristic
          ? {
              ...next,
              selectedCharacteristicIds: Array.from(selectedCharacteristicIds),
              activeCharacteristicIds: Array.from(activeCharacteristicIds),
            }
          : next;

        if (nextScope === 'not_inform') {
          const isRequired = Boolean(isRequiredForCatalog || applicableField?.isRequired);
          const dependency = getCharacteristicDependencyState(
            fieldName,
            prev.technicalValues || {}
          );
          if (
            !isRequired &&
            dependency.isDependent &&
            !dependency.isDisabled
          ) {
            return {
              ...nextWithCharacteristicState,
              technicalValues: {
                ...(prev.technicalValues || {}),
                [fieldName]: 'Não se aplica',
              },
            };
          }
          return applyTechnicalValueChangeToProduct(nextWithCharacteristicState, fieldName, 'Não informar');
        }

        if (nextScope === 'global') {
          const storedValue = prev.technicalValues?.[fieldName];
          const storedValueIsNotApplicable = [
            'não se aplica',
            'nao se aplica',
            'n/a',
            'não informar',
          ].includes(String(storedValue ?? '').trim().toLocaleLowerCase('pt-BR'));
          const hasConfiguredValue =
            (!storedValueIsNotApplicable && storedValue !== undefined && storedValue !== null) ||
            hasCharacteristicValue(
              { id: `scope-${fieldName}`, name: fieldName, dataType: 'text', options: [] },
              prev
            );
          return hasConfiguredValue
            ? nextWithCharacteristicState
            : isQuantityCharacteristic(fieldName)
              ? {
                  ...nextWithCharacteristicState,
                  technicalValues: { ...(next.technicalValues || {}), [fieldName]: '' },
                }
                : applyTechnicalValueChangeToProduct(
                    nextWithCharacteristicState,
                    fieldName,
                    applicableField?.dataType === 'boolean' ? null : ''
                  );
        }

        return nextWithCharacteristicState;
      });
    },
    [
      allTechnicalFields,
      applicability.visibleFields,
      setFormData,
      setManualFieldNames,
    ]
  );

  const handleSetCharacteristicScope = useCallback(
    (field: TechnicalFieldDefinition, scope: 'not_inform' | 'global' | 'variation') => {
      if (scope === 'not_inform') {
        handleToggleVariableField(field.name, scope);
        return;
      }

      if (field.groupId) handleAddCharacteristicGroup(field.groupId, field.name);
      else actions.handleAddManualField(field);
      handleToggleVariableField(field.name, scope);
    },
    [actions, handleAddCharacteristicGroup, handleToggleVariableField]
  );

  const openAttributeModal = () => setIsAttributeModalOpen(true);
  const closeAttributeModal = () => {
    setIsAttributeModalOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return {
    loadingFields,
    visibleFields: applicability.visibleFields,
    displayedOptionalFields: applicability.displayedOptionalFields,
    fieldGroups: applicability.fieldGroups,
    requiredFieldGroups: applicability.requiredFieldGroups,
    manualFieldNames,
    characteristicSearchTerm,
    debouncedCharacteristicSearchTerm,
    normalizedSearchTerm: applicability.normalizedSearchTerm,
    normalizedDebouncedSearchTerm: applicability.normalizedDebouncedSearchTerm,
    matchingOptionalFields: applicability.matchingOptionalFields,
    matchingGroups: applicability.matchingGroups,
    productGroupSections: applicability.productGroupSections,
    matchingProductGroups: applicability.matchingProductGroups,
    matchingProductGroupFields: applicability.matchingProductGroupFields,
    characteristicGroups,
    isAttributeModalOpen,
    setCharacteristicSearchTerm,
    handleFieldChange: actions.handleFieldChange,
    handleTechnicalValueChange: actions.handleTechnicalValueChange,
    handleToggleVariableField,
    handleAddManualField: actions.handleAddManualField,
    handleAddGroup: actions.handleAddGroup,
    handleAddCharacteristicGroup,
    handleToggleCharacteristic,
    handleSetCharacteristicScope,
    handleAddCharacteristicFromSearch,
    handleRemoveManualField: actions.handleRemoveManualField,
    openAttributeModal,
    closeAttributeModal,
  };
};
