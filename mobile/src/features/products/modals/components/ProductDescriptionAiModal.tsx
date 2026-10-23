import type React from 'react';
import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
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
import { ClipboardList, FileText, Sparkles, X } from 'lucide-react-native';
import { productAiDescriptiveTextFormSchema } from '../../../../../../shared-utils/productAiFormSchemas';
import { useZodForm } from '../../../../hooks/useZodForm';
import { buildProductDescriptionModelSummary } from '../../domain/productDescriptionModelSummary';

type GenerationMode = 'characteristics' | 'informative_text';

interface Props {
  visible: boolean;
  dark: boolean;
  productName: string;
  brand: string;
  model: string;
  line: string;
  modelOrLine: string;
  missingPrerequisites: string[];
  isGenerating: boolean;
  onClose: () => void;
  onGenerateFromCharacteristics: () => void | Promise<void>;
  onGenerateFromInformativeText: (text: string) => void | Promise<void>;
}

export const ProductDescriptionAiModal: React.FC<Props> = ({
  visible,
  dark,
  productName,
  brand,
  model,
  line,
  modelOrLine,
  missingPrerequisites,
  isGenerating,
  onClose,
  onGenerateFromCharacteristics,
  onGenerateFromInformativeText,
}) => {
  const [activeMode, setActiveMode] = useState<GenerationMode>('characteristics');
  const hasCharacteristicsPrerequisites = missingPrerequisites.length === 0;
  const form = useZodForm(productAiDescriptiveTextFormSchema, {
    descriptiveText: '',
    additionalInfo: '',
  });
  const {
    control,
    formState: { errors },
    getValues,
    reset,
    validateAndRun,
  } = form;

  useEffect(() => {
    if (!visible) return;
    reset({ descriptiveText: '', additionalInfo: '' });
    setActiveMode(hasCharacteristicsPrerequisites ? 'characteristics' : 'informative_text');
  }, [visible, hasCharacteristicsPrerequisites, reset]);

  const submitInformativeText = async () => {
    await validateAndRun(
      { descriptiveText: getValues('descriptiveText') || '', additionalInfo: '' },
      async (values) => onGenerateFromInformativeText(values.descriptiveText)
    );
  };
  const lightText = dark && styles.lightText;
  const mutedText = dark && styles.mutedLightText;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isGenerating ? undefined : onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, dark && styles.sheetDark]}>
          <View style={[styles.header, dark && styles.headerDark]}>
            <View style={styles.titleGroup}>
              <View style={styles.iconBadge}><Sparkles size={17} color="#d97706" /></View>
              <View style={styles.titleCopy}>
                <Text style={[styles.title, lightText]}>Gerar descrição com IA</Text>
                <Text style={[styles.subtitle, mutedText]}>Escolha os dados que a IA deve usar.</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              disabled={isGenerating}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              style={styles.closeButton}
            >
              <X size={20} color={dark ? '#cbd5e1' : '#64748b'} />
            </Pressable>
          </View>

          <View style={[styles.modeSelector, dark && styles.modeSelectorDark]}>
            <Pressable
              onPress={() => setActiveMode('characteristics')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeMode === 'characteristics' }}
              style={[styles.modeButton, activeMode === 'characteristics' && styles.modeButtonActive]}
            >
              <ClipboardList size={15} color={activeMode === 'characteristics' ? '#b45309' : '#64748b'} />
              <Text style={[styles.modeLabel, mutedText, activeMode === 'characteristics' && styles.modeLabelActive]}>Características</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveMode('informative_text')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeMode === 'informative_text' }}
              style={[styles.modeButton, activeMode === 'informative_text' && styles.modeButtonActive]}
            >
              <FileText size={15} color={activeMode === 'informative_text' ? '#b45309' : '#64748b'} />
              <Text style={[styles.modeLabel, mutedText, activeMode === 'informative_text' && styles.modeLabelActive]}>Texto informativo</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} keyboardShouldPersistTaps="handled">
            {activeMode === 'characteristics' ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, lightText]}>Dados do cadastro</Text>
                <View style={[styles.summary, dark && styles.summaryDark]}>
                  <SummaryRow label="Nome" value={productName} dark={dark} />
                  <SummaryRow label="Marca" value={brand} dark={dark} />
                  {buildProductDescriptionModelSummary({ model, line, modelOrLine }).map((row) => (
                    <SummaryRow key={row.label} label={row.label} value={row.value} dark={dark} />
                  ))}
                </View>
                {missingPrerequisites.length ? (
                  <Text style={styles.warningText}>Preencha no cadastro: {missingPrerequisites.join(', ')}. Ou use Texto informativo.</Text>
                ) : (
                  <Text style={[styles.helperText, mutedText]}>A IA usará as características e medidas. A cor fica de fora porque pertence às variações.</Text>
                )}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={[styles.inputLabel, lightText]}>Texto informativo / anotações do produto</Text>
                <Controller
                  control={control}
                  name="descriptiveText"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      editable={!isGenerating}
                      multiline
                      textAlignVertical="top"
                      accessibilityLabel="Texto informativo / anotações do produto"
                      placeholder="Cole ou digite especificações, materiais, funções e medidas do produto..."
                      placeholderTextColor={dark ? '#64748b' : '#94a3b8'}
                      style={[styles.textInput, dark && styles.textInputDark, lightText]}
                    />
                  )}
                />
                {typeof errors.descriptiveText?.message === 'string' ? (
                  <Text style={styles.errorText} accessibilityLiveRegion="polite">{errors.descriptiveText.message}</Text>
                ) : null}
                <Text style={[styles.helperText, mutedText]}>A IA organizará as informações em uma descrição comercial, sem inventar especificações nem mencionar cor.</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, dark && styles.footerDark]}>
            <Pressable onPress={onClose} disabled={isGenerating} accessibilityRole="button" style={[styles.secondaryButton, dark && styles.secondaryButtonDark]}>
              <Text style={[styles.secondaryButtonText, lightText]}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => activeMode === 'characteristics'
                ? void onGenerateFromCharacteristics()
                : void submitInformativeText()}
              disabled={isGenerating || (activeMode === 'characteristics' && !hasCharacteristicsPrerequisites)}
              accessibilityRole="button"
              accessibilityLabel={activeMode === 'characteristics' ? 'Gerar descrição a partir das características' : 'Gerar descrição via texto informativo'}
              style={[styles.primaryButton, (isGenerating || (activeMode === 'characteristics' && !hasCharacteristicsPrerequisites)) && styles.disabledButton]}
            >
              {isGenerating ? <ActivityIndicator size="small" color="#ffffff" /> : <Sparkles size={15} color="#ffffff" />}
              <Text style={styles.primaryButtonText}>{isGenerating ? 'Gerando...' : 'Gerar descrição'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const SummaryRow: React.FC<{ label: string; value: string; dark: boolean }> = ({ label, value, dark }) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, dark && styles.mutedLightText]}>{label}:</Text>
    <Text style={[styles.summaryValue, dark && styles.lightText]}>{value.trim() || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(15,23,42,0.68)' },
  sheet: { maxHeight: '88%', overflow: 'hidden', borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  sheetDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  header: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerDark: { borderBottomColor: '#1e293b' },
  titleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  titleCopy: { flex: 1, gap: 2 },
  iconBadge: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#fef3c7' },
  title: { color: '#1e293b', fontSize: 14, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 11 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modeSelector: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modeSelectorDark: { borderBottomColor: '#1e293b' },
  modeButton: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  modeButtonActive: { borderBottomColor: '#f59e0b' },
  modeLabel: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  modeLabelActive: { color: '#b45309' },
  content: { flexGrow: 0 },
  contentInner: { padding: 18 },
  section: { gap: 12 },
  sectionTitle: { color: '#334155', fontSize: 13, fontWeight: '800' },
  summary: { gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  summaryDark: { borderColor: '#334155', backgroundColor: '#020617' },
  summaryRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  summaryLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  summaryValue: { color: '#334155', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  warningText: { color: '#92400e', fontSize: 12, lineHeight: 18, padding: 12, borderRadius: 14, backgroundColor: '#fef3c7' },
  helperText: { color: '#64748b', fontSize: 11, lineHeight: 17 },
  inputLabel: { color: '#334155', fontSize: 12, fontWeight: '800' },
  textInput: { minHeight: 170, maxHeight: 290, borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', padding: 14, color: '#0f172a', fontSize: 13, lineHeight: 19 },
  textInputDark: { borderColor: '#475569', backgroundColor: '#1e293b' },
  errorText: { color: '#dc2626', fontSize: 11, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#f8fafc' },
  footerDark: { borderTopColor: '#1e293b', backgroundColor: '#020617' },
  secondaryButton: { minHeight: 44, minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14 },
  secondaryButtonDark: { backgroundColor: '#1e293b' },
  secondaryButtonText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  primaryButton: { minHeight: 44, minWidth: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#d97706' },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  lightText: { color: '#f8fafc' },
  mutedLightText: { color: '#94a3b8' },
});
