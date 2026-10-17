import { Search, X } from 'lucide-react-native';
import type React from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../modals/UnavailabilityFormModal.styles';
import { ProductVariationSuggestion } from '../types';

export interface UnavailabilityProductPickerProps {
  readonly isDarkMode: boolean;
  readonly selectedProductVariation: ProductVariationSuggestion | null;
  readonly productQuery: string;
  readonly isSearchingProduct: boolean;
  readonly productSuggestions: readonly ProductVariationSuggestion[];
  readonly onSelectProductVariation: (item: ProductVariationSuggestion | null) => void;
  readonly onProductQueryChange: (query: string) => void;
}

export const UnavailabilityProductPicker: React.FC<UnavailabilityProductPickerProps> = ({
  isDarkMode,
  selectedProductVariation,
  productQuery,
  isSearchingProduct,
  productSuggestions,
  onSelectProductVariation,
  onProductQueryChange,
}) => {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>
        Produto e Variação <Text style={styles.requiredMark}>*</Text>
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
              onProductQueryChange('');
            }}
            style={styles.clearSelectedBtn}
          >
            <X size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
            <Search size={18} color="#94a3b8" />
            <TextInput
              style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
              placeholder="Buscar por nome ou SKU..."
              placeholderTextColor="#94a3b8"
              value={productQuery}
              onChangeText={onProductQueryChange}
              autoCapitalize="none"
            />
            {isSearchingProduct && <ActivityIndicator size="small" color="#dc2626" />}
          </View>

          {/* Sugestões de variações */}
          {productSuggestions.length > 0 && (
            <View style={[styles.suggestionsList, isDarkMode && styles.suggestionsListDark]}>
              {productSuggestions.map((item) => (
                <TouchableOpacity
                  key={`${item.id}-${item.variation_id}`}
                  style={[styles.suggestionItem, isDarkMode && styles.suggestionItemDark]}
                  onPress={() => {
                    onSelectProductVariation(item);
                    onProductQueryChange('');
                  }}
                >
                  <Text style={[styles.suggestionName, isDarkMode && styles.textLight]}>
                    {item.variationName}
                  </Text>
                  <Text style={styles.suggestionDetails}>
                    SKU: {item.sku} • Saldo: {item.stock}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
