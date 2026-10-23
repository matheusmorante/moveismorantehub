import { ArrowLeftRight, Check, Link, PlusCircle, Search, Trash2, Unlink } from 'lucide-react-native';
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
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  getProductCharacteristicAttributes,
  getTechnicalValue,
  groupProductTechnicalFields,
  hasTechnicalValue,
  isExcludedProductTechnicalField,
  isMobileVariableTechnicalField,
  isProductTechnicalFieldRequired,
  isRequiredCharacteristicName,
  upsertProductCharacteristicAttribute,
  resolveMobileVariableTechnicalFieldNames,
} from '../../domain/productCharacteristics';
import {
  applyProductCharacteristicToVariationNames,
  canUseProductCharacteristicInVariationName,
  isProductCharacteristicIncludedInVariationNames,
} from '../../domain/productVariationName';
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
}

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('pt-BR');
const normalizeSearchTerm = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const getDimensionField = (name: string) => {
  const normalized = normalizeName(name);
  if (normalized === 'altura') return 'height';
  if (normalized === 'largura') return 'width';
  if (['profundidade', 'comprimento'].includes(normalized)) return 'depth';
  if (normalized === 'peso') return 'weight';
  return null;
};

const getDimensionSyncField = (field: string) =>
  field === 'width'
    ? 'syncWidth'
    : field === 'height'
      ? 'syncHeight'
      : field === 'depth'
        ? 'syncDepth'
        : 'syncWeight';

export const ProductFormTechnicalTab: React.FC<Props> = ({
  formData,
  setFormData,
  dark,
  parentData,
  requiredFieldsOnly = false,
}) => {
  const [technicalFields, setTechnicalFields] = useState<MobileProductTechnicalField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
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
  const ownTechnicalValues = useMemo(
    () =>
      getEffectiveVariationTechnicalValues(
        {},
        formData,
        parentData ? variableTechnicalFieldNames : undefined
      ),
    [formData.attributes, formData.technicalValues, parentData, variableTechnicalFieldNames]
  );
  const categoryIds: string[] = useMemo(
    () =>
      parentData
        ? parentData.categoryIds || (parentData.categoryId ? [parentData.categoryId] : [])
        : formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []),
    [parentData?.categoryIds, parentData?.categoryId, formData.categoryIds, formData.categoryId]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingFields(true);
      try {
        const fields = await fetchMobileProductTechnicalFields();
        if (!mounted) return;
        setTechnicalFields(fields);
      } catch (error) {
        console.warn('[ProductFormTechnicalTab] Falha ao carregar atributos do ERP:', error);
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
      manualFieldNames
    );
    const existingNames = new Set(visible.map((field) => normalizeName(field.name)));
    const preservedLegacyFields = Object.keys(values)
      .filter(
        (name) => !isExcludedProductTechnicalField(name) && !existingNames.has(normalizeName(name))
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
        if (!isMobileVariableTechnicalField(field.name, variableTechnicalFieldNames)) return;
        const key = normalizeSearchTerm(field.name);
        if (!fieldsByName.has(key)) fieldsByName.set(key, { ...field, isRequired: true });
      });
      return [...fieldsByName.values()];
    }
    return requiredFieldsOnly
      ? allVisibleFields.filter((field) => isProductTechnicalFieldRequired(field, categoryIds))
      : allVisibleFields;
  }, [
    technicalFields,
    categoryIds,
    ownTechnicalValues,
    parentTechnicalValues,
    manualFieldNames,
    requiredFieldsOnly,
    parentData,
    variableTechnicalFieldNames,
  ]);

  const isVariationForm = Boolean(parentData);
  const isFieldRequired = useCallback(
    (field: MobileProductTechnicalField) =>
      isVariationForm
        ? isMobileVariableTechnicalField(field.name, variableTechnicalFieldNames)
        : isProductTechnicalFieldRequired(field, categoryIds),
    [isVariationForm, variableTechnicalFieldNames, categoryIds]
  );

  const requiredFieldGroups = useMemo(
    () =>
      groupProductTechnicalFields(
        visibleTechnicalFields.filter((field) =>
          isFieldRequired(field)
        )
      ),
    [visibleTechnicalFields, parentData, variableTechnicalFieldNames, isFieldRequired]
  );
  const optionalTechnicalFields = useMemo(
    () =>
      visibleTechnicalFields.filter(
        (field) => !isFieldRequired(field)
      ),
    [visibleTechnicalFields, parentData, variableTechnicalFieldNames, isFieldRequired]
  );
  const selectedOptionalFields = useMemo(() => {
    if (parentData) return optionalTechnicalFields;
    return optionalTechnicalFields.filter((field) => {
      const hasConfiguredValue = hasTechnicalValue(ownTechnicalValues, field.name);
      const value = String(getTechnicalValue(ownTechnicalValues, field.name) ?? '')
        .trim()
        .toLocaleLowerCase('pt-BR');
      return (
        manualFieldNames.some((name) => normalizeName(name) === normalizeName(field.name)) ||
        (hasConfiguredValue && !['não se aplica', 'nao se aplica', 'n/a'].includes(value))
      );
    });
  }, [parentData, optionalTechnicalFields, ownTechnicalValues, manualFieldNames]);
  const searchableOptionalFields = useMemo(() => {
    if (parentData) return [];
    const selectedNames = new Set(selectedOptionalFields.map((field) => normalizeName(field.name)));
    return technicalFields.filter(
      (field) =>
        field.active !== false &&
        !isProductTechnicalFieldRequired(field, categoryIds) &&
        !isExcludedProductTechnicalField(field.name) &&
        !selectedNames.has(normalizeName(field.name))
    );
  }, [parentData, technicalFields, selectedOptionalFields, categoryIds]);
  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);
  const matchingOptionalFields =
    !requiredFieldsOnly &&
    !parentData &&
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
      const next: any = {
        ...prev,
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
        next.attributes = upsertProductCharacteristicAttribute(prev.attributes, name, value);
      }
      const dimensionField = getDimensionField(name);
      if (dimensionField) {
        next[dimensionField] = value;
        if (parentData) next[getDimensionSyncField(dimensionField)] = false;
      }
      return next;
    });

  const setFieldScope = (
    fieldName: string,
    scope: 'not_inform' | 'global' | 'variation'
  ) => {
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
        const technicalValues = Object.fromEntries(
          Object.entries(previous.technicalValues || {}).filter(
            ([name]) => normalizeSearchTerm(name) !== normalizeSearchTerm(fieldName)
          )
        );
        const attributes = getProductCharacteristicAttributes(previous.attributes).filter(
          (attribute) => normalizeSearchTerm(attribute.name) !== normalizeSearchTerm(fieldName)
        );
        const dimensionField = getDimensionField(fieldName);
        return {
          ...next,
          technicalValues,
          attributes,
          ...(dimensionField ? { [dimensionField]: '' } : {}),
          ...(normalizeName(fieldName) === 'marca' ? { brand: '' } : {}),
        };
      }
      if (scope === 'global' && !hasTechnicalValue(getEffectiveProductTechnicalValues(previous), fieldName)) {
        return {
          ...next,
          technicalValues: { ...(previous.technicalValues || {}), [fieldName]: '' },
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
        next.attributes = next.attributes.filter(
          (attribute: any) => normalizeName(attribute.name) !== normalizeName(sourceName)
        );
        next.depth = currentValue;
        next.syncDepth = false;
      } else {
        next.depth = currentValue;
      }
      return next;
    });
  };

  const resetVariationOverride = (name: string) =>
    setFormData((prev: any) => {
      const technicalValues = { ...(prev.technicalValues || {}) };
      Object.keys(technicalValues)
        .filter((fieldName) => normalizeName(fieldName) === normalizeName(name))
        .forEach((fieldName) => {
          delete technicalValues[fieldName];
        });
      const attributes = getProductCharacteristicAttributes(prev.attributes).filter(
        (attribute) => normalizeName(attribute.name) !== normalizeName(name)
      );
      const next: any = { ...prev, technicalValues, attributes };
      const dimensionField = getDimensionField(name);
      if (dimensionField && parentData) {
        next[dimensionField] = parentData[dimensionField];
        next[getDimensionSyncField(dimensionField)] = true;
      }
      return next;
    });

  const characteristicSearchControl =
    !requiredFieldsOnly && !parentData ? (
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
                  setTechnicalValue(field.name, '');
                  setCharacteristicSearchTerm('');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Adicionar característica ${field.name}`}
                style={[styles.searchResultRow, dark && styles.darkOptionRow]}
              >
                <Text style={[styles.searchResultName, dark && styles.lightText]}>
                  {field.name}{field.unit ? ` (${field.unit})` : ''}
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
                  const storedValue = hasOwnValue ? ownValue : (parentValue ?? '');
                  const currentValue = Array.isArray(storedValue)
                    ? storedValue.join(', ')
                    : String(storedValue ?? '');
                  const currentFieldIsRequired = isFieldRequired(field);
                  const alwaysApplicable = currentFieldIsRequired;
                  const isCurrentVariableField = isMobileVariableTechnicalField(
                    field.name,
                    variableTechnicalFieldNames
                  );
                  const currentScope = isCurrentVariableField
                    ? 'variation'
                    : hasTechnicalValue(ownTechnicalValues, field.name) ||
                        (normalizeName(field.name) === 'marca' && Boolean(formData.brand))
                      ? 'global'
                      : 'not_inform';
                  const isPhysicalDimension = getDimensionField(field.name) !== null;
                  const hasConfiguredParentValue =
                    Boolean(parentData) && hasTechnicalValue(parentTechnicalValues, field.name);
                  const applicable =
                    alwaysApplicable ||
                    (isPhysicalDimension
                      ? (hasOwnValue || hasConfiguredParentValue) &&
                        currentValue.trim().toLocaleLowerCase('pt-BR') !== 'não se aplica'
                      : currentValue.trim().toLocaleLowerCase('pt-BR') !== 'não se aplica');
                  const isManual = manualFieldNames.includes(field.name);
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
                          <Text style={[styles.label, dark && styles.dimText]}>
                            {field.name}
                            {field.unit ? ` (${field.unit})` : ''}
                            {currentFieldIsRequired && applicable && (
                              <Text style={{ color: '#ef4444' }}> *</Text>
                            )}
                          </Text>
                        </View>
                        <View style={styles.attributeActions}>
                          {['profundidade', 'comprimento'].includes(normalizeName(field.name)) && (
                            <TouchableOpacity
                              onPress={() => toggleDepthLength(field)}
                              style={styles.inheritanceButton}
                              accessibilityRole="button"
                              accessibilityLabel={`Alternar para ${normalizeName(field.name) === 'profundidade' ? 'Comprimento' : 'Profundidade'}`}
                            >
                              <ArrowLeftRight size={15} color="#64748b" />
                            </TouchableOpacity>
                          )}
                          {!alwaysApplicable && !isManual && (
                            <Switch
                              value={applicable}
                              disabled={Boolean(parentData && !hasOwnValue)}
                              onValueChange={(value) =>
                                setTechnicalValue(
                                  field.name,
                                  value ? (hasOwnValue ? '' : currentValue) : 'Não se aplica'
                                )
                              }
                              accessibilityLabel={`Se aplica: ${field.name}`}
                              trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                            />
                          )}
                          {parentData && (
                            <TouchableOpacity
                              onPress={() => {
                                if (hasOwnValue) resetVariationOverride(field.name);
                                else
                                  setTechnicalValue(
                                    field.name,
                                    getTechnicalValue(parentTechnicalValues, field.name) ?? ''
                                  );
                              }}
                              style={styles.inheritanceButton}
                              accessibilityLabel={
                                hasOwnValue
                                  ? `Herdar ${field.name} do produto pai`
                                  : `Personalizar ${field.name}`
                              }
                            >
                              {hasOwnValue ? (
                                <Unlink size={15} color="#64748b" />
                              ) : (
                                <Link size={15} color="#10b981" />
                              )}
                            </TouchableOpacity>
                          )}
                          {isManual && (
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
                                  return { ...previous, technicalValues };
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
                              accessibilityHint="Inclui a cor no nome e nos atributos das variações que têm um valor disponível."
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
                      {!parentData && (
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
                      {(parentData ? isCurrentVariableField || hasOwnValue : currentScope === 'global') && (
                        <ProductTechnicalFieldInput
                          field={field}
                          value={currentValue === 'Não se aplica' ? '' : storedValue}
                          disabled={!applicable || isInheritedFromParent}
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
