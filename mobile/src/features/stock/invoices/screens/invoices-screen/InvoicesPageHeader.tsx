import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Calendar, ChevronDown, FilePlus2, MoreVertical, Search, X } from 'lucide-react-native';
import { SefazSyncStatusBadge } from '../../components/SefazSyncStatusBadge';
import type { InvoiceDateFilter } from '../../../types/stock.types';
import { styles } from './invoicesScreen.styles';

interface InvoicesPageHeaderProps {
  isDarkMode: boolean;
  renderModuleHeader: (rightAction?: React.ReactNode) => React.ReactElement;
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
  renderModuleHeader,
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
  const { width: viewportWidth } = useWindowDimensions();
  const menuAnchorRef = useRef<View>(null);
  const [isImportMenuVisible, setIsImportMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 16 });

  const openImportMenu = () => {
    menuAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPosition({
        top: y + height + 4,
        right: Math.max(8, viewportWidth - x - width),
      });
      setIsImportMenuVisible(true);
    });
  };

  const importInvoice = () => {
    setIsImportMenuVisible(false);
    onOpenImport();
  };

  const importMenuTrigger = (
    <View ref={menuAnchorRef} collapsable={false}>
      <TouchableOpacity
        style={[styles.menuTrigger, isDarkMode && styles.menuTriggerDark]}
        onPress={openImportMenu}
        accessibilityRole="button"
        accessibilityLabel="Mais opções de NF-e"
        accessibilityHint="Abre as ações disponíveis para notas fiscais de entrada"
      >
        <MoreVertical size={19} color={isDarkMode ? '#cbd5e1' : '#475569'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.pageHeaderWrapper, isDarkMode && styles.pageHeaderWrapperDark]}>
      {renderModuleHeader(importMenuTrigger)}

      <View style={styles.filtersContainer}>
        <View style={styles.filtersRow}>
          <View style={[styles.searchWrapper, isDarkMode && styles.searchWrapperDark]}>
            <Search size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            <TextInput
              style={[styles.searchInput, isDarkMode && styles.textDark]}
              placeholder="Pesquisar por fornecedor, número da NF de entrada ou chave de acesso de 44 caracteres..."
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              value={searchTerm}
              onChangeText={onChangeSearchTerm}
              returnKeyType="search"
              accessibilityLabel="Pesquisar notas fiscais"
              accessibilityHint="Busca por fornecedor, número ou chave de acesso da NF-e"
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

          <View style={[styles.filterDivider, isDarkMode && styles.filterDividerDark]} />

          <TouchableOpacity
            style={[styles.periodBtn, isDarkMode && styles.periodBtnDark]}
            onPress={onOpenPeriodModal}
            accessibilityRole="button"
            accessibilityLabel={`Período: ${periodLabel}`}
          >
            <Calendar size={17} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
            <View style={styles.periodCopy}>
              <Text style={[styles.periodLabel, isDarkMode && styles.textMutedDark]}>Período:</Text>
              <View style={styles.periodValueWrapper}>
                <Text style={[styles.periodValue, isDarkMode && styles.textDark]}>{periodLabel}</Text>
                <ChevronDown size={15} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <SefazSyncStatusBadge isDarkMode={isDarkMode} onSyncSuccess={onSyncSuccess} />

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
      </View>

      <Modal
        visible={isImportMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsImportMenuVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsImportMenuVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar menu de opções"
          />
          <View
            style={[
              styles.importMenu,
              isDarkMode && styles.importMenuDark,
              menuPosition,
            ]}
          >
            <TouchableOpacity
              style={styles.importMenuItem}
              onPress={importInvoice}
              accessibilityRole="button"
              accessibilityLabel="Importar NF-e"
            >
              <FilePlus2 size={17} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
              <Text style={[styles.importMenuText, isDarkMode && styles.importMenuTextDark]}>
                Importar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
