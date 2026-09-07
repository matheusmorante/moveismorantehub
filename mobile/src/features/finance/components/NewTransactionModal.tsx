import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { FinancialCategory, FinancialTransaction } from '../../../services/mobileFinanceService';
import { CategorySelectModal } from './CategorySelectModal';
import { TransactionDatePickerModal } from './TransactionDatePickerModal';
import { TransactionTypeSelector } from './TransactionTypeSelector';
import { TransactionDateSelector } from './TransactionDateSelector';
import { TransactionPurposeSelector } from './TransactionPurposeSelector';
import { TransactionCategoryField } from './TransactionCategoryField';
import { PaymentMethodChips } from './PaymentMethodChips';
import { TransactionVehicleSelector } from './TransactionVehicleSelector';
import { TransactionCollaboratorSelector } from './TransactionCollaboratorSelector';
import { UnselectedTypePrompt } from './UnselectedTypePrompt';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { PAYMENT_METHODS, VEHICLES } from './transactionModalUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: FinancialCategory[];
  transaction?: FinancialTransaction | null;
  onSuccess: () => void;
  userName?: string;
  isDarkMode?: boolean;
}

export const NewTransactionModal: React.FC<Props> = ({
  visible,
  onClose,
  categories,
  transaction = null,
  onSuccess,
  userName = 'Operador',
  isDarkMode = false,
}) => {
  const form = useTransactionForm({
    visible,
    transaction,
    categories,
    userName,
    onSuccess,
    onClose,
  });

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            {/* Cabeçalho */}
            <View style={styles.header}>
              <Text style={[styles.title, isDarkMode && styles.titleDark]}>
                {transaction ? 'Editar Transação' : '+ Nova Transação'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Tipo de Movimentação: Primeiro campo absoluto */}
              <TransactionTypeSelector
                type={form.type}
                onTypeChange={form.handleTypeChange}
                hasError={form.fieldErrors.type}
                isDarkMode={isDarkMode}
              />

              {!form.type ? (
                <UnselectedTypePrompt isDarkMode={isDarkMode} />
              ) : (
                <>
                  {/* Data da Transação */}
                  <TransactionDateSelector
                    transactionDate={form.transactionDate}
                    todayStr={form.todayStr}
                    yesterdayStr={form.yesterdayStr}
                    onSelectDate={form.setTransactionDate}
                    onOpenDatePicker={() => form.setDatePickerVisible(true)}
                    isDarkMode={isDarkMode}
                  />

                  {/* Finalidade para Saídas */}
                  {form.isExpense && (
                    <TransactionPurposeSelector
                      purpose={form.purpose}
                      onPurposeChange={form.handlePurposeChange}
                      isDarkMode={isDarkMode}
                    />
                  )}

                  {/* Valor */}
                  <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                    Valor (R$) <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.amountInput,
                      isDarkMode && styles.inputDark,
                      form.fieldErrors.amount && styles.inputError,
                    ]}
                    placeholder="0,00"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    keyboardType="numeric"
                    value={form.amountStr}
                    onChangeText={text => {
                      form.setAmountStr(text);
                      if (form.fieldErrors.amount) {
                        form.setFieldErrors(prev => ({ ...prev, amount: false }));
                      }
                    }}
                  />

                  {/* Descrição */}
                  <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                    Descrição <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      isDarkMode && styles.inputDark,
                      form.fieldErrors.description && styles.inputError,
                    ]}
                    placeholder="Ex: Abastecimento da Strada, Conta de Luz, Retirada..."
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    value={form.description}
                    onChangeText={text => {
                      form.setDescription(text);
                      if (form.fieldErrors.description) {
                        form.setFieldErrors(prev => ({ ...prev, description: false }));
                      }
                    }}
                  />

                  {/* Categoria */}
                  <TransactionCategoryField
                    selectedCategory={form.selectedCategory}
                    isExpense={form.isExpense}
                    purpose={form.purpose}
                    hasError={form.fieldErrors.category}
                    onOpenCategoryModal={() => {
                      form.handleOpenCategoryModal('');
                      if (form.fieldErrors.category) {
                        form.setFieldErrors(prev => ({ ...prev, category: false }));
                      }
                    }}
                    isDarkMode={isDarkMode}
                  />

                  {/* Colaborador / Funcionário */}
                  {form.isPersonnelCategory && (
                    <TransactionCollaboratorSelector
                      collaborators={form.collaboratorsList}
                      selectedCollaboratorId={form.collaboratorId}
                      onSelectCollaborator={(id, name) => {
                        form.setCollaboratorId(id);
                        form.setCollaboratorName(name);
                      }}
                      isDarkMode={isDarkMode}
                    />
                  )}

                  {/* Forma de Pagamento */}
                  <PaymentMethodChips
                    options={PAYMENT_METHODS}
                    selectedMethod={form.paymentMethod}
                    onSelectMethod={m => {
                      form.setPaymentMethod(m);
                      if (form.fieldErrors.paymentMethod) {
                        form.setFieldErrors(prev => ({ ...prev, paymentMethod: false }));
                      }
                    }}
                    hasError={form.fieldErrors.paymentMethod}
                    isDarkMode={isDarkMode}
                  />

                  {/* Veículo */}
                  {form.isVehicleCategory && (
                    <TransactionVehicleSelector
                      vehicles={VEHICLES}
                      selectedVehicleId={form.vehicleId}
                      onSelectVehicle={form.setVehicleId}
                      isDarkMode={isDarkMode}
                    />
                  )}
                </>
              )}
            </ScrollView>

            {/* Rodapé de Ações */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={form.saving}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={form.handleSave} disabled={form.saving}>
                {form.saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{transaction ? 'Salvar alterações' : 'Finalizar'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Categorias com Busca */}
      <CategorySelectModal
        visible={form.categoryModalVisible}
        onClose={() => form.setCategoryModalVisible(false)}
        categories={form.filteredCategories}
        selectedCategoryId={form.selectedCatId}
        onSelectCategory={cat => {
          form.setSelectedCatId(cat.id);
        }}
        initialSearchText={form.categorySearchQuery}
        isDarkMode={isDarkMode}
      />

      {/* Modal de Calendário */}
      <TransactionDatePickerModal
        visible={form.datePickerVisible}
        selectedDate={form.transactionDate}
        isDarkMode={isDarkMode}
        onClose={() => form.setDatePickerVisible(false)}
        onSelect={form.setTransactionDate}
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
  requiredAsterisk: {
    color: '#dc2626',
    fontWeight: '700',
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
  inputError: {
    borderWidth: 1.5,
    borderColor: '#dc2626',
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
