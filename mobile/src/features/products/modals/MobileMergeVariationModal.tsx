import type React from 'react';
import { useEffect, useState } from 'react';
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
  type MobileCanonicalVariation,
  mergeMobileVariationIntoCanonical,
  searchMobileCanonicalVariations,
} from '../services/mobileProductVariationActionsService';

interface Props {
  visible: boolean;
  dark: boolean;
  variation: any | null;
  parentProduct: any | null;
  onClose: () => void;
  onMerged: () => void | Promise<void>;
}

export const MobileMergeVariationModal: React.FC<Props> = ({
  visible,
  dark,
  variation,
  parentProduct,
  onClose,
  onMerged,
}) => {
  const sourceId = String(variation?.variationId || variation?.id || '');
  const supplierId = String(parentProduct?.supplierId || parentProduct?.supplier_id || '');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<MobileCanonicalVariation[]>([]);
  const [target, setTarget] = useState<MobileCanonicalVariation | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !variation) return;
    setQuery('');
    setOptions([]);
    setTarget(null);
    setLoading(false);
    setSaving(false);
  }, [visible, sourceId]);

  useEffect(() => {
    if (!visible || !variation || query.trim().length < 2 || target) {
      setOptions([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const timeout = setTimeout(() => {
      searchMobileCanonicalVariations(query, sourceId, supplierId || undefined)
        .then((results) => {
          if (active) setOptions(results);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setOptions([]);
          Alert.alert(
            'Não foi possível buscar variações',
            error instanceof Error ? error.message : 'Confira a conexão e tente novamente.'
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [visible, variation, query, target, sourceId, supplierId]);

  const handleMerge = async () => {
    if (!target || !sourceId || saving) return;
    try {
      setSaving(true);
      const result = await mergeMobileVariationIntoCanonical(sourceId, target.id);
      await onMerged();
      onClose();
      Alert.alert(
        'Variação mesclada',
        `O vínculo canônico foi salvo e o histórico foi preservado. ${result.transferredSupplierIds.length} fornecedor(es) exclusivo(s) foram incorporados ao produto canônico.`
      );
    } catch (error: unknown) {
      Alert.alert(
        'Não foi possível mesclar as variações',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const sourceLabel = String(
    variation?.name || variation?.displayName || variation?.sku || sourceId
  );
  const showResults = query.trim().length >= 2 && !target;

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
                Mesclar com outra variação
              </Text>
              <Text style={[styles.subtitle, dark && styles.subtitleDark]}>
                “{sourceLabel}” manterá o UUID histórico e apontará para a variação canônica.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar mesclagem de variação"
            >
              <Text style={[styles.closeText, dark && styles.textDark]}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>Histórico preservado</Text>
              <Text style={styles.warningText}>
                Movimentações, recebimentos, quantidades, custos e fornecedor histórico não serão
                alterados.
              </Text>
            </View>

            <View>
              <Text style={[styles.label, dark && styles.textDark]}>
                Variação canônica de destino
              </Text>
              <TextInput
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  setTarget(null);
                }}
                placeholder="Nome ou SKU (mín. 2 caracteres)"
                placeholderTextColor="#94a3b8"
                style={[styles.input, dark && styles.inputDark, target && styles.inputSelected]}
                autoCorrect={false}
                accessibilityLabel="Pesquisar variação canônica"
              />
            </View>

            {loading ? <ActivityIndicator color="#4f46e5" style={styles.loader} /> : null}
            {showResults ? (
              <View style={[styles.results, dark && styles.resultsDark]}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.option, dark && styles.borderDark]}
                    onPress={() => {
                      setTarget(option);
                      setQuery(option.name);
                      setOptions([]);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Selecionar ${option.name} como variação canônica`}
                  >
                    <Text style={[styles.optionName, dark && styles.textDark]} numberOfLines={2}>
                      {option.name}
                    </Text>
                    <Text style={styles.optionMeta} numberOfLines={2}>
                      {option.product?.name || option.product?.description || 'Produto pai'}
                      {option.sku ? ` • SKU: ${option.sku}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
                {!loading && options.length === 0 ? (
                  <Text style={styles.emptyResult}>Nenhuma variação encontrada.</Text>
                ) : null}
              </View>
            ) : null}

            {target ? (
              <View style={styles.selected}>
                <Text style={styles.selectedTitle}>Destino selecionado</Text>
                <Text style={styles.selectedName}>{target.name}</Text>
                <Text style={styles.selectedMeta}>
                  {target.product?.name || target.product?.description || 'Produto pai'}
                  {target.sku ? ` • SKU: ${target.sku}` : ''}
                </Text>
              </View>
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
              onPress={() => void handleMerge()}
              disabled={!target || saving}
              style={[
                styles.footerButton,
                styles.confirmButton,
                (!target || saving) && styles.disabledButton,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>
                {saving ? 'Mesclando…' : 'Confirmar mesclagem'}
              </Text>
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
  loader: { marginVertical: 8 },
  results: {
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  resultsDark: { borderColor: '#334155', backgroundColor: '#1e293b' },
  option: {
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    justifyContent: 'center',
    gap: 3,
  },
  optionName: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  optionMeta: { color: '#64748b', fontSize: 11 },
  emptyResult: { padding: 14, color: '#64748b', textAlign: 'center', fontSize: 12 },
  selected: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 3,
  },
  selectedTitle: { color: '#047857', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  selectedName: { color: '#065f46', fontSize: 13, fontWeight: '900' },
  selectedMeta: { color: '#047857', fontSize: 11 },
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
