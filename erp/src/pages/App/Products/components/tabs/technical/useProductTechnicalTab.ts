import React, { useCallback, useEffect, useState } from 'react';
import type Product from '@/pages/types/product.type';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../../../services/technicalFieldService';
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
import { hasCharacteristicValue } from './technicalTabUtils';

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

  // Sub-hook: Resolução de campos aplicáveis, visibilidade e agrupamento
  const applicability = useTechnicalFieldApplicability({
    allTechnicalFields,
    formData,
    categoryName,
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

  // Sub-hook: Manipuladores de ação (mudança de valores, adição/remoção manual, toggle de dimensões)
  const actions = useTechnicalFieldActions({
    allTechnicalFields,
    manualFieldNames,
    setFormData,
    setManualFieldNames,
    setCharacteristicSearchTerm,
  });

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
        const nextVariableFields =
          nextScope === 'variation'
            ? isVariable
              ? variableFields
              : [...variableFields, fieldName]
            : variableFields.filter((name) => !isTechnicalFieldVariable(fieldName, [name]));
        const next = { ...prev, variableTechnicalFields: nextVariableFields };

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
              ...next,
              technicalValues: {
                ...(prev.technicalValues || {}),
                [fieldName]: 'Não se aplica',
              },
            };
          }
          return applyTechnicalValueChangeToProduct(next, fieldName, undefined);
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
            ? next
            : isQuantityCharacteristic(fieldName)
              ? {
                  ...next,
                  technicalValues: { ...(next.technicalValues || {}), [fieldName]: '' },
                }
              : applyTechnicalValueChangeToProduct(next, fieldName, '');
        }

        return next;
      });
    },
    [
      applicability.visibleFields,
      setFormData,
      setManualFieldNames,
    ]
  );

  const openAttributeModal = () => setIsAttributeModalOpen(true);
  const closeAttributeModal = () => {
    setIsAttributeModalOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return {
    loadingFields,
    visibleFields: applicability.visibleFields,
    fieldGroups: applicability.fieldGroups,
    requiredFieldGroups: applicability.requiredFieldGroups,
    manualFieldNames,
    characteristicSearchTerm,
    debouncedCharacteristicSearchTerm,
    normalizedSearchTerm: applicability.normalizedSearchTerm,
    normalizedDebouncedSearchTerm: applicability.normalizedDebouncedSearchTerm,
    matchingOptionalFields: applicability.matchingOptionalFields,
    matchingGroups: applicability.matchingGroups,
    isAttributeModalOpen,
    setCharacteristicSearchTerm,
    handleFieldChange: actions.handleFieldChange,
    handleTechnicalValueChange: actions.handleTechnicalValueChange,
    handleToggleVariableField,
    handleAddManualField: actions.handleAddManualField,
    handleAddGroup: actions.handleAddGroup,
    handleRemoveManualField: actions.handleRemoveManualField,
    handleToggleDepthLength: actions.handleToggleDepthLength,
    openAttributeModal,
    closeAttributeModal,
  };
};
