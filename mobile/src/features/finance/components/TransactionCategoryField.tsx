import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, ChevronRight, Check } from 'lucide-react-native';
import { FinancialCategory } from '../../../services/mobileFinanceService';

interface Props {
  selectedCategory?: FinancialCategory;
  isExpense: boolean;
  purpose: 'BUSINESS' | 'PERSONAL_PARTNER';
  hasError?: boolean;
  onOpenCategoryModal: () => void;
  isDarkMode?: boolean;
}

export const TransactionCategoryField: React.FC<Props> = ({
  selectedCategory,
  isExpense,
  purpose,
  hasError,
  onOpenCategoryModal,
  isDarkMode,
}) => {
  return (
    <View>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>
        Categoria <Text style={styles.requiredAsterisk}>*</Text>
      </Text>

      {selectedCategory ? (
        <View
          style={[
            styles.selectedCategoryCard,
            isDarkMode && styles.selectedCategoryCardDark,
            hasError && styles.inputError,
          ]}
        >
          <View style={styles.selectedCategoryInfo}>
            <Text style={[styles.selectedCategoryLabel, isDarkMode && styles.selectedCategoryLabelDark]}>
              Categoria Selecionada {isExpense && purpose === 'PERSONAL_PARTNER' ? '(Uso Particular)' : ''}
            </Text>
            <Text style={[styles.selectedCategoryName, isDarkMode && styles.selectedCategoryNameDark]}>
              {selectedCategory.name}
            </Text>
          </View>

          {isExpense && purpose === 'PERSONAL_PARTNER' ? (
            <View style={styles.automaticCategoryBadge}>
              <Check size={14} color="#16a34a" />
              <Text style={styles.automaticCategoryText}>Automática</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.changeCategoryBtn}
              onPress={onOpenCategoryModal}
              activeOpacity={0.7}
            >
              <Text style={styles.changeCategoryBtnText}>Trocar</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.categorySearchTrigger,
            isDarkMode && styles.categorySearchTriggerDark,
            hasError && styles.inputError,
          ]}
          onPress={onOpenCategoryModal}
          activeOpacity={0.7}
        >
          <Search size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text
            style={[
              styles.categorySearchTriggerPlaceholder,
              isDarkMode && styles.categorySearchTriggerPlaceholderDark,
            ]}
          >
            {isExpense && purpose === 'PERSONAL_PARTNER'
              ? 'Selecionar Pró-labore...'
              : 'Pesquisar ou selecionar categoria...'}
          </Text>
          <ChevronRight size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  inputError: {
    borderWidth: 1.5,
    borderColor: '#dc2626',
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
  automaticCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
  },
  automaticCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
});
