import { ArrowLeftRight, Link, Trash2, Unlink } from 'lucide-react-native';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
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
  isRequiredCharacteristicName,
  upsertProductCharacteristicAttribute,
} from '../../domain/productCharacteristics';
import {
  fetchMobileProductTechnicalFields,
  type MobileProductTechnicalField,
} from '../../services/mobileProductTechnicalService';
import { ProductTechnicalFieldInput } from './ProductTechnicalFieldInput';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  parentData?: any;
  requiredFieldsOnly?: boolean;
}

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('pt-BR');

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
  const [showAdditionalAttributes, setShowAdditionalAttributes] = useState(false);
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
  const [optionSearch, setOptionSearch] = useState('');
  const parentTechnicalValues = useMemo(
    () => (parentData ? getEffectiveProductTechnicalValues(parentData) : {}),
    [parentData?.attributes, parentData?.technicalValues, parentData?.technical_specs]
  );
  const ownTechnicalValues = useMemo(
    () => getEffectiveVariationTechnicalValues({}, formData),
    [formData.attributes, formData.technicalValues]
  );
  const categoryIds: string[] = parentData
    ? parentData.categoryIds || (parentData.categoryId ? [parentData.categoryId] : [])
    : formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []);

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
  }, [categoryIds.join('|')]);

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
        (name) =>
          !isExcludedProductTechnicalField(name) &&
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
    return requiredFieldsOnly
      ? allVisibleFields.filter(
          (field) => field.isRequired ?? isRequiredCharacteristicName(field.name)
        )
      : allVisibleFields;
  }, [
    technicalFields,
    categoryIds.join('|'),
    ownTechnicalValues,
    parentTechnicalValues,
    manualFieldNames,
    requiredFieldsOnly,
  ]);

  const visibleFieldGroups = useMemo(() => {
    return groupProductTechnicalFields(visibleTechnicalFields);
  }, [visibleTechnicalFields]);

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

  return (
    <View style={styles.container}>
      {loadingFields ? (
        <ActivityIndicator color="#2563eb" />
      ) : visibleTechnicalFields.length === 0 ? (
        <View style={[styles.card, dark && styles.darkCard]}>
          <Text style={[styles.helper, dark && styles.dimText]}>
            Selecione uma categoria para ver as características aplicáveis.
          </Text>
        </View>
      ) : (
        visibleFieldGroups.map((group) => (
          <View key={group.title} style={[styles.card, dark && styles.darkCard]}>
            <Text style={[styles.groupTitle, dark && styles.dimText]}>{group.title}</Text>
            {group.fields.map((field: any) => {
              const hasOwnValue = hasTechnicalValue(ownTechnicalValues, field.name);
              const ownValue = getTechnicalValue(ownTechnicalValues, field.name);
              const parentValue = getTechnicalValue(parentTechnicalValues, field.name);
              const storedValue = hasOwnValue ? ownValue : (parentValue ?? '');
              const currentValue = Array.isArray(storedValue)
                ? storedValue.join(', ')
                : String(storedValue ?? '');
              const alwaysApplicable = isRequiredCharacteristicName(field.name);
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
                parentData && !hasOwnValue && hasMeaningfulParentValue
              );

              return (
                <View key={field.id} style={styles.attributeField}>
                  <View style={styles.attributeHeading}>
                    <View style={styles.attributeLabelWrap}>
                      <Text style={[styles.label, dark && styles.dimText]}>
                        {field.name}
                        {field.unit ? ` (${field.unit})` : ''}
                        {applicable && (
                          <Text style={{ color: '#ef4444' }}> *</Text>
                        )}
                      </Text>
                      {isManual && <Text style={styles.manualBadge}>Manual</Text>}
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
                      {!alwaysApplicable && (
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
                                parentTechnicalValues[field.name] ?? ''
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
                              const technicalValues = { ...(previous.technicalValues || {}) };
                              delete technicalValues[field.name];
                              return { ...previous, technicalValues };
                            });
                          }}
                          accessibilityLabel={`Remover característica ${field.name}`}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <ProductTechnicalFieldInput
                    field={field}
                    value={currentValue === 'Não se aplica' ? '' : storedValue}
                    disabled={!applicable || isInheritedFromParent}
                    dark={dark}
                    onChange={(value) => setTechnicalValue(field.name, value)}
                  />
                </View>
              );
            })}
          </View>
        ))
      )}
      {!parentData && !requiredFieldsOnly && visibleTechnicalFields.length > 0 && (
        <View>
          {technicalFields.some(
            (field: any) => !visibleTechnicalFields.some((visible) => visible.name === field.name)
          ) && (
            <TouchableOpacity
              onPress={() => {
                setOptionSearch('');
                setShowAdditionalAttributes(true);
              }}
              style={styles.addAttributeButton}
            >
              <Text style={styles.addAttributeButtonText}>＋ Adicionar outra característica</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal
        visible={showAdditionalAttributes}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdditionalAttributes(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, dark && styles.darkCard]}>
            <Text style={[styles.cardTitle, dark && styles.lightText]}>
              Adicionar característica
            </Text>
            <TextInput
              value={optionSearch}
              onChangeText={setOptionSearch}
              placeholder="Buscar característica..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]}
            />
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.optionList}>
              {technicalFields
                .filter(
                  (field: any) =>
                    !isExcludedProductTechnicalField(field.name) &&
                    !visibleTechnicalFields.some(
                      (visible) => normalizeName(visible.name) === normalizeName(field.name)
                    ) &&
                    field.name.toLowerCase().includes(optionSearch.trim().toLowerCase())
                )
                .map((field: any) => (
                  <TouchableOpacity
                    key={field.id}
                    onPress={() => {
                      setManualFieldNames((previous) => [...previous, field.name]);
                      setTechnicalValue(field.name, '');
                      setShowAdditionalAttributes(false);
                    }}
                    style={styles.optionRow}
                  >
                    <Text style={[styles.optionRowText, dark && styles.lightText]}>
                      {field.name}
                    </Text>
                    <Text style={styles.selectedMark}>＋</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowAdditionalAttributes(false)}
              style={styles.pickerCloseButton}
            >
              <Text style={styles.pickerCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  attributeField: { gap: 7 },
  attributeHeading: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  attributeLabelWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inheritanceButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
  },
  manualBadge: {
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: '700',
  },
  pickerOverlay: { flex: 1, backgroundColor: '#0f172a99', justifyContent: 'center', padding: 18 },
  pickerCard: { maxHeight: '82%', backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 },
  optionList: { flexGrow: 0 },
  optionRow: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionRowText: { color: '#334155', fontSize: 13, fontWeight: '600', flex: 1 },
  selectedMark: { color: '#2563eb', fontWeight: '900' },
  pickerCloseButton: {
    height: 42,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCloseText: { color: '#fff', fontWeight: '800' },
  addAttributeButton: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAttributeButtonText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
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
