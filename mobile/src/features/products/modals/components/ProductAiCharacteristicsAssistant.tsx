import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, FileText, Search, Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useZodForm, flattenFormErrors } from '../../../../hooks/useZodForm';
import { resolveProductAiAttributeDataType } from '../../../../../../shared-utils/productAiAttributeTypes';
import {
  productAiCharacteristicsModalFormSchema,
  productAiDescriptiveTextFormSchema,
  type ProductAiSuggestedCharacteristics,
} from '../../../../../../shared-utils/productAiFormSchemas';
import { applyMobileAiCharacteristicsToProduct, buildMobileAiSuggestionRows } from '../../domain/mobileProductAiApply';
import type { MobileProductTechnicalField } from '../../services/mobileProductTechnicalService';
import {
  extractMobileProductCharacteristicsFromText,
  extractMobileProductCharacteristicsWithAI,
  getMobileProductCharacteristicsQuota,
  type MobileProductCharacteristicsQuota,
} from '../../services/mobileProductAiService';

type Props = {
  formData: any;
  setFormData: (fn: (previous: any) => any) => void;
  availableAttributes: readonly MobileProductTechnicalField[];
  categoryName: string;
  dark: boolean;
};

type AssistantMode = 'web_search' | 'descriptive_text';

const getQuotaError = (quota: MobileProductCharacteristicsQuota | null) =>
  !quota || quota.usedMinute >= quota.limitMinute || quota.usedHour >= quota.limitHour || quota.usedToday >= quota.limitToday;

export const ProductAiCharacteristicsAssistant: React.FC<Props> = ({
  formData,
  setFormData,
  availableAttributes,
  categoryName,
  dark,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('web_search');
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [phase, setPhase] = useState<'input' | 'review'>('input');
  const [quota, setQuota] = useState<MobileProductCharacteristicsQuota | null>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [result, setResult] = useState<ProductAiSuggestedCharacteristics | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const requestInFlight = useRef(false);
  const additionalInfoForm = useZodForm(productAiCharacteristicsModalFormSchema, { additionalInfo: '' });
  const descriptiveTextForm = useZodForm(productAiDescriptiveTextFormSchema, { descriptiveText: '', additionalInfo: '' });
  const rows = useMemo(
    () => result ? buildMobileAiSuggestionRows(result, formData) : [],
    [result, formData]
  );
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const isBlocked = quota ? getQuotaError(quota) : isLoadingQuota || quotaError;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoadingQuota(true);
    setQuotaError(false);
    getMobileProductCharacteristicsQuota()
      .then((value) => { if (active) setQuota(value); })
      .catch(() => { if (active) { setQuota(null); setQuotaError(true); } })
      .finally(() => { if (active) setIsLoadingQuota(false); });
    return () => { active = false; };
  }, [isOpen]);

  const close = () => {
    if (isGenerating) return;
    setIsOpen(false);
    setPhase('input');
    setResult(null);
    setSelected({});
    setEditedValues({});
  };

  const getContext = (additionalInfo: string) => ({
    productName: String(formData.name || '').trim(),
    brand: String(formData.brand || '').trim(),
    model: String(formData.line || formData.model || '').trim(),
    categoryName: String(categoryName || formData.category || '').trim(),
    description: String(formData.description || '').trim(),
    additionalInfo,
    images: Array.isArray(formData.images) ? formData.images.filter((image: unknown) => typeof image === 'string') : [],
    availableAttributes: availableAttributes.map((attribute) => ({
      id: String(attribute.id),
      name: attribute.name,
      dataType: resolveProductAiAttributeDataType(attribute.name, attribute.data_type),
      options: (attribute.options || []).map((option: any) => String(option?.value ?? option?.label ?? option)),
    })),
  });

  const startReview = (suggested: ProductAiSuggestedCharacteristics) => {
    const nextRows = buildMobileAiSuggestionRows(suggested, formData);
    setResult(suggested);
    setEditedValues({});
    setSelected(Object.fromEntries(nextRows.map((row) => [row.key, !row.isExisting])));
    setPhase('review');
    void getMobileProductCharacteristicsQuota().then(setQuota).catch(() => {
      setQuota(null);
      setQuotaError(true);
    });
  };

  const handleWebSearch = async () => {
    if (requestInFlight.current || isBlocked || quotaError) return;
    await additionalInfoForm.validateAndRun({ additionalInfo: additionalInfoForm.getValues('additionalInfo') || '' }, async ({ additionalInfo }) => {
      requestInFlight.current = true;
      setIsGenerating(true);
      try {
        const suggested = await extractMobileProductCharacteristicsWithAI({
          ...getContext(additionalInfo),
          productName: String(formData.name || '').trim(),
        });
        startReview(suggested);
      } catch (error) {
        Alert.alert('Não foi possível preencher', error instanceof Error ? error.message : 'Tente novamente.');
      } finally {
        requestInFlight.current = false;
        setIsGenerating(false);
      }
    }, (errors) => Alert.alert('Revise os dados', Object.values(flattenFormErrors(errors))[0] || 'Preencha o nome do produto.'));
  };

  const handleDescriptiveText = async () => {
    if (requestInFlight.current || isBlocked || quotaError) return;
    const current = descriptiveTextForm.getValues();
    await descriptiveTextForm.validateAndRun(current, async (values) => {
      requestInFlight.current = true;
      setIsGenerating(true);
      try {
        const suggested = await extractMobileProductCharacteristicsFromText({
          descriptiveText: values.descriptiveText,
          additionalInfo: values.additionalInfo,
          currentName: String(formData.name || ''),
          currentBrand: String(formData.brand || ''),
          currentModel: String(formData.line || formData.model || ''),
          categoryName,
          availableAttributes: getContext('').availableAttributes,
        });
        startReview(suggested);
      } catch (error) {
        Alert.alert('Não foi possível processar', error instanceof Error ? error.message : 'Tente novamente.');
      } finally {
        requestInFlight.current = false;
        setIsGenerating(false);
      }
    }, (errors) => Alert.alert('Revise os dados', Object.values(flattenFormErrors(errors))[0] || 'Cole a ficha técnica do produto.'));
  };

  const toggleAll = (value: boolean) => setSelected(Object.fromEntries(rows.map((row) => [row.key, value])));
  const applySelected = () => {
    if (!result || selectedCount === 0) return;
    setFormData((previous) => applyMobileAiCharacteristicsToProduct(previous, result, selected, editedValues));
    close();
  };

  const errorText = quotaError
    ? 'Não foi possível validar a cota agora. A geração fica bloqueada até a validação voltar.'
    : !isLoadingQuota && isBlocked
      ? 'Cota de preenchimento com IA esgotada. Aguarde a renovação.'
      : '';

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={[styles.openButton, dark && styles.openButtonDark]}
        accessibilityRole="button"
        accessibilityLabel="Preencher características do produto com IA"
      >
        <Sparkles size={16} color="#ffffff" />
        <Text style={styles.openButtonText}>Preencher características com IA</Text>
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
        <KeyboardAvoidingView style={[styles.screen, dark && styles.screenDark]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.header, dark && styles.headerDark, { paddingTop: 12 + topInset }]}>
            <View style={styles.headerIcon}><Sparkles size={18} color="#b45309" /></View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, dark && styles.lightText]}>{phase === 'input' ? 'Preenchimento inteligente' : 'Revise as sugestões'}</Text>
              <Text style={[styles.subtitle, dark && styles.dimText]}>{phase === 'input' ? 'Escolha uma fonte para preencher os dados do produto.' : 'Selecione e edite os campos antes de aplicar.'}</Text>
            </View>
            <TouchableOpacity onPress={close} disabled={isGenerating} accessibilityRole="button" accessibilityLabel="Fechar preenchimento com IA" style={styles.closeButton}>
              <X size={18} color={dark ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {phase === 'input' ? (
              <>
                <View style={[styles.modePicker, dark && styles.cardDark]}>
                  <TouchableOpacity onPress={() => setMode('web_search')} style={[styles.modeButton, mode === 'web_search' && styles.modeButtonActive]} accessibilityRole="button" accessibilityLabel="Modo pesquisa na web">
                    <Search size={15} color={mode === 'web_search' ? '#ffffff' : '#475569'} />
                    <Text style={[styles.modeText, mode === 'web_search' && styles.modeTextActive]}>Pesquisa web</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMode('descriptive_text')} style={[styles.modeButton, mode === 'descriptive_text' && styles.modeButtonActive]} accessibilityRole="button" accessibilityLabel="Modo ficha técnica">
                    <FileText size={15} color={mode === 'descriptive_text' ? '#ffffff' : '#475569'} />
                    <Text style={[styles.modeText, mode === 'descriptive_text' && styles.modeTextActive]}>Ficha técnica</Text>
                  </TouchableOpacity>
                </View>

                {mode === 'web_search' ? (
                  <View style={[styles.card, dark && styles.cardDark]}>
                    <Text style={[styles.sectionTitle, dark && styles.lightText]}>Dados usados na pesquisa</Text>
                    <Text style={[styles.helper, dark && styles.dimText]}>Produto: {formData.name || 'Informe o nome na aba Informações Básicas'}</Text>
                    <Text style={[styles.helper, dark && styles.dimText]}>Categoria: {categoryName || 'Não informada'}</Text>
                    <Text style={[styles.helper, dark && styles.dimText]}>Fotos disponíveis: {Array.isArray(formData.images) ? formData.images.length : 0}</Text>
                    <Text style={[styles.label, dark && styles.dimText]}>Informações adicionais (opcional)</Text>
                    <TextInput
                      value={additionalInfoForm.watch('additionalInfo') || ''}
                      onChangeText={(value) => additionalInfoForm.setValue('additionalInfo', value)}
                      editable={!isGenerating && !isBlocked && !quotaError}
                      maxLength={3000}
                      multiline
                      placeholder="Modelo, linha, tipo de puxador, observações do fabricante..."
                      placeholderTextColor="#94a3b8"
                      style={[styles.input, styles.multiline, dark && styles.inputDark, dark && styles.lightText]}
                      accessibilityLabel="Informações adicionais para pesquisa de características"
                    />
                  </View>
                ) : (
                  <View style={[styles.card, dark && styles.cardDark]}>
                    <Text style={[styles.sectionTitle, dark && styles.lightText]}>Cole a ficha técnica recebida</Text>
                    <Text style={[styles.helper, dark && styles.dimText]}>A IA organiza nome, marca, modelo, medidas e características sem completar lacunas com suposições.</Text>
                    <TextInput
                      value={descriptiveTextForm.watch('descriptiveText')}
                      onChangeText={(value) => descriptiveTextForm.setValue('descriptiveText', value)}
                      editable={!isGenerating && !isBlocked && !quotaError}
                      maxLength={12000}
                      multiline
                      placeholder="Cole especificações do fornecedor, catálogo ou manual..."
                      placeholderTextColor="#94a3b8"
                      style={[styles.input, styles.multiline, styles.largeInput, dark && styles.inputDark, dark && styles.lightText]}
                      accessibilityLabel="Ficha técnica descritiva do produto"
                    />
                    <Text style={[styles.label, dark && styles.dimText]}>Instruções extras (opcional)</Text>
                    <TextInput
                      value={descriptiveTextForm.watch('additionalInfo') || ''}
                      onChangeText={(value) => descriptiveTextForm.setValue('additionalInfo', value)}
                      editable={!isGenerating && !isBlocked && !quotaError}
                      maxLength={3000}
                      placeholder="Ex.: priorize as medidas do manual."
                      placeholderTextColor="#94a3b8"
                      style={[styles.input, dark && styles.inputDark, dark && styles.lightText]}
                      accessibilityLabel="Instruções extras para extração"
                    />
                  </View>
                )}

                <View style={[styles.quotaCard, dark && styles.cardDark]}>
                  {isLoadingQuota ? <ActivityIndicator size="small" color="#d97706" /> : null}
                  <Text style={[styles.helper, dark && styles.dimText]}>
                    {quota ? `Cota: ${quota.usedMinute}/${quota.limitMinute} por minuto · ${quota.usedHour}/${quota.limitHour} por hora · ${quota.usedToday}/${quota.limitToday} hoje` : 'Consultando cota de uso...'}
                  </Text>
                  {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                </View>
              </>
            ) : (
              <>
                <View style={[styles.reviewToolbar, dark && styles.cardDark]}>
                  <Text style={[styles.sectionTitle, dark && styles.lightText]}>{selectedCount} campo(s) selecionado(s)</Text>
                  <View style={styles.reviewToolbarActions}>
                    <TouchableOpacity onPress={() => toggleAll(true)} accessibilityRole="button"><Text style={styles.linkText}>Marcar todos</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleAll(false)} accessibilityRole="button"><Text style={styles.linkText}>Limpar</Text></TouchableOpacity>
                  </View>
                </View>
                {rows.map((row) => {
                  const checked = Boolean(selected[row.key]);
                  return (
                    <View key={row.key} style={[styles.suggestionCard, dark && styles.cardDark]}>
                      <TouchableOpacity onPress={() => setSelected((previous) => ({ ...previous, [row.key]: !previous[row.key] }))} style={styles.suggestionHeading} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`Aplicar ${row.label}`}>
                        <View style={[styles.checkbox, checked && styles.checkboxSelected]}>{checked ? <Check size={13} color="#ffffff" /> : null}</View>
                        <Text style={[styles.label, dark && styles.lightText]}>{row.label}</Text>
                        {row.confidence ? <Text style={styles.confidence}>{row.confidence}</Text> : null}
                      </TouchableOpacity>
                      <TextInput
                        value={editedValues[row.key] ?? row.value}
                        onChangeText={(value) => setEditedValues((previous) => ({ ...previous, [row.key]: value }))}
                        editable={!isGenerating}
                        multiline={row.key === '__field_description__'}
                        style={[styles.input, dark && styles.inputDark, dark && styles.lightText]}
                        accessibilityLabel={`Editar sugestão ${row.label}`}
                      />
                    </View>
                  );
                })}
                {result?.identifiedProduct?.divergences ? (
                  <View style={[styles.noteCard, dark && styles.cardDark]}><Text style={[styles.helper, dark && styles.dimText]}>Divergências: {result.identifiedProduct.divergences}</Text></View>
                ) : null}
                {result?.reasoning ? <Text style={[styles.helper, dark && styles.dimText]}>Observação da IA: {result.reasoning}</Text> : null}
                {(result?.identifiedProduct?.sources || result?.sources || []).map((source, index) => {
                  const safeUri = source.uri?.startsWith('https://') ? source.uri : undefined;
                  return (
                  <TouchableOpacity key={`${source.uri || source.title}-${index}`} disabled={!safeUri} onPress={() => safeUri && Linking.openURL(safeUri).catch(() => undefined)} accessibilityRole="link" style={styles.sourceRow}>
                    <Text style={styles.linkText}>{source.title}</Text>
                    {safeUri ? <Text numberOfLines={1} style={[styles.helper, dark && styles.dimText]}>{safeUri}</Text> : null}
                  </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>

          <View
            style={[styles.footer, dark && styles.headerDark, { paddingBottom: 10 + bottomInset }]}
          >
            {phase === 'review' ? (
              <>
                <TouchableOpacity onPress={() => setPhase('input')} disabled={isGenerating} style={styles.secondaryButton} accessibilityRole="button"><Text style={styles.secondaryText}>Voltar</Text></TouchableOpacity>
                <TouchableOpacity onPress={applySelected} disabled={selectedCount === 0 || isGenerating} style={[styles.primaryButton, (selectedCount === 0 || isGenerating) && styles.disabledButton]} accessibilityRole="button" accessibilityLabel={`Aplicar ${selectedCount} campos selecionados`}>
                  <Check size={16} color="#ffffff" /><Text style={styles.primaryText}>Aplicar selecionados</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={close} disabled={isGenerating} style={styles.secondaryButton} accessibilityRole="button"><Text style={styles.secondaryText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={mode === 'web_search' ? handleWebSearch : handleDescriptiveText} disabled={isGenerating || isLoadingQuota || isBlocked || quotaError} style={[styles.primaryButton, (isGenerating || isLoadingQuota || isBlocked || quotaError) && styles.disabledButton]} accessibilityRole="button">
                  {isGenerating ? <ActivityIndicator size="small" color="#ffffff" /> : <Sparkles size={15} color="#ffffff" />}
                  <Text style={styles.primaryText}>{isGenerating ? 'Consultando...' : mode === 'web_search' ? 'Pesquisar com IA' : 'Extrair com IA'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  openButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#d97706' },
  openButtonDark: { backgroundColor: '#b45309' },
  openButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  screenDark: { backgroundColor: '#020617' },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff' },
  headerDark: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  headerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7' },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  closeButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  modePicker: { flexDirection: 'row', padding: 4, borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', gap: 5 },
  modeButton: { flex: 1, minHeight: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modeButtonActive: { backgroundColor: '#d97706' },
  modeText: { color: '#475569', fontSize: 11, fontWeight: '800' },
  modeTextActive: { color: '#ffffff' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', gap: 10 },
  cardDark: { borderColor: '#334155', backgroundColor: '#0f172a' },
  sectionTitle: { color: '#334155', fontSize: 13, fontWeight: '900' },
  helper: { color: '#64748b', fontSize: 11, fontWeight: '600', lineHeight: 17 },
  label: { color: '#475569', fontSize: 11, fontWeight: '800' },
  input: { minHeight: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, color: '#0f172a', fontSize: 12, fontWeight: '600', backgroundColor: 'transparent' },
  inputDark: { borderColor: '#475569', color: '#f8fafc' },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  largeInput: { minHeight: 180 },
  quotaCard: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  errorText: { width: '100%', color: '#b91c1c', fontSize: 11, fontWeight: '700' },
  reviewToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  reviewToolbarActions: { flexDirection: 'row', gap: 14 },
  linkText: { color: '#2563eb', fontSize: 11, fontWeight: '800' },
  suggestionCard: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', gap: 9 },
  suggestionHeading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 19, height: 19, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  confidence: { marginLeft: 'auto', color: '#64748b', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  noteCard: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  sourceRow: { paddingVertical: 5, gap: 2 },
  footer: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff' },
  primaryButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#d97706' },
  disabledButton: { opacity: 0.45 },
  primaryText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  secondaryButton: { minHeight: 44, minWidth: 78, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#e2e8f0' },
  secondaryText: { color: '#475569', fontSize: 11, fontWeight: '800' },
  lightText: { color: '#f8fafc' },
  dimText: { color: '#94a3b8' },
});
