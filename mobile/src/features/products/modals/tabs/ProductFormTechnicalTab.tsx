import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../../../services/supabaseClient';
import { Link, Search, Trash2, Unlink } from 'lucide-react-native';

interface Props {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  dark: boolean;
  parentData?: any;
}

const CHARACTERISTIC_TOPICS = [
  { title: 'Dimensões e peso', matches: /\b(altura|largura|profundidade|comprimento|peso)\b/i },
  { title: 'Tecido e revestimento', matches: /\b(tecido|revestimento|espuma|densidade|estofad)/i },
  { title: 'Estrutura', matches: /\b(estrutura|material da estrutura|tipo de portas|quantidade de portas)\b/i },
  { title: 'Funcionalidades', matches: /\b(espelho|porta|gaveta|deslizamento|mecanismo|retr[aá]til|extens[íi]vel)/i },
  { title: 'Acessórios', matches: /\b(p[eé]s?|puxador|rod[ií]zio|sapata)/i },
  { title: 'Materiais e acabamento', matches: /\b(material|acabamento|cor|madeira|metal|vidro)/i },
];

export const ProductFormTechnicalTab: React.FC<Props> = ({ formData, setFormData, dark, parentData }) => {
  const [technicalFields, setTechnicalFields] = useState<any[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [activePickerField, setActivePickerField] = useState<any>(null);
  const [focusedDropdown, setFocusedDropdown] = useState<string | null>(null);
  const [showAdditionalAttributes, setShowAdditionalAttributes] = useState(false);
  const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
  const [optionSearch, setOptionSearch] = useState('');
  const parentTechnicalValues = parentData?.technicalValues || {};
  const variationAttributeValues = Array.isArray(formData.attributes)
    ? Object.fromEntries(formData.attributes.filter((attribute: any) => attribute?.name).map((attribute: any) => [attribute.name, attribute.value]))
    : { ...(formData.attributes || {}) };
  const ownTechnicalValues = { ...variationAttributeValues, ...(formData.technicalValues || {}) };
  const categoryIds: string[] = parentData
    ? (parentData.categoryIds || (parentData.categoryId ? [parentData.categoryId] : []))
    : (formData.categoryIds || (formData.categoryId ? [formData.categoryId] : []));

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingFields(true);
      try {
        let attributesData: any[] | null = null;
        const attributesQuery = await supabase.from('attributes')
          .select('id, name, active, data_type, unit, is_globally_required, is_custom')
          .eq('active', true).order('name');
        if (attributesQuery.error && (attributesQuery.error.code === '42703' || attributesQuery.error.message?.includes('is_custom'))) {
          const fallbackQuery = await supabase.from('attributes')
            .select('id, name, active, data_type, unit, is_globally_required')
            .eq('active', true).order('name');
          if (fallbackQuery.error) throw fallbackQuery.error;
          attributesData = fallbackQuery.data;
        } else if (attributesQuery.error) {
          throw attributesQuery.error;
        } else {
          attributesData = attributesQuery.data;
        }
        const [{ data: options }, { data: categoryLinks }] = await Promise.all([
          supabase.from('attribute_values').select('id, attribute_id, value'),
          supabase.from('category_attributes').select('attribute_id, category_id, is_required'),
        ]);
        if (!mounted) return;
        setTechnicalFields((attributesData || []).map((attribute: any) => {
          const links = (categoryLinks || []).filter((link: any) => link.attribute_id === attribute.id);
          return {
            ...attribute,
            categoryIds: links.map((link: any) => link.category_id),
            requiredForCategory: links.some((link: any) => link.is_required && categoryIds.includes(link.category_id)),
            options: (options || []).filter((option: any) => option.attribute_id === attribute.id)
              .sort((a: any, b: any) => a.value.localeCompare(b.value, 'pt-BR', { numeric: true, sensitivity: 'base' })),
          };
        }));
      } catch (error) {
        console.warn('[ProductFormTechnicalTab] Falha ao carregar atributos do ERP:', error);
      } finally {
        if (mounted) setLoadingFields(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [categoryIds.join('|')]);

  const visibleTechnicalFields = useMemo(() => {
    const values = { ...parentTechnicalValues, ...ownTechnicalValues };
    const visible = technicalFields.filter(field =>
      field.is_globally_required || Object.prototype.hasOwnProperty.call(values, field.name) ||
      manualFieldNames.includes(field.name) ||
      field.categoryIds?.some((id: string) => categoryIds.includes(id))
    );
    const existingNames = new Set(visible.map(field => field.name));
    const preservedLegacyFields = Object.keys(values)
      .filter(name => !existingNames.has(name))
      .map(name => ({ id: `legacy:${name}`, name, data_type: 'text', unit: '', options: [] }));
    return [...visible, ...preservedLegacyFields];
  }, [technicalFields, categoryIds.join('|'), ownTechnicalValues, parentTechnicalValues, manualFieldNames]);

  const visibleFieldGroups = useMemo(() => {
    const groups = new Map<string, any[]>();
    const otherFields: any[] = [];
    visibleTechnicalFields.forEach(field => {
      const topic = field.is_custom === true ? undefined : CHARACTERISTIC_TOPICS.find(candidate => candidate.matches.test(field.name));
      if (!topic) {
        otherFields.push(field);
        return;
      }
      groups.set(topic.title, [...(groups.get(topic.title) || []), field]);
    });
    return [
      ...CHARACTERISTIC_TOPICS.flatMap(topic => groups.has(topic.title) ? [{ title: topic.title, fields: groups.get(topic.title)! }] : []),
      ...(otherFields.length ? [{ title: 'Outras características', fields: otherFields }] : []),
    ];
  }, [visibleTechnicalFields]);

  const setTechnicalValue = (name: string, value: any) => setFormData((prev: any) => {
    const next: any = { ...prev, technicalValues: { ...(prev.technicalValues || {}), [name]: value } };
    if (parentData) {
      const attributes = Array.isArray(prev.attributes)
        ? [...prev.attributes]
        : Object.entries(prev.attributes || {}).map(([attributeName, attributeValue]) => ({ name: attributeName, value: String(attributeValue), showName: true }));
      const existingIndex = attributes.findIndex((attribute: any) => attribute.name?.trim().toLowerCase() === name.trim().toLowerCase());
      if (String(value ?? '').trim()) {
        const attribute = { ...(existingIndex >= 0 ? attributes[existingIndex] : {}), name, value: String(value), showName: true };
        if (existingIndex >= 0) attributes[existingIndex] = attribute;
        else attributes.push(attribute);
      } else if (existingIndex >= 0) {
        attributes.splice(existingIndex, 1);
      }
      next.attributes = attributes;
    }
    const normalized = name.trim().toLocaleLowerCase('pt-BR');
    const dimensionField = normalized === 'altura' ? 'height'
      : normalized === 'largura' ? 'width'
      : ['profundidade', 'comprimento'].includes(normalized) ? 'depth'
      : normalized === 'peso' ? 'weight' : null;
    if (dimensionField) {
      next[dimensionField] = value;
      if (parentData) next[dimensionField === 'width' ? 'syncWidth' : dimensionField === 'height' ? 'syncHeight' : dimensionField === 'depth' ? 'syncDepth' : 'syncWeight'] = false;
    }
    return next;
  });

  const resetVariationOverride = (name: string) => setFormData((prev: any) => {
    const technicalValues = { ...(prev.technicalValues || {}) };
    delete technicalValues[name];
    const attributes = Array.isArray(prev.attributes)
      ? prev.attributes.filter((attribute: any) => attribute.name?.trim().toLowerCase() !== name.trim().toLowerCase())
      : Object.fromEntries(Object.entries(prev.attributes || {}).filter(([attributeName]) => attributeName.trim().toLowerCase() !== name.trim().toLowerCase()));
    const next: any = { ...prev, technicalValues, attributes };
    const normalized = name.trim().toLocaleLowerCase('pt-BR');
    const dimensionField = normalized === 'altura' ? 'height'
      : normalized === 'largura' ? 'width'
      : ['profundidade', 'comprimento'].includes(normalized) ? 'depth'
      : normalized === 'peso' ? 'weight' : null;
    if (dimensionField && parentData) {
      next[dimensionField] = parentData[dimensionField];
      next[dimensionField === 'width' ? 'syncWidth' : dimensionField === 'height' ? 'syncHeight' : dimensionField === 'depth' ? 'syncDepth' : 'syncWeight'] = true;
    }
    return next;
  });

  return (
    <View style={styles.container}>
      {loadingFields ? <ActivityIndicator color="#2563eb" /> : visibleTechnicalFields.length === 0 ? (
        <View style={[styles.card, dark && styles.darkCard]}>
          <Text style={[styles.helper, dark && styles.dimText]}>Selecione uma categoria para ver as características aplicáveis.</Text>
        </View>
      ) : visibleFieldGroups.map(group => (
        <View key={group.title} style={[styles.card, dark && styles.darkCard]}>
          <Text style={[styles.groupTitle, dark && styles.dimText]}>{group.title}</Text>
          {group.fields.map((field: any) => {
          const hasOwnValue = Object.prototype.hasOwnProperty.call(ownTechnicalValues, field.name);
          const storedValue = hasOwnValue ? ownTechnicalValues[field.name] : (parentTechnicalValues[field.name] ?? '');
          const currentValue = Array.isArray(storedValue) ? storedValue.join(', ') : String(storedValue);
          const choices = field.options || [];
          const required = Boolean(field.is_globally_required || field.requiredForCategory);
          const normalizedName = field.name.trim().toLocaleLowerCase('pt-BR');
          const alwaysApplicable = ['cor', 'material da estrutura'].includes(normalizedName);
          const applicable = alwaysApplicable || currentValue !== 'Não se aplica';
          const isManual = manualFieldNames.includes(field.name);

                  return (
            <View key={field.id} style={styles.attributeField}>
              <View style={styles.attributeHeading}>
                <View style={styles.attributeLabelWrap}>
                  <Text style={[styles.label, dark && styles.dimText]}>{field.name}{field.unit ? ` (${field.unit})` : ''}{required && applicable ? ' *' : ''}</Text>
                  {isManual && <Text style={styles.manualBadge}>Manual</Text>}
                </View>
                <View style={styles.attributeActions}>
                  {!alwaysApplicable && <Switch value={applicable} disabled={Boolean(parentData && !hasOwnValue)} onValueChange={value => setTechnicalValue(field.name, value ? (hasOwnValue ? '' : currentValue) : 'Não se aplica')}
                    accessibilityLabel={`Se aplica: ${field.name}`} trackColor={{ false: '#cbd5e1', true: '#2563eb' }} />}
                  {parentData && (
                    <TouchableOpacity onPress={() => {
                      if (hasOwnValue) resetVariationOverride(field.name);
                      else setTechnicalValue(field.name, parentTechnicalValues[field.name] ?? '');
                    }} style={styles.inheritanceButton} accessibilityLabel={hasOwnValue ? `Herdar ${field.name} do produto pai` : `Personalizar ${field.name}`}>
                      {hasOwnValue ? <Unlink size={15} color="#64748b" /> : <Link size={15} color="#10b981" />}
                    </TouchableOpacity>
                  )}
                  {isManual && <TouchableOpacity onPress={() => {
                    setManualFieldNames(previous => previous.filter(name => name !== field.name));
                    setFormData((previous: any) => {
                      const technicalValues = { ...(previous.technicalValues || {}) };
                      delete technicalValues[field.name];
                      return { ...previous, technicalValues };
                    });
                  }} accessibilityLabel={`Remover característica ${field.name}`}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>}
                </View>
              </View>
              {choices.length > 0 ? (
                <View>
                  <TextInput
                    editable={applicable}
                    value={currentValue === 'Não se aplica' ? '' : currentValue}
                    onFocus={() => {
                      setFocusedDropdown(field.name);
                      setActivePickerField(field);
                    }}
                    onChangeText={value => {
                      setTechnicalValue(field.name, value);
                      if (activePickerField?.name !== field.name) setActivePickerField(field);
                    }}
                    placeholder="Selecione ou digite..."
                    placeholderTextColor="#94a3b8"
                    style={[styles.input, dark && styles.darkInput, dark && styles.lightText, !applicable && styles.disabledInput]}
                  />
                  {focusedDropdown === field.name && activePickerField?.name === field.name && currentValue.length >= 2 && (
                    <View style={[styles.inlineDropdown, dark && styles.darkInlineDropdown]}>
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                        {(choices || []).filter((o: any) => o.value.toLowerCase().includes(currentValue.trim().toLowerCase())).map((option: any) => {
                          const current = ownTechnicalValues[activePickerField.name];
                          const selectedValues = Array.isArray(current) ? current : current ? [String(current)] : [];
                          const selected = selectedValues.includes(option.value);
                          return (
                            <TouchableOpacity key={option.id} onPress={() => {
                              if (activePickerField.data_type === 'multi_select') {
                                setTechnicalValue(activePickerField.name, selected
                                  ? selectedValues.filter((value: string) => value !== option.value)
                                  : [...selectedValues, option.value]);
                              } else {
                                setTechnicalValue(activePickerField.name, option.value);
                                setFocusedDropdown(null);
                                setActivePickerField(null);
                              }
                            }} style={[styles.optionRow, selected && styles.selectedOptionRow]}>
                              <Text style={[styles.optionRowText, dark && styles.lightText, selected && styles.selectedOptionRowText]}>{option.value}</Text>
                              {selected && <Text style={styles.selectedMark}>✓</Text>}
                            </TouchableOpacity>
                          );
                        })}
                        {(choices || []).filter((o: any) => o.value.toLowerCase().includes(currentValue.trim().toLowerCase())).length === 0 && (
                          <View style={styles.optionRow}>
                            <Text style={[styles.optionRowText, dark && styles.lightText]}>Nenhum resultado</Text>
                          </View>
                        )}
                      </ScrollView>
                      <TouchableOpacity onPress={() => { setFocusedDropdown(null); setActivePickerField(null); }} style={styles.inlineCloseBtn}>
                        <Text style={styles.inlineCloseBtnText}>Concluir</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <TextInput editable={applicable} value={currentValue === 'Não se aplica' ? '' : currentValue} onChangeText={value => setTechnicalValue(field.name, value)}
                  keyboardType={['decimal', 'measure'].includes(field.data_type) ? 'decimal-pad' : ['integer', 'number'].includes(field.data_type) ? 'number-pad' : 'default'}
                  maxLength={['text_short', 'text'].includes(field.data_type) ? 120 : undefined}
                  placeholder={['decimal', 'measure'].includes(field.data_type) ? '0,00' : ['integer', 'number'].includes(field.data_type)
                    ? /porta|gaveta/i.test(field.name) ? 'Insira a quantidade de portas' : 'Insira um número inteiro'
                    : 'Informe o valor'} placeholderTextColor="#94a3b8"
                  style={[styles.input, dark && styles.darkInput, dark && styles.lightText, !applicable && styles.disabledInput]} />
              )}
            </View>
          );
          })}
        </View>
      ))}
      {!parentData && visibleTechnicalFields.length > 0 && (
        <View>
        {technicalFields.some((field: any) => !visibleTechnicalFields.some(visible => visible.name === field.name)) && (
          <TouchableOpacity onPress={() => { setOptionSearch(''); setShowAdditionalAttributes(true); }} style={styles.addAttributeButton}>
            <Text style={styles.addAttributeButtonText}>＋ Adicionar outra característica</Text>
          </TouchableOpacity>
        )}
        </View>
      )}

      <Modal visible={showAdditionalAttributes} transparent animationType="fade" onRequestClose={() => setShowAdditionalAttributes(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, dark && styles.darkCard]}>
            <Text style={[styles.cardTitle, dark && styles.lightText]}>Adicionar característica</Text>
            <TextInput value={optionSearch} onChangeText={setOptionSearch} placeholder="Buscar característica..." placeholderTextColor="#94a3b8"
              style={[styles.input, dark && styles.darkInput, dark && styles.lightText]} />
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.optionList}>
              {technicalFields.filter((field: any) => !visibleTechnicalFields.some(visible => visible.name === field.name) &&
                field.name.toLowerCase().includes(optionSearch.trim().toLowerCase())).map((field: any) => (
                <TouchableOpacity key={field.id} onPress={() => {
                  setManualFieldNames(previous => [...previous, field.name]);
                  setTechnicalValue(field.name, '');
                  setShowAdditionalAttributes(false);
                }} style={styles.optionRow}>
                  <Text style={[styles.optionRowText, dark && styles.lightText]}>{field.name}</Text>
                  <Text style={styles.selectedMark}>＋</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowAdditionalAttributes(false)} style={styles.pickerCloseButton}>
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
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  groupTitle: { fontSize: 10, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#cbd5e1' },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
  helper: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  attributeField: { gap: 7 },
  attributeHeading: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  attributeLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  attributeActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inheritanceButton: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#f1f5f9' },
  manualBadge: { color: '#2563eb', backgroundColor: '#dbeafe', borderRadius: 4, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 2, fontSize: 9, fontWeight: '700' },
  disabledInput: { opacity: 0.5 },
  choiceButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44, height: 'auto', paddingVertical: 10 },
  choiceButtonText: { fontSize: 12, fontWeight: '700', color: '#334155', flex: 1 },
  choiceChevron: { color: '#64748b', fontSize: 18 },
  inlineDropdown: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginTop: 4, maxHeight: 240, overflow: 'hidden' },
  darkInlineDropdown: { backgroundColor: '#1e293b', borderColor: '#334155' },
  inlineCloseBtn: { height: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  inlineCloseBtnText: { color: '#2563eb', fontWeight: '800', fontSize: 12 },
  pickerOverlay: { flex: 1, backgroundColor: '#0f172a99', justifyContent: 'center', padding: 18 },
  pickerCard: { maxHeight: '82%', backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 },
  optionList: { flexGrow: 0 },
  optionRow: { minHeight: 44, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedOptionRow: { backgroundColor: '#eff6ff' },
  optionRowText: { color: '#334155', fontSize: 13, fontWeight: '600', flex: 1 },
  selectedOptionRowText: { color: '#1d4ed8', fontWeight: '800' },
  selectedMark: { color: '#2563eb', fontWeight: '900' },
  pickerCloseButton: { height: 42, borderRadius: 11, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  pickerCloseText: { color: '#fff', fontWeight: '800' },
  addAttributeButton: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: '#93c5fd', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addAttributeButtonText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: 4 },
  input: { height: 44, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 13, fontWeight: '700', color: '#0f172a' },
  darkInput: { backgroundColor: '#0f172a', borderColor: '#334155' },
  textarea: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 13, fontWeight: '600', color: '#0f172a', minHeight: 160 },
  textareaSmall: { minHeight: 80 },
  switchBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  switchBtnText: { fontSize: 10, fontWeight: '800', color: '#2563eb' },
});
