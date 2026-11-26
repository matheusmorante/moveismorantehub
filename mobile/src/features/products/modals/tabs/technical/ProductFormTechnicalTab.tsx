import { matchesSearchText } from '../../../../../../../shared-utils/core/searchText';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  getProductTechnicalDependencyChain,
  getMobileProductTechnicalSearchMatches,
  getDisplayedOptionalProductTechnicalFields,
  isConfiguredProductTechnicalDependencySatisfied,
  isConfiguredFamilyProductTechnicalDependencySatisfied,
  getTechnicalValue,
  groupProductTechnicalFields,
  hasTechnicalValue,
  isExcludedProductTechnicalField,
  isProductTechnicalFieldRequired,
  isProductTechnicalFieldRequiredForCatalog,
} from '../../../domain/productCharacteristics';
import {
  isCharacteristicDependent,
  isQuantityCharacteristic,
} from '../../../../../../../shared-utils/productCharacteristicDependencies';
import type { MobileProductTechnicalField } from '../../../services/categories/mobileProductTechnicalService';
import { ProductAiCharacteristicsAssistant } from '../../components/ProductAiCharacteristicsAssistant';
import { ProductTechnicalFieldsLoadStatus } from './ProductTechnicalFieldsLoadStatus';
import { ProductTechnicalFieldSearchControl } from './ProductTechnicalFieldSearchControl';
import { ProductTechnicalFieldItem } from './ProductTechnicalFieldItem';
import { useProductTechnicalFieldsLoader } from './useProductTechnicalFieldsLoader';
import { useProductTechnicalValueHandlers } from './useProductTechnicalValueHandlers';
import {
  normalizeName,
  normalizeSearchTerm,
  resolveVisibleProductTechnicalFields,
} from './productTechnicalTabFieldVisibility';
import { resolveConfiguredProductTechnicalDependencyReferenceIds } from './productTechnicalTabDependencyReferences';
import { useProductTechnicalTabValues } from './useProductTechnicalTabValues';
import { styles } from './productFormTechnicalTab.styles';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  parentData?: any;
  requiredFieldsOnly?: boolean;
  isSingleVariation?: boolean;
}

export const ProductFormTechnicalTab: React.FC<Props> = ({
  formData,
  setFormData,
  dark,
  parentData,
  requiredFieldsOnly = false,
  isSingleVariation = false,
}) => {
  const [technicalFields, setTechnicalFields] = useState<MobileProductTechnicalField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [technicalFieldsError, setTechnicalFieldsError] = useState<string | null>(null);
  const [technicalFieldsRefreshKey, setTechnicalFieldsRefreshKey] = useState(0);
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
  const [visibleDependencyReason, setVisibleDependencyReason] = useState<string | null>(null);
  const [characteristicSearchTerm, setCharacteristicSearchTerm] = useState('');
  const [debouncedCharacteristicSearchTerm, setDebouncedCharacteristicSearchTerm] = useState('');
  const {
    parentTechnicalValues,
    variableTechnicalFieldNames,
    isVariableField,
    isVariationEditing,
    ownTechnicalValues,
    dependencyValues,
    categoryIds,
    selectedCategoryName,
    isSimpleProduct,
  } = useProductTechnicalTabValues({ formData, parentData, technicalFields });

  useProductTechnicalFieldsLoader({
    categoryIds,
    isVariationEditing,
    refreshKey: technicalFieldsRefreshKey,
    setTechnicalFields,
    setLoadingFields,
    setTechnicalFieldsError,
  });

  const {
    setTechnicalValue,
    removeManualVariationField,
    setFieldScope,
    toggleDepthLength,
  } = useProductTechnicalValueHandlers({
    setFormData,
    setManualFieldNames,
    parentData,
    technicalFields,
    ownTechnicalValues,
    parentTechnicalValues,
    categoryIds,
    selectedCategoryName,
  });

  const visibleTechnicalFields = useMemo(() => {
    return resolveVisibleProductTechnicalFields({
      technicalFields,
      categoryIds,
      parentTechnicalValues,
      ownTechnicalValues,
      manualFieldNames,
      selectedCategoryName,
      requiredFieldsOnly,
      parentData,
      isVariableField,
    });
  }, [
    technicalFields,
    categoryIds,
    selectedCategoryName,
    ownTechnicalValues,
    parentTechnicalValues,
    manualFieldNames,
    requiredFieldsOnly,
    parentData,
    variableTechnicalFieldNames,
    isVariableField,
  ]);

  const isFieldRequired = useCallback(
    (field: MobileProductTechnicalField) =>
      isProductTechnicalFieldRequired(field, categoryIds, selectedCategoryName),
    [categoryIds, selectedCategoryName]
  );

  const isConfiguredFieldDependencySatisfied = useCallback(
    (field: MobileProductTechnicalField) => {
      if (parentData) return true;
      if (isSimpleProduct) {
        return isConfiguredProductTechnicalDependencySatisfied(
          field,
          visibleTechnicalFields,
          dependencyValues
        );
      }

      return isConfiguredFamilyProductTechnicalDependencySatisfied(
        field,
        visibleTechnicalFields,
        dependencyValues,
        formData.variations || [],
        variableTechnicalFieldNames
      );
    },
    [
      parentData,
      isSimpleProduct,
      visibleTechnicalFields,
      dependencyValues,
      formData.variations,
      variableTechnicalFieldNames,
    ]
  );

  const configuredDependencyReferenceIds = useMemo(() => {
    return resolveConfiguredProductTechnicalDependencyReferenceIds({
      isSimpleProduct,
      visibleTechnicalFields,
      ownTechnicalValues,
      manualFieldNames,
      isFieldRequired,
      categoryIds,
      selectedCategoryName,
      dependencyValues,
    });
  }, [
    isSimpleProduct,
    visibleTechnicalFields,
    ownTechnicalValues,
    manualFieldNames,
    isFieldRequired,
    categoryIds,
    selectedCategoryName,
    dependencyValues,
  ]);

  const requiredFieldGroups = useMemo(
    () => {
      const productRequired = visibleTechnicalFields.filter(
        (field) => isFieldRequired(field) && isConfiguredFieldDependencySatisfied(field)
      );
      const catalogRequired = visibleTechnicalFields.filter(
        (field) =>
          !isFieldRequired(field) &&
          isConfiguredFieldDependencySatisfied(field) &&
          isProductTechnicalFieldRequiredForCatalog(
            field,
            categoryIds,
            selectedCategoryName
          )
      );
      return groupProductTechnicalFields([...productRequired, ...catalogRequired]);
    },
    [visibleTechnicalFields, categoryIds, selectedCategoryName, isFieldRequired, isConfiguredFieldDependencySatisfied]
  );
  const optionalTechnicalFields = useMemo(
    () =>
      visibleTechnicalFields.filter(
        (field) =>
          !isFieldRequired(field) &&
          !isProductTechnicalFieldRequiredForCatalog(
            field,
            categoryIds,
            selectedCategoryName
          )
      ),
    [visibleTechnicalFields, categoryIds, selectedCategoryName, isFieldRequired]
  );
  const selectedOptionalFields = useMemo(() => {
    if (!parentData) {
      const displayed = getDisplayedOptionalProductTechnicalFields(
        optionalTechnicalFields,
        technicalFields,
        ownTechnicalValues,
        dependencyValues,
        variableTechnicalFieldNames,
        manualFieldNames
      ) as MobileProductTechnicalField[];
      if (!isSimpleProduct) {
        return displayed.filter(isConfiguredFieldDependencySatisfied);
      }
      const displayedIds = new Set(
        displayed
          .filter(isConfiguredFieldDependencySatisfied)
          .map((field) => field.id)
      );
      return optionalTechnicalFields.filter(
        (field) =>
          isConfiguredFieldDependencySatisfied(field) &&
          (displayedIds.has(field.id) || configuredDependencyReferenceIds.has(field.id))
      );
    }

    return optionalTechnicalFields.filter((field) => {
      const parentValue = String(getTechnicalValue(parentTechnicalValues, field.name) ?? '')
        .trim();
      const ownValue = String(getTechnicalValue(ownTechnicalValues, field.name) ?? '')
        .trim();
      const normalizedOwnValue = normalizeSearchTerm(ownValue);
      const hasSelectedParentValue =
        hasTechnicalValue(parentTechnicalValues, field.name) &&
        !['nao se aplica', 'n/a'].includes(normalizeSearchTerm(parentValue));
      const hasSelectedOwnValue =
        hasTechnicalValue(ownTechnicalValues, field.name) &&
        !['nao se aplica', 'n/a', 'nao informar'].includes(normalizedOwnValue);
      return (
        manualFieldNames.some((name) => normalizeName(name) === normalizeName(field.name)) ||
        hasSelectedOwnValue ||
        hasSelectedParentValue ||
        isCharacteristicDependent(field.name)
      );
    });
  }, [
    parentData,
    optionalTechnicalFields,
    ownTechnicalValues,
    parentTechnicalValues,
    dependencyValues,
    technicalFields,
    variableTechnicalFieldNames,
    manualFieldNames,
    isSimpleProduct,
    isConfiguredFieldDependencySatisfied,
    configuredDependencyReferenceIds,
  ]);
  const searchableOptionalFields = useMemo(() => {
    const selectedNames = new Set(selectedOptionalFields.map((field) => normalizeName(field.name)));
    return technicalFields.filter(
      (field) =>
        field.active !== false &&
        (!parentData || isVariableField(field.name)) &&
        !isProductTechnicalFieldRequired(field, categoryIds, selectedCategoryName) &&
        !isProductTechnicalFieldRequiredForCatalog(
          field,
          categoryIds,
          selectedCategoryName
        ) &&
        !isExcludedProductTechnicalField(field.name) &&
        !selectedNames.has(normalizeName(field.name))
    );
  }, [
    parentData,
    technicalFields,
    selectedOptionalFields,
    categoryIds,
    selectedCategoryName,
    isVariableField,
  ]);
  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);
  const matchingOptionalFields =
    !requiredFieldsOnly &&
    normalizedSearchTerm.length >= 3 &&
    normalizedSearchTerm === normalizedDebouncedSearchTerm
      ? getMobileProductTechnicalSearchMatches(
          searchableOptionalFields,
          normalizedDebouncedSearchTerm,
        )
      : [];
  const isPersistedGroupNameSearch = matchingOptionalFields.some(
    (field) =>
      field.groupName &&
      matchesSearchText(field.groupName, normalizedDebouncedSearchTerm)
  );
  const addSearchResultField = (field: MobileProductTechnicalField) => {
    const fieldsToActivate = isSimpleProduct
      ? getProductTechnicalDependencyChain(field, visibleTechnicalFields)
      : [field];
    const names = fieldsToActivate.map((candidate) => candidate.name);
    setManualFieldNames((previous: string[]) =>
      names.reduce<string[]>(
        (next, name) =>
          next.some((current) => normalizeName(current) === normalizeName(name))
            ? next
            : [...next, name],
        [...previous]
      )
    );
    fieldsToActivate.forEach((candidate) => {
      const isReference = candidate.id !== field.id;
      if (isReference && hasTechnicalValue(ownTechnicalValues, candidate.name)) return;
      setTechnicalValue(
        candidate.name,
        candidate.data_type === 'boolean'
          ? null
          : isQuantityCharacteristic(candidate.name)
            ? null
            : ''
      );
    });
    setCharacteristicSearchTerm('');
  };
  const selectedOptionalGroupedFields = selectedOptionalFields.filter(
    (field) => Boolean(field.groupName?.trim()),
  );
  const selectedOptionalUngroupedFields = selectedOptionalFields.filter(
    (field) => !field.groupName?.trim(),
  );
  const fieldGroups = [
    ...requiredFieldGroups,
    ...(!requiredFieldsOnly ? groupProductTechnicalFields(selectedOptionalGroupedFields) : []),
    ...(!requiredFieldsOnly && selectedOptionalUngroupedFields.length > 0
      ? [{ title: 'Características secundárias adicionadas', fields: selectedOptionalUngroupedFields }]
      : []),
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCharacteristicSearchTerm(characteristicSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [characteristicSearchTerm]);

  const characteristicSearchControl =
    !parentData && !requiredFieldsOnly ? (
      <ProductTechnicalFieldSearchControl
        dark={dark}
        characteristicSearchTerm={characteristicSearchTerm}
        onSearchTermChange={setCharacteristicSearchTerm}
        normalizedSearchTerm={normalizedSearchTerm}
        normalizedDebouncedSearchTerm={normalizedDebouncedSearchTerm}
        matchingOptionalFields={matchingOptionalFields}
        isPersistedGroupNameSearch={isPersistedGroupNameSearch}
        onAddSearchResultField={addSearchResultField}
      />
    ) : null;

  return (
    <View style={styles.container}>
      {!parentData && !requiredFieldsOnly && (
        <ProductAiCharacteristicsAssistant
          formData={formData}
          setFormData={setFormData}
          availableAttributes={technicalFields}
          categoryName={String(formData.categoryName || formData.category || '')}
          dark={dark}
        />
      )}
      <ProductTechnicalFieldsLoadStatus
        error={technicalFieldsError}
        loading={loadingFields}
        dark={dark}
        onRetry={() => setTechnicalFieldsRefreshKey((key) => key + 1)}
      />
      {loadingFields ? (
        null
      ) : visibleTechnicalFields.length === 0 ? (
        <>
          {(!isVariationEditing || (requiredFieldsOnly && !technicalFieldsError)) && (
            <View style={[styles.card, dark && styles.darkCard]}>
              <Text style={[styles.helper, dark && styles.dimText]}>
                {isVariationEditing
                  ? 'Nenhuma característica cadastrada.'
                  : 'Selecione uma categoria para ver as características aplicáveis.'}
              </Text>
            </View>
          )}
          {characteristicSearchControl}
        </>
      ) : (
        <>
          {fieldGroups.map((group, groupIndex) => (
            <View key={group.title}>
              {groupIndex === requiredFieldGroups.length && characteristicSearchControl}
              <View style={[styles.card, dark && styles.darkCard]}>
                <Text style={[styles.groupTitle, dark && styles.dimText]}>{group.title}</Text>
                {group.fields.map((field: any) => (
                  <ProductTechnicalFieldItem
                    key={field.id}
                    field={field}
                    formData={formData}
                    setFormData={setFormData}
                    parentData={parentData}
                    dark={dark}
                    isSimpleProduct={isSimpleProduct}
                    isSingleVariation={isSingleVariation}
                    categoryIds={categoryIds}
                    selectedCategoryName={selectedCategoryName}
                    ownTechnicalValues={ownTechnicalValues}
                    parentTechnicalValues={parentTechnicalValues}
                    dependencyValues={dependencyValues}
                    variableTechnicalFieldNames={variableTechnicalFieldNames}
                    manualFieldNames={manualFieldNames}
                    visibleDependencyReason={visibleDependencyReason}
                    setVisibleDependencyReason={setVisibleDependencyReason}
                    isFieldRequired={isFieldRequired}
                    isVariableField={isVariableField}
                    onSetTechnicalValue={setTechnicalValue}
                    onRemoveManualVariationField={removeManualVariationField}
                    onSetFieldScope={setFieldScope}
                    onToggleDepthLength={toggleDepthLength}
                  />
                ))}
              </View>
            </View>
          ))}
          {fieldGroups.length === requiredFieldGroups.length && characteristicSearchControl}
        </>
      )}
    </View>
  );
};
