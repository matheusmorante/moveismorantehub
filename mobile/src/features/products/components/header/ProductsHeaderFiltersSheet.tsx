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
  isAdministrator?: boolean;
  showTestProducts?: boolean;
  showTrash?: boolean;
  onToggleMergedProducts?: () => void;
  onToggleTestProducts?: () => void;
  catalogStatusFilter: 'all' | 'published' | 'hidden';
  onCatalogStatusFilterChange: (value: 'all' | 'published' | 'hidden') => void;
  canFilterByCategory: boolean;
  categories: any[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  onResetFilters?: () => void;
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
  isAdministrator = false,
  showTestProducts = false,
  showTrash = false,
  onToggleMergedProducts,
  onToggleTestProducts,
  catalogStatusFilter,
  onCatalogStatusFilterChange,
  canFilterByCategory,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  onResetFilters,
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

          {!showTrash && <Text style={[styles.filterLabel, dark && styles.light]}>Situação no ERP</Text>}
          {!showTrash && <View style={styles.choiceRow}>
            {(
              [
                ['all', 'Todos os Produtos'],
                ['active', 'Produtos Ativos'],
                ['disabled', 'Produtos Desativados'],
                ['draft', 'Rascunhos (Em Cadastro)'],
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
          </View>}

          {!showTrash && mode === 'standard' && (
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

          {!showTrash && mode === 'standard' && onToggleMergedProducts && (
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

          {!showTrash && mode !== 'categories' && isAdministrator && onToggleTestProducts && (
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: showTestProducts }}
              onPress={onToggleTestProducts}
              style={styles.testToggleRow}
            >
              <View style={[styles.testCheckbox, showTestProducts && styles.testCheckboxChecked]}>
                {showTestProducts && <Check size={14} color="#ffffff" />}
              </View>
              <Text style={[styles.choiceText, dark && styles.light]}>Mostrar dados de teste</Text>
            </TouchableOpacity>
          )}

          {!showTrash && <Text style={[styles.filterLabel, dark && styles.light]}>Catálogo digital</Text>}
          {!showTrash && <View style={styles.choiceRow}>
            {(
              [
                ['all', 'Todos'],
                ['published', 'Publicado no Catálogo'],
                ['hidden', 'Ocultado do Catálogo'],
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
          </View>}

          {canFilterByCategory && (
            <>
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
                    Todas as Categorias
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
            </>
          )}

          <View style={styles.filterActions}>
            {onResetFilters && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={onResetFilters}
                style={[styles.resetFiltersButton, dark && styles.darkResetFiltersButton]}
              >
                <Text style={[styles.resetFiltersText, dark && styles.light]}>Limpar filtros</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Aplicar filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
