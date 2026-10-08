import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  checkMobileVariationAttributeConflict,
  countMobileParentVariations,
  ensureMobileAttributeValue,
  fetchMobileVariationFamilies,
  type MobileVariationAttribute,
  type MobileVariationFamily,
  moveMobileVariationToFamily,
  toMobileVariationAttributes,
} from '../services/mobileProductVariationActionsService';

interface Props {
  visible: boolean;
  dark: boolean;
  variation: any | null;
  parentProduct: any | null;
  onClose: () => void;
  onMoved: () => void | Promise<void>;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const familyName = (family: MobileVariationFamily) => family.name || family.description || '';
type AttributeRow = MobileVariationAttribute & { rowId: string };

const getImageUrls = (value: unknown): string[] => {
  if (Array.isArray(value))
    return value.filter((url): url is string => typeof url === 'string' && Boolean(url));
  if (typeof value === 'string')
    return value
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
  return [];
};

export const MobileMoveVariationModal: React.FC<Props> = ({
  visible,
  dark,
  variation,
  parentProduct,
  onClose,
  onMoved,
}) => {
  const variationId = String(variation?.variationId || variation?.id || '');
  const sourceParentId = String(parentProduct?.id || variation?.parentId || '');
  const [families, setFamilies] = useState<MobileVariationFamily[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [familyQuery, setFamilyQuery] = useState('');
  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [conflictState, setConflictState] = useState<
    'idle' | 'checking' | 'clear' | 'conflict' | 'error'
  >('idle');
  const [countdown, setCountdown] = useState(5);
  const [isOnlyVariation, setIsOnlyVariation] = useState(false);
  const [saving, setSaving] = useState(false);
  const attributeRowId = useRef(0);

  const validAttributes = useMemo(
    () => attributes.filter((attribute) => attribute.name.trim() && attribute.value.trim()),
    [attributes]
  );
  const suggestions = useMemo(() => {
    const term = normalize(familyQuery.trim());
    if (term.length < 2 || targetFamilyId) return [];
    return families
      .filter((family) => normalize(`${familyName(family)} ${family.code || ''}`).includes(term))
      .slice(0, 8);
  }, [families, familyQuery, targetFamilyId]);

  useEffect(() => {
    if (!visible || !variation) return;
    let active = true;
    setFamiliesLoading(true);
    setFamilies([]);
    setTargetFamilyId('');
    setFamilyQuery('');
    setShowSuggestions(false);
    setAttributes(
      toMobileVariationAttributes(variation.attributes).map((attribute) => ({
        ...attribute,
        rowId: `attribute-${attributeRowId.current++}`,
      }))
    );
    setConflictState('idle');
    setCountdown(5);
    setIsOnlyVariation(false);

    Promise.allSettled([
      fetchMobileVariationFamilies(sourceParentId),
      sourceParentId ? countMobileParentVariations(sourceParentId) : Promise.resolve(0),
    ])
      .then(([familiesResult, countResult]) => {
        if (!active) return;
        if (familiesResult.status === 'fulfilled') {
          setFamilies(familiesResult.value);
        } else {
          Alert.alert(
            'Não foi possível carregar os produtos pai',
            familiesResult.reason instanceof Error
              ? familiesResult.reason.message
              : 'Tente novamente.'
          );
        }
        if (countResult.status === 'fulfilled') setIsOnlyVariation(countResult.value === 1);
      })
      .finally(() => {
        if (active) setFamiliesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible, variation, sourceParentId]);

  useEffect(() => {
    if (!visible || !targetFamilyId || validAttributes.length === 0) {
      setConflictState('idle');
      return;
    }
    let active = true;
    setConflictState('checking');
    const timeout = setTimeout(() => {
      checkMobileVariationAttributeConflict(targetFamilyId, validAttributes)
        .then((hasConflict) => {
          if (active) setConflictState(hasConflict ? 'conflict' : 'clear');
        })
        .catch(() => {
          if (active) setConflictState('error');
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [visible, targetFamilyId, validAttributes]);

  useEffect(() => {
    if (!visible || !targetFamilyId || conflictState !== 'clear' || saving) {
      setCountdown(5);
      return;
    }
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, targetFamilyId, conflictState, saving, countdown]);

  const updateAttribute = (index: number, field: 'name' | 'value', value: string) => {
    setAttributes((current) =>
      current.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, [field]: value } : attribute
      )
    );
    setCountdown(5);
  };

  const handleMove = async () => {
    const targetFamily = families.find((family) => family.id === targetFamilyId);
    if (!targetFamily || !variationId || !sourceParentId || saving) return;
    try {
      setSaving(true);
      const canonicalAttributes = await Promise.all(
        validAttributes.map(async ({ name, value, showName }) => ({
          ...(await ensureMobileAttributeValue(name, value)),
          ...(showName === undefined ? {} : { showName }),
        }))
      );
      const newName = [familyName(targetFamily), ...canonicalAttributes.map(({ value }) => value)]
        .filter(Boolean)
        .join(' ');

      let images = getImageUrls(variation.images || variation.image_url);
      if (images.length === 0) images = getImageUrls(parentProduct?.images);

      const result = await moveMobileVariationToFamily(
        variationId,
        targetFamily.id,
        canonicalAttributes,
        newName,
        images,
        sourceParentId
      );
      await onMoved();
      onClose();
      Alert.alert(
        'Variação movida',
        result.sourceParentRemoved
          ? `A variação manteve o mesmo ID e histórico. O produto pai de origem, que ficou sem variações, foi removido. Novo SKU: ${result.newSku || 'gerado'}.`
          : `A variação manteve o mesmo ID e histórico. Novo SKU: ${result.newSku || 'gerado'}.`
      );
    } catch (error: unknown) {
      Alert.alert(
        'Não foi possível mover a variação',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const canConfirm =
    Boolean(targetFamilyId) &&
    validAttributes.length > 0 &&
    conflictState === 'clear' &&
    countdown === 0 &&
    !saving &&
    !familiesLoading;
  const buttonLabel = !validAttributes.length
    ? 'Atributo obrigatório'
    : saving
      ? 'Movendo…'
      : conflictState === 'checking'
        ? 'Validando combinação…'
        : conflictState === 'conflict'
          ? 'Resolva o conflito'
          : conflictState === 'error'
            ? 'Falha na validação'
            : targetFamilyId && countdown > 0
              ? `Confirmar em ${countdown}s`
              : isOnlyVariation
                ? 'Mover e remover produto'
                : 'Confirmar mudança';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={saving ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, dark && styles.sheetDark]}>
          <View style={[styles.header, dark && styles.borderDark]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, dark && styles.textDark]}>
                Mover para outro produto pai
              </Text>
              <Text style={[styles.subtitle, dark && styles.subtitleDark]}>
                O ID e o histórico da variação serão preservados.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar movimento de variação"
            >
              <Text style={[styles.closeText, dark && styles.textDark]}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {isOnlyVariation ? (
              <View style={styles.warning}>
                <Text style={styles.warningTitle}>Esta é a única variação deste produto.</Text>
                <Text style={styles.warningText}>
                  Ao movê-la, o produto pai de origem ficará sem variações e será removido. A
                  variação e seu histórico permanecerão.
                </Text>
              </View>
            ) : (
              <View style={styles.info}>
                <Text style={styles.infoText}>
                  O nome passará a usar o novo produto pai e os valores dos atributos. As fotos
                  vinculadas à variação acompanham a mudança.
                </Text>
              </View>
            )}

            <View>
              <Text style={[styles.label, dark && styles.textDark]}>Novo produto pai</Text>
              <TextInput
                value={familyQuery}
                onChangeText={(value) => {
                  setFamilyQuery(value);
                  setTargetFamilyId('');
                  setShowSuggestions(true);
                  setConflictState('idle');
                  setCountdown(5);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Nome ou código (mín. 2 caracteres)"
                placeholderTextColor={dark ? '#94a3b8' : '#94a3b8'}
                style={[
                  styles.input,
                  dark && styles.inputDark,
                  targetFamilyId && styles.inputSelected,
                ]}
                autoCorrect={false}
                accessibilityLabel="Pesquisar produto pai de destino"
              />
              {familiesLoading ? <ActivityIndicator style={styles.loader} color="#4f46e5" /> : null}
              {showSuggestions && !targetFamilyId && familyQuery.trim().length >= 2 ? (
                <View style={[styles.suggestions, dark && styles.suggestionsDark]}>
                  {suggestions.length ? (
                    suggestions.map((family) => (
                      <TouchableOpacity
                        key={family.id}
                        style={[styles.suggestion, dark && styles.borderDark]}
                        onPress={() => {
                          setTargetFamilyId(family.id);
                          setFamilyQuery(
                            `${familyName(family)}${family.code ? ` — ${family.code}` : ''}`
                          );
                          setShowSuggestions(false);
                          setCountdown(5);
                        }}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[styles.suggestionName, dark && styles.textDark]}
                          numberOfLines={2}
                        >
                          {familyName(family) || 'Produto sem nome'}
                        </Text>
                        <Text style={styles.suggestionCode}>
                          Código: {family.code || 'não informado'}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptySuggestion}>Nenhum produto pai encontrado.</Text>
                  )}
                </View>
              ) : null}
            </View>

            <View>
              <View style={styles.attributeHeader}>
                <Text style={[styles.label, dark && styles.textDark]}>Atributos da variação</Text>
                <TouchableOpacity
                  onPress={() => {
                    setAttributes((current) => [
                      ...current,
                      { name: '', value: '', rowId: `attribute-${attributeRowId.current++}` },
                    ]);
                    setCountdown(5);
                  }}
                  disabled={attributes.length >= 8}
                  style={styles.addAttributeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar atributo"
                >
                  <Text style={styles.addAttributeText}>＋ Atributo</Text>
                </TouchableOpacity>
              </View>
              {attributes.length === 0 ? (
                <Text style={[styles.hint, dark && styles.subtitleDark]}>
                  Informe ao menos um atributo e seu valor antes de mover.
                </Text>
              ) : (
                attributes.map((attribute, index) => (
                  <View style={styles.attributeRow} key={attribute.rowId}>
                    <TextInput
                      value={attribute.name}
                      onChangeText={(value) => updateAttribute(index, 'name', value)}
                      placeholder="Atributo (ex.: Cor)"
                      placeholderTextColor="#94a3b8"
                      style={[styles.attributeInput, dark && styles.inputDark]}
                      accessibilityLabel={`Nome do atributo ${index + 1}`}
                    />
                    <TextInput
                      value={attribute.value}
                      onChangeText={(value) => updateAttribute(index, 'value', value)}
                      placeholder="Valor (ex.: Azul)"
                      placeholderTextColor="#94a3b8"
                      style={[styles.attributeInput, dark && styles.inputDark]}
                      accessibilityLabel={`Valor do atributo ${index + 1}`}
                    />
                  </View>
                ))
              )}
            </View>

            {conflictState === 'conflict' ? (
              <View style={styles.conflict}>
                <Text style={styles.conflictTitle}>Combinação já existente</Text>
                <Text style={styles.conflictText}>
                  Este produto pai já tem uma variação com estes mesmos atributos. Altere um valor
                  antes de continuar.
                </Text>
              </View>
            ) : null}
            {conflictState === 'error' ? (
              <Text style={styles.conflictText}>
                Não foi possível validar a combinação. Confira a conexão e tente novamente.
              </Text>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, dark && styles.borderDark]}>
            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              style={[styles.footerButton, styles.cancelButton]}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleMove()}
              disabled={!canConfirm}
              style={[
                styles.footerButton,
                styles.confirmButton,
                !canConfirm && styles.disabledButton,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>{buttonLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    maxHeight: '100%',
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetDark: { backgroundColor: '#0f172a', borderColor: '#334155' },
  header: {
    minHeight: 72,
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerText: { flex: 1, gap: 4 },
  title: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  subtitleDark: { color: '#94a3b8' },
  textDark: { color: '#f8fafc' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#64748b', fontSize: 30, lineHeight: 34 },
  borderDark: { borderColor: '#334155' },
  scroll: { flexGrow: 0, flexShrink: 1, maxHeight: '70%' },
  content: { padding: 16, gap: 16 },
  warning: {
    padding: 13,
    borderRadius: 13,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    gap: 5,
  },
  warningTitle: { color: '#92400e', fontSize: 13, fontWeight: '900' },
  warningText: { color: '#78350f', fontSize: 12, lineHeight: 18 },
  info: {
    padding: 13,
    borderRadius: 13,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: { color: '#1e40af', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  label: { marginBottom: 7, color: '#334155', fontSize: 12, fontWeight: '900' },
  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 11,
    color: '#0f172a',
    fontSize: 14,
  },
  inputDark: { color: '#f8fafc', borderColor: '#475569', backgroundColor: '#1e293b' },
  inputSelected: { borderColor: '#10b981' },
  loader: { marginTop: 8, alignSelf: 'flex-start' },
  suggestions: {
    marginTop: 6,
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  suggestionsDark: { borderColor: '#334155', backgroundColor: '#1e293b' },
  suggestion: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    justifyContent: 'center',
    gap: 2,
  },
  suggestionName: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  suggestionCode: { color: '#64748b', fontSize: 11 },
  emptySuggestion: { padding: 14, color: '#64748b', textAlign: 'center', fontSize: 12 },
  attributeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addAttributeButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 10 },
  addAttributeText: { color: '#4f46e5', fontSize: 12, fontWeight: '900' },
  hint: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  attributeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  attributeInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    color: '#0f172a',
    fontSize: 12,
  },
  conflict: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 4,
  },
  conflictTitle: { color: '#b91c1c', fontSize: 13, fontWeight: '900' },
  conflictText: { color: '#b91c1c', fontSize: 12, lineHeight: 17 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerButton: {
    minHeight: 46,
    paddingHorizontal: 15,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: { backgroundColor: '#f1f5f9' },
  cancelText: { color: '#475569', fontSize: 12, fontWeight: '900' },
  confirmButton: { flexShrink: 1, backgroundColor: '#4f46e5' },
  confirmText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
});
