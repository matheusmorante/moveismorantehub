import { Check, X } from 'lucide-react-native';
import type React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UnavailabilityProductPicker } from '../components/UnavailabilityProductPicker';
import { useMobileUnavailabilityForm } from '../hooks/useMobileUnavailabilityForm';
import { REASONS, TREATMENTS } from '../types';
import { styles } from './UnavailabilityFormModal.styles';

interface Props {
  readonly isOpen: boolean;
  readonly isDarkMode: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
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
            <UnavailabilityProductPicker
              isDarkMode={isDarkMode}
              selectedProductVariation={state.selectedProductVariation}
              productQuery={state.productQuery}
              isSearchingProduct={state.isSearchingProduct}
              productSuggestions={state.productSuggestions}
              onSelectProductVariation={actions.setSelectedProductVariation}
              onProductQueryChange={actions.setProductQuery}
            />

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
