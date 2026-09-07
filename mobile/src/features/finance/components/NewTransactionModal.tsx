import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { X, Search, ChevronRight, Check } from 'lucide-react-native';
import { FinancialCategory, createFinancialTransaction } from '../../../services/mobileFinanceService';
import { supabase } from '../../../services/supabaseClient';
import { CategorySelectModal } from './CategorySelectModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: FinancialCategory[];
  onSuccess: () => void;
  userName?: string;
  isDarkMode?: boolean;
}

const PAYMENT_METHODS = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'TED'];
const VEHICLES = ['Strada', 'HR', 'Outro', 'Não informado'];

const isProLaboreCat = (name: string): boolean => {
  const norm = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return (
    norm.includes('pro-labore') ||
    norm.includes('prolabore') ||
    norm.includes('pro labore') ||
    norm.includes('retirada') ||
    norm.includes('socio') ||
    norm.includes('particular')
  );
};

export const NewTransactionModal: React.FC<Props> = ({
  visible,
  onClose,
  categories,
  onSuccess,
  userName = 'Operador',
  isDarkMode = false,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [statusMode, setStatusMode] = useState<'PAID' | 'PENDING'>('PAID');
  const [purpose, setPurpose] = useState<'BUSINESS' | 'PERSONAL_PARTNER'>('BUSINESS');
  const [dueDateStr, setDueDateStr] = useState<string>(todayStr);

  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [vehicleId, setVehicleId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [collaboratorName, setCollaboratorName] = useState('');
  const [collaboratorsList, setCollaboratorsList] = useState<{ id: string; name: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCollaborators = async () => {
      try {
        const { data } = await supabase.from('profiles').select('id, name, full_name, role').limit(50);
        if (data && data.length > 0) {
          setCollaboratorsList(
            data.map(p => ({
              id: p.id,
              name: p.full_name || p.name || 'Colaborador',
            }))
          );
        }
      } catch (err) {
        console.warn('Erro ao carregar colaboradores no mobile finance modal:', err);
      }
    };
    loadCollaborators();
  }, []);

  // Filtragem dinâmica das categorias baseada no Tipo e na Finalidade
  const filteredCategories = useMemo(() => {
    const byType = categories.filter(c => c.type === type);

    if (purpose === 'PERSONAL_PARTNER') {
      const proLaboreCats = byType.filter(c => isProLaboreCat(c.name));
      if (proLaboreCats.length > 0) {
        return proLaboreCats;
      }
      // Fallback padrão se não houver categoria cadastrada com nome de Pró-labore
      return [
        {
          id: 'cat_pro_labore_default',
          name: 'Pró-labore',
          type: type,
        },
      ];
    }

    // Operação da Empresa: exibe as categorias da empresa
    return byType;
  }, [categories, type, purpose]);

  // Obter categoria selecionada (inclusive caso seja o fallback virtual)
  const selectedCategory = useMemo(() => {
    return filteredCategories.find(c => c.id === selectedCatId) || categories.find(c => c.id === selectedCatId);
  }, [filteredCategories, categories, selectedCatId]);

  // Ajuste automático ao alternar a finalidade
  const handlePurposeChange = (newPurpose: 'BUSINESS' | 'PERSONAL_PARTNER') => {
    setPurpose(newPurpose);
    if (newPurpose === 'PERSONAL_PARTNER') {
      // Procura categoria de Pró-labore e pré-seleciona
      const proLaboreCat = categories.find(c => c.type === type && isProLaboreCat(c.name));
      if (proLaboreCat) {
        setSelectedCatId(proLaboreCat.id);
      } else {
        setSelectedCatId('cat_pro_labore_default');
      }
    } else {
      // Se estava com Pró-labore selecionado, reseta para seleção aberta
      if (selectedCategory && isProLaboreCat(selectedCategory.name)) {
        setSelectedCatId('');
      }
    }
  };

  // Verificar se a categoria é de Pessoal/Colaborador
  const isPersonnelCategory = selectedCategory?.name
    ? ['salário', 'salários', 'adiantamento', 'comissão', 'comissao', 'benefício', 'beneficio', 'reembolso'].some(term =>
        selectedCategory.name.toLowerCase().includes(term)
      )
    : false;

  // Verificar se a categoria é de Transporte/Combustível
  const isVehicleCategory = selectedCategory?.name
    ? ['combustível', 'gasolina', 'veículo', 'veiculo', 'pedágio', 'pedagio', 'manutenção de veículos'].some(term =>
        selectedCategory.name.toLowerCase().includes(term)
      )
    : false;

  const handleSave = async () => {
    const val = parseFloat(amountStr.replace(',', '.'));
    if (!val || val <= 0) {
      Alert.alert('Valor Inválido', 'Por favor informe um valor maior que zero.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Descrição Obrigatória', 'Por favor insira a descrição da movimentação.');
      return;
    }

    setSaving(true);
    const catName = selectedCategory?.name || (purpose === 'PERSONAL_PARTNER' ? 'Pró-labore' : (type === 'income' ? 'Outras entradas' : 'Despesa não classificada'));
    const realCatId = selectedCatId === 'cat_pro_labore_default' ? null : (selectedCatId || null);

    // Toda transação manual criada é única
    await createFinancialTransaction({
      type,
      amount: val,
      description: description.trim(),
      category_id: realCatId,
      category_name: catName,
      payment_method: paymentMethod,
      purpose,
      vehicle_id: isVehicleCategory ? vehicleId || null : null,
      collaborator_id: isPersonnelCategory ? collaboratorId || null : null,
      collaborator_name: isPersonnelCategory ? collaboratorName || null : null,
      notes: notes.trim() || null,
      origin: 'MANUAL',
      created_by: userName,
      date: statusMode === 'PAID' ? todayStr : dueDateStr || todayStr,
      due_date: statusMode === 'PENDING' ? dueDateStr || todayStr : null,
      is_recurring: false,
      status: statusMode === 'PAID' ? 'ACTIVE' : 'PENDING',
    });

    setSaving(false);

    // Reset form
    setAmountStr('');
    setDescription('');
    setSelectedCatId('');
    setCategorySearchQuery('');
    setNotes('');
    setCollaboratorId('');
    setCollaboratorName('');
    onSuccess();
    onClose();
  };

  const handleOpenCategoryModal = (initialQuery = '') => {
    setCategorySearchQuery(initialQuery);
    setCategoryModalVisible(true);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <View style={styles.header}>
              <Text style={[styles.title, isDarkMode && styles.titleDark]}>+ Nova Transação</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Tipo */}
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Tipo de Movimentação</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
                  onPress={() => {
                    setType('income');
                    setSelectedCatId('');
                  }}
                >
                  <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextIncome]}>
                    + Entrada
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
                  onPress={() => {
                    setType('expense');
                    setSelectedCatId('');
                  }}
                >
                  <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextExpense]}>
                    - Saída
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Situação */}
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Situação Financeira</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, statusMode === 'PAID' && styles.typeBtnIncome]}
                  onPress={() => setStatusMode('PAID')}
                >
                  <Text style={[styles.typeBtnText, statusMode === 'PAID' && styles.typeBtnTextIncome]}>
                    ✓ Efetivada / Já Paga
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeBtn, statusMode === 'PENDING' && { backgroundColor: '#fef3c7' }]}
                  onPress={() => setStatusMode('PENDING')}
                >
                  <Text style={[styles.typeBtnText, statusMode === 'PENDING' && { color: '#d97706' }]}>
                    ⏳ A Pagar (Obrigação)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Vencimento (se A Pagar) */}
              {statusMode === 'PENDING' && (
                <View>
                  <Text style={[styles.label, isDarkMode && styles.labelDark]}>Data de Vencimento (AAAA-MM-DD)</Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.inputDark]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    value={dueDateStr}
                    onChangeText={setDueDateStr}
                  />
                </View>
              )}

              {/* Finalidade: Posicionado logo acima do campo de Valor */}
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Finalidade</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, purpose === 'BUSINESS' && styles.typeBtnActive]}
                  onPress={() => handlePurposeChange('BUSINESS')}
                >
                  <Text style={[styles.typeBtnText, purpose === 'BUSINESS' && styles.typeBtnTextActive]}>
                    🏢 Operação da Empresa
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeBtn, purpose === 'PERSONAL_PARTNER' && styles.typeBtnActive]}
                  onPress={() => handlePurposeChange('PERSONAL_PARTNER')}
                >
                  <Text style={[styles.typeBtnText, purpose === 'PERSONAL_PARTNER' && styles.typeBtnTextActive]}>
                    👤 Uso Particular
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Valor */}
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Valor (R$)</Text>
              <TextInput
                style={[styles.input, styles.amountInput, isDarkMode && styles.inputDark]}
                placeholder="0,00"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                keyboardType="numeric"
                value={amountStr}
                onChangeText={setAmountStr}
              />

              {/* Descrição */}
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Descrição</Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                placeholder="Ex: Abastecimento da Strada, Conta de Luz, Retirada..."
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                value={description}
                onChangeText={setDescription}
              />

              {/* Categoria: Input de Pesquisa + Modal de Seleção */}
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Categoria</Text>
              {selectedCategory ? (
                <View style={[styles.selectedCategoryCard, isDarkMode && styles.selectedCategoryCardDark]}>
                  <View style={styles.selectedCategoryInfo}>
                    <Text style={[styles.selectedCategoryLabel, isDarkMode && styles.selectedCategoryLabelDark]}>
                      Categoria Selecionada {purpose === 'PERSONAL_PARTNER' ? '(Uso Particular)' : ''}
                    </Text>
                    <Text style={[styles.selectedCategoryName, isDarkMode && styles.selectedCategoryNameDark]}>
                      {selectedCategory.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeCategoryBtn}
                    onPress={() => handleOpenCategoryModal('')}
                  >
                    <Text style={styles.changeCategoryBtnText}>Trocar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.categorySearchTrigger, isDarkMode && styles.categorySearchTriggerDark]}
                  onPress={() => handleOpenCategoryModal('')}
                  activeOpacity={0.7}
                >
                  <Search size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  <Text style={[styles.categorySearchTriggerPlaceholder, isDarkMode && styles.categorySearchTriggerPlaceholderDark]}>
                    {purpose === 'PERSONAL_PARTNER' ? 'Selecionar Pró-labore...' : 'Pesquisar ou selecionar categoria...'}
                  </Text>
                  <ChevronRight size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
                </TouchableOpacity>
              )}

              {/* Colaborador / Funcionário (Condicional para Pessoal) */}
              {isPersonnelCategory && (
                <View>
                  <Text style={[styles.label, isDarkMode && styles.labelDark]}>Colaborador / Funcionário</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                    {collaboratorsList.map(collab => (
                      <TouchableOpacity
                        key={collab.id}
                        style={[styles.chip, collaboratorId === collab.id && styles.chipActive]}
                        onPress={() => {
                          if (collaboratorId === collab.id) {
                            setCollaboratorId('');
                            setCollaboratorName('');
                          } else {
                            setCollaboratorId(collab.id);
                            setCollaboratorName(collab.name);
                          }
                        }}
                      >
                        <Text style={[styles.chipText, collaboratorId === collab.id && styles.chipTextActive]}>
                          {collab.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Forma de Pagamento */}
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Forma de Pagamento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, paymentMethod === m && styles.chipActive]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text style={[styles.chipText, paymentMethod === m && styles.chipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Veículo (Condicional para Transporte) */}
              {isVehicleCategory && (
                <View>
                  <Text style={[styles.label, isDarkMode && styles.labelDark]}>Veículo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                    {VEHICLES.map(v => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.chip, vehicleId === v && styles.chipActive]}
                        onPress={() => setVehicleId(vehicleId === v ? '' : v)}
                      >
                        <Text style={[styles.chipText, vehicleId === v && styles.chipTextActive]}>
                          {v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Observação */}
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Observação (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.inputDark]}
                placeholder="Detalhes adicionais..."
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                multiline={true}
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Salvar Movimentação</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Categorias com Busca */}
      <CategorySelectModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        categories={filteredCategories}
        selectedCategoryId={selectedCatId}
        onSelectCategory={(cat) => {
          setSelectedCatId(cat.id);
          setCategorySearchQuery('');
        }}
        initialSearchText={categorySearchQuery}
        isDarkMode={isDarkMode}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  modalContentDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  titleDark: {
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingVertical: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
  },
  labelDark: {
    color: '#cbd5e1',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  typeBtnIncome: {
    backgroundColor: '#dcfce7',
  },
  typeBtnExpense: {
    backgroundColor: '#fee2e2',
  },
  typeBtnActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  typeBtnTextIncome: {
    color: '#16a34a',
  },
  typeBtnTextExpense: {
    color: '#dc2626',
  },
  typeBtnTextActive: {
    color: '#2563eb',
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  inputDark: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  categorySearchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categorySearchTriggerDark: {
    backgroundColor: '#1e293b',
  },
  categorySearchTriggerPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
  categorySearchTriggerPlaceholderDark: {
    color: '#94a3b8',
  },
  selectedCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedCategoryCardDark: {
    backgroundColor: '#1e3a8a33',
    borderColor: '#1e40af',
  },
  selectedCategoryInfo: {
    flex: 1,
  },
  selectedCategoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  selectedCategoryLabelDark: {
    color: '#94a3b8',
  },
  selectedCategoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
    marginTop: 2,
  },
  selectedCategoryNameDark: {
    color: '#60a5fa',
  },
  changeCategoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  changeCategoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
