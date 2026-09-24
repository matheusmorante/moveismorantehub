import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { searchProducts } from '../../../../services/stockService';

interface Props {
  isDarkMode: boolean;
  selectedProductName: string;
  onSelectProduct: (product: any) => void;
  onClearProduct: () => void;
}

export const StockProductSearchFilter: React.FC<Props> = ({
  isDarkMode,
  selectedProductName,
  onSelectProduct,
  onClearProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchProducts(searchQuery);
        setSuggestions(results);
      } catch (e) {
        console.error('Error fetching suggestions', e);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = (item: any) => {
    onSelectProduct(item);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onClearProduct();
    setSearchQuery('');
    setShowSuggestions(false);
  };

  if (selectedProductName) {
    return (
      <View style={[styles.selectedWrapper, isDarkMode && styles.selectedWrapperDark]}>
        <Text style={[styles.selectedText, isDarkMode && styles.textDark]} numberOfLines={1}>
          {selectedProductName}
        </Text>
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={6}>
          <X size={14} color="#0369a1" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
        <Search size={18} color={isDarkMode ? '#64748b' : '#94a3b8'} style={styles.searchIcon} />
        <TextInput
          style={[styles.input, isDarkMode && styles.textDark]}
          placeholder="Buscar por produto ou variação..."
          placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text);
            setShowSuggestions(text.length >= 2);
          }}
          onFocus={() => {
            if (searchQuery.length >= 2) setShowSuggestions(true);
          }}
        />
      </View>

      {showSuggestions && (
        <View style={[styles.suggestions, isDarkMode && styles.suggestionsDark]}>
          {isSearching ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ padding: 14 }} />
          ) : suggestions.length > 0 ? (
            suggestions.map(item => (
              <TouchableOpacity
                key={`${item.id}-${item.variation_id || 'main'}`}
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={[styles.suggestionName, isDarkMode && styles.textDark]}>
                  {item.name}
                </Text>
                {Boolean(item.sku) && <Text style={styles.suggestionSku}>SKU: {item.sku}</Text>}
                {item.stock !== undefined && (
                  <Text style={styles.suggestionStock}>Estoque: {item.stock} un</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.noResults, isDarkMode && styles.textMuted]}>
              Nenhum produto encontrado
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  selectedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    justifyContent: 'space-between',
  },
  selectedWrapperDark: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  selectedText: { fontSize: 13, fontWeight: '700', color: '#0369a1', flex: 1 },
  textDark: { color: '#f8fafc' },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(3, 105, 161, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
  },
  searchBoxDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  suggestions: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionsDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggestionName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  suggestionSku: { fontSize: 11, color: '#64748b', marginTop: 2 },
  suggestionStock: { fontSize: 11, fontWeight: '700', color: '#059669', marginTop: 2 },
  noResults: { padding: 14, textAlign: 'center', fontSize: 13, color: '#64748b' },
  textMuted: { color: '#94a3b8' },
});
