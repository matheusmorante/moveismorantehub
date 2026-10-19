import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { styles } from './ProductsHeader.styles';
import type { ProductListMode } from './ProductsHeaderModeSelector';

interface ProductsHeaderFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  dark: boolean;
  mode: ProductListMode;
  statusFilter: 'all' | 'active' | 'disabled' | 'draft';
  onStatusFilterChange: (value: 'all' | 'active' | 'disabled' | 'draft') => void;
  generalTypeFilter?: 'all' | 'product' | 'service';
  onGeneralTypeFilterChange?: (value: 'all' | 'product' | 'service') => void;
  showMergedProducts?: boolean;
  onToggleMergedProducts?: () => void;
  catalogStatusFilter: 'all' | 'published' | 'hidden';
  onCatalogStatusFilterChange: (value: 'all' | 'published' | 'hidden') => void;
  categories: any[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
}

/**
 * Bottom sheet modal de filtros avançados para a listagem móvel de produtos.
 */
export const ProductsHeaderFiltersSheet: React.FC<ProductsHeaderFiltersSheetProps> = ({
  visible,
  onClose,
  dark,
  mode,
  statusFilter,
  onStatusFilterChange,
  generalTypeFilter = 'all',
  onGeneralTypeFilterChange,
  showMergedProducts,
  onToggleMergedProducts,
  catalogStatusFilter,
  onCatalogStatusFilterChange,
  categories,
  categoryFilter,
  onCategoryFilterChange,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.filterBackdrop}>
        <View style={[styles.filterSheet, dark && styles.darkMenu]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, dark && styles.light]}>Filtros de produtos</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={dark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.filterLabel, dark && styles.light]}>Situação no ERP</Text>
          <View style={styles.choiceRow}>
            {(
              [
                ['all', 'Todos'],
                ['active', 'Ativos'],
                ['disabled', 'Desativados'],
                ['draft', 'Rascunhos'],
              ] as const
            ).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                onPress={() => onStatusFilterChange(value)}
                style={[styles.choice, statusFilter === value && styles.choiceActive]}
              >
                <Text
                  style={[styles.choiceText, statusFilter === value && styles.choiceTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'standard' && (
            <>
              <Text style={[styles.filterLabel, dark && styles.light]}>Tipo geral</Text>
              <View style={styles.choiceRow}>
                {(
                  [
                    ['all', 'Todos'],
                    ['product', 'Somente Produtos'],
                    ['service', 'Somente Serviços'],
                  ] as const
                ).map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => onGeneralTypeFilterChange?.(value)}
                    style={[styles.choice, generalTypeFilter === value && styles.choiceActive]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        generalTypeFilter === value && styles.choiceTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {mode === 'standard' && onToggleMergedProducts && (
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: showMergedProducts }}
              onPress={onToggleMergedProducts}
              style={styles.testToggleRow}
            >
              <View style={[styles.testCheckbox, showMergedProducts && styles.testCheckboxChecked]}>
                {showMergedProducts && <Check size={14} color="#ffffff" />}
              </View>
              <Text style={[styles.choiceText, dark && styles.light]}>Mostrar mesclados</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.filterLabel, dark && styles.light]}>Catálogo digital</Text>
          <View style={styles.choiceRow}>
            {(
              [
                ['all', 'Todos'],
                ['published', 'Publicados'],
                ['hidden', 'Ocultados'],
              ] as const
            ).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                onPress={() => onCatalogStatusFilterChange(value)}
                style={[styles.choice, catalogStatusFilter === value && styles.choiceActive]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    catalogStatusFilter === value && styles.choiceTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterLabel, dark && styles.light]}>Categoria</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.choiceRow}
          >
            <TouchableOpacity
              onPress={() => onCategoryFilterChange('')}
              style={[styles.choice, !categoryFilter && styles.choiceActive]}
            >
              <Text style={[styles.choiceText, !categoryFilter && styles.choiceTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => onCategoryFilterChange(String(category.id))}
                style={[
                  styles.choice,
                  categoryFilter === String(category.id) && styles.choiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    categoryFilter === String(category.id) && styles.choiceTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyButtonText}>Aplicar filtros</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
