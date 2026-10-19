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
  isYesNoValueActive,
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
import { extractSofaDescriptionCharacteristics } from './sofaDescriptionCharacteristics';

const SOFA_ONLY_DIMENSION_NAMES = new Set([
  'profundidade aberto',
  'profundidade fechado',
  'altura do assento ao chao',
  'altura do chao ate o assento',
]);

const SOFA_RETRACTABLE_FIELD: TechnicalFieldDefinition = {
  id: 'sofa-retractable-characteristic',
  name: 'Retrátil?',
  dataType: 'radio',
  options: [
    { id: 'nao', value: 'Não' },
    { id: 'sim', value: 'Sim' },
  ],
  isRequired: true,
  active: true,
};

const SOFA_ONLY_DIMENSION_DEFAULTS: TechnicalFieldDefinition[] = [
  {
    id: 'sofa-open-depth-characteristic',
    name: 'Profundidade aberto',
    dataType: 'measure',
    unit: 'cm',
    options: [],
    isRequired: false,
    active: true,
  },
  {
    id: 'sofa-closed-depth-characteristic',
    name: 'Profundidade fechado',
    dataType: 'measure',
    unit: 'cm',
    options: [],
    isRequired: false,
    active: true,
  },
  {
    id: 'sofa-seat-height-characteristic',
    name: 'Altura do assento ao chão',
    dataType: 'measure',
    unit: 'cm',
    options: [],
    isRequired: false,
    active: true,
  },
  {
    id: 'sofa-seat-height-alternative-characteristic',
    name: 'Altura do chão até o assento',
    dataType: 'measure',
    unit: 'cm',
    options: [],
    isRequired: false,
    active: true,
  },
];

const isRetractableCharacteristic = (name: string): boolean => {
  const normalizedName = normalizeSearchTerm(name).replace(/[?¿!.,:;]/g, '').trim();
  return ['retratil', 'possui retratil', 'e retratil'].includes(normalizedName);
};

const isOpenClosedSofaDepth = (name: string): boolean =>
  ['profundidade aberto', 'profundidade fechado'].includes(normalizeSearchTerm(name));

const isMissingTechnicalValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'number') return value <= 0;
  if (typeof value !== 'string') return false;
  const normalizedValue = normalizeSearchTerm(value);
  if (/^0+(?:[.,]0+)?$/.test(normalizedValue)) return true;
  return ['', 'nao se aplica', 'n/a', 'nao informado'].includes(normalizeSearchTerm(value));
};

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
  const isSofaCategorySelected = /(?:^|[^a-z0-9])sofas?(?=$|[^a-z0-9])/i.test(
    normalizeSearchTerm(categoryName)
  );
  const categoryTechnicalFields = allTechnicalFields.filter(
    (field) =>
      isSofaCategorySelected || !SOFA_ONLY_DIMENSION_NAMES.has(normalizeSearchTerm(field.name))
  );

  const sofaTechnicalFields = isSofaCategorySelected
    ? [
        ...categoryTechnicalFields,
        ...SOFA_ONLY_DIMENSION_DEFAULTS.filter(
          (defaultField) =>
            !categoryTechnicalFields.some(
              (field) => normalizeSearchTerm(field.name) === normalizeSearchTerm(defaultField.name)
            )
        ),
      ]
    : categoryTechnicalFields;
  const retractableField = sofaTechnicalFields.find(
    (field) => isRetractableCharacteristic(field.name) && field.active !== false
  ) || SOFA_RETRACTABLE_FIELD;

  useEffect(() => {
    if (!isSofaCategorySelected || !formData.description || allTechnicalFields.length === 0) return;

    const extractedValues = extractSofaDescriptionCharacteristics(
      formData.description,
      [...allTechnicalFields, ...SOFA_ONLY_DIMENSION_DEFAULTS, SOFA_RETRACTABLE_FIELD],
      formData.categoryIds || []
    );
    if (Object.keys(extractedValues).length === 0) return;

    setFormData((prev) => {
      let next = prev;
      Object.entries(extractedValues).forEach(([fieldName, value]) => {
        if (isMissingTechnicalValue(next.technicalValues?.[fieldName])) {
          next = applyTechnicalValueChangeToProduct(next, fieldName, value);
        }
      });
      return next;
    });
  }, [
    allTechnicalFields,
    formData.categoryIds,
    formData.description,
    isSofaCategorySelected,
    setFormData,
  ]);

  const retractableValue = Object.entries(formData.technicalValues || {}).find(([name]) =>
    isRetractableCharacteristic(name)
  )?.[1];
  const isSofaRetractableActive =
    isSofaCategorySelected && isYesNoValueActive(retractableValue);

  const applicableFieldsForCategory = getApplicableTechnicalFields(
    sofaTechnicalFields,
    formData.categoryIds || [],
    formData.technicalValues || {},
    manualFieldNames
  );

  const applicableFieldsByName = new Map<string, TechnicalFieldDefinition>(
    applicableFieldsForCategory.map(
      (field): [string, TechnicalFieldDefinition] => [normalizeSearchTerm(field.name), field]
    )
  );
  if (isSofaCategorySelected) {
    applicableFieldsByName.set(normalizeSearchTerm(retractableField.name), {
      ...retractableField,
      isRequired: true,
    });

    if (isSofaRetractableActive) {
      SOFA_ONLY_DIMENSION_DEFAULTS.filter((field) =>
        isOpenClosedSofaDepth(field.name)
      ).forEach((defaultField) => {
        const field = sofaTechnicalFields.find(
          (candidate) =>
            normalizeSearchTerm(candidate.name) === normalizeSearchTerm(defaultField.name)
        ) || defaultField;
        applicableFieldsByName.set(normalizeSearchTerm(field.name), {
          ...field,
          isRequired: true,
        });
      });
    }
  }

  const applicableFields = Array.from(applicableFieldsByName.values()).map((field) => {
    const normalizedName = normalizeSearchTerm(field.name);
    if (!isSofaCategorySelected) return field;
    if (normalizedName === 'profundidade' || normalizedName === 'profundidade total') {
      return { ...field, isRequired: false };
    }
    if (isOpenClosedSofaDepth(field.name)) {
      return { ...field, isRequired: isSofaRetractableActive };
    }
    if (isRetractableCharacteristic(field.name)) return { ...field, isRequired: true };
    return field;
  });

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
    sofaTechnicalFields,
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
