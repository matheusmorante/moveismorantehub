import React, { useEffect, useState } from 'react';
import { Product } from '../../../../../types/product.type';
import { syncVariationsWithParent } from '../../../domain/variationParentSync';
import {
  TechnicalFieldDefinition,
  getAvailableAdditionalFields,
  getApplicableTechnicalFields,
  groupTechnicalFields,
  isMattressCategory,
} from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../../../services/technicalFieldService';
import {
  SYNCED_FIELDS,
  normalizeTechnicalName,
  normalizeSearchTerm,
  parseNumericDimension,
  getToggledDepthLengthTarget,
  isOptionalFieldSelected,
  hasCharacteristicValue,
} from './technicalTabUtils';

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

  const handleFieldChange = <K extends keyof Product>(field: K, value: Product[K]) => {
    setFormData((prev) => {
      const next: Partial<Product> = { ...prev, [field]: value };
      if (SYNCED_FIELDS.has(field) && next.variations?.length) {
        next.variations = syncVariationsWithParent(next.variations, {
          description: next.description,
          width: next.width,
          height: next.height,
          depth: next.depth,
          weight: next.weight,
        });
      }
      return next;
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
        setFormData((prev) => {
          const technicalValues = { ...(prev.technicalValues || {}) };
          let changed = false;
          const isMattress = isMattressCategory(prev.categoryIds, mapped);
          mapped
            .filter((field) => {
              if (isMattress && normalizeTechnicalName(field.name) === 'altura') return false;
              const isReq =
                field.isRequired ||
                (isMattress && normalizeTechnicalName(field.name) === 'espessura do colchão');
              return isReq && field.active !== false;
            })
            .forEach((field) => {
              if (!Object.prototype.hasOwnProperty.call(technicalValues, field.name)) {
                const norm = normalizeTechnicalName(field.name);
                if (norm === 'altura' && prev.height) {
                  technicalValues[field.name] = prev.height;
                } else if (norm === 'espessura do colchão' && prev.height) {
                  technicalValues[field.name] = prev.height;
                } else if (norm === 'largura' && prev.width) {
                  technicalValues[field.name] = prev.width;
                } else if ((norm === 'profundidade' || norm === 'comprimento') && prev.depth) {
                  technicalValues[field.name] = prev.depth;
                } else {
                  technicalValues[field.name] = '';
                }
                changed = true;
              }
            });
          return changed ? { ...prev, technicalValues } : prev;
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
  // REGRA DO USUÁRIO: Características selecionadas ou preenchidas devem continuar exibidas
  // por mais que altere o campo de pesquisa na aba de características.
  const filledOrManualOptionalFields = optionalFields.filter((field) =>
    isOptionalFieldSelected(field, formData, manualFieldNames)
  );

  let displayedOptionalFields: TechnicalFieldDefinition[] = [];

  if (requiredFieldsOnly) {
    displayedOptionalFields = [];
  } else if (!normalizedSearchTerm) {
    // Quando não há pesquisa digitada, exibe todas as características aplicáveis da categoria + preenchidas
    displayedOptionalFields = optionalFields;
  } else {
    // Quando há pesquisa ativa:
    // 1. Mantém SEMPRE visíveis todos os campos preenchidos/selecionados
    const visibleMap = new Map<string, TechnicalFieldDefinition>();
    filledOrManualOptionalFields.forEach((f) => visibleMap.set(f.name, f));

    // 2. Adiciona campos opcionais aplicáveis que coincidem com o termo pesquisado
    optionalFields.forEach((f) => {
      if (normalizeSearchTerm(f.name).includes(normalizedSearchTerm)) {
        visibleMap.set(f.name, f);
      }
    });

    // 3. Adiciona características globais do catálogo que coincidem com a busca
    allTechnicalFields.forEach((f) => {
      if (!f.isRequired && normalizeSearchTerm(f.name).includes(normalizedSearchTerm)) {
        if (!visibleMap.has(f.name)) {
          visibleMap.set(f.name, f);
        }
      }
    });

    displayedOptionalFields = Array.from(visibleMap.values());
  }

  const requiredFieldNames = new Set(
    requiredFields.map((field) => normalizeTechnicalName(field.name))
  );

  const searchableOptionalFields = getAvailableAdditionalFields(allTechnicalFields, [
    ...requiredFields,
    ...displayedOptionalFields,
  ]).filter((field) => !requiredFieldNames.has(normalizeTechnicalName(field.name)));

  const matchingOptionalFields =
    !requiredFieldsOnly &&
    normalizedSearchTerm.length >= 3 &&
    normalizedSearchTerm === normalizedDebouncedSearchTerm
      ? searchableOptionalFields
          .filter((field) =>
            normalizeSearchTerm(field.name).includes(normalizedDebouncedSearchTerm)
          )
          .slice(0, 3)
      : [];

  const fieldGroups = requiredFieldsOnly
    ? requiredFieldGroups
    : [...requiredFieldGroups, ...groupTechnicalFields(displayedOptionalFields)];

  const handleTechnicalValueChange = (fieldName: string, value: unknown) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      setManualFieldNames((prev) => (prev.includes(fieldName) ? prev : [...prev, fieldName]));
    }
    setFormData((prev) => {
      const currentTech = { ...(prev.technicalValues || {}) };
      if (value === undefined || value === null) {
        delete currentTech[fieldName];
      } else {
        currentTech[fieldName] = value;
      }
      const next: Partial<Product> = {
        ...prev,
        technicalValues: currentTech,
      };
      if (/^marca$/i.test(fieldName.trim())) {
        next.brand = typeof value === 'string' ? value : String(value || '');
      }

      const norm = normalizeTechnicalName(fieldName);
      let dimensionChanged = false;
      if (norm === 'altura' || norm === 'altura total') {
        next.height = parseNumericDimension(value);
        dimensionChanged = true;
      } else if (norm === 'largura' || norm === 'largura total') {
        next.width = parseNumericDimension(value);
        dimensionChanged = true;
      } else if (
        norm === 'profundidade' ||
        norm === 'profundidade total' ||
        norm === 'comprimento' ||
        norm === 'comprimento total'
      ) {
        next.depth = parseNumericDimension(value);
        dimensionChanged = true;
      }

      if (dimensionChanged && next.variations?.length) {
        next.variations = syncVariationsWithParent(next.variations, {
          description: next.description,
          width: next.width,
          height: next.height,
          depth: next.depth,
          weight: next.weight,
        });
      }

      return next;
    });
  };

  const handleAddManualField = (field: TechnicalFieldDefinition) => {
    setManualFieldNames((prev) => Array.from(new Set([...prev, field.name])));
    handleTechnicalValueChange(field.name, '');
    setCharacteristicSearchTerm('');
  };

  const handleRemoveManualField = (fieldName: string) => {
    setManualFieldNames((prev) => prev.filter((name) => name !== fieldName));
    handleTechnicalValueChange(fieldName, undefined);
  };

  const handleToggleDepthLength = (currentField: TechnicalFieldDefinition) => {
    const target = getToggledDepthLengthTarget(currentField.name, allTechnicalFields);
    if (!target) {
      console.warn(`Campo compatível não encontrado no cadastro global de características.`);
      return;
    }

    const oldName = currentField.name;
    const actualNewName = target.name;
    const currentValue = formData.technicalValues?.[oldName];

    setFormData((prev) => {
      const tv = { ...(prev.technicalValues || {}) };
      if (currentValue !== undefined) {
        tv[actualNewName] = currentValue;
      } else {
        tv[actualNewName] = '';
      }
      delete tv[oldName];
      const next: Partial<Product> = {
        ...prev,
        technicalValues: tv,
        depth: parseNumericDimension(currentValue),
      };
      if (next.variations?.length) {
        next.variations = syncVariationsWithParent(next.variations, {
          description: next.description,
          width: next.width,
          height: next.height,
          depth: next.depth,
          weight: next.weight,
        });
      }
      return next;
    });

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
    isAttributeModalOpen,
    setCharacteristicSearchTerm,
    handleFieldChange,
    handleTechnicalValueChange,
    handleAddManualField,
    handleRemoveManualField,
    handleToggleDepthLength,
    openAttributeModal,
    closeAttributeModal,
  };
};
