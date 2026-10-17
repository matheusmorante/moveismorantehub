import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar, ChevronDown, FilePlus2, ReceiptText, Search, X } from 'lucide-react-native';
import { SefazSyncStatusBadge } from '../components/SefazSyncStatusBadge';
import type { InvoiceDateFilter } from '../../types/stock.types';
import { styles } from './invoicesScreen.styles';

interface InvoicesPageHeaderProps {
  isDarkMode: boolean;
  isCompactViewport: boolean;
  periodLabel: string;
  dateFilter: InvoiceDateFilter;
  searchTerm: string;
  onOpenImport: () => void;
  onOpenPeriodModal: () => void;
  onSyncSuccess: () => void;
  onChangeDateFilter: (filter: InvoiceDateFilter) => void;
  onChangeSearchTerm: (term: string) => void;
  onClearSearch: () => void;
}

export const InvoicesPageHeader: React.FC<InvoicesPageHeaderProps> = ({
  isDarkMode,
  isCompactViewport,
  periodLabel,
  dateFilter,
  searchTerm,
  onOpenImport,
  onOpenPeriodModal,
  onSyncSuccess,
  onChangeDateFilter,
  onChangeSearchTerm,
  onClearSearch,
}) => {
  return (
    <View style={[styles.pageHeaderWrapper, isDarkMode && styles.pageHeaderWrapperDark]}>
      <View style={[styles.titleRow, isCompactViewport && styles.titleRowCompact]}>
        <View style={styles.titleGroup}>
          <View style={styles.titleIcon}>
            <ReceiptText size={20} color="#ffffff" />
          </View>
          <View style={styles.titleCopy}>
            <Text style={[styles.pageTitle, isDarkMode && styles.textDark]}>
              Notas Fiscais de Entrada
            </Text>
            <Text style={styles.subtitle}>
              Gestão e importação de notas fiscais de entrada dos fornecedores
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.importBtn, isCompactViewport && styles.importBtnCompact]}
          onPress={onOpenImport}
          accessibilityRole="button"
        >
          <FilePlus2 size={17} color="#ffffff" />
          <Text style={styles.importBtnText}>Importar XML da NF-e</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodBtn, isDarkMode && styles.periodBtnDark]}
            onPress={onOpenPeriodModal}
            accessibilityRole="button"
            accessibilityLabel={`Período: ${periodLabel}`}
          >
            <Calendar size={17} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
            <Text style={[styles.periodLabel, isDarkMode && styles.textMutedDark]}>Período:</Text>
            <View style={[styles.periodValueWrapper, isDarkMode && styles.periodValueWrapperDark]}>
              <Text style={[styles.periodValue, isDarkMode && styles.textDark]}>{periodLabel}</Text>
              <ChevronDown size={15} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </View>
          </TouchableOpacity>

          <SefazSyncStatusBadge isDarkMode={isDarkMode} onSyncSuccess={onSyncSuccess} />
        </View>

        {dateFilter.mode === 'custom_month' && (
          <TextInput
            value={dateFilter.customMonth}
            onChangeText={(customMonth) => onChangeDateFilter({ ...dateFilter, customMonth })}
            placeholder="AAAA-MM"
            accessibilityLabel="Mês personalizado"
            maxLength={7}
            style={[styles.monthInput, isDarkMode && styles.monthInputDark]}
          />
        )}
        {dateFilter.mode === 'custom_range' && (
          <View style={styles.customRange}>
            <Text style={styles.rangeLabel}>De:</Text>
            <TextInput
              value={dateFilter.startMonth}
              onChangeText={(startMonth) => onChangeDateFilter({ ...dateFilter, startMonth })}
              placeholder="AAAA-MM"
              accessibilityLabel="Mês inicial"
              maxLength={7}
              style={[styles.monthInput, isDarkMode && styles.monthInputDark]}
            />
            <Text style={styles.rangeLabel}>Até:</Text>
            <TextInput
              value={dateFilter.endMonth}
              onChangeText={(endMonth) => onChangeDateFilter({ ...dateFilter, endMonth })}
              placeholder="AAAA-MM"
              accessibilityLabel="Mês final"
              maxLength={7}
              style={[styles.monthInput, isDarkMode && styles.monthInputDark]}
            />
          </View>
        )}

        <View style={[styles.searchWrapper, isDarkMode && styles.searchWrapperDark]}>
          <Search size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.textDark]}
            placeholder="Pesquisar por fornecedor, número da NF-e ou chave de acesso de 44 dígitos..."
            placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
            value={searchTerm}
            onChangeText={onChangeSearchTerm}
            returnKeyType="search"
            accessibilityLabel="Pesquisar notas fiscais"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              onPress={onClearSearch}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              hitSlop={8}
            >
              <X size={17} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};
