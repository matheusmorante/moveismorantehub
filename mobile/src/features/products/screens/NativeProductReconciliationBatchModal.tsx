import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createReconciliationBatchFormSchema,
  reconciliationSupplierSearchSchema,
  type ReconciliationAvailableAttribute,
  type ReconciliationBatchInput,
  type ReconciliationResult,
} from '../../../../../shared-utils/reconciliationFormSchemas';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import type { MobileCategory } from '../services/mobileCategoryService';
import {
  searchMobileReconciliationSuppliers,
} from '../services/mobileProductReconciliationService';
import type { NativeProductReconciliationBatchOperation } from './NativeProductReconciliationBatchBar';

interface Props {
  visible: boolean;
  operation: NativeProductReconciliationBatchOperation | null;
  productIds: string[];
  categories: MobileCategory[];
  availableAttributes: Array<ReconciliationAvailableAttribute & { id: string; unit?: string }>;
  dark: boolean;
  onClose: () => void;
  onConfirm: (values: ReconciliationBatchInput) => Promise<ReconciliationResult>;
}

const initialValues = (operation: NativeProductReconciliationBatchOperation | null, productIds: string[]): ReconciliationBatchInput => {
  if (operation === 'supplier') return { operation, productIds, supplierId: '', replaceExisting: false };
  if (operation === 'category') return { operation, productIds, categoryId: '' };
  if (operation === 'ncm') return { operation, productIds, ncm: '' };
  return { operation: 'attribute', productIds, name: '', value: '' };
};

export const NativeProductReconciliationBatchModal: React.FC<Props> = ({
  visible,
  operation,
  productIds,
  categories,
  availableAttributes,
  dark,
  onClose,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOptions, setSupplierOptions] = useState<Array<{ id: string; fullName: string; tradeName?: string }>>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; fullName: string; tradeName?: string } | null>(null);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [ncm, setNcm] = useState('');
  const [attributeName, setAttributeName] = useState('');
  const [attributeValue, setAttributeValue] = useState('');
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supplierRevision = useRef(0);
  const supplierSearchForm = useZodForm(reconciliationSupplierSearchSchema, { search: '' });
  const selectedSupplierIds = useMemo(
    () => Array.from(new Set([...supplierOptions.map((supplier) => supplier.id), ...(selectedSupplier ? [selectedSupplier.id] : [])])),
    [selectedSupplier, supplierOptions]
  );
  const schema = useMemo(() => createReconciliationBatchFormSchema({
    attributes: availableAttributes,
    supplierIds: selectedSupplierIds,
    categoryIds: categories.map((category) => category.id),
  }), [availableAttributes, categories, selectedSupplierIds]);
  const form = useZodForm(schema, initialValues(operation, productIds));
  const selectedAttribute = availableAttributes.find((attribute) => attribute.name === attributeName);
  const categoryMatches = useMemo(() => {
    const normalizedSearch = categorySearch.trim().toLocaleLowerCase('pt-BR');
    return categories.filter((category) => !normalizedSearch || category.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
  }, [categories, categorySearch]);
  const darkSurface = dark ? styles.panelDark : styles.panel;
  const darkText = dark ? styles.textLight : styles.textDark;

  useEffect(() => {
    if (!visible) return;
    setSupplierSearch('');
    setSupplierOptions([]);
    setSelectedSupplier(null);
    setSupplierError('');
    setCategorySearch('');
    setSelectedCategoryId('');
    setNcm('');
    setAttributeName('');
    setAttributeValue('');
    setError('');
    setUncertain(false);
  }, [operation, visible]);

  useEffect(() => {
    const revision = ++supplierRevision.current;
    const isCurrent = () => revision === supplierRevision.current;
    if (!visible || operation !== 'supplier') {
      setSupplierLoading(false);
      setSupplierOptions([]);
      setSupplierError('');
      return () => { supplierRevision.current += 1; };
    }
    if (supplierSearch.trim().length < 2) {
      setSupplierOptions([]);
      setSupplierError('');
      setSupplierLoading(false);
      return () => { supplierRevision.current += 1; };
    }
    const timer = setTimeout(async () => {
      setSupplierLoading(true);
      setSupplierError('');
      const values = await supplierSearchForm.validateValues(
        { search: supplierSearch },
        (errors) => {
          if (isCurrent()) setSupplierError(Object.values(flattenFormErrors(errors))[0] || 'Confira a busca.');
        }
      );
      if (!values || !isCurrent()) {
        if (isCurrent()) setSupplierLoading(false);
        return;
      }
      try {
        const suppliers = await searchMobileReconciliationSuppliers(values.search);
        if (isCurrent()) setSupplierOptions(suppliers);
      } catch (cause) {
        if (isCurrent()) {
          setSupplierError(cause instanceof Error ? cause.message : 'Não foi possível buscar fornecedores.');
          setSupplierOptions([]);
        }
      } finally {
        if (isCurrent()) setSupplierLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      supplierRevision.current += 1;
    };
  }, [operation, supplierSearch, supplierSearchForm.validateValues, visible]);

  const submit = async () => {
    if (!visible || !operation || isSubmitting || uncertain) return;
    const values = initialValues(operation, productIds);
    if (operation === 'supplier') {
      Object.assign(values, { supplierId: selectedSupplier?.id || '', replaceExisting: false });
    } else if (operation === 'category') {
      Object.assign(values, { categoryId: selectedCategoryId });
    } else if (operation === 'ncm') {
      Object.assign(values, { ncm });
    } else {
      Object.assign(values, { name: attributeName, value: attributeValue });
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await form.validateAndRun(
        values,
        async (parsed) => {
          const response = await onConfirm(parsed);
          if (response.uncertain) {
            setUncertain(true);
            setError(response.error || 'Não foi possível confirmar. Confira os produtos antes de repetir.');
          } else if (!response.success) {
            setError(response.error || 'Não foi possível aplicar a correção. Revise os produtos e tente novamente.');
          } else {
            onClose();
          }
          return response;
        },
        (errors) => setError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados informados.')
      );
      if (result === false) setError((current) => current || 'Confira os dados informados.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível aplicar a correção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = operation === 'supplier' ? 'Atribuir fornecedor' : operation === 'category' ? 'Definir categoria' : operation === 'ncm' ? 'Definir NCM' : 'Definir atributo';
  const confirmLabel = operation === 'supplier' ? 'Confirmar atribuição' : operation === 'category' ? 'Aplicar categoria' : operation === 'ncm' ? 'Aplicar NCM' : 'Aplicar atributo';
  const inputDisabled = isSubmitting || uncertain;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!isSubmitting) onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={[styles.panel, darkSurface, { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, darkText]}>{title}</Text>
              <Text style={styles.subtitle}>Operação em lote · {productIds.length} {productIds.length === 1 ? 'produto selecionado' : 'produtos selecionados'}</Text>
            </View>
            <Pressable onPress={onClose} disabled={isSubmitting} accessibilityRole="button" accessibilityLabel="Fechar operação em lote" style={styles.closeButton}>
              <X size={20} color={dark ? '#e2e8f0' : '#64748b'} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <View style={[styles.countCard, dark && styles.countCardDark]}>
              <Text style={styles.countValue}>{productIds.length}</Text>
              <Text style={[styles.countLabel, darkText]}>Produtos selecionados</Text>
              <Text style={styles.helpText}>
                {operation === 'supplier' ? 'O fornecedor será aplicado aos produtos sem substituir vínculos existentes.' : 'Confira a seleção antes de confirmar a alteração.'}
              </Text>
            </View>

            {operation === 'supplier' ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, darkText]}>Fornecedor a atribuir</Text>
                {selectedSupplier ? (
                  <View style={[styles.selectedValue, dark && styles.fieldDark]}>
                    <View style={styles.selectedCopy}>
                      <Text style={[styles.optionTitle, darkText]}>{selectedSupplier.fullName}</Text>
                      {selectedSupplier.tradeName ? <Text style={styles.helpText}>{selectedSupplier.tradeName}</Text> : null}
                    </View>
                    <Pressable onPress={() => setSelectedSupplier(null)} disabled={inputDisabled} accessibilityRole="button" accessibilityLabel="Trocar fornecedor selecionado" style={styles.smallAction}>
                      <Text style={styles.smallActionText}>Trocar</Text>
                    </Pressable>
                  </View>
                ) : null}
                <View style={[styles.searchWrap, dark && styles.fieldDark]}>
                  <Search size={16} color="#94a3b8" />
                  <TextInput value={supplierSearch} onChangeText={setSupplierSearch} editable={!inputDisabled} placeholder="Buscar fornecedor..." placeholderTextColor="#94a3b8" accessibilityLabel="Buscar fornecedor para lote" style={[styles.textInput, darkText]} />
                  {supplierLoading ? <ActivityIndicator size="small" color="#7c3aed" /> : null}
                </View>
                {supplierError ? <Text style={styles.errorText} accessibilityRole="alert">{supplierError}</Text> : null}
                {supplierSearch.trim().length < 2 ? <Text style={styles.helpText}>Digite pelo menos 2 caracteres.</Text> : null}
                {supplierSearch.trim().length >= 2 && !supplierLoading && supplierOptions.length === 0 && !supplierError ? <Text style={styles.helpText}>Nenhum fornecedor encontrado.</Text> : null}
                {supplierOptions.map((supplier) => (
                  <Pressable key={supplier.id} onPress={() => { setSelectedSupplier(supplier); setSupplierSearch(''); }} disabled={inputDisabled} accessibilityRole="button" style={[styles.option, dark && styles.fieldDark]}>
                    <Text style={[styles.optionTitle, darkText]}>{supplier.fullName}</Text>
                    {supplier.tradeName ? <Text style={styles.helpText}>{supplier.tradeName}</Text> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {operation === 'category' ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, darkText]}>Categoria a atribuir</Text>
                <View style={[styles.searchWrap, dark && styles.fieldDark]}>
                  <Search size={16} color="#94a3b8" />
                  <TextInput value={categorySearch} onChangeText={setCategorySearch} editable={!inputDisabled} placeholder="Buscar categoria..." placeholderTextColor="#94a3b8" accessibilityLabel="Buscar categoria para lote" style={[styles.textInput, darkText]} />
                </View>
                {categoryMatches.length === 0 ? <Text style={styles.helpText}>Nenhuma categoria encontrada.</Text> : categoryMatches.map((category) => (
                  <Pressable key={category.id} onPress={() => setSelectedCategoryId(category.id)} disabled={inputDisabled} accessibilityRole="radio" accessibilityState={{ selected: selectedCategoryId === category.id }} style={[styles.option, dark && styles.fieldDark, selectedCategoryId === category.id && styles.optionSelected]}>
                    <Text style={[styles.optionTitle, darkText]}>{category.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {operation === 'ncm' ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, darkText]}>Código NCM</Text>
                <TextInput value={ncm} onChangeText={setNcm} editable={!inputDisabled} placeholder="Ex: 9403.50.00" placeholderTextColor="#94a3b8" accessibilityLabel="NCM para aplicação em lote" autoCapitalize="none" style={[styles.textInput, styles.inputBox, dark && styles.fieldDark, darkText]} />
                <Text style={styles.helpText}>O valor fiscal existente será lido e os demais campos serão preservados.</Text>
              </View>
            ) : null}

            {operation === 'attribute' ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, darkText]}>Nome do atributo</Text>
                {availableAttributes.length === 0 ? <Text style={styles.helpText}>Os produtos selecionados não possuem atributos obrigatórios pendentes em comum.</Text> : availableAttributes.map((attribute) => (
                  <Pressable key={attribute.id} onPress={() => { setAttributeName(attribute.name); setAttributeValue(''); }} disabled={inputDisabled} accessibilityRole="radio" accessibilityState={{ selected: attributeName === attribute.name }} style={[styles.option, dark && styles.fieldDark, attributeName === attribute.name && styles.optionSelected]}>
                    <Text style={[styles.optionTitle, darkText]}>{attribute.name}</Text>
                  </Pressable>
                ))}
                <Text style={[styles.label, darkText]}>Valor a atribuir</Text>
                {selectedAttribute?.dataType === 'boolean' ? (
                  <View style={styles.booleanOptions}>
                    {['Sim', 'Não'].map((value) => (
                      <Pressable key={value} onPress={() => setAttributeValue(value)} disabled={inputDisabled} accessibilityRole="radio" accessibilityState={{ selected: attributeValue === value }} style={[styles.booleanButton, dark && styles.fieldDark, attributeValue === value && styles.optionSelected]}>
                        <Text style={[styles.optionTitle, darkText]}>{value}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.searchWrap, styles.attributeInput, dark && styles.fieldDark]}>
                    <TextInput value={attributeValue} onChangeText={setAttributeValue} editable={!inputDisabled} placeholder="Informe o valor..." placeholderTextColor="#94a3b8" accessibilityLabel="Valor do atributo em lote" keyboardType={selectedAttribute && ['integer', 'decimal', 'measure'].includes(selectedAttribute.dataType || '') ? 'decimal-pad' : 'default'} style={[styles.textInput, darkText]} />
                    {selectedAttribute?.unit ? <Text style={styles.unit}>{selectedAttribute.unit}</Text> : null}
                  </View>
                )}
              </View>
            ) : null}

            {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
            {uncertain ? <Text style={styles.errorText}>A gravação não foi confirmada. Confira os produtos antes de tentar novamente.</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose} disabled={isSubmitting} accessibilityRole="button" style={styles.cancelButton}>
              <Text style={[styles.cancelText, darkText]}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={() => void submit()} disabled={isSubmitting || uncertain || productIds.length === 0} accessibilityRole="button" accessibilityLabel={confirmLabel} style={[styles.confirmButton, (isSubmitting || uncertain || productIds.length === 0) && styles.disabled]}>
              {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : null}
              <Text style={styles.confirmText}>{isSubmitting ? 'Aplicando...' : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.58)' },
  panel: { maxHeight: '92%', width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, gap: 12 },
  panelDark: { backgroundColor: '#0f172a' },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#cbd5e1', paddingBottom: 10 },
  headerCopy: { flex: 1 },
  title: { fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },
  subtitle: { color: '#64748b', fontSize: 10, fontWeight: '700', marginTop: 3 },
  textDark: { color: '#0f172a' },
  textLight: { color: '#f8fafc' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  body: { gap: 16, paddingTop: 4, paddingBottom: 12 },
  countCard: { borderWidth: 1, borderColor: '#dbeafe', borderRadius: 16, padding: 14, gap: 4, backgroundColor: '#eff6ff' },
  countCardDark: { backgroundColor: '#172554', borderColor: '#1e3a8a' },
  countValue: { color: '#7c3aed', fontSize: 22, fontWeight: '900' },
  countLabel: { fontSize: 12, fontWeight: '900' },
  helpText: { color: '#64748b', fontSize: 10, lineHeight: 15, fontWeight: '600' },
  fieldGroup: { gap: 8 },
  label: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: '#64748b' },
  searchWrap: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 13, paddingHorizontal: 11, backgroundColor: '#f8fafc' },
  textInput: { flex: 1, minHeight: 44, fontSize: 13, fontWeight: '600' },
  inputBox: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 13, paddingHorizontal: 12, backgroundColor: '#f8fafc' },
  fieldDark: { backgroundColor: '#111c2f', borderColor: '#334155' },
  option: { minHeight: 46, justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff' },
  optionSelected: { borderColor: '#8b5cf6', backgroundColor: '#f5f3ff' },
  optionTitle: { fontSize: 12, fontWeight: '800' },
  selectedValue: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 13, padding: 10, backgroundColor: '#f0fdf4' },
  selectedCopy: { flex: 1 },
  smallAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  smallActionText: { color: '#7c3aed', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  booleanOptions: { flexDirection: 'row', gap: 8 },
  booleanButton: { minHeight: 44, flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, backgroundColor: '#fff' },
  attributeInput: { paddingRight: 12 },
  unit: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  errorText: { color: '#b91c1c', fontSize: 11, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#cbd5e1', paddingTop: 10 },
  cancelButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  cancelText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', color: '#64748b' },
  confirmButton: { minHeight: 46, minWidth: 148, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingHorizontal: 16, backgroundColor: '#7c3aed' },
  confirmText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  disabled: { opacity: 0.45 },
});
