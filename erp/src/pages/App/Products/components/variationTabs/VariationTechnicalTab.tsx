import React, { useState, useMemo, useCallback } from 'react';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import type { CharacteristicGroup } from '@/pages/types/variation.type';
import {
  TechnicalFieldDefinition,
  getApplicableTechnicalFields,
  isCharacteristicDependent,
  isCharacteristicDependentOnVariableField,
  hasVariationOverride,
  isTechnicalFieldVariable,
  setVariationOverride,
  removeVariationOverride,
  resolveVariableTechnicalFieldNames,
  groupTechnicalFields,
  mergeCharacteristicGroups,
} from '@/pages/utils/technicalValuesService';
import { AttributeManagementModal } from '../modals/attributes/AttributeManagementModal';
import { VariationTechnicalDescriptionSection } from './VariationTechnicalDescriptionSection';
import { VariationTechnicalFieldGroups } from './VariationTechnicalFieldGroups';
import { getDefaultShowNameForVariationOverride } from '../../../../../../../shared-utils/productVariationAttributeDefaults';
import {
  removeProductVariationTechnicalAttribute,
  syncProductVariationTechnicalAttribute,
} from '../../../../../../../shared-utils/productVariationTechnicalAttributes';
import {
  cleanupDependentCharacteristicsOnZero,
  cleanupDependentVariationAttributesOnQuantityChange,
} from '../tabs/technical/sync/dependentCleanup';
import {
  isDresserOrWardrobeCategoryName,
  isDresserOrWardrobeRequiredCharacteristic,
  isSofaRequiredCharacteristic,
  isSofaCategoryName,
} from '../../../../../../../shared-utils/productTechnicalFieldRules';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';
import {
  normalizeSearchTerm,
  resolveVisibleVariationTechnicalFields,
} from './variationTechnicalFieldResolution';
import { buildVariationTechnicalDependencyValues } from './variationTechnicalDependencyValues';
import { useVariationTechnicalReferenceData } from './useVariationTechnicalReferenceData';
import { getSofaRequiredTechnicalFields } from '../tabs/technical/hooks/sofaTechnicalConstants';
import { getDresserOrWardrobeRequiredTechnicalFields } from '../tabs/technical/hooks/dresserTechnicalConstants';

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
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [fieldsError, setFieldsError] = useState('');
  const [groupsError, setGroupsError] = useState('');
  const parentCategoryIdsKey = JSON.stringify([...new Set(parentProduct.categoryIds ?? [])].filter(Boolean).sort());

  useVariationTechnicalReferenceData({
    initialTechnicalFields,
    parentCategoryIdsKey,
    refreshKey,
    setAllTechnicalFields,
    setCharacteristicGroups,
    setFieldsError,
    setGroupsError,
    setLoadingFields,
    setLoadingGroups,
  });
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

  // Exibe as características configuradas no produto pai para variar e preserva valores existentes.
  const combinedValues = useMemo(() => {
    return {
      ...parentNormalizedValues,
      ...variationAttributeValues,
      ...(formData?.technicalValues || {}),
    };
  }, [parentNormalizedValues, variationAttributeValues, formData?.technicalValues]);

  const dependencyValues = useMemo(
    () =>
      buildVariationTechnicalDependencyValues({
        allTechnicalFields,
        combinedValues,
        formDataTechnicalValues: formData?.technicalValues,
        variableFieldNames,
        variationAttributeValues,
      }),
    [
      allTechnicalFields,
      combinedValues,
      formData?.technicalValues,
      variableFieldNames,
      variationAttributeValues,
    ]
  );

  const isSofaCategorySelected = isSofaCategoryName(parentProduct.category || '');
  const isDresserOrWardrobeCategorySelected = isDresserOrWardrobeCategoryName(parentProduct.category || '');

  const allFieldsForCategory = useMemo(() => {
    if (!isSofaCategorySelected && !isDresserOrWardrobeCategorySelected) return allTechnicalFields;
    return [
      ...allTechnicalFields.filter((field) =>
        !(isSofaCategorySelected && isSofaRequiredCharacteristic(field.name)) &&
        !(isDresserOrWardrobeCategorySelected && isDresserOrWardrobeRequiredCharacteristic(field.name))
      ),
      ...(isSofaCategorySelected
        ? getSofaRequiredTechnicalFields(allTechnicalFields, parentProduct.categoryIds || [])
        : []),
      ...(isDresserOrWardrobeCategorySelected
        ? getDresserOrWardrobeRequiredTechnicalFields(allTechnicalFields, parentProduct.categoryIds || [])
        : []),
    ];
  }, [
    allTechnicalFields,
    isSofaCategorySelected,
    isDresserOrWardrobeCategorySelected,
    parentProduct.categoryIds,
  ]);

  // Disponibiliza definições para resolver somente os campos variáveis do produto pai.
  const fieldsWithGroupNames = useMemo(() => {
    const groupNameById = new Map(
      characteristicGroups.map((group) => [group.id, group.name] as const)
    );
    return allFieldsForCategory.map((field) => ({
      ...field,
      ...(isCatalogNeverRequiredCharacteristicName(field.name) &&
      !(isDresserOrWardrobeCategorySelected && isDresserOrWardrobeRequiredCharacteristic(field.name))
        ? { isRequired: false, isRequiredForCatalog: false }
        : {}),
      groupName: field.groupId ? groupNameById.get(field.groupId) : undefined,
    }));
  }, [allFieldsForCategory, characteristicGroups, isDresserOrWardrobeCategorySelected]);

  const applicableFields = useMemo(
    () =>
      getApplicableTechnicalFields(
        fieldsWithGroupNames,
        parentProduct.categoryIds || [],
        combinedValues,
        [],
        [parentProduct.category || '']
      ),
    [fieldsWithGroupNames, parentProduct.category, parentProduct.categoryIds, combinedValues]
  );

  const isChairCategorySelected = /(?:^|[^a-z0-9])cadeiras?(?=$|[^a-z0-9])/i.test(
    normalizeSearchTerm(parentProduct.category || '')
  );
  const visibleFields = useMemo(() => {
    return resolveVisibleVariationTechnicalFields({
      allTechnicalFields: allFieldsForCategory,
      fieldsWithGroupNames,
      applicableFields,
      isChairCategorySelected,
      isSofaCategorySelected,
      isDresserOrWardrobeCategorySelected,
      isVariableField,
      parentProduct,
      formData,
      variationAttributeValues,
      parentNormalizedValues,
      dependencyValues,
    });
  }, [
    allFieldsForCategory,
    fieldsWithGroupNames,
    characteristicGroups,
    applicableFields,
    isChairCategorySelected,
    isSofaCategorySelected,
    isDresserOrWardrobeCategorySelected,
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
      formData.technicalValues,
      parentProduct.selectedCharacteristicIds,
      parentProduct.activeCharacteristicIds,
    ]
  );

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

  const handleRemoveManualField = (fieldName: string) => {
    handleRemoveOverride(fieldName);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-350">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
          Características específicas
        </h3>
        <p className="mt-1 text-[10px] font-semibold text-slate-500">
          Esta aba exibe somente as características do produto pai configuradas para variar.
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
          <VariationTechnicalFieldGroups
            fieldGroups={fieldGroups}
            parentNormalizedValues={parentNormalizedValues}
            variationAttributeValues={variationAttributeValues}
            dependencyValues={dependencyValues}
            formDataTechnicalValues={formData.technicalValues}
            isSingleVariation={isSingleVariation}
            onSetOverride={handleSetOverride}
            onRemoveManualField={handleRemoveManualField}
            onOpenAttributeModal={() => setIsAttributeModalOpen(true)}
          />
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
