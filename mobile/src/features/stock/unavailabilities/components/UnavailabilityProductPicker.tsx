import React, { useState } from 'react';
import { Search, X } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { InventoryProductSearchModal } from '../../inventory/components/InventoryProductSearchModal';
import { searchProducts } from '../../../../services/stock/stockInventoryService';
import { styles } from '../modals/UnavailabilityFormModal.styles';
import { ProductVariationSuggestion } from '../types';

export interface UnavailabilityProductPickerProps {
  readonly isDarkMode: boolean;
  readonly disabled: boolean;
  readonly selectedProductVariation: ProductVariationSuggestion | null;
  readonly onSelectProductVariation: (item: ProductVariationSuggestion | null) => void;
}

export const UnavailabilityProductPicker: React.FC<UnavailabilityProductPickerProps> = ({
  isDarkMode,
  disabled,
  selectedProductVariation,
  onSelectProductVariation,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>
        Produto <Text style={styles.requiredMark}>*</Text>
      </Text>
      {selectedProductVariation ? (
        <View style={[styles.selectedCard, isDarkMode && styles.selectedCardDark]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectedTitle, isDarkMode && styles.selectedTitleDark]}>
              {selectedProductVariation.variationName}
            </Text>
            <Text style={styles.selectedSku}>
              SKU: {selectedProductVariation.sku} • Saldo: {selectedProductVariation.stock}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              onSelectProductVariation(null);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Alterar produto selecionado"
            style={styles.clearSelectedBtn}
          >
            <X size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buscar produto"
          disabled={disabled}
          onPress={() => setIsSearchOpen(true)}
          style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}
        >
          <Search size={18} color="#94a3b8" />
          <Text style={[styles.searchInput, isDarkMode && styles.searchInputDark]}>
            Toque para buscar produto...
          </Text>
        </TouchableOpacity>
      )}

      <InventoryProductSearchModal
        isDarkMode={isDarkMode}
        visible={isSearchOpen}
        activeOnly
        subtitle="Selecione a variação para registrar a indisponibilidade"
        searchProvider={(query) => searchProducts(query, { includeTrashEligibility: false })}
        onClose={() => setIsSearchOpen(false)}
        onSelect={(product) => {
          if (!product.variation_id) return;
          onSelectProductVariation({
            id: product.id,
            name: product.name,
            sku: product.sku || '',
            stock: Number(product.stock || 0),
            variation_id: product.variation_id,
            variationName: product.name,
          });
          setIsSearchOpen(false);
        }}
      />
    </View>
  );
};
