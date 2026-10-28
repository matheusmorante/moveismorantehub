import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import type { CharacteristicGroup } from '@/pages/types/variation.type';
import {
  TechnicalFieldDefinition,
  getAvailableAdditionalFields,
  getApplicableTechnicalFields,
  getCharacteristicDependencyState,
  isCharacteristicDependent,
  isCharacteristicDependentOnVariableField,
  isQuantityCharacteristic,
  hasVariationOverride,
  isTechnicalFieldVariable,
  setVariationOverride,
  removeVariationOverride,
  resolveVariableTechnicalFieldNames,
  groupTechnicalFields,
  isDepthCharacteristic,
  mergeCharacteristicGroups,
  isChairWeightCapacityCharacteristic,
} from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '../../services/technicalFieldService';
import { fetchCharacteristicGroups } from '@/pages/utils/characteristicGroupService';
import { AttributeManagementModal } from '../modals/attributes/AttributeManagementModal';
import { VariationTechnicalFieldItem } from './VariationTechnicalFieldItem';
import { VariationTechnicalSearchControl } from './VariationTechnicalSearchControl';
import { VariationTechnicalDescriptionSection } from './VariationTechnicalDescriptionSection';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { getDefaultShowNameForVariationOverride } from '../../../../../../../shared-utils/productVariationAttributeDefaults';
import {
  removeProductVariationTechnicalAttribute,
  syncProductVariationTechnicalAttribute,
} from '../../../../../../../shared-utils/productVariationTechnicalAttributes';
import {
  isDoorQuantityCharacteristic,
  isDrawerQuantityCharacteristic,
  isHasDoorsCharacteristic,
  isHasDrawersCharacteristic,
} from '@/pages/utils/technicalValues/predicates/furniture';
import {
  cleanupDependentCharacteristicsOnZero,
  cleanupDependentVariationAttributesOnQuantityChange,
} from '../tabs/technical/sync/dependentCleanup';
import {
  isSofaCategoryName,
} from '../../../../../../../shared-utils/productTechnicalFieldRules';
import {
  getTechnicalFieldDisplayName,
  areTechnicalCharacteristicNamesEquivalent,
  isTechnicalFieldAllowedForCategories,
} from '../../../../../../../shared-utils/productTechnicalFieldScope';
import {
  evaluateCharacteristicDependencies,
  evaluateCharacteristicDependency,
  getCharacteristicDependencies,
} from '../../../../../../../shared-utils/characteristicDependencyRules';
import { resolveProductCharacteristicApplication } from '../tabs/technical/productCharacteristicGroupRules';

export interface VariationTechnicalTabProps {
  readonly formData: Variation & { readonly material?: string | null };
  readonly setFormData?: React.Dispatch<React.SetStateAction<Variation | null>>;
  readonly parentProduct: Product & { readonly attributes?: Variation['attributes'] };
  readonly handleChange: <K extends keyof Variation>(field: K, value: Variation[K]) => void;
  readonly showDescription?: boolean;
  readonly requiredFieldsOnly?: boolean;
  readonly isSingleVariation?: boolean;
  readonly showAiImprove?: boolean;
  readonly initialTechnicalFields?: TechnicalFieldDefinition[];
}

const normalizeSearchTerm = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export const VariationTechnicalTab: React.FC<VariationTechnicalTabProps> = ({
  formData,
  setFormData,
  parentProduct,
  handleChange,
  showDescription = false,
  requiredFieldsOnly = false,
  isSingleVariation = false,
  showAiImprove = false,
  initialTechnicalFields,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [allTechnicalFields, setAllTechnicalFields] = useState<TechnicalFieldDefinition[]>(
    initialTechnicalFields || []
  );
  const [characteristicGroups, setCharacteristicGroups] = useState<CharacteristicGroup[]>([]);
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [fieldsError, setFieldsError] = useState('');
  const [groupsError, setGroupsError] = useState('');
  const [characteristicSearchTerm, setCharacteristicSearchTerm] = useState('');
  const [debouncedCharacteristicSearchTerm, setDebouncedCharacteristicSearchTerm] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedCharacteristicSearchTerm(characteristicSearchTerm),
      300
    );
    return () => window.clearTimeout(timeoutId);
  }, [characteristicSearchTerm]);

  // Carregar Informações Técnicas cadastradas e vínculos
  useEffect(() => {
    let isMounted = true;

    // Se já foi fornecido inicialmente e não houve refresh forçado, usa o estado inicial
    if (initialTechnicalFields && initialTechnicalFields.length > 0 && refreshKey === 0) {
      return;
    }

    const loadFields = async () => {
      setLoadingFields(true);
      setFieldsError('');
      try {
        const mapped = await withTimeout(fetchTechnicalFieldDefinitions('variation-form', { forceRefresh: refreshKey > 0 }), 15000, null, 'variacao:caracteristicas');
        if (!isMounted) return;
        if (!mapped) throw new Error('Consulta de características não confirmada.');
        setAllTechnicalFields(mapped);
      } catch {
        if (isMounted) setFieldsError('Não foi possível carregar as características. Consulte novamente.');
      } finally {
        if (isMounted) setLoadingFields(false);
      }
    };

    loadFields();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, initialTechnicalFields]);

  useEffect(() => {
    let isMounted = true;
    setLoadingGroups(true);
    setGroupsError('');

    const loadGroups = async () => {
      try {
        const result = await withTimeout(
          fetchCharacteristicGroups(),
          15000,
          null,
          'variacao:aplicacoes-dos-grupos-de-caracteristicas'
        );
        if (!result) throw new Error('Consulta de grupos não confirmada.');
        if (isMounted) setCharacteristicGroups(result.groups);
      } catch {
        if (isMounted) {
          setCharacteristicGroups([]);
          setGroupsError('Não foi possível verificar os grupos de características. Consulte novamente.');
        }
      } finally {
        if (isMounted) setLoadingGroups(false);
      }
    };

    void loadGroups();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Características definidas na própria variação (ex: Cor, Material, Tamanho)
  const variationAttributeValues = useMemo(() => {
    const map: Record<string, any> = {};
    (formData?.attributes || []).forEach((attr) => {
      if (attr.name && attr.value !== undefined && attr.value !== '') {
        map[attr.name] = attr.value;
        map[attr.name.trim().toLowerCase()] = attr.value;
      }
    });
    return map;
  }, [formData?.attributes]);

  const parentNormalizedValues = useMemo(() => {
    const map: Record<string, any> = {};
    (parentProduct?.attributes || []).forEach((attr) => {
      if (attr.name && attr.value !== undefined && attr.value !== null && attr.value !== '') {
        map[attr.name] = attr.value;
      }
    });
    return { ...map, ...(parentProduct?.technicalValues || {}) };
  }, [parentProduct?.attributes, parentProduct?.technicalValues]);

  const variableFieldNames = useMemo(
    () =>
      resolveVariableTechnicalFieldNames(
        parentProduct.variableTechnicalFields,
        parentProduct.variations?.length ? parentProduct.variations : [formData]
      ),
    [parentProduct.variableTechnicalFields, parentProduct.variations, formData]
  );
  const isVariableField = useCallback(
    (fieldName: string) =>
      isCharacteristicDependent(fieldName)
        ? isCharacteristicDependentOnVariableField(fieldName, variableFieldNames)
        : isTechnicalFieldVariable(fieldName, variableFieldNames),
    [variableFieldNames]
  );

  // Campos visíveis na variação: categorias do pai + valores do pai + overrides da variação + características da variação + manuais
  const combinedValues = useMemo(() => {
    return {
      ...parentNormalizedValues,
      ...variationAttributeValues,
      ...(formData?.technicalValues || {}),
    };
  }, [parentNormalizedValues, variationAttributeValues, formData?.technicalValues]);

  const dependencyValues = useMemo(() => {
    const values = { ...combinedValues };

    const useVariationQuantity = (
      isQuantity: (name: string) => boolean,
      isLegacyToggle: (name: string) => boolean
    ) => {
      const quantityName = allTechnicalFields.find(
        (field) => isQuantity(field.name) && isTechnicalFieldVariable(field.name, variableFieldNames)
      )?.name;
      if (!quantityName) return;

      const ownQuantity =
        Object.entries(formData?.technicalValues || {}).find(([name]) => isQuantity(name)) ||
        Object.entries(variationAttributeValues).find(([name]) => isQuantity(name));
      Object.keys(values).forEach((name) => {
        if (isQuantity(name) || isLegacyToggle(name)) delete values[name];
      });
      if (ownQuantity) values[quantityName] = ownQuantity[1];
    };

    useVariationQuantity(isDoorQuantityCharacteristic, isHasDoorsCharacteristic);
    useVariationQuantity(isDrawerQuantityCharacteristic, isHasDrawersCharacteristic);
    return values;
  }, [
    allTechnicalFields,
    combinedValues,
    formData?.technicalValues,
    variableFieldNames,
    variationAttributeValues,
  ]);

  // Todas as especificações técnicas ativas cadastradas aparecem na variação
  const fieldsWithGroupNames = useMemo(() => {
    const groupNameById = new Map(
      characteristicGroups.map((group) => [group.id, group.name] as const)
    );
    return allTechnicalFields.map((field) => ({
      ...field,
      groupName: field.groupId ? groupNameById.get(field.groupId) : undefined,
    }));
  }, [allTechnicalFields, characteristicGroups]);

  const applicableFields = useMemo(
    () =>
      getApplicableTechnicalFields(
        fieldsWithGroupNames,
        parentProduct.categoryIds || [],
        combinedValues,
        manualFieldNames,
        [parentProduct.category || '']
      ),
    [fieldsWithGroupNames, parentProduct.category, parentProduct.categoryIds, combinedValues, manualFieldNames]
  );

  const isChairCategorySelected = /(?:^|[^a-z0-9])cadeiras?(?=$|[^a-z0-9])/i.test(
    normalizeSearchTerm(parentProduct.category || '')
  );
  const isSofaCategorySelected = isSofaCategoryName(parentProduct.category || '');

  const visibleFields = useMemo(() => {
    const fieldsByName = new Map<string, TechnicalFieldDefinition>();
    const selectedCategoryIds = new Set(parentProduct.categoryIds || []);
    const selectedFieldIds = new Set(parentProduct.selectedCharacteristicIds || []);
    const activeFieldIds = new Set(
      parentProduct.activeCharacteristicIds ?? parentProduct.selectedCharacteristicIds ?? []
    );
    const hasExplicitActiveFieldIds = Array.isArray(parentProduct.activeCharacteristicIds);
    const isRequiredInCategory = (field: TechnicalFieldDefinition) => {
      const application = resolveProductCharacteristicApplication(field, parentProduct.categoryIds || []);
      const hasCategoryApplication = field.categoryApplications?.some((item) =>
        selectedCategoryIds.has(String(item.categoryId))
      ) ?? false;
      if (hasCategoryApplication) return application === 'required';
      return application === 'required' || Boolean(
        field.isRequiredForCatalog ||
        field.requiredCategoryIds?.some((id) => selectedCategoryIds.has(String(id)))
      );
    };
    const getGroupFieldState = (field: TechnicalFieldDefinition) => {
      const application = resolveProductCharacteristicApplication(field, parentProduct.categoryIds || []);
      if (application === 'unavailable') return { visible: false, required: false };
      const required = isRequiredInCategory(field);
      const hasStoredValue =
        hasVariationOverride(parentProduct.technicalValues, field.name) ||
        (parentProduct.variations || []).some((variation) =>
          hasVariationOverride(variation.technicalValues, field.name) ||
          variation.attributes?.some((attribute) =>
            normalizeSearchTerm(attribute.name) === normalizeSearchTerm(field.name)
          )
        );

      const isInSelectedScope = isVariableField(field.name);
      const fieldSelected = required || selectedFieldIds.has(field.id) ||
        (!Array.isArray(parentProduct.selectedCharacteristicIds) && (hasStoredValue || isInSelectedScope));
      const fieldActive = required || activeFieldIds.has(field.id) ||
        (!hasExplicitActiveFieldIds && (hasStoredValue || isInSelectedScope));
      return {
        visible: fieldSelected && fieldActive && (field.active !== false || hasStoredValue || isInSelectedScope),
        required,
      };
    };

    const readValue = (values: Record<string, unknown> | undefined, name: string) =>
      Object.entries(values || {}).find(([candidate]) =>
        areTechnicalCharacteristicNamesEquivalent(candidate, name)
      )?.[1];
    const readVariationValue = (name: string) => {
      const technicalEntry = Object.entries(formData.technicalValues || {}).find(([candidate]) =>
        areTechnicalCharacteristicNamesEquivalent(candidate, name)
      );
      return technicalEntry
        ? technicalEntry[1]
        : readValue(variationAttributeValues, name);
    };
    const isDependencySatisfied = (
      field: TechnicalFieldDefinition,
      visited = new Set<string>()
    ): boolean => {
      if (visited.has(field.id)) return false;
      const nextVisited = new Set(visited).add(field.id);
      if (field.dependency) {
        return evaluateCharacteristicDependencies(
          getCharacteristicDependencies(field),
          field.dependencyLogic,
          (dependency) => {
            const reference = allTechnicalFields.find((candidate) => candidate.id === dependency.referenceAttributeId);
            if (!reference || !getGroupFieldState(reference).visible || !isDependencySatisfied(reference, nextVisited)) return false;
            const referenceValue = isVariableField(reference.name)
              ? readVariationValue(reference.name)
              : readValue(parentNormalizedValues, reference.name);
            return evaluateCharacteristicDependency(dependency, reference.dataType, referenceValue);
          }
        );
      }

      const legacyDependency = getCharacteristicDependencyState(field.name, dependencyValues);
      return !legacyDependency.isDependent || !legacyDependency.isDisabled;
    };

    [...applicableFields, ...fieldsWithGroupNames].forEach((field) => {
      if (!isTechnicalFieldAllowedForCategories(
        field.name,
        [parentProduct.category || ''],
        field.categoryApplications,
        parentProduct.categoryIds || []
      )) {
        return;
      }
      const groupState = getGroupFieldState(field);
      if (!groupState.visible) return;
      if (!isDependencySatisfied(field)) return;
      if (
        isChairWeightCapacityCharacteristic(field.name) &&
        !isChairCategorySelected &&
        !field.categoryIds?.some((id) => selectedCategoryIds.has(id))
      ) {
        return;
      }
      if (!isVariableField(field.name)) return;
      const key = normalizeSearchTerm(field.name);
      if (!fieldsByName.has(key)) {
        const visibleField =
          isSofaCategorySelected && isDepthCharacteristic(field.name)
            ? { ...field, isRequired: false, isRequiredForCatalog: false }
            : field;
        const requiredField = groupState.required
          ? { ...visibleField, isRequired: true }
          : visibleField;
        fieldsByName.set(
          key,
          requiredField
        );
      }
    });
    return [...fieldsByName.values()];
  }, [
    allTechnicalFields,
    fieldsWithGroupNames,
    characteristicGroups,
    applicableFields,
    isChairCategorySelected,
    isSofaCategorySelected,
    isVariableField,
    parentProduct.category,
    parentProduct.categoryIds,
    parentProduct.selectedCharacteristicIds,
    parentProduct.activeCharacteristicIds,
    parentProduct.technicalValues,
    parentProduct.variations,
    formData.technicalValues,
    variationAttributeValues,
    parentNormalizedValues,
    dependencyValues,
  ]);

  const requiredFields = useMemo(
    () => visibleFields.filter((field) => field.isRequired || field.isRequiredForCatalog),
    [visibleFields]
  );

  const requiredFieldGroups = useMemo(
    () => groupTechnicalFields(requiredFields),
    [requiredFields]
  );

  const optionalFields = useMemo(
    () => visibleFields.filter((field) => !field.isRequired && !field.isRequiredForCatalog),
    [visibleFields]
  );

  const isOptionalFieldSelected = (field: TechnicalFieldDefinition) => {
    const normalizedFieldName = field.name.trim().toLowerCase();
    const hasAttributeValue =
      variationAttributeValues[field.name] !== undefined ||
      variationAttributeValues[normalizedFieldName] !== undefined;
    const parentValue = parentNormalizedValues[field.name];
    const hasSelectedParentValue =
      Object.prototype.hasOwnProperty.call(parentNormalizedValues, field.name) &&
      !['não se aplica', 'n/a'].includes(normalizeSearchTerm(String(parentValue ?? '')));
    return (
      manualFieldNames.includes(field.name) ||
      hasVariationOverride(formData.technicalValues, field.name) ||
      hasAttributeValue ||
      hasSelectedParentValue ||
      isCharacteristicDependent(field.name)
    );
  };

  const selectedOptionalFields = useMemo(
    () => {
      const selectedFieldIds = new Set(parentProduct.selectedCharacteristicIds || []);
      const activeFieldIds = new Set(
        parentProduct.activeCharacteristicIds ?? parentProduct.selectedCharacteristicIds ?? []
      );
      return optionalFields.filter((field) =>
        (selectedFieldIds.has(field.id) && activeFieldIds.has(field.id)) ||
        isOptionalFieldSelected(field)
      );
    },
    [
      optionalFields,
      variationAttributeValues,
      parentNormalizedValues,
      manualFieldNames,
      formData.technicalValues,
      parentProduct.selectedCharacteristicIds,
      parentProduct.activeCharacteristicIds,
    ]
  );

  const requiredFieldNames = useMemo(
    () => new Set(requiredFields.map((field) => normalizeSearchTerm(field.name))),
    [requiredFields]
  );

  const searchableOptionalFields = useMemo(
    () =>
      getAvailableAdditionalFields(allTechnicalFields, [
        ...requiredFields,
        ...selectedOptionalFields,
      ], [parentProduct.category || ''], parentProduct.categoryIds || []).filter(
        (field) =>
          !field.groupId &&
          !requiredFieldNames.has(normalizeSearchTerm(field.name)) &&
          isVariableField(field.name)
      ),
    [
      allTechnicalFields,
      parentProduct.category,
      parentProduct.categoryIds,
      requiredFields,
      selectedOptionalFields,
      requiredFieldNames,
      isVariableField,
    ]
  );

  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);

  const matchingOptionalFields = useMemo(() => {
    if (
      requiredFieldsOnly ||
      normalizedSearchTerm.length < 3 ||
      normalizedSearchTerm !== normalizedDebouncedSearchTerm
    ) {
      return [];
    }
    return searchableOptionalFields
      .filter((field) =>
        normalizeSearchTerm(getTechnicalFieldDisplayName(field.name)).includes(
          normalizedDebouncedSearchTerm
        )
      )
      .slice(0, 3);
  }, [requiredFieldsOnly, normalizedSearchTerm, normalizedDebouncedSearchTerm, searchableOptionalFields]);

  const fieldGroups = useMemo(
    () =>
      mergeCharacteristicGroups([
        ...requiredFieldGroups,
        ...groupTechnicalFields(selectedOptionalFields),
      ]),
    [requiredFieldGroups, selectedOptionalFields]
  );


  const handleSetOverride = (fieldName: string, value: any) => {
    const currentOverrides = formData.technicalValues || {};
    const updated = cleanupDependentCharacteristicsOnZero(
      setVariationOverride(currentOverrides, fieldName, value),
      fieldName,
      value
    );
    handleChange('technicalValues', updated);

    // Manter sincronizado com formData.attributes para retrocompatibilidade
    const currentAttrs = cleanupDependentVariationAttributesOnQuantityChange(
      formData.attributes || [],
      fieldName,
      value
    );
    handleChange(
      'attributes',
      syncProductVariationTechnicalAttribute(
        currentAttrs,
        fieldName,
        value,
        getDefaultShowNameForVariationOverride(fieldName)
      )
    );
  };

  const handleRemoveOverride = (fieldName: string) => {
    const currentOverrides = formData.technicalValues || {};
    const updated = removeVariationOverride(currentOverrides, fieldName);
    handleChange('technicalValues', updated);

    // Ao remover override e voltar a herdar, limpa também a característica correspondente se existir
    const currentAttrs = removeProductVariationTechnicalAttribute(
      formData.attributes || [],
      fieldName
    );
    handleChange('attributes', currentAttrs);
  };

  const handleAddManualField = (field: TechnicalFieldDefinition) => {
    setManualFieldNames((prev) => Array.from(new Set([...prev, field.name])));
    handleSetOverride(field.name, isQuantityCharacteristic(field.name) ? null : '');
    setCharacteristicSearchTerm('');
  };

  const handleRemoveManualField = (fieldName: string) => {
    setManualFieldNames((prev) => prev.filter((name) => name !== fieldName));
    handleRemoveOverride(fieldName);
  };

  const searchControl = !requiredFieldsOnly ? (
    <VariationTechnicalSearchControl
      searchTerm={characteristicSearchTerm}
      debouncedSearchTerm={debouncedCharacteristicSearchTerm}
      matchingFields={matchingOptionalFields}
      onSearchTermChange={setCharacteristicSearchTerm}
      onAddField={handleAddManualField}
    />
  ) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-350">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
          Características específicas
        </h3>
        <p className="mt-1 text-[10px] font-semibold text-slate-500">
          Os campos fixos vêm do produto pai; esta aba mostra somente os campos variáveis.
        </p>
      </div>
      {(fieldsError || groupsError) && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{fieldsError || groupsError} <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingFields || loadingGroups}>Consultar características novamente</button></p>}
      <div className="flex flex-col gap-4">
        {loadingFields || loadingGroups ? (
          <div role="status" className="py-6 text-center text-slate-400 text-xs font-bold animate-pulse">
            <i className="bi bi-arrow-clockwise animate-spin mr-2" />
            Carregando especificações técnicas...
          </div>
        ) : requiredFieldsOnly && visibleFields.length === 0 && !fieldsError ? (
          <div className="py-6 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            Nenhuma característica cadastrada.
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-1">
            {fieldGroups.map((group, index) => (
              <React.Fragment key={group.title}>
                {index === requiredFieldGroups.length && searchControl}
                <section
                  aria-labelledby={`variation-technical-group-${group.title}`}
                  className="flex flex-col gap-3"
                >
                  <h4
                    id={`variation-technical-group-${group.title}`}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2"
                  >
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {group.fields.map((field) => (
                      <VariationTechnicalFieldItem
                        key={field.id}
                        field={field}
                        parentNormalizedValues={parentNormalizedValues}
                        variationAttributeValues={variationAttributeValues}
                        dependencyValues={dependencyValues}
                        formDataTechnicalValues={formData.technicalValues}
                        isManual={manualFieldNames.includes(field.name)}
                        isVariable
                        isSingleVariation={isSingleVariation}
                        onSetOverride={handleSetOverride}
                        onRemoveManualField={handleRemoveManualField}
                        onOpenAttributeModal={() => setIsAttributeModalOpen(true)}
                      />
                    ))}
                  </div>
                </section>
              </React.Fragment>
            ))}
            {fieldGroups.length === requiredFieldGroups.length && searchControl}
          </div>
        )}
      </div>

      {showDescription && (
        <VariationTechnicalDescriptionSection
          formData={formData}
          parentProduct={parentProduct}
          handleChange={handleChange}
          isSingleVariation={isSingleVariation}
          showAiImprove={showAiImprove}
          parentNormalizedValues={parentNormalizedValues}
        />
      )}

      <AttributeManagementModal
        isOpen={isAttributeModalOpen}
        focusAttributeName="Cor"
        onClose={() => {
          setIsAttributeModalOpen(false);
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
};
