import { ArrowLeftRight, Check, Info, PlusCircle, Search } from 'lucide-react-native';
import { matchesSearchText } from '../../../../../../shared-utils/searchText';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getApplicableProductTechnicalFields,
  getProductTechnicalDependencyChain,
  getProductTechnicalFieldDisplayName,
  getMobileProductTechnicalSearchMatches,
  getEffectiveProductTechnicalValues,
  getProductCharacteristicAttributes,
  getDisplayedOptionalProductTechnicalFields,
  isConfiguredProductTechnicalDependencySatisfied,
  isConfiguredFamilyProductTechnicalDependencySatisfied,
  getTechnicalValue,
  groupProductTechnicalFields,
  hasTechnicalValue,
  isDependentProductTechnicalFieldActive,
  isExcludedProductTechnicalField,
  isMobileVariableTechnicalField,
  isProductTechnicalFieldRequired,
  isProductTechnicalFieldRequiredForCatalog,
  isProductTechnicalFieldApplicableByCategory,
  removeProductCharacteristicAttribute,
  upsertProductCharacteristicAttribute,
  resolveMobileVariableTechnicalFieldNames,
} from '../../domain/productCharacteristics';
import {
  applyProductCharacteristicToVariationNames,
  canUseProductCharacteristicInVariationName,
  isProductCharacteristicIncludedInVariationNames,
} from '../../domain/productVariationName';
import {
  getProductTechnicalRootPatch,
} from '../../../../../../shared-utils/productTechnicalRootPatch';
import {
  getProductTechnicalDimensionField,
  parseProductTechnicalDimension,
} from '../../../../../../shared-utils/productTechnicalDimensions';
import {
  getCharacteristicDependencyState,
  isCharacteristicDependent,
  isCharacteristicDependentOnVariableField,
  isQuantityCharacteristic,
  type CharacteristicDependencyState,
} from '../../../../../../shared-utils/productCharacteristicDependencies';
import { getDefaultShowNameForVariationOverride } from '../../../../../../shared-utils/productVariationAttributeDefaults';
import {
  cleanupDependentCharacteristicsOnZero,
  cleanupDependentVariationAttributesOnQuantityChange,
} from '../../../../../../shared-utils/productDependentCharacteristicCleanup';
import { removeProductTechnicalValueAliases } from '../../../../../../shared-utils/productTechnicalValueAliases';
import {
  isSofaCategoryName,
  isSofaRequiredCharacteristic,
} from '../../../../../../shared-utils/productTechnicalFieldScope';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import {
  fetchMobileProductTechnicalFields,
  type MobileProductTechnicalField,
} from '../../services/mobileProductTechnicalService';
import { ProductAiCharacteristicsAssistant } from '../components/ProductAiCharacteristicsAssistant';
import { ProductTechnicalFieldInput } from './ProductTechnicalFieldInput';
import { ProductTechnicalFieldsLoadStatus } from './ProductTechnicalFieldsLoadStatus';
import { useProductTechnicalTabValues } from './useProductTechnicalTabValues';
import { styles } from './productFormTechnicalTab.styles';

import { FormTextInput } from '../../../../components/shared/FormTextInput';
interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  parentData?: any;
  requiredFieldsOnly?: boolean;
  isSingleVariation?: boolean;
}

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('pt-BR');
const normalizeSearchTerm = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingFields(true);
      setTechnicalFieldsError(null);
      try {
        const fields = isVariationEditing
          ? await withTimeout(
              fetchMobileProductTechnicalFields(),
              15_000,
              null,
              'variacao:caracteristicas'
            )
          : await fetchMobileProductTechnicalFields();
        if (!mounted) return;
        if (!fields) throw new Error('Consulta de características não confirmada.');
        setTechnicalFields(fields);
      } catch (error) {
        if (!mounted) return;
        console.warn('[ProductFormTechnicalTab] Falha ao carregar características do ERP:', error);
        setTechnicalFieldsError(
          'Não foi possível carregar as características. Consulte novamente.'
        );
      } finally {
        if (mounted) setLoadingFields(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [categoryIds, isVariationEditing, technicalFieldsRefreshKey]);

  const visibleTechnicalFields = useMemo(() => {
    const values = { ...parentTechnicalValues, ...ownTechnicalValues };
    const visible = getApplicableProductTechnicalFields(
      technicalFields,
      categoryIds,
      values,
      manualFieldNames,
      selectedCategoryName
    );
    const existingNames = new Set(visible.map((field) => normalizeName(field.name)));
    const preservedLegacyFields = Object.keys(values)
      .filter(
        (name) =>
          !isExcludedProductTechnicalField(name) &&
          isProductTechnicalFieldApplicableByCategory({ name }, categoryIds, selectedCategoryName) &&
          !existingNames.has(normalizeName(name))
      )
      .map((name) => ({
        id: `legacy:${name}`,
        name,
        data_type: 'text',
        unit: '',
        options: [],
        isRequired: isProductTechnicalFieldRequired(
          { name },
          categoryIds,
          selectedCategoryName
        ),
      }));
    const allVisibleFields = [...visible, ...preservedLegacyFields];
    if (parentData) {
      const fieldsByName = new Map<string, any>();
      [...allVisibleFields, ...technicalFields].forEach((field) => {
        if (
          !isProductTechnicalFieldApplicableByCategory(
            field,
            categoryIds,
            selectedCategoryName
          )
        ) return;
        if (!isVariableField(field.name)) return;
        const key = normalizeSearchTerm(field.name);
        if (!fieldsByName.has(key)) fieldsByName.set(key, field);
      });
      return [...fieldsByName.values()];
    }
    return requiredFieldsOnly
      ? allVisibleFields.filter((field) =>
          isProductTechnicalFieldRequired(field, categoryIds, selectedCategoryName)
        )
      : allVisibleFields;
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
    const referenceIds = new Set<string>();
    if (!isSimpleProduct) return referenceIds;

    const selectedRoots = visibleTechnicalFields.filter((field) => {
      if (!field.dependency) return false;
      const value = getTechnicalValue(ownTechnicalValues, field.name);
      const hasStoredValue = hasTechnicalValue(ownTechnicalValues, field.name) &&
        !['nao se aplica', 'nao informar', 'n/a'].includes(
          normalizeSearchTerm(String(value ?? ''))
        );
      const isSelectedManually = manualFieldNames.some(
        (name) => normalizeName(name) === normalizeName(field.name)
      );
      return isFieldRequired(field) ||
        isProductTechnicalFieldRequiredForCatalog(field, categoryIds, selectedCategoryName) ||
        isSelectedManually || hasStoredValue;
    });

    selectedRoots.forEach((field) => {
      getProductTechnicalDependencyChain(field, visibleTechnicalFields)
        .slice(1)
        .forEach((reference) => {
          if (
            reference.id &&
            isConfiguredProductTechnicalDependencySatisfied(
              reference,
              visibleTechnicalFields,
              dependencyValues
            )
          ) referenceIds.add(reference.id);
        });
    });
    return referenceIds;
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
      );
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
    setManualFieldNames((previous) =>
      names.reduce(
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

  const setTechnicalValue = useCallback((name: string, value: any) =>
    setFormData((prev: any) => {
      const currentValue = getTechnicalValue(prev.technicalValues || {}, name);
      const currentHasQuantity =
        currentValue !== undefined &&
        currentValue !== null &&
        String(currentValue).trim() !== '' &&
        Number.isFinite(Number(String(currentValue).replace(',', '.')));
      if (
        isQuantityCharacteristic(name) &&
        (value === '' || value === null || value === undefined) &&
        currentHasQuantity
      ) return prev;

      const technicalValues = cleanupDependentCharacteristicsOnZero(
        {
          ...removeProductTechnicalValueAliases(prev.technicalValues || {}, name),
          [name]: value,
        },
        name,
        value
      );
      const next: any = {
        ...prev,
        ...(!parentData ? getProductTechnicalRootPatch(name, value) : {}),
        technicalValues,
      };
      if (parentData) {
        const attributes = cleanupDependentVariationAttributesOnQuantityChange(
          getProductCharacteristicAttributes(prev.attributes),
          name,
          value
        );
        next.attributes = upsertProductCharacteristicAttribute(
          attributes,
          name,
          value,
          getDefaultShowNameForVariationOverride(name)
        );
      }
      // O ERP grava as dimensões físicas no Produto pai. Na edição da variação,
      // a característica própria fica em technicalValues/attributes e não altera
      // as colunas herdadas de dimensão da variação.
      const dimensionField = parentData ? null : getProductTechnicalDimensionField(name);
      if (dimensionField) {
        next[dimensionField] = parseProductTechnicalDimension(value);
      }
      return next;
    }), [parentData, setFormData]);

  const removeManualVariationField = (fieldName: string) => {
    setManualFieldNames((previous) => previous.filter((name) => name !== fieldName));
    setFormData((previous: any) => ({
      ...previous,
      technicalValues: removeProductTechnicalValueAliases(
        previous.technicalValues || {},
        fieldName
      ),
      attributes: removeProductCharacteristicAttribute(previous.attributes, fieldName),
    }));
  };

  const setFieldScope = (
    fieldName: string,
    scope: 'not_inform' | 'global' | 'variation'
  ) => {
    const requiredCatalogField = technicalFields.find(
      (field) => normalizeSearchTerm(field.name) === normalizeSearchTerm(fieldName)
    );
    if (
      scope === 'not_inform' &&
      requiredCatalogField &&
      (isProductTechnicalFieldRequired(
        requiredCatalogField,
        categoryIds,
        selectedCategoryName
      ) ||
        isProductTechnicalFieldRequiredForCatalog(
          requiredCatalogField,
          categoryIds,
          selectedCategoryName
        ))
    ) return;

    setFormData((previous: any) => {
      const configuredNames = resolveMobileVariableTechnicalFieldNames(previous);
      const isVariable = isMobileVariableTechnicalField(fieldName, configuredNames);
      const variableTechnicalFields =
        scope === 'variation'
          ? isVariable
            ? configuredNames
            : [...configuredNames, fieldName]
          : configuredNames.filter(
              (name) => !isMobileVariableTechnicalField(fieldName, [name])
            );
      const next = { ...previous, variableTechnicalFields };
      if (scope === 'not_inform') {
        const dependency = getCharacteristicDependencyState(
          fieldName,
          getEffectiveProductTechnicalValues(previous)
        );
        if (
          dependency.isDependent &&
          !dependency.isDisabled &&
          !isProductTechnicalFieldRequired(
            requiredCatalogField || { name: fieldName },
            categoryIds,
            selectedCategoryName
          ) &&
          !isProductTechnicalFieldRequiredForCatalog(
            requiredCatalogField || { name: fieldName },
            categoryIds,
            selectedCategoryName
          )
        ) {
          return {
            ...next,
            technicalValues: {
              ...(previous.technicalValues || {}),
              [fieldName]: 'Não se aplica',
            },
          };
        }
        const technicalValues = Object.fromEntries(
          Object.entries(previous.technicalValues || {}).filter(
            ([name]) => normalizeSearchTerm(name) !== normalizeSearchTerm(fieldName)
          )
        );
        const attributes = getProductCharacteristicAttributes(previous.attributes).filter(
          (attribute) => normalizeSearchTerm(attribute.name) !== normalizeSearchTerm(fieldName)
        );
        const dimensionField = parentData ? null : getProductTechnicalDimensionField(fieldName);
        return {
          ...next,
          technicalValues,
          attributes,
          ...(!parentData ? getProductTechnicalRootPatch(fieldName, undefined) : {}),
          ...(dimensionField ? { [dimensionField]: undefined } : {}),
        };
      }
      const currentTechnicalValue = getTechnicalValue(
        getEffectiveProductTechnicalValues(previous),
        fieldName
      );
      const isCurrentlyNotApplicable = [
        'nao se aplica',
        'n/a',
        'nao informar',
      ].includes(normalizeSearchTerm(String(currentTechnicalValue ?? '')));
      if (
        scope === 'global' &&
        (isCurrentlyNotApplicable ||
          !hasTechnicalValue(getEffectiveProductTechnicalValues(previous), fieldName))
      ) {
        return {
          ...next,
          technicalValues: {
            ...(previous.technicalValues || {}),
            [fieldName]: requiredCatalogField?.data_type === 'boolean' || isQuantityCharacteristic(fieldName) ? null : '',
          },
        };
      }
      return next;
    });
  };

  const toggleDepthLength = (field: any) => {
    const sourceName = field.name;
    const targetName =
      normalizeName(sourceName) === 'profundidade' ? 'Comprimento' : 'Profundidade';
    const targetField = technicalFields.find(
      (technicalField) => normalizeName(technicalField.name) === normalizeName(targetName)
    );
    if (!targetField) return;

    const currentValue =
      getTechnicalValue(ownTechnicalValues, sourceName) ??
      getTechnicalValue(parentTechnicalValues, sourceName) ??
      '';
    setFormData((prev: any) => {
      const technicalValues = Object.fromEntries(
        Object.entries(prev.technicalValues || {}).filter(
          ([name]) =>
            normalizeName(name) !== normalizeName(sourceName) &&
            normalizeName(name) !== normalizeName(targetField.name)
        )
      );
      technicalValues[targetField.name] = currentValue;
      const next: any = { ...prev, technicalValues };
      if (parentData) {
        next.attributes = upsertProductCharacteristicAttribute(
          prev.attributes,
          targetField.name,
          currentValue
        );
        next.attributes = removeProductCharacteristicAttribute(next.attributes, sourceName);
        next.depth = currentValue;
        next.syncDepth = false;
      } else {
        next.depth = currentValue;
      }
      return next;
    });
  };

  const characteristicSearchControl =
    !requiredFieldsOnly ? (
      <View style={styles.searchControl}>
        <Text style={[styles.searchLabel, dark && styles.dimText]}>Pesquisar característica</Text>
        <View style={[styles.searchInputWrap, dark && styles.darkInput]}>
          <Search size={16} color={dark ? '#94a3b8' : '#64748b'} />
          <FormTextInput
            value={characteristicSearchTerm}
            onChangeText={setCharacteristicSearchTerm}
            placeholder="Digite pelo menos 3 caracteres"
            placeholderTextColor="#94a3b8"
            accessibilityLabel="Pesquisar característica técnica"
            returnKeyType="search"
            style={[styles.searchInput, dark && styles.lightText]}
          />
        </View>
        <Text style={[styles.searchHint, dark && styles.dimText]} accessibilityLiveRegion="polite">
          {normalizedSearchTerm.length < 3
            ? 'Digite pelo menos 3 caracteres para pesquisar.'
            : normalizedSearchTerm !== normalizedDebouncedSearchTerm
              ? 'Buscando características...'
              : matchingOptionalFields.length === 0
                ? 'Nenhuma característica encontrada.'
                : isPersistedGroupNameSearch
                  ? 'Exibindo as características disponíveis do grupo.'
                  : 'Exibindo características correspondentes.'}
        </Text>
        {matchingOptionalFields.length > 0 && (
          <View style={[styles.searchResults, dark && styles.darkCard]}>
            {matchingOptionalFields.map((field) => (
              <TouchableOpacity
                key={field.id}
                onPress={() => addSearchResultField(field)}
                accessibilityRole="button"
                accessibilityLabel={`Adicionar característica ${getProductTechnicalFieldDisplayName(field.name)}`}
                style={[styles.searchResultRow, dark && styles.darkOptionRow]}
              >
                <View style={styles.searchResultCopy}>
                  <Text style={[styles.searchResultName, dark && styles.lightText]}>
                    {getProductTechnicalFieldDisplayName(field.name)}{field.unit ? ` (${field.unit})` : ''}
                  </Text>
                  {field.groupName ? (
                    <Text style={[styles.searchResultGroup, dark && styles.dimText]}>
                      {field.groupName}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.searchResultAction}>
                  <PlusCircle size={14} color="#2563eb" />
                  <Text style={styles.searchResultActionText}>Adicionar</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
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
                {group.fields.map((field: any) => {
                  const hasOwnValue = hasTechnicalValue(ownTechnicalValues, field.name);
                  const ownValue = getTechnicalValue(ownTechnicalValues, field.name);
                  const parentValue = getTechnicalValue(parentTechnicalValues, field.name);
                  const isCurrentVariableField =
                    !isSimpleProduct &&
                    isVariableField(field.name);
                  const isDependencyVariable = isCharacteristicDependentOnVariableField(
                    field.name,
                    variableTechnicalFieldNames
                  );
                  const storedValue = hasOwnValue
                    ? ownValue
                    : parentData && isCurrentVariableField
                      ? ''
                      : (parentValue ?? '');
                  const currentValue = Array.isArray(storedValue)
                    ? storedValue.join(', ')
                    : String(storedValue ?? '');
                  const isExplicitlyNotApplicable = [
                    'nao se aplica',
                    'n/a',
                    'nao informar',
                  ].includes(normalizeSearchTerm(currentValue));
                  const isDependentCharacteristic = isCharacteristicDependent(field.name);
                  const currentFieldIsRequired = isFieldRequired(field);
                  const requiredForCatalog = isProductTechnicalFieldRequiredForCatalog(
                    field,
                    categoryIds,
                    selectedCategoryName
                  );
                  const alwaysApplicable =
                    currentFieldIsRequired ||
                    (!parentData && requiredForCatalog && isSimpleProduct) ||
                    Boolean(
                      parentData &&
                        isCurrentVariableField &&
                        (!isDependentCharacteristic || requiredForCatalog)
                    );
                  const dependencyState: CharacteristicDependencyState = getCharacteristicDependencyState(
                    field.name,
                    dependencyValues
                  );
                  const isDependencyDisabled = dependencyState.isDisabled;
                  const isDependencySatisfied =
                    dependencyState.isDependent && !isDependencyDisabled;
                  const currentScope = isCurrentVariableField
                    ? 'variation'
                    : requiredForCatalog
                      ? 'global'
                      : isExplicitlyNotApplicable
                        ? 'not_inform'
                        : hasTechnicalValue(ownTechnicalValues, field.name) ||
                        (normalizeName(field.name) === 'marca' && Boolean(formData.brand)) ||
                        alwaysApplicable ||
                        isDependencySatisfied
                        ? 'global'
                        : 'not_inform';
                  const isPhysicalDimension = getProductTechnicalDimensionField(field.name) !== null;
                  const hasConfiguredParentValue =
                    Boolean(parentData) && hasTechnicalValue(parentTechnicalValues, field.name);
                  const applicable =
                    requiredForCatalog ||
                    alwaysApplicable ||
                    (dependencyState.isDependent
                      ? isDependencySatisfied && !isExplicitlyNotApplicable
                      : isPhysicalDimension
                      ? (hasOwnValue || hasConfiguredParentValue) &&
                        currentValue.trim().toLocaleLowerCase('pt-BR') !== 'não se aplica'
                      : currentValue.trim().toLocaleLowerCase('pt-BR') !== 'não se aplica');
                  const isManual = manualFieldNames.includes(field.name);
                  const isQuantityField = isQuantityCharacteristic(field.name);
                  const isOptionalField = !currentFieldIsRequired && !requiredForCatalog;
                  const showsApplicabilitySwitch = !requiredForCatalog && (parentData
                    ? isQuantityField && isOptionalField
                    : !alwaysApplicable && (!isManual || isQuantityField));
                  const parentText = String(parentValue ?? '').trim();
                  const parentIsZero =
                    ['integer', 'number', 'decimal', 'measure'].includes(field.data_type) &&
                    Number(parentText.replace(',', '.')) === 0;
                  const hasMeaningfulParentValue =
                    parentText !== '' &&
                    parentText.toLocaleLowerCase('pt-BR') !== 'não se aplica' &&
                    !parentIsZero;
                  const isInheritedFromParent = Boolean(
                    parentData &&
                      !isCurrentVariableField &&
                      !hasOwnValue &&
                      hasMeaningfulParentValue
                  );
                  const productVariations =
                    !parentData && Array.isArray(formData.variations) ? formData.variations : [];
                  const nameSource = String(formData.name || formData.description || '').trim();
                  const isColorField = normalizeName(field.name) === 'cor';
                  const parentColor = getTechnicalValue(ownTechnicalValues, field.name);
                  const canUseInVariationName =
                    isColorField &&
                    canUseProductCharacteristicInVariationName(
                      productVariations,
                      field.name,
                      parentColor
                    );
                  const isIncludedInVariationName =
                    canUseInVariationName &&
                    isProductCharacteristicIncludedInVariationNames(
                      productVariations,
                      nameSource,
                      field.name,
                      parentColor
                    );

                  return (
                    <View key={field.id} style={styles.attributeField}>
                      <View style={styles.attributeHeading}>
                        <View style={styles.attributeLabelWrap}>
                          <Text
                            style={[
                              styles.label,
                              dark && styles.dimText,
                              isDependencyDisabled && styles.dependentFieldLabel,
                            ]}
                          >
                            {getProductTechnicalFieldDisplayName(field.name)}
                            {field.unit ? ` (${field.unit})` : ''}
                            {isSofaCategoryName(selectedCategoryName) && isSofaRequiredCharacteristic(field.name) && (
                              <Text style={styles.requiredMark} accessibilityLabel="Obrigatória"> *</Text>
                            )}
                          </Text>
                        </View>
                        <View style={styles.attributeActions}>
                          {isDependencyDisabled && dependencyState.disabledReason && (
                            <TouchableOpacity
                              onPress={() =>
                                setVisibleDependencyReason((current) =>
                                  current === field.name ? null : field.name
                                )
                              }
                              style={styles.inheritanceButton}
                              accessibilityRole="button"
                              accessibilityLabel={dependencyState.disabledReason}
                              accessibilityHint="Mostrar ou ocultar o motivo do bloqueio."
                              accessibilityState={{
                                expanded: visibleDependencyReason === field.name,
                              }}
                            >
                              <Info size={15} color="#d97706" />
                            </TouchableOpacity>
                          )}
                          {['profundidade', 'comprimento'].includes(normalizeName(field.name)) && (
                            <TouchableOpacity
                              disabled={isSingleVariation}
                              onPress={() => toggleDepthLength(field)}
                              style={styles.inheritanceButton}
                              accessibilityRole="button"
                              accessibilityState={{ disabled: isSingleVariation }}
                              accessibilityLabel={`Alternar para ${normalizeName(field.name) === 'profundidade' ? 'Comprimento' : 'Profundidade'}`}
                            >
                              <ArrowLeftRight size={15} color="#64748b" />
                            </TouchableOpacity>
                          )}
                          {showsApplicabilitySwitch && (
                            <Switch
                              value={parentData ? true : applicable}
                              onValueChange={(value) => {
                                if (parentData && isQuantityField) {
                                  if (!value) removeManualVariationField(field.name);
                                  return;
                                }
                                setTechnicalValue(
                                  field.name,
                                  value
                                    ? (hasOwnValue
                                        ? (isQuantityField ? null : '')
                                        : currentValue)
                                    : 'Não se aplica'
                                );
                              }}
                              accessibilityLabel={
                                parentData
                                  ? `Exibir característica ${field.name}`
                                  : `Se aplica: ${field.name}`
                              }
                              trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                            />
                          )}
                          {!parentData && isColorField && (
                            <TouchableOpacity
                              disabled={!canUseInVariationName}
                              onPress={() =>
                                setFormData((previous: any) => {
                                  const variations = Array.isArray(previous.variations)
                                    ? previous.variations
                                    : [];
                                  const updatedVariations =
                                    applyProductCharacteristicToVariationNames(
                                      variations,
                                      String(previous.name || previous.description || '').trim(),
                                      field.name,
                                      getTechnicalValue(
                                        previous.technicalValues || {},
                                        field.name
                                      ) ?? parentColor
                                    );
                                  return updatedVariations === variations
                                    ? previous
                                    : { ...previous, variations: updatedVariations };
                                })
                              }
                              style={[
                                styles.nameAction,
                                !canUseInVariationName && styles.disabledNameAction,
                                isIncludedInVariationName && styles.nameActionSelected,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel="Usar cor no nome da variação"
                              accessibilityState={{ disabled: !canUseInVariationName }}
                              accessibilityHint="Inclui a cor no nome e nas características das variações que têm um valor disponível."
                            >
                              {isIncludedInVariationName && <Check size={12} color="#15803d" />}
                              <Text
                                style={[
                                  styles.nameActionText,
                                  isIncludedInVariationName && styles.nameActionTextSelected,
                                ]}
                              >
                                Usar no nome
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {isDependencyDisabled &&
                        visibleDependencyReason === field.name &&
                        dependencyState.disabledReason && (
                          <Text
                            style={[
                              styles.dependencyReason,
                              dark && styles.darkDependencyReason,
                            ]}
                            accessibilityRole="text"
                          >
                            {dependencyState.disabledReason}
                          </Text>
                        )}
                      {!parentData &&
                        isSimpleProduct &&
                        !alwaysApplicable &&
                        !isDependencyVariable && (
                        <Switch
                          value={currentScope === 'global'}
                          onValueChange={(enabled) =>
                            setFieldScope(field.name, enabled ? 'global' : 'not_inform')
                          }
                          accessibilityRole="switch"
                          accessibilityLabel={`Exibir característica ${field.name}`}
                          trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                          thumbColor={currentScope === 'global' ? '#fff' : '#f8fafc'}
                        />
                      )}
                      {!parentData &&
                        !isSimpleProduct &&
                        !alwaysApplicable &&
                        !isDependencyVariable && (
                        <View style={styles.scopeRow}>
                          {([
                            ...(!requiredForCatalog ? [['not_inform', 'Não informar'] as const] : []),
                            ['global', 'Global'] as const,
                            ['variation', 'Por variação'] as const,
                          ] as const).map(([scope, label]) => {
                            const selected = currentScope === scope;
                            return (
                              <TouchableOpacity
                                key={scope}
                                onPress={() => setFieldScope(field.name, scope)}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                style={[
                                  styles.scopeButton,
                                  dark && styles.darkScopeButton,
                                  selected && styles.scopeButtonSelected,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.scopeButtonText,
                                    dark && styles.dimText,
                                    selected && styles.scopeButtonTextSelected,
                                  ]}
                                >
                                  {label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                      {(parentData
                        ? isCurrentVariableField ||
                          hasOwnValue ||
                          (isDependentCharacteristic && isDependencyDisabled)
                        : currentScope === 'global' ||
                          currentScope === 'variation' ||
                          isDependentCharacteristic) && (
                        <ProductTechnicalFieldInput
                          field={field}
                          value={
                            parentData && isExplicitlyNotApplicable
                              ? ''
                              : currentValue === 'Não se aplica'
                                ? ''
                                : storedValue
                          }
                          disabled={
                            isSingleVariation ||
                            isDependencyDisabled ||
                            (!parentData && !applicable) ||
                            isInheritedFromParent ||
                            (!parentData && isCurrentVariableField) ||
                            (parentData && !isCurrentVariableField && !hasOwnValue)
                          }
                          dark={dark}
                          placeholder={
                            !parentData && currentScope === 'variation'
                              ? 'Defina na variação...'
                              : undefined
                          }
                          onChange={(value) => setTechnicalValue(field.name, value)}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          {fieldGroups.length === requiredFieldGroups.length && characteristicSearchControl}
        </>
      )}
    </View>
  );
};
