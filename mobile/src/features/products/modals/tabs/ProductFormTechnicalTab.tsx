import { ArrowLeftRight, Check, Info, PlusCircle, Search, Trash2 } from 'lucide-react-native';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getApplicableProductTechnicalFields,
  getProductTechnicalFieldDisplayName,
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  getProductCharacteristicAttributes,
  getTechnicalValue,
  groupProductTechnicalFields,
  hasTechnicalValue,
  isExcludedProductTechnicalField,
  isMobileVariableTechnicalField,
  isProductTechnicalFieldRequired,
  isProductTechnicalFieldRequiredForCatalog,
  isRequiredCharacteristicName,
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
  getProductTechnicalRootFallbackValue,
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
  isDoorQuantityCharacteristic,
  isDrawerQuantityCharacteristic,
  isHasDoorsCharacteristic,
  isHasDrawersCharacteristic,
  isQuantityCharacteristic,
  type CharacteristicDependencyState,
} from '../../../../../../shared-utils/productCharacteristicDependencies';
import { getDefaultShowNameForVariationOverride } from '../../../../../../shared-utils/productVariationAttributeDefaults';
import {
  fetchMobileProductTechnicalFields,
  type MobileProductTechnicalField,
} from '../../services/mobileProductTechnicalService';
import { ProductAiCharacteristicsAssistant } from '../components/ProductAiCharacteristicsAssistant';
import { ProductTechnicalFieldInput } from './ProductTechnicalFieldInput';

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
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
  const [visibleDependencyReason, setVisibleDependencyReason] = useState<string | null>(null);
  const [characteristicSearchTerm, setCharacteristicSearchTerm] = useState('');
  const [debouncedCharacteristicSearchTerm, setDebouncedCharacteristicSearchTerm] = useState('');
  const parentTechnicalValues = useMemo(
    () => {
      if (!parentData) return {};
      const values = getEffectiveProductTechnicalValues(parentData);
      const dimensions = [
        ['Altura', parentData.height],
        ['Largura', parentData.width],
        [parentData.depthUseLength || parentData.depth_use_length ? 'Comprimento' : 'Profundidade', parentData.depth],
        ['Peso', parentData.weight],
      ] as const;
      for (const [name, value] of dimensions) {
        if (
          value !== undefined &&
          value !== null &&
          String(value).trim() &&
          !String(getTechnicalValue(values, name) ?? '').trim()
        ) {
          values[name] = value;
        }
      }
      return values;
    },
    [
      parentData?.attributes,
      parentData?.technicalValues,
      parentData?.technical_specs,
      parentData?.height,
      parentData?.width,
      parentData?.depth,
      parentData?.weight,
      parentData?.depthUseLength,
      parentData?.depth_use_length,
    ]
  );
  const variableTechnicalFieldNames = useMemo(
    () => resolveMobileVariableTechnicalFieldNames(parentData || formData),
    [
      parentData?.variableTechnicalFields,
      parentData?.technical_specs,
      parentData?.variations,
      formData.variableTechnicalFields,
      formData.variations,
    ]
  );
  const isVariableField = useCallback(
    (fieldName: string) =>
      isMobileVariableTechnicalField(fieldName, variableTechnicalFieldNames) ||
      isCharacteristicDependentOnVariableField(fieldName, variableTechnicalFieldNames),
    [variableTechnicalFieldNames]
  );
  const isVariationEditing = Boolean(parentData);
  const ownTechnicalValues = useMemo(
    () => {
      // Root weight is an own fallback only for products and variations that do not inherit it.
      const values = getEffectiveVariationTechnicalValues({}, formData);
      const usesOwnWeight =
        !isVariationEditing ||
        formData.syncWeight === false ||
        formData.use_parent_dimensions === false;

      if (usesOwnWeight && !hasTechnicalValue(values, 'Peso')) {
        const fallback = getProductTechnicalRootFallbackValue('Peso', formData);
        if (fallback !== undefined) values.Peso = fallback;
      }

      return values;
    },
    [
      formData.attributes,
      formData.technicalValues,
      formData.weight,
      formData.syncWeight,
      formData.use_parent_dimensions,
      isVariationEditing,
    ]
  );
  const dependencyValues = useMemo(() => {
    const values = { ...parentTechnicalValues, ...ownTechnicalValues };

    const useVariationQuantity = (
      isQuantity: (name: string) => boolean,
      isLegacyToggle: (name: string) => boolean
    ) => {
      const quantityName = technicalFields.find(
        (field) => isQuantity(field.name) && isMobileVariableTechnicalField(field.name, variableTechnicalFieldNames)
      )?.name;
      if (!quantityName) return;

      const ownQuantity = Object.entries(ownTechnicalValues).find(([name]) => isQuantity(name));
      Object.keys(values).forEach((name) => {
        if (isQuantity(name) || isLegacyToggle(name)) delete values[name];
      });
      if (ownQuantity) values[quantityName] = ownQuantity[1];
    };

    if (parentData) {
      useVariationQuantity(isDoorQuantityCharacteristic, isHasDoorsCharacteristic);
      useVariationQuantity(isDrawerQuantityCharacteristic, isHasDrawersCharacteristic);
    }
    return values;
  }, [
    technicalFields,
    parentData,
    parentTechnicalValues,
    ownTechnicalValues,
    variableTechnicalFieldNames,
  ]);
  const categoryIds: string[] = useMemo(
    () =>
      parentData
        ? parentData.categoryIds || (parentData.categoryId ? [parentData.categoryId] : [])
        : formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []),
    [parentData?.categoryIds, parentData?.categoryId, formData.categoryIds, formData.categoryId]
  );
  const selectedCategoryName = String(
    (parentData || formData).categoryName || (parentData || formData).category || ''
  );
  const isSimpleProduct =
    !parentData &&
    !formData.hasVariations &&
    (!Array.isArray(formData.variations) || formData.variations.length <= 1);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingFields(true);
      try {
        const fields = await fetchMobileProductTechnicalFields();
        if (!mounted) return;
        setTechnicalFields(fields);
      } catch (error) {
        console.warn('[ProductFormTechnicalTab] Falha ao carregar características do ERP:', error);
      } finally {
        if (mounted) setLoadingFields(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [categoryIds]);

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
        isRequired: isRequiredCharacteristicName(name),
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
        if (!isMobileVariableTechnicalField(field.name, variableTechnicalFieldNames)) return;
        const key = normalizeSearchTerm(field.name);
        if (!fieldsByName.has(key)) fieldsByName.set(key, field);
      });
      return [...fieldsByName.values()];
    }
    return requiredFieldsOnly
      ? allVisibleFields.filter((field) => isProductTechnicalFieldRequired(field, categoryIds))
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
  ]);

  const isFieldRequired = useCallback(
    (field: MobileProductTechnicalField) =>
      isProductTechnicalFieldRequired(field, categoryIds),
    [categoryIds]
  );

  const requiredFieldGroups = useMemo(
    () => {
      const productRequired = visibleTechnicalFields.filter((field) => isFieldRequired(field));
      const catalogRequired = parentData
        ? []
        : visibleTechnicalFields.filter(
            (field) =>
              !isFieldRequired(field) &&
              isProductTechnicalFieldRequiredForCatalog(field, categoryIds)
          );
      return groupProductTechnicalFields([...productRequired, ...catalogRequired]);
    },
    [visibleTechnicalFields, categoryIds, isFieldRequired, parentData]
  );
  const optionalTechnicalFields = useMemo(
    () =>
      visibleTechnicalFields.filter(
        (field) =>
          !isFieldRequired(field) &&
          (Boolean(parentData) || !isProductTechnicalFieldRequiredForCatalog(field, categoryIds))
      ),
    [visibleTechnicalFields, categoryIds, isFieldRequired, parentData]
  );
  const selectedOptionalFields = useMemo(() => {
    return optionalTechnicalFields.filter((field) => {
      if (parentData) {
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
      }
      const hasConfiguredValue = hasTechnicalValue(ownTechnicalValues, field.name);
      const value = String(getTechnicalValue(ownTechnicalValues, field.name) ?? '')
        .trim()
        .toLocaleLowerCase('pt-BR');
      return (
        manualFieldNames.some((name) => normalizeName(name) === normalizeName(field.name)) ||
        (hasConfiguredValue && !['não se aplica', 'nao se aplica', 'n/a'].includes(value)) ||
        isCharacteristicDependent(field.name)
      );
    });
  }, [parentData, optionalTechnicalFields, ownTechnicalValues, parentTechnicalValues, manualFieldNames]);
  const searchableOptionalFields = useMemo(() => {
    const selectedNames = new Set(selectedOptionalFields.map((field) => normalizeName(field.name)));
    return technicalFields.filter(
      (field) =>
        field.active !== false &&
        (!parentData || isVariableField(field.name)) &&
        !isProductTechnicalFieldRequired(field, categoryIds) &&
        (Boolean(parentData) || !isProductTechnicalFieldRequiredForCatalog(field, categoryIds)) &&
        !isExcludedProductTechnicalField(field.name) &&
        !selectedNames.has(normalizeName(field.name))
    );
  }, [parentData, technicalFields, selectedOptionalFields, categoryIds, isVariableField]);
  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);
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
  const fieldGroups = [
    ...requiredFieldGroups,
    ...groupProductTechnicalFields(selectedOptionalFields),
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCharacteristicSearchTerm(characteristicSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [characteristicSearchTerm]);

  const setTechnicalValue = (name: string, value: any) =>
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

      const next: any = {
        ...prev,
        ...getProductTechnicalRootPatch(name, value),
        technicalValues: {
          ...Object.fromEntries(
            Object.entries(prev.technicalValues || {}).filter(
              ([fieldName]) => normalizeName(fieldName) !== normalizeName(name)
            )
          ),
          [name]: value,
        },
      };
      if (parentData) {
        next.attributes = upsertProductCharacteristicAttribute(
          prev.attributes,
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
    });

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
      (isProductTechnicalFieldRequired(requiredCatalogField, categoryIds) ||
        isProductTechnicalFieldRequiredForCatalog(requiredCatalogField, categoryIds))
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
            categoryIds
          ) &&
          !isProductTechnicalFieldRequiredForCatalog(
            requiredCatalogField || { name: fieldName },
            categoryIds
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
          ...getProductTechnicalRootPatch(fieldName, undefined),
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
            [fieldName]: isQuantityCharacteristic(fieldName) ? null : '',
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
          <TextInput
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
                : 'Exibindo até 3 características correspondentes.'}
        </Text>
        {matchingOptionalFields.length > 0 && (
          <View style={[styles.searchResults, dark && styles.darkCard]}>
            {matchingOptionalFields.map((field) => (
              <TouchableOpacity
                key={field.id}
                onPress={() => {
                  setManualFieldNames((previous) =>
                    previous.some((name) => normalizeName(name) === normalizeName(field.name))
                      ? previous
                      : [...previous, field.name]
                  );
                  setTechnicalValue(field.name, isQuantityCharacteristic(field.name) ? null : '');
                  setCharacteristicSearchTerm('');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Adicionar característica ${getProductTechnicalFieldDisplayName(field.name)}`}
                style={[styles.searchResultRow, dark && styles.darkOptionRow]}
              >
                <Text style={[styles.searchResultName, dark && styles.lightText]}>
                  {getProductTechnicalFieldDisplayName(field.name)}{field.unit ? ` (${field.unit})` : ''}
                </Text>
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
      {loadingFields ? (
        <ActivityIndicator color="#2563eb" />
      ) : visibleTechnicalFields.length === 0 ? (
        <>
          <View style={[styles.card, dark && styles.darkCard]}>
            <Text style={[styles.helper, dark && styles.dimText]}>
              Selecione uma categoria para ver as características aplicáveis.
            </Text>
          </View>
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
                  const requiredForCatalog = isProductTechnicalFieldRequiredForCatalog(field, categoryIds);
                  const alwaysApplicable =
                    currentFieldIsRequired ||
                    (!parentData && requiredForCatalog) ||
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
                    alwaysApplicable ||
                    (dependencyState.isDependent
                      ? isDependencySatisfied && !isExplicitlyNotApplicable
                      : isPhysicalDimension
                      ? (hasOwnValue || hasConfiguredParentValue) &&
                        currentValue.trim().toLocaleLowerCase('pt-BR') !== 'não se aplica'
                      : currentValue.trim().toLocaleLowerCase('pt-BR') !== 'não se aplica');
                  const isManual = manualFieldNames.includes(field.name);
                  const isQuantityField = isQuantityCharacteristic(field.name);
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
                          {!alwaysApplicable && (!isManual || isQuantityField) && (
                            <Switch
                              value={applicable}
                              disabled={
                                isSingleVariation ||
                                isDependencyDisabled ||
                                Boolean(parentData && !hasOwnValue && !isDependentCharacteristic)
                              }
                              onValueChange={(value) =>
                                setTechnicalValue(
                                  field.name,
                                  value
                                    ? (hasOwnValue
                                        ? (isQuantityField ? null : '')
                                        : currentValue)
                                    : 'Não se aplica'
                                )
                              }
                              accessibilityLabel={`Se aplica: ${field.name}`}
                              trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                            />
                          )}
                          {isManual && !isQuantityField && (
                            <TouchableOpacity
                              onPress={() => {
                                setManualFieldNames((previous) =>
                                  previous.filter((name) => name !== field.name)
                                );
                                setFormData((previous: any) => {
                                  const technicalValues = Object.fromEntries(
                                    Object.entries(previous.technicalValues || {}).filter(
                                      ([name]) => normalizeName(name) !== normalizeName(field.name)
                                    )
                                  );
                                  const attributes = parentData
                                    ? getProductCharacteristicAttributes(previous.attributes).filter(
                                        (attribute) =>
                                          normalizeName(attribute.name) !== normalizeName(field.name)
                                      )
                                    : previous.attributes;
                                  return {
                                    ...previous,
                                    technicalValues,
                                    ...(parentData ? { attributes } : {}),
                                  };
                                });
                              }}
                              accessibilityLabel={`Remover característica ${field.name}`}
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
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
                            ['not_inform', 'Não informar'],
                            ['global', 'Global'],
                            ['variation', 'Por variação'],
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
                        : currentScope === 'global' || isDependentCharacteristic) && (
                        <ProductTechnicalFieldInput
                          field={field}
                          value={currentValue === 'Não se aplica' ? '' : storedValue}
                          disabled={
                            isSingleVariation ||
                            isDependencyDisabled ||
                            !applicable ||
                            isInheritedFromParent ||
                            (!parentData && isCurrentVariableField) ||
                            (parentData && !isCurrentVariableField && !hasOwnValue)
                          }
                          dark={dark}
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

const styles = StyleSheet.create({
  container: { gap: 14 },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  groupTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  helper: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  searchControl: { gap: 7, paddingHorizontal: 2, paddingTop: 4, paddingBottom: 2 },
  searchLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchInputWrap: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 9, color: '#0f172a', fontSize: 13 },
  searchHint: { fontSize: 10, lineHeight: 15, color: '#94a3b8' },
  searchResults: {
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  searchResultRow: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  darkOptionRow: { borderBottomColor: '#334155' },
  searchResultName: { flex: 1, color: '#334155', fontSize: 12, fontWeight: '600' },
  searchResultAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  searchResultActionText: { color: '#2563eb', fontSize: 11, fontWeight: '800' },
  attributeField: { gap: 7 },
  scopeRow: { flexDirection: 'row', gap: 6 },
  scopeButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 9,
    paddingHorizontal: 6,
    backgroundColor: '#fff',
  },
  darkScopeButton: { borderColor: '#475569', backgroundColor: '#0f172a' },
  scopeButtonSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  scopeButtonText: { color: '#64748b', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  scopeButtonTextSelected: { color: '#1d4ed8' },
  attributeHeading: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeLabelWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 7,
    maxWidth: '100%',
  },
  nameAction: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  disabledNameAction: { opacity: 0.45 },
  dependentFieldLabel: { opacity: 0.65 },
  dependencyReason: {
    color: '#92400e',
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 4,
  },
  darkDependencyReason: { color: '#fbbf24' },
  nameActionSelected: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  nameActionText: { color: '#475569', fontSize: 9, fontWeight: '800' },
  nameActionTextSelected: { color: '#15803d' },
  inheritanceButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
  },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  input: {
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  textarea: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    minHeight: 160,
  },
  textareaSmall: { minHeight: 80 },
  switchBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  switchBtnText: { fontSize: 10, fontWeight: '800', color: '#2563eb' },
});
