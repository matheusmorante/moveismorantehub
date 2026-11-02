import { FormTextInput } from '../../../../components/shared/FormTextInput';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import {
  PRODUCT_CATEGORY_SEARCH_MAX_SUGGESTIONS,
  PRODUCT_CATEGORY_SEARCH_MIN_LENGTH,
  searchProductCategories,
} from '../../../../../../shared-utils/productCategorySearch';
import { normalizeSearchTerm } from '../../../../../../shared-utils/productText';
import { MobileCategory } from '../../services/mobileCategoryService';

const MIN_CATEGORY_SEARCH_LENGTH = PRODUCT_CATEGORY_SEARCH_MIN_LENGTH;

interface CategoryMultiSelectListProps {
  categories: MobileCategory[];
  filteredCategories: MobileCategory[];
  selectedCategoryIds: string[];
  onToggleCategory: (category: MobileCategory) => void;
  dark: boolean;
  hasValidationError?: boolean;
}

export const CategoryMultiSelectList: React.FC<CategoryMultiSelectListProps> = ({
  categories,
  filteredCategories,
  selectedCategoryIds,
  onToggleCategory,
  dark,
  hasValidationError = false,
}) => {
  const [search, setSearch] = useState('');
  const selectedCategories = useMemo(
    () => filteredCategories.filter((category) => selectedCategoryIds.includes(category.id)),
    [filteredCategories, selectedCategoryIds]
  );
  const normalizedSearch = normalizeSearchTerm(search);
  const matchingCategories = useMemo(
    () => searchProductCategories(filteredCategories, categories, search)
      .slice(0, PRODUCT_CATEGORY_SEARCH_MAX_SUGGESTIONS),
    [categories, filteredCategories, search]
  );

  return (
    <View
      style={[
        styles.categoriesContainer,
        dark && styles.darkCategoriesContainer,
        hasValidationError && selectedCategoryIds.length === 0 && styles.errorCategoriesContainer,
      ]}
    >
      <View style={styles.searchBox}>
        <Search size={16} color={dark ? '#94a3b8' : '#64748b'} />
        <FormTextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar categorias..."
          placeholderTextColor="#94a3b8"
          accessibilityLabel="Pesquisar categorias"
          accessibilityHint={hasValidationError ? 'Selecione pelo menos uma categoria.' : undefined}
          style={[styles.searchInput, dark && styles.lightText]}
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Limpar pesquisa"
          >
            <X size={16} color={dark ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        )}
      </View>
      {selectedCategories.length > 0 && (
        <View style={styles.selectedWrap}>
          {selectedCategories.map((category) => {
            const parentNames = (category.parents || [])
              .map((id) => categories.find((item) => item.id === id)?.name)
              .filter(Boolean)
              .join(', ');
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => onToggleCategory(category)}
                style={styles.selectedChip}
                accessibilityRole="button"
                accessibilityLabel={`Remover categoria ${category.name}`}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Check size={12} color="#2563eb" strokeWidth={3} />
                <Text style={styles.selectedChipText}>{category.name}</Text>
                {parentNames ? (
                  <Text style={styles.selectedChipParents} numberOfLines={1}>
                    ({parentNames})
                  </Text>
                ) : null}
                <X size={12} color="#64748b" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {normalizedSearch.length >= MIN_CATEGORY_SEARCH_LENGTH ? (
        <ScrollView
          nestedScrollEnabled
          style={styles.categoriesScroll}
          keyboardShouldPersistTaps="handled"
        >
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
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                accessibilityLabel={`Categoria ${cat.name}`}
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
            <Text style={styles.emptyCategoriesText}>
              Nenhuma categoria encontrada para “{search}”.
            </Text>
          )}
        </ScrollView>
      ) : (
        <Text style={styles.emptyCategoriesText}>Digite ao menos 3 caracteres para pesquisar.</Text>
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
  errorCategoriesContainer: {
    borderColor: '#ef4444',
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
    minHeight: 32,
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
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
