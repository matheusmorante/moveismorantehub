import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import { MobileCategory } from '../../services/mobileCategoryService';

interface CategoryMultiSelectListProps {
  categories: MobileCategory[];
  filteredCategories: MobileCategory[];
  selectedCategoryIds: string[];
  onToggleCategory: (category: MobileCategory) => void;
  dark: boolean;
}

const normalizeSearchTerm = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

export const CategoryMultiSelectList: React.FC<CategoryMultiSelectListProps> = ({
  categories,
  filteredCategories,
  selectedCategoryIds,
  onToggleCategory,
  dark,
}) => {
  const [search, setSearch] = useState('');
  const selectedCategories = useMemo(
    () => filteredCategories.filter(category => selectedCategoryIds.includes(category.id)),
    [filteredCategories, selectedCategoryIds],
  );
  const normalizedSearch = normalizeSearchTerm(search);
  const matchingCategories = useMemo(() => {
    if (normalizedSearch.length < 2) return [];
    return filteredCategories.filter(category => {
      const parentNames = (category.parents || [])
        .map(id => categories.find(item => item.id === id)?.name || '')
        .join(' ');
      return normalizeSearchTerm(`${category.name} ${parentNames}`).includes(normalizedSearch);
    });
  }, [categories, filteredCategories, normalizedSearch]);

  return (
    <View style={[styles.categoriesContainer, dark && styles.darkCategoriesContainer]}>
      <View style={styles.searchBox}>
        <Search size={16} color={dark ? '#94a3b8' : '#64748b'} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar categorias..."
          placeholderTextColor="#94a3b8"
          accessibilityLabel="Pesquisar categorias"
          style={[styles.searchInput, dark && styles.lightText]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Limpar pesquisa">
            <X size={16} color={dark ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        )}
      </View>
      {selectedCategories.length > 0 && (
        <View style={styles.selectedWrap}>
          {selectedCategories.map(category => {
            const parentNames = (category.parents || [])
              .map(id => categories.find(item => item.id === id)?.name)
              .filter(Boolean)
              .join(', ');
            return (
              <TouchableOpacity key={category.id} onPress={() => onToggleCategory(category)} style={styles.selectedChip}>
                <Check size={12} color="#2563eb" strokeWidth={3} />
                <Text style={styles.selectedChipText}>{category.name}</Text>
                {parentNames ? <Text style={styles.selectedChipParents} numberOfLines={1}>({parentNames})</Text> : null}
                <X size={12} color="#64748b" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {normalizedSearch.length >= 2 ? (
      <ScrollView nestedScrollEnabled style={styles.categoriesScroll} keyboardShouldPersistTaps="handled">
        {matchingCategories.map((cat) => {
          const isChecked = selectedCategoryIds.includes(cat.id);
          const parentNames = (cat.parents || [])
            .map((pid) => categories.find((item) => item.id === pid)?.name)
            .filter(Boolean)
            .join(', ');

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onToggleCategory(cat)}
              style={[styles.categoryItem, dark && styles.darkCategoryItem]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  isChecked && styles.checkboxChecked,
                  dark && !isChecked && styles.darkCheckbox,
                ]}
              >
                {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </View>
              <View style={styles.categoryInfo}>
                <Text
                  style={[
                    styles.categoryName,
                    isChecked && styles.categoryNameActive,
                    dark && styles.lightText,
                  ]}
                >
                  {cat.name}
                </Text>
                {parentNames ? (
                  <Text style={styles.categoryParents} numberOfLines={1}>
                    Ambientes: {parentNames}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
        {matchingCategories.length === 0 && (
          <Text style={styles.emptyCategoriesText}>Nenhuma categoria encontrada para “{search}”.</Text>
        )}
      </ScrollView>
      ) : (
        <Text style={styles.emptyCategoriesText}>Digite ao menos 2 caracteres para pesquisar.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  categoriesContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    maxHeight: 220,
    overflow: 'hidden',
  },
  darkCategoriesContainer: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  categoriesScroll: {
    padding: 6,
    maxHeight: 220,
  },
  searchBox: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  selectedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
  },
  selectedChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectedChipText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  selectedChipParents: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  darkCategoryItem: {
    backgroundColor: 'transparent',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  darkCheckbox: {
    borderColor: '#475569',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryInfo: {
    flex: 1,
    gap: 1,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  categoryNameActive: {
    color: '#2563eb',
  },
  categoryParents: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
  },
  emptyCategoriesText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 16,
  },
  lightText: {
    color: '#f8fafc',
  },
});
