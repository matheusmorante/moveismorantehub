import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { FinancialCategory, createFinancialTransaction, calculateInstallments } from '../../../services/mobileFinanceService';
import { supabase } from '../../../services/supabaseClient';

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: FinancialCategory[];
  onSuccess: () => void;
  userName?: string;
  isDarkMode?: boolean;
}

const PAYMENT_METHODS = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'Transferência'];
const VEHICLES = ['Strada', 'HR', 'Outro', 'Não informado'];
const PURPOSES = [
  { id: 'BUSINESS', label: 'Operação da Empresa' },
  { id: 'PERSONAL_PARTNER', label: 'Uso Particular / Sócio' },
  { id: 'NOT_INFORMED', label: 'Não Informado' },
];

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
  const [repetition, setRepetition] = useState<'SINGLE' | 'INSTALLMENT' | 'RECURRING'>('SINGLE');
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [dueDateStr, setDueDateStr] = useState<string>(todayStr);

  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [purpose, setPurpose] = useState('BUSINESS');
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

  const filteredCategories = categories.filter(c => c.type === type);
  const selectedCategory = categories.find(c => c.id === selectedCatId);

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
    const catName = selectedCategory?.name || (type === 'income' ? 'Outras entradas' : 'Despesa não classificada');

    if (repetition === 'INSTALLMENT' && installmentsCount > 1) {
      // Criar parcelas
      const parcelas = calculateInstallments(val, installmentsCount, dueDateStr || todayStr);
      const groupId = 'grp_' + Math.random().toString(36).substring(2, 9);

      for (const p of parcelas) {
        await createFinancialTransaction({
          type,
          amount: p.amount,
          description: `${description.trim()} (${p.number}/${p.total})`,
          category_id: selectedCatId || null,
          category_name: catName,
          payment_method: paymentMethod,
          purpose,
          vehicle_id: isVehicleCategory ? vehicleId || null : null,
          collaborator_id: isPersonnelCategory ? collaboratorId || null : null,
          collaborator_name: isPersonnelCategory ? collaboratorName || null : null,
          notes: notes.trim() || null,
          origin: 'MANUAL',
          created_by: userName,
          date: p.dueDate,
          due_date: p.dueDate,
          installments_total: p.total,
          installment_number: p.number,
          status: 'PENDING', // Parcelas começam como pendentes
        });
      }
    } else {
      // Única ou Recorrente
      await createFinancialTransaction({
        type,
        amount: val,
        description: description.trim(),
        category_id: selectedCatId || null,
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
        is_recurring: repetition === 'RECURRING',
        status: statusMode === 'PAID' ? 'ACTIVE' : 'PENDING',
      });
    }

    setSaving(false);

    // Reset form
    setAmountStr('');
    setDescription('');
    setSelectedCatId('');
    setNotes('');
    setCollaboratorId('');
    setCollaboratorName('');
    onSuccess();
    onClose();
  };

  return (
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

            {/* Vencimento (se A Pagar ou Parcelado) */}
            {(statusMode === 'PENDING' || repetition === 'INSTALLMENT') && (
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

            {/* Repetição */}
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>Frequência / Repetição</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              <TouchableOpacity
                style={[styles.chip, repetition === 'SINGLE' && styles.chipActive]}
                onPress={() => setRepetition('SINGLE')}
              >
                <Text style={[styles.chipText, repetition === 'SINGLE' && styles.chipTextActive]}>Única</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, repetition === 'INSTALLMENT' && styles.chipActive]}
                onPress={() => setRepetition('INSTALLMENT')}
              >
                <Text style={[styles.chipText, repetition === 'INSTALLMENT' && styles.chipTextActive]}>Parcelada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, repetition === 'RECURRING' && styles.chipActive]}
                onPress={() => setRepetition('RECURRING')}
              >
                <Text style={[styles.chipText, repetition === 'RECURRING' && styles.chipTextActive]}>Recorrente Mensal</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Opções de Parcelamento */}
            {repetition === 'INSTALLMENT' && (
              <View>
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>Quantidade de Parcelas</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                  {[2, 3, 4, 5, 6, 10, 12].map(num => (
                    <TouchableOpacity
                      key={num}
                      style={[styles.chip, installmentsCount === num && styles.chipActive]}
                      onPress={() => setInstallmentsCount(num)}
                    >
                      <Text style={[styles.chipText, installmentsCount === num && styles.chipTextActive]}>{num}x</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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
              placeholder="Ex: Abastecimento da Strada, Conta de Luz..."
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              value={description}
              onChangeText={setDescription}
            />

            {/* Categoria */}
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {filteredCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, selectedCatId === cat.id && styles.chipActive]}
                  onPress={() => setSelectedCatId(cat.id)}
                >
                  <Text style={[styles.chipText, selectedCatId === cat.id && styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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

            {/* Finalidade */}
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>Finalidade / Contexto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {PURPOSES.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, purpose === p.id && styles.chipActive]}
                  onPress={() => setPurpose(p.id)}
                >
                  <Text style={[styles.chipText, purpose === p.id && styles.chipTextActive]}>
                    {p.label}
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
  typeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  typeBtnTextIncome: {
    color: '#16a34a',
  },
  typeBtnTextExpense: {
    color: '#dc2626',
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
