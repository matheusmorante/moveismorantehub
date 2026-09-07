import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput, FlatList } from 'react-native';
import { X, Search, Check, Folder } from 'lucide-react-native';
import type { FinancialCategory } from '../../../services/mobileFinanceService';

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: FinancialCategory[];
  selectedCategoryId: string;
  onSelectCategory: (category: FinancialCategory) => void;
  initialSearchText?: string;
  isDarkMode?: boolean;
}

const normalize = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const CategorySelectModal: React.FC<Props> = ({
  visible,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  initialSearchText = '',
  isDarkMode = false,
}) => {
  const [searchText, setSearchText] = useState(initialSearchText);

  React.useEffect(() => {
    if (visible) {
      setSearchText(initialSearchText);
    }
  }, [visible, initialSearchText]);

  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return categories;
    const term = normalize(searchText);
    return categories.filter(c => normalize(c.name).includes(term));
  }, [categories, searchText]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Folder size={18} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
              <Text style={[styles.title, isDarkMode && styles.titleDark]}>Selecionar Categoria</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
            <Search size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <TextInput
              style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
              placeholder="Pesquisar categoria..."
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus={true}
              clearButtonMode="while-editing"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchBtn}>
                <X size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filteredCategories}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
                  Nenhuma categoria encontrada para "{searchText}".
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = item.id === selectedCategoryId;
              return (
                <TouchableOpacity
                  style={[
                    styles.itemRow,
                    isDarkMode && styles.itemRowDark,
                    isSelected && (isDarkMode ? styles.itemRowSelectedDark : styles.itemRowSelected),
                  ]}
                  onPress={() => {
                    onSelectCategory(item);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.itemText,
                      isDarkMode && styles.itemTextDark,
                      isSelected && styles.itemTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {isSelected && <Check size={18} color="#3b82f6" />}
                </TouchableOpacity>
              );
            }}
          />
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
    paddingBottom: 24,
    height: '75%',
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
  listContent: {
    paddingVertical: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemRowDark: {
    backgroundColor: 'transparent',
  },
  itemRowSelected: {
    backgroundColor: '#eff6ff',
  },
  itemRowSelectedDark: {
    backgroundColor: '#1e3a8a33',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  itemTextDark: {
    color: '#cbd5e1',
  },
  itemTextSelected: {
    color: '#2563eb',
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
