import { FormTextInput } from '../../../components/shared/FormTextInput';
import React, { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from 'react-native';
import { X, Search, Check, Folder, ChevronDown, ChevronRight, Tag } from 'lucide-react-native';
import type { FinancialCategory } from '../../../services/mobileFinanceService';
import { matchesSearchText } from '../../../../../shared-utils/searchText';
import { buildCategoryTreeRows, type CategoryTreeRow } from './categorySelectTreeRows';

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: FinancialCategory[];
  selectedCategoryId: string;
  onSelectCategory: (category: FinancialCategory) => void;
  initialSearchText?: string;
  isDarkMode?: boolean;
}

export const CategorySelectModal: React.FC<Props> = ({
  visible,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  initialSearchText = '',
  isDarkMode = false,
}) => {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState(initialSearchText);
  const [draftCategoryId, setDraftCategoryId] = useState(selectedCategoryId);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());

  const treeRows = useMemo(() => buildCategoryTreeRows(categories), [categories]);
  const parentCategoryIds = useMemo(
    () => treeRows.filter((row) => row.hasChildren).map((row) => row.category.id),
    [treeRows]
  );

  useEffect(() => {
    if (!visible) return;
    setSearchText(initialSearchText);
    setDraftCategoryId(selectedCategoryId);
    setExpandedCategoryIds(new Set(parentCategoryIds));
  }, [visible, initialSearchText, selectedCategoryId, parentCategoryIds]);

  useEffect(() => {
    const query = searchText.trim();
    if (!visible || !query) return;
    const ancestorsOfMatches = new Set(
      treeRows
        .filter((row) => matchesSearchText(row.category.name, query))
        .flatMap((row) => row.ancestors)
    );
    if (ancestorsOfMatches.size === 0) return;
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      ancestorsOfMatches.forEach((ancestor) => next.add(ancestor));
      return next.size === current.size ? current : next;
    });
  }, [searchText, treeRows, visible]);

  const visibleRows = useMemo(() => {
    const query = searchText.trim();
    if (!query) {
      return treeRows.filter((row) => row.ancestors.every((ancestor) => expandedCategoryIds.has(ancestor)));
    }

    const matchingIds = new Set(
      treeRows
        .filter((row) => matchesSearchText(row.category.name, query))
        .map((row) => row.category.id)
    );
    const includedIds = new Set(matchingIds);
    treeRows.forEach((row) => {
      if (!matchingIds.has(row.category.id)) return;
      row.ancestors.forEach((ancestor) => {
        includedIds.add(ancestor);
      });
    });

    return treeRows.filter(
      (row) => includedIds.has(row.category.id)
        && row.ancestors.every((ancestor) => expandedCategoryIds.has(ancestor))
    );
  }, [expandedCategoryIds, searchText, treeRows]);

  const selectedCategory = categories.find((category) => category.id === draftCategoryId);
  const toggleExpanded = (categoryId: string) => {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const confirmSelection = () => {
    const category = categories.find((item) => item.id === draftCategoryId);
    if (!category) return;
    onSelectCategory(category);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Folder size={18} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
              <Text style={[styles.title, isDarkMode && styles.titleDark]}>Selecionar Categoria</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar seletor de categoria" onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
            <Search size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <FormTextInput
              style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
              placeholder="Pesquisar categoria..."
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              clearButtonMode="while-editing"
              accessibilityLabel="Pesquisar categorias e subcategorias"
            />
            {searchText.length > 0 && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpar pesquisa" onPress={() => setSearchText('')} style={styles.clearSearchBtn}>
                <X size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            style={styles.list}
            data={visibleRows}
            keyExtractor={(row) => row.category.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
                  Nenhuma categoria encontrada para “{searchText}”.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = item.category.id === draftCategoryId;
              const isExpanded = expandedCategoryIds.has(item.category.id);
              return (
                <View style={[styles.row, item.depth > 0 && styles.childRow]}>
                  <View style={[styles.treeBranch, { width: item.depth * 18 }]} />
                  {item.hasChildren ? (
                    <TouchableOpacity
                      testID={`cat-expand-${item.category.name}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${isExpanded ? 'Recolher' : 'Expandir'} ${item.category.name}`}
                      onPress={() => toggleExpanded(item.category.id)}
                      style={styles.expandButton}
                      hitSlop={6}
                    >
                      {isExpanded
                        ? <ChevronDown size={17} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                        : <ChevronRight size={17} color={isDarkMode ? '#94a3b8' : '#64748b'} />}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.expandSpacer} />
                  )}

                  <TouchableOpacity
                    testID={`cat-item-${item.category.name}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${item.depth > 0 ? 'Subcategoria' : 'Categoria'} ${item.category.name}`}
                    style={[
                      styles.optionButton,
                      item.depth > 0 && styles.childOptionButton,
                      isSelected && (isDarkMode ? styles.optionSelectedDark : styles.optionSelected),
                    ]}
                    onPress={() => setDraftCategoryId(item.category.id)}
                  >
                    {item.depth === 0
                      ? <Folder size={16} color={isSelected ? '#2563eb' : isDarkMode ? '#93c5fd' : '#64748b'} />
                      : <Tag size={14} color={isSelected ? '#2563eb' : isDarkMode ? '#94a3b8' : '#94a3b8'} />}
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.optionText,
                        item.depth === 0 && styles.parentOptionText,
                        isDarkMode && styles.optionTextDark,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {item.category.name}
                    </Text>
                    <View style={[styles.radio, isSelected && styles.radioSelected, isDarkMode && styles.radioDark]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          <View style={[styles.footer, isDarkMode && styles.footerDark]}>
            <View style={styles.selectedSummary}>
              <Text style={[styles.selectedLabel, isDarkMode && styles.selectedLabelDark]}>Selecionado</Text>
              <Text numberOfLines={1} style={[styles.selectedValue, isDarkMode && styles.selectedValueDark]}>
                {selectedCategory?.name || 'Nenhuma categoria'}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Confirmar seleção de categoria"
              onPress={confirmSelection}
              disabled={!selectedCategory}
              style={[styles.confirmButton, !selectedCategory && styles.confirmButtonDisabled]}
            >
              <Check size={17} color="#ffffff" />
              <Text style={styles.confirmButtonText}>Confirmar seleção</Text>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    height: '82%',
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  searchContainerDark: {
    backgroundColor: '#1e293b',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  searchInputDark: {
    color: '#f8fafc',
  },
  clearSearchBtn: {
    padding: 4,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingVertical: 4,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  childRow: {
    marginTop: 1,
  },
  treeBranch: {
    alignSelf: 'stretch',
  },
  expandButton: {
    width: 30,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandSpacer: {
    width: 30,
    height: 38,
  },
  optionButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  childOptionButton: {
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    marginLeft: 2,
    paddingLeft: 12,
  },
  optionSelected: {
    backgroundColor: '#eff6ff',
  },
  optionSelectedDark: {
    backgroundColor: '#1e3a8a55',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: '#334155',
  },
  parentOptionText: {
    fontWeight: '700',
  },
  optionTextDark: {
    color: '#cbd5e1',
  },
  optionTextSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
  radio: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDark: {
    borderColor: '#64748b',
  },
  radioSelected: {
    borderColor: '#2563eb',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 6,
    gap: 10,
  },
  footerDark: {
    borderTopColor: '#334155',
  },
  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  selectedLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedLabelDark: {
    color: '#94a3b8',
  },
  selectedValue: {
    flex: 1,
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  selectedValueDark: {
    color: '#f8fafc',
  },
  confirmButton: {
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#64748b',
  },
});
