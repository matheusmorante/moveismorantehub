import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, TextInput } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { FinancialCategory, TransactionFilterOptions } from '../../../services/mobileFinanceService';

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: FinancialCategory[];
  currentFilters: TransactionFilterOptions;
  onApplyFilters: (filters: TransactionFilterOptions) => void;
  isDarkMode?: boolean;
}

const PAYMENT_METHODS = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'Transferência'];
const ACCOUNTS = ['Caixa Geral', 'Banco do Brasil', 'Itaú', 'Bradesco', 'Outro'];

export const TransactionFilterModal: React.FC<Props> = ({
  visible,
  onClose,
  categories,
  currentFilters,
  onApplyFilters,
  isDarkMode = false,
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>(currentFilters.categoryId || '');
  const [selectedPayment, setSelectedPayment] = useState<string>(currentFilters.paymentMethod || '');
  const [selectedAccount, setSelectedAccount] = useState<string>(currentFilters.accountId || '');
  const [searchQuery, setSearchQuery] = useState<string>(currentFilters.searchQuery || '');

  const handleApply = () => {
    onApplyFilters({
      ...currentFilters,
      categoryId: selectedCatId || undefined,
      paymentMethod: selectedPayment || undefined,
      accountId: selectedAccount || undefined,
      searchQuery: searchQuery || undefined,
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedCatId('');
    setSelectedPayment('');
    setSelectedAccount('');
    setSearchQuery('');
    onApplyFilters({
      type: currentFilters.type,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
          <View style={styles.header}>
            <Text style={[styles.title, isDarkMode && styles.titleDark]}>Filtros Avançados</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Busca livre */}
            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Busca por texto</Text>
            <TextInput
              style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
              placeholder="Descrição, observação ou contraparte..."
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Categoria */}
            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedCatId && styles.chipActive]}
                onPress={() => setSelectedCatId('')}
              >
                <Text style={[styles.chipText, !selectedCatId && styles.chipTextActive]}>Todas</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, selectedCatId === cat.id && styles.chipActive]}
                  onPress={() => setSelectedCatId(selectedCatId === cat.id ? '' : cat.id)}
                >
                  <Text style={[styles.chipText, selectedCatId === cat.id && styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Forma de Pagamento */}
            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Forma de Pagamento</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {PAYMENT_METHODS.map(method => (
                <TouchableOpacity
                  key={method}
                  style={[styles.chip, selectedPayment === method && styles.chipActive]}
                  onPress={() => setSelectedPayment(selectedPayment === method ? '' : method)}
                >
                  <Text style={[styles.chipText, selectedPayment === method && styles.chipTextActive]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Conta/Caixa */}
            <Text style={[styles.sectionLabel, isDarkMode && styles.sectionLabelDark]}>Conta / Caixa</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {ACCOUNTS.map(acc => (
                <TouchableOpacity
                  key={acc}
                  style={[styles.chip, selectedAccount === acc && styles.chipActive]}
                  onPress={() => setSelectedAccount(selectedAccount === acc ? '' : acc)}
                >
                  <Text style={[styles.chipText, selectedAccount === acc && styles.chipTextActive]}>
                    {acc}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>Limpar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
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
    maxHeight: '80%',
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  sectionLabelDark: {
    color: '#cbd5e1',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  searchInputDark: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
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
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
