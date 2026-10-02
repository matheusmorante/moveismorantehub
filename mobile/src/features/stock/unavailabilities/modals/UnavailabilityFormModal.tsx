import { Check, Search, X } from 'lucide-react-native';
import type React from 'react';
import {
  ActivityIndicator,
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
import { useMobileUnavailabilityForm } from '../hooks/useMobileUnavailabilityForm';
import { REASONS, TREATMENTS } from '../types';

interface Props {
  isOpen: boolean;
  isDarkMode: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UnavailabilityFormModal: React.FC<Props> = ({
  isOpen,
  isDarkMode,
  onClose,
  onSuccess,
}) => {
  const { state, actions } = useMobileUnavailabilityForm({
    isOpen,
    onClose,
    onSuccess,
  });

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={actions.handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
          {/* Header */}
          <View style={[styles.modalHeader, isDarkMode && styles.modalHeaderDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
              Nova Indisponibilidade
            </Text>
            <TouchableOpacity onPress={actions.handleClose} hitSlop={8}>
              <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Produto / Variação */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                Produto e Variação <Text style={styles.requiredMark}>*</Text>
              </Text>
              {state.selectedProductVariation ? (
                <View style={[styles.selectedCard, isDarkMode && styles.selectedCardDark]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedTitle, isDarkMode && styles.selectedTitleDark]}>
                      {state.selectedProductVariation.variationName}
                    </Text>
                    <Text style={styles.selectedSku}>
                      SKU: {state.selectedProductVariation.sku} • Saldo:{' '}
                      {state.selectedProductVariation.stock}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      actions.setSelectedProductVariation(null);
                      actions.setProductQuery('');
                    }}
                    style={styles.clearSelectedBtn}
                  >
                    <X size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
                    <Search size={18} color="#94a3b8" />
                    <TextInput
                      style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
                      placeholder="Buscar por nome ou SKU..."
                      placeholderTextColor="#94a3b8"
                      value={state.productQuery}
                      onChangeText={actions.setProductQuery}
                      autoCapitalize="none"
                    />
                    {state.isSearchingProduct && <ActivityIndicator size="small" color="#dc2626" />}
                  </View>

                  {/* Sugestões de variações */}
                  {state.productSuggestions.length > 0 && (
                    <View
                      style={[styles.suggestionsList, isDarkMode && styles.suggestionsListDark]}
                    >
                      {state.productSuggestions.map((item) => (
                        <TouchableOpacity
                          key={`${item.id}-${item.variation_id}`}
                          style={[styles.suggestionItem, isDarkMode && styles.suggestionItemDark]}
                          onPress={() => {
                            actions.setSelectedProductVariation(item);
                            actions.setProductQuery('');
                          }}
                        >
                          <Text style={[styles.suggestionName, isDarkMode && styles.textLight]}>
                            {item.variationName}
                          </Text>
                          <Text style={styles.suggestionDetails}>
                            SKU: {item.sku} • Saldo: {item.stock}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Quantidade */}
            <View style={[styles.inputGroup, state.isFieldsDisabled && styles.disabledGroup]}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                Quantidade <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  isDarkMode && styles.inputDark,
                  state.isFieldsDisabled && styles.inputDisabled,
                ]}
                keyboardType="numeric"
                value={state.quantity}
                onChangeText={actions.setQuantity}
                placeholder="Ex: 1"
                placeholderTextColor="#94a3b8"
                editable={!state.isFieldsDisabled}
              />
            </View>

            {/* Motivo */}
            <View style={[styles.inputGroup, state.isFieldsDisabled && styles.disabledGroup]}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                Motivo <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.wrapPills}>
                {REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    disabled={state.isFieldsDisabled}
                    style={[
                      styles.pill,
                      isDarkMode && styles.pillDark,
                      state.reason === r && styles.pillActive,
                      state.isFieldsDisabled && styles.pillDisabled,
                    ]}
                    onPress={() => actions.setReason(r)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isDarkMode && styles.textLight,
                        state.reason === r && styles.pillTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tratativa */}
            <View style={[styles.inputGroup, state.isFieldsDisabled && styles.disabledGroup]}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                Tratativa <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.wrapPills}>
                {TREATMENTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    disabled={state.isFieldsDisabled}
                    style={[
                      styles.pill,
                      isDarkMode && styles.pillDark,
                      state.treatment === t && styles.pillActive,
                      state.isFieldsDisabled && styles.pillDisabled,
                    ]}
                    onPress={() => actions.setTreatment(t)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isDarkMode && styles.textLight,
                        state.treatment === t && styles.pillTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fornecedor Alvo (se devolução) */}
            {state.treatment === 'Devolução ao fornecedor' && (
              <View style={[styles.inputGroup, state.isFieldsDisabled && styles.disabledGroup]}>
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                  Fornecedor Alvo <Text style={styles.requiredMark}>*</Text>
                </Text>
                {state.suppliers.length === 0 ? (
                  <Text style={[styles.emptySupplierText, isDarkMode && styles.textLight]}>
                    Nenhum fornecedor vinculado a este produto.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pillsRow}
                  >
                    {state.suppliers.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        disabled={state.isFieldsDisabled}
                        style={[
                          styles.pill,
                          isDarkMode && styles.pillDark,
                          state.selectedSupplierId === s.id && styles.pillActive,
                          state.isFieldsDisabled && styles.pillDisabled,
                        ]}
                        onPress={() => actions.setSelectedSupplierId(s.id)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            isDarkMode && styles.textLight,
                            state.selectedSupplierId === s.id && styles.pillTextActive,
                          ]}
                        >
                          {s.fantasy_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Observação */}
            <View style={[styles.inputGroup, state.isFieldsDisabled && styles.disabledGroup]}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Observação</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  isDarkMode && styles.inputDark,
                  state.isFieldsDisabled && styles.inputDisabled,
                ]}
                placeholder="Detalhes adicionais (opcional)..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={state.observation}
                onChangeText={actions.setObservation}
                editable={!state.isFieldsDisabled}
              />
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={[styles.modalFooter, isDarkMode && styles.modalFooterDark]}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={actions.handleClose}
              disabled={state.isLoading}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!state.selectedProductVariation || state.isLoading) && styles.submitBtnDisabled,
              ]}
              onPress={actions.handleSubmit}
              disabled={!state.selectedProductVariation || state.isLoading}
            >
              {state.isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={16} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Registrar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderDark: {
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalTitleDark: {
    color: '#f8fafc',
  },
  formScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredMark: {
    color: '#dc2626',
  },
  labelDark: {
    color: '#cbd5e1',
  },
  textLight: {
    color: '#e2e8f0',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchBoxDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
  },
  searchInputDark: {
    color: '#f8fafc',
  },
  suggestionsList: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    maxHeight: 180,
  },
  suggestionsListDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionItemDark: {
    borderBottomColor: '#1e293b',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  suggestionDetails: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
  },
  selectedCardDark: {
    backgroundColor: '#064e3b22',
    borderColor: '#065f46',
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  selectedTitleDark: {
    color: '#4ade80',
  },
  selectedSku: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 2,
  },
  clearSelectedBtn: {
    padding: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  wrapPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  pillDark: {
    backgroundColor: '#0f172a',
  },
  pillActive: {
    backgroundColor: '#dc2626',
  },
  pillDisabled: {
    opacity: 0.6,
  },
  pillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  disabledGroup: {
    opacity: 0.55,
  },
  emptySupplierText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalFooterDark: {
    borderTopColor: '#334155',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
});
