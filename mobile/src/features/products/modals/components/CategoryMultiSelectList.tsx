import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { MobileCategory } from '../../services/mobileCategoryService';

interface CategoryMultiSelectListProps {
  categories: MobileCategory[];
  filteredCategories: MobileCategory[];
  selectedCategoryIds: string[];
  onToggleCategory: (category: MobileCategory) => void;
  dark: boolean;
}

export const CategoryMultiSelectList: React.FC<CategoryMultiSelectListProps> = ({
  categories,
  filteredCategories,
  selectedCategoryIds,
  onToggleCategory,
  dark,
}) => {
  return (
    <View style={[styles.categoriesContainer, dark && styles.darkCategoriesContainer]}>
      <ScrollView nestedScrollEnabled style={styles.categoriesScroll}>
        {filteredCategories.map((cat) => {
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
        {filteredCategories.length === 0 && (
          <Text style={styles.emptyCategoriesText}>Carregando categorias...</Text>
        )}
      </ScrollView>
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
