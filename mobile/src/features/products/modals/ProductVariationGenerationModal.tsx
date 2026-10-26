import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Eye, EyeOff, Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cartesianVariationFormSchema } from '../../../../../shared-utils/catalogFormSchemas';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import {
  fetchMobileAttributes,
  type MobileAttribute,
} from '../services/mobileAttributeService';
import type { MobileBulkVariationOption } from '../domain/mobileProductVariationGeneration';

interface Props {
  visible: boolean;
  dark: boolean;
  onClose: () => void;
  onGenerate: (attributes: MobileBulkVariationOption[]) => void;
}

export const ProductVariationGenerationModal: React.FC<Props> = ({
  visible,
  dark,
  onClose,
  onGenerate,
}) => {
  const insets = useSafeAreaInsets();
  const [attributes, setAttributes] = useState<MobileAttribute[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<MobileBulkVariationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const form = useZodForm(cartesianVariationFormSchema, { attributes: selectedOptions });

  useEffect(() => {
    if (!visible) {
      setSelectedOptions([]);
      setLoadError(false);
      return;
    }
    let current = true;
    setLoading(true);
    setLoadError(false);
    void fetchMobileAttributes()
      .then((result) => {
        if (current) {
          setAttributes(
            result.filter((attribute) => attribute.active !== false && attribute.options.length > 0)
          );
        }
      })
      .catch(() => {
        if (current) setLoadError(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [visible]);

  const combinationCount = useMemo(() => {
    if (selectedOptions.length === 0 || selectedOptions.some(({ values }) => values.length === 0)) {
      return 0;
    }
    return selectedOptions.reduce((count, option) => count * option.values.length, 1);
  }, [selectedOptions]);

  const toggleAttribute = (attribute: MobileAttribute) => {
    setSelectedOptions((current) => {
      const existing = current.find((option) => option.name === attribute.name);
      return existing
        ? current.filter((option) => option.name !== attribute.name)
        : [...current, { name: attribute.name, values: [], showName: true }];
    });
  };

  const toggleValue = (attributeName: string, value: string) => {
    setSelectedOptions((current) =>
      current.map((option) => {
        if (option.name !== attributeName) return option;
        const values = option.values.includes(value)
          ? option.values.filter((item) => item !== value)
          : [...option.values, value];
        return { ...option, values };
      })
    );
  };

  const toggleShowName = (attributeName: string) => {
    setSelectedOptions((current) =>
      current.map((option) =>
        option.name === attributeName ? { ...option, showName: !option.showName } : option
      )
    );
  };

  const handleGenerate = async () => {
    await form.validateAndRun(
      { attributes: selectedOptions },
      (values) => {
        onGenerate(values.attributes);
        onClose();
      },
      (errors) =>
        Alert.alert(
          'Revise as características',
          Object.values(flattenFormErrors(errors))[0] || 'Selecione ao menos um valor por característica.'
        )
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          dark && styles.darkRoot,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={[styles.header, dark && styles.darkBorder]}>
          <View style={styles.flex1}>
            <Text style={[styles.title, dark && styles.lightText]}>Gerar variações</Text>
            <Text style={[styles.subtitle, dark && styles.dimText]}>
              Selecione características e valores para criar todas as combinações.
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar">
            <X size={22} color={dark ? '#cbd5e1' : '#64748b'} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.hint, dark && styles.darkHint]}>
            <Sparkles size={18} color={dark ? '#93c5fd' : '#2563eb'} />
            <Text style={[styles.hintText, dark && styles.lightText]}>
              As combinações recebem SKU, nome e características automaticamente, como no ERP.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#2563eb" style={styles.loader} />
          ) : loadError ? (
            <View style={[styles.empty, dark && styles.darkCard]}>
              <Text style={[styles.emptyText, dark && styles.dimText]}>
                Não foi possível carregar as características. Feche e tente novamente.
              </Text>
            </View>
          ) : attributes.length === 0 ? (
            <View style={[styles.empty, dark && styles.darkCard]}>
              <Text style={[styles.emptyText, dark && styles.dimText]}>
                Não há características ativas com opções para gerar variações.
              </Text>
            </View>
          ) : (
            attributes.map((attribute) => {
              const selection = selectedOptions.find((option) => option.name === attribute.name);
              const selected = Boolean(selection);
              const selectedValues = selection?.values ?? [];
              const showName = selection?.showName ?? true;
              return (
                <View key={attribute.id} style={[styles.attributeCard, dark && styles.darkCard]}>
                  <TouchableOpacity
                    onPress={() => toggleAttribute(attribute)}
                    style={styles.attributeHeader}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected && <Check size={13} color="#ffffff" />}
                    </View>
                    <Text style={[styles.attributeName, dark && styles.lightText]}>
                      {attribute.name}
                    </Text>
                    <Text style={[styles.optionCount, dark && styles.dimText]}>
                      {attribute.options.length} opções
                    </Text>
                  </TouchableOpacity>
                  {selected && (
                    <>
                      <View style={styles.valuesHeader}>
                        <Text style={[styles.label, dark && styles.dimText]}>
                          Valores selecionados: {selectedValues.length}
                        </Text>
                        <TouchableOpacity
                          onPress={() => toggleShowName(attribute.name)}
                          style={styles.nameToggle}
                          accessibilityRole="button"
                          accessibilityLabel={
                            showName
                              ? 'Valor da característica exibido no nome da variação'
                              : 'Valor da característica oculto no nome da variação'
                          }
                        >
                          {showName ? (
                            <Eye size={14} color="#2563eb" />
                          ) : (
                            <EyeOff size={14} color="#64748b" />
                          )}
                          <Text style={[styles.nameToggleText, !showName && styles.hiddenNameText]}>
                            {showName ? 'Valor no Nome' : 'Valor Oculto'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.values}>
                        {attribute.options.map((option) => {
                          const isChosen = selectedValues.includes(option.value);
                          return (
                            <TouchableOpacity
                              key={option.id}
                              onPress={() => toggleValue(attribute.name, option.value)}
                              style={[styles.valueChip, dark && styles.darkValueChip, isChosen && styles.valueChipSelected]}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: isChosen }}
                            >
                              <Text style={[styles.valueText, dark && styles.dimText, isChosen && styles.valueTextSelected]}>
                                {option.value}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.footer, dark && styles.darkBorder]}>
          <Text style={[styles.count, dark && styles.dimText]}>
            {combinationCount > 0
              ? `${combinationCount} ${combinationCount === 1 ? 'variação será adicionada' : 'variações serão adicionadas'}`
              : 'Escolha ao menos um valor por característica'}
          </Text>
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelButton, dark && styles.darkCancel]}>
              <Text style={[styles.cancelText, dark && styles.lightText]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleGenerate()}
              disabled={loading || loadError || attributes.length === 0}
              style={[styles.generateButton, (loading || loadError || attributes.length === 0) && styles.disabledButton]}
              accessibilityRole="button"
            >
              <Sparkles size={15} color="#ffffff" />
              <Text style={styles.generateText}>Gerar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  darkRoot: { backgroundColor: '#0f172a' },
  header: { minHeight: 74, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  darkBorder: { borderColor: '#334155' },
  flex1: { flex: 1 },
  title: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  subtitle: { marginTop: 4, color: '#64748b', fontSize: 11, fontWeight: '600' },
  content: { padding: 16, gap: 12 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: '#eff6ff' },
  darkHint: { backgroundColor: '#172554' },
  hintText: { flex: 1, color: '#1e3a8a', fontSize: 11, fontWeight: '700', lineHeight: 16 },
  loader: { marginTop: 36 },
  empty: { padding: 18, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center' },
  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  emptyText: { color: '#64748b', fontSize: 12, textAlign: 'center', fontWeight: '700' },
  attributeCard: { padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', gap: 10 },
  attributeHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkbox: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6 },
  checkboxSelected: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  attributeName: { flex: 1, color: '#0f172a', fontSize: 13, fontWeight: '800' },
  optionCount: { color: '#64748b', fontSize: 10, fontWeight: '700' },
  valuesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { color: '#64748b', fontSize: 10, fontWeight: '800' },
  nameToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#dbeafe' },
  nameToggleText: { color: '#1d4ed8', fontSize: 9, fontWeight: '900' },
  hiddenNameText: { color: '#64748b' },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  valueChip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  darkValueChip: { backgroundColor: '#0f172a', borderColor: '#475569' },
  valueChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  valueText: { color: '#475569', fontSize: 10, fontWeight: '700' },
  valueTextSelected: { color: '#ffffff' },
  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 10 },
  count: { color: '#475569', fontSize: 11, fontWeight: '800' },
  footerActions: { flexDirection: 'row', gap: 8 },
  cancelButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#e2e8f0' },
  darkCancel: { backgroundColor: '#334155' },
  cancelText: { color: '#334155', fontSize: 12, fontWeight: '800' },
  generateButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, backgroundColor: '#2563eb' },
  generateText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
  lightText: { color: '#f1f5f9' },
  dimText: { color: '#94a3b8' },
});
