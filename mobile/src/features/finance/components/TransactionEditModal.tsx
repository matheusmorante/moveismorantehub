import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Calendar, DollarSign, Tag, User, CreditCard, Layers } from 'lucide-react-native';
import { ParsedFinancialIntent, FinancialInstallment } from '../../../services/financialAiAssistantService';

interface Props {
  visible: boolean;
  intent: ParsedFinancialIntent | null;
  onClose: () => void;
  onSave: (updatedIntent: ParsedFinancialIntent) => void;
  isDarkMode?: boolean;
}

export const TransactionEditModal: React.FC<Props> = ({
  visible,
  intent,
  onClose,
  onSave,
  isDarkMode = false,
}) => {
  if (!intent) return null;

  const [description, setDescription] = useState(intent.description || '');
  const [supplier, setSupplier] = useState(intent.supplier || intent.counterparty || '');
  const [totalAmount, setTotalAmount] = useState(intent.totalAmount ? String(intent.totalAmount) : '');
  const [category, setCategory] = useState(intent.category || '');
  const [paymentMethod, setPaymentMethod] = useState(intent.paymentMethod || 'Boleto');
  const [dueDate, setDueDate] = useState(intent.dueDate || intent.date || '');
  const [notes, setNotes] = useState(intent.notes || '');

  // Parcela list management
  const [installments, setInstallments] = useState<FinancialInstallment[]>(
    intent.installmentList || []
  );

  const handleSave = () => {
    const numAmount = parseFloat(totalAmount.replace(',', '.')) || intent.totalAmount || 0;
    
    const updated: ParsedFinancialIntent = {
      ...intent,
      description,
      supplier: supplier || intent.supplier,
      counterparty: supplier || intent.counterparty,
      totalAmount: numAmount,
      category,
      paymentMethod,
      dueDate: dueDate || intent.dueDate,
      date: dueDate || intent.date,
      notes,
      installmentList: installments.length > 0 ? installments : intent.installmentList,
      validationStatus: 'ready', // Once manually edited, user resolved any needs_input
      missingFields: [],
    };

    onSave(updated);
    onClose();
  };

  const handleUpdateInstallment = (index: number, field: keyof FinancialInstallment, value: any) => {
    const next = [...installments];
    next[index] = {
      ...next[index],
      [field]: field === 'amount' ? parseFloat(String(value).replace(',', '.')) || 0 : value,
    };
    setInstallments(next);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={[styles.header, isDarkMode && styles.headerDark]}>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
              Editar Dados da Sugestão
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Fechar edição"
              style={styles.closeBtn}
            >
              <X size={22} color={isDarkMode ? '#CBD5E1' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContainer}>
            {/* Descrição */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Descrição / Item</Text>
              <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
                <Tag size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ex: Compra de móveis"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Fornecedor / Cliente */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Fornecedor / Pessoa</Text>
              <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
                <User size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={supplier}
                  onChangeText={setSupplier}
                  placeholder="Ex: Bechara"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Valor Total */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Valor Total (R$)</Text>
              <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
                <DollarSign size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Categoria */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Categoria</Text>
              <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
                <Layers size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={category}
                  onChangeText={setCategory}
                  placeholder="Ex: Fornecedores, Combustível..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Forma de Pagamento */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Forma de Pagamento</Text>
              <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
                <CreditCard size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={paymentMethod}
                  onChangeText={setPaymentMethod}
                  placeholder="Boleto, Pix, Cartão..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Data / Vencimento */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Vencimento / Data</Text>
              <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
                <Calendar size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Parcelas se existirem */}
            {installments.length > 0 && (
              <View style={styles.installmentsSection}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
                  Parcelamento ({installments.length}x)
                </Text>
                {installments.map((inst, idx) => (
                  <View key={idx} style={[styles.instRow, isDarkMode && styles.instRowDark]}>
                    <Text style={[styles.instNum, isDarkMode && styles.instNumDark]}>
                      #{inst.number}
                    </Text>
                    <TextInput
                      style={[styles.instInput, isDarkMode && styles.instInputDark]}
                      value={String(inst.amount)}
                      onChangeText={(v) => handleUpdateInstallment(idx, 'amount', v)}
                      keyboardType="decimal-pad"
                      placeholder="Valor"
                    />
                    <TextInput
                      style={[styles.instInput, isDarkMode && styles.instInputDark]}
                      value={inst.dueDate}
                      onChangeText={(v) => handleUpdateInstallment(idx, 'dueDate', v)}
                      placeholder="AAAA-MM-DD"
                    />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, isDarkMode && styles.footerDark]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerTitleDark: {
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  labelDark: {
    color: '#94A3B8',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
  },
  inputWrapperDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  inputDark: {
    color: '#F8FAFC',
  },
  installmentsSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: '#F1F5F9',
  },
  instRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  instRowDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  instNum: {
    width: 32,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  instNumDark: {
    color: '#94A3B8',
  },
  instInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  instInputDark: {
    borderColor: '#475569',
    color: '#F8FAFC',
    backgroundColor: '#0F172A',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  footerDark: {
    backgroundColor: '#1E293B',
    borderTopColor: '#334155',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
