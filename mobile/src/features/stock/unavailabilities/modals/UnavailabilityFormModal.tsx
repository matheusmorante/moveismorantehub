import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Check, Search } from 'lucide-react-native';
import { supabase } from '../../../../services/supabaseClient';
import { searchProducts } from '../../../../services/stockService';
import { createStockUnavailability } from '../../../../services/stock/stockUnavailabilitiesService';
import { REASONS, TREATMENTS, LOCATIONS } from '../types';

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
  const [isLoading, setIsLoading] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [selectedProductVariation, setSelectedProductVariation] = useState<any | null>(null);

  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [treatment, setTreatment] = useState<string>(TREATMENTS[0]);
  const [physicalLocation, setPhysicalLocation] = useState<string>(LOCATIONS[0]);
  const [observation, setObservation] = useState('');

  const [suppliers, setSuppliers] = useState<{ id: string; fantasy_name: string }[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Busca fornecedores
    const fetchSuppliers = async () => {
      try {
        const { data } = await supabase
          .from('suppliers')
          .select('id, fantasy_name')
          .order('fantasy_name');
        if (data) setSuppliers(data);
      } catch (e) {
        console.warn('Erro ao carregar fornecedores no mobile:', e);
      }
    };
    fetchSuppliers();
  }, [isOpen]);

  // Debounced search de produtos com variação
  useEffect(() => {
    if (productQuery.trim().length < 2 || selectedProductVariation) {
      setProductSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const results = await searchProducts(productQuery);
        setProductSuggestions(results);
      } catch (e) {
        console.warn('Erro na busca de produtos:', e);
      } finally {
        setIsSearchingProduct(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [productQuery, selectedProductVariation]);

  const resetForm = () => {
    setSelectedProductVariation(null);
    setProductQuery('');
    setQuantity('1');
    setReason(REASONS[0]);
    setTreatment(TREATMENTS[0]);
    setPhysicalLocation(LOCATIONS[0]);
    setSelectedSupplierId('');
    setObservation('');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedProductVariation) {
      Alert.alert('Atenção', 'Selecione uma variação do produto.');
      return;
    }

    const qty = parseFloat(quantity.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida maior que zero.');
      return;
    }

    if (treatment === 'Devolução ao fornecedor' && !selectedSupplierId) {
      Alert.alert('Atenção', 'Selecione o fornecedor para a devolução.');
      return;
    }

    const currentStock = Number(selectedProductVariation.stock || 0);
    if (qty > currentStock) {
      Alert.alert(
        'Estoque insuficiente',
        `A quantidade informada (${qty}) é maior que o saldo em estoque (${currentStock}).`
      );
      return;
    }

    setIsLoading(true);
    try {
      await createStockUnavailability({
        productId: selectedProductVariation.id,
        variationId: selectedProductVariation.variation_id,
        quantity: qty,
        reason,
        treatment,
        physicalLocation,
        observation: observation.trim() || undefined,
        supplierId: selectedSupplierId || null,
      });

      Alert.alert('Sucesso', 'Indisponibilidade registrada com sucesso!');
      resetForm();
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erro ao registrar', error?.message || 'Falha ao registrar indisponibilidade.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleClose}>
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
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Produto / Variação */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Produto e Variação *</Text>
              {selectedProductVariation ? (
                <View style={[styles.selectedCard, isDarkMode && styles.selectedCardDark]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedTitle, isDarkMode && styles.selectedTitleDark]}>
                      {selectedProductVariation.variationName}
                    </Text>
                    <Text style={styles.selectedSku}>
                      SKU: {selectedProductVariation.sku} • Saldo: {selectedProductVariation.stock}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedProductVariation(null);
                      setProductQuery('');
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
                      value={productQuery}
                      onChangeText={setProductQuery}
                    />
                    {isSearchingProduct && <ActivityIndicator size="small" color="#2563eb" />}
                  </View>

                  {productSuggestions.length > 0 && (
                    <View style={[styles.suggestionsList, isDarkMode && styles.suggestionsListDark]}>
                      {productSuggestions.map((item) => (
                        <TouchableOpacity
                          key={`${item.id}-${item.variation_id}`}
                          style={[styles.suggestionItem, isDarkMode && styles.suggestionItemDark]}
                          onPress={() => {
                            setSelectedProductVariation(item);
                            setProductSuggestions([]);
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

            {/* Quantidade e Local */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>Quantidade *</Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1.5 }]}>
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>Local Físico *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                  {LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      style={[
                        styles.pill,
                        isDarkMode && styles.pillDark,
                        physicalLocation === loc && styles.pillActive,
                      ]}
                      onPress={() => setPhysicalLocation(loc)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isDarkMode && styles.textLight,
                          physicalLocation === loc && styles.pillTextActive,
                        ]}
                      >
                        {loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Motivo */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Motivo *</Text>
              <View style={styles.wrapPills}>
                {REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.pill,
                      isDarkMode && styles.pillDark,
                      reason === r && styles.pillActive,
                    ]}
                    onPress={() => setReason(r)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isDarkMode && styles.textLight,
                        reason === r && styles.pillTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tratativa */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Tratativa *</Text>
              <View style={styles.wrapPills}>
                {TREATMENTS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.pill,
                      isDarkMode && styles.pillDark,
                      treatment === t && styles.pillActive,
                    ]}
                    onPress={() => setTreatment(t)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isDarkMode && styles.textLight,
                        treatment === t && styles.pillTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fornecedor (se devolução) */}
            {treatment === 'Devolução ao fornecedor' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                  Fornecedor * (obrigatório para devolução)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                  {suppliers.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.pill,
                        isDarkMode && styles.pillDark,
                        selectedSupplierId === s.id && styles.pillActive,
                      ]}
                      onPress={() => setSelectedSupplierId(s.id)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isDarkMode && styles.textLight,
                          selectedSupplierId === s.id && styles.pillTextActive,
                        ]}
                      >
                        {s.fantasy_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Observação */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Observação</Text>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.inputDark]}
                placeholder="Detalhes adicionais (opcional)..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={observation}
                onChangeText={setObservation}
              />
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={[styles.modalFooter, isDarkMode && styles.modalFooterDark]}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedProductVariation || isLoading) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedProductVariation || isLoading}
            >
              {isLoading ? (
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
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  labelDark: {
    color: '#94a3b8',
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
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
  pillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
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
