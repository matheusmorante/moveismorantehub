import { FormTextInput } from '../../../../components/shared/FormTextInput';
import React, { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { X, Search } from 'lucide-react-native';
import { matchesSearchText } from '../../../../../../shared-utils/searchText';
import { productAutocompleteFormSchema } from '../../../../../../shared-utils/productAutocompleteFormSchema';
import { useZodForm } from '../../../../hooks/useZodForm';

import {
  fetchInventoryScopeSuppliers,
  fetchInventoryScopeProducts,
} from '../../../../services/stockService';
import type { ProductSearchProvider, SearchableProduct } from './InventoryProductSearchModal';

interface Props {
  isDarkMode: boolean;
  visible: boolean;
  onClose: () => void;
  onSelect: (product: SearchableProduct) => void;
  subtitle?: string;
  supplierId?: string;
  activeOnly?: boolean;
  searchProvider?: ProductSearchProvider;
}

export const InventoryProductSearchModalContent: React.FC<Props> = ({
  isDarkMode,
  visible,
  onClose,
  onSelect,
  subtitle = 'Selecione para adicionar à contagem',
  supplierId,
  activeOnly = false,
  searchProvider,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  );
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [products, setProducts] = useState<SearchableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [remoteProducts, setRemoteProducts] = useState<SearchableProduct[]>([]);
  const [isRemoteSearching, setIsRemoteSearching] = useState(false);
  const [remoteSearchError, setRemoteSearchError] = useState('');
  const remoteSearchRevision = useRef(0);
  const searchForm = useZodForm(productAutocompleteFormSchema, {
    query: search,
    parentsOnly: false,
    variationsOnly: true,
    includeDeactivated: !activeOnly,
    excludeCombos: false,
  });
  const validateSearch = searchForm.validateValues;

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  useEffect(() => {
    if (!visible || searchProvider) return;
    setLoading(true);

    Promise.all([
      fetchInventoryScopeSuppliers().catch(() => []),
      fetchInventoryScopeProducts('full').catch(() => []),
    ])
      .then(([supplierData, scopeProducts]) => {
        const suppliersList = (supplierData || []) as Array<{
          id: string | number;
          full_name?: string;
        }>;
        const suppliersMap = new Map<string, string>();
        for (const s of suppliersList) {
          if (s.id && s.full_name) {
            suppliersMap.set(String(s.id), s.full_name);
          }
        }

        const resolveSuppliers = (p: any) => {
          const ids = [
            ...new Set(
              [p.main_supplier_id, p.supplier_id, ...(p.supplier_ids || [])]
                .filter(Boolean)
                .map(String)
            ),
          ];
          const names = ids.map((id) => suppliersMap.get(id)).filter(Boolean);
          const supplierNames = names.join(' / ') || 'Fábrica não informada';
          const assignedSupplier = names[0] || 'Sem fornecedor';
          return { supplierNames, assignedSupplier };
        };

        const mapped = (scopeProducts || []).map((product: any) => {
          const { supplierNames, assignedSupplier } = resolveSuppliers(product);
          return {
            id: String(product.id),
            variation_id: product.variation_id ? String(product.variation_id) : undefined,
            name: product.name || product.description || 'Produto',
            description: product.description,
            sku: product.sku || product.code || '',
            code: product.code || '',
            barcode: product.barcode || '',
            stock: product.stock ?? 0,
            unit: product.unit || 'UN',
            main_supplier_id: product.main_supplier_id ? String(product.main_supplier_id) : undefined,
            supplier_id: product.supplier_id ? String(product.supplier_id) : undefined,
            supplier_ids: Array.isArray(product.supplier_ids)
              ? product.supplier_ids.map(String)
              : [],
            supplierNames,
            assignedSupplier,
            active: product.active !== false,
          } as SearchableProduct;
        });

        setProducts(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erro ao buscar catálogo de produtos para escopo:', err);
        setLoading(false);
      });
  }, [visible, searchProvider]);

  useEffect(() => {
    if (!searchProvider) return;

    const query = search.trim();
    const revision = ++remoteSearchRevision.current;
    setRemoteProducts([]);
    setRemoteSearchError('');

    if (!visible || query.length < 3) {
      setIsRemoteSearching(false);
      return () => {
        if (remoteSearchRevision.current === revision) remoteSearchRevision.current += 1;
      };
    }

    setIsRemoteSearching(false);
    const timeoutId = setTimeout(() => {
      setIsRemoteSearching(true);
      void validateSearch({
        query,
        parentsOnly: false,
        variationsOnly: true,
        includeDeactivated: !activeOnly,
        excludeCombos: false,
      })
        .then((values) => {
          if (!values || revision !== remoteSearchRevision.current) return [];
          return searchProvider(values.query);
        })
        .then((results) => {
          if (revision === remoteSearchRevision.current) setRemoteProducts(results.slice(0, 5));
        })
        .catch(() => {
          if (revision === remoteSearchRevision.current) {
            setRemoteSearchError('Não foi possível buscar produtos. Confira a conexão e tente novamente.');
          }
        })
        .finally(() => {
          if (revision === remoteSearchRevision.current) setIsRemoteSearching(false);
        });
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (remoteSearchRevision.current === revision) remoteSearchRevision.current += 1;
    };
  }, [activeOnly, search, searchProvider, validateSearch, visible]);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 3) {
      setDebouncedSearch('');
      return;
    }

    const timeoutId = setTimeout(() => setDebouncedSearch(term), 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const supplierScopedProducts = products.filter((product) => {
    if (activeOnly && product.active === false) return false;
    if (!supplierId) return true;
    const supplierIds = new Set([
      ...(product.supplier_ids || []),
      product.main_supplier_id,
      product.supplier_id,
    ].filter(Boolean).map(String));
    return supplierIds.has(supplierId);
  });

  const searchTerm = search.trim();
  const searchReady = searchTerm.length >= 3 && searchTerm === debouncedSearch;
  const filtered = searchProvider
    ? remoteProducts
    : searchReady
    ? supplierScopedProducts
        .filter((p) => matchesSearchText(`${p.name || p.description || ''} ${p.sku || ''}`, debouncedSearch))
        .slice(0, 5)
    : [];

  const resultsLoading = searchProvider ? isRemoteSearching : loading;

  const handleClose = () => {
    if (searchProvider) {
      setSearch('');
      setRemoteProducts([]);
      setRemoteSearchError('');
    }
    onClose();
  };

  const handleSelect = (product: SearchableProduct) => {
    onSelect(product);
    setSearch('');
    setRemoteProducts([]);
    setRemoteSearchError('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View
        style={[
          styles.container,
          { backgroundColor: bg },
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#7c3aed' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Buscar Produto</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity testID="close-modal-btn" onPress={handleClose} style={styles.closeBtn}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: surface, borderBottomColor: border }]}>
          <View style={[styles.searchBox, { backgroundColor: bg, borderColor: border }]}>
            <Search size={18} color={muted} />
            <FormTextInput
              testID="search-product-input"
              style={[styles.searchInput, { color: textPrimary }]}
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Nome, SKU, código..."
              placeholderTextColor={muted}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color={muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results */}
        {resultsLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#7c3aed" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) =>
              item.variation_id ? `${item.id}-${item.variation_id}` : String(item.id)
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={{ color: muted, textAlign: 'center' }}>
                  {remoteSearchError || (searchTerm.length < 3
                    ? 'Digite ao menos 3 caracteres para buscar produtos'
                    : (searchProvider && searchTerm !== debouncedSearch) || (!searchProvider && !searchReady)
                      ? 'Buscando produtos...'
                      : 'Nenhum produto encontrado')}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                testID="product-search-item"
                accessibilityRole="button"
                accessibilityLabel={`Selecionar produto ${item.name || item.description || 'Produto'}${item.sku ? `, SKU ${item.sku}` : ''}`}
                style={[styles.productItem, { backgroundColor: surface, borderColor: border }]}
                onPress={() => handleSelect(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: textPrimary }]} numberOfLines={1}>
                    {item.name || item.description || 'Produto'}
                  </Text>
                  <Text style={[styles.productStock, { color: muted }]}>
                    {item.resultMeta || [
                      item.supplierNames && item.supplierNames !== 'Fábrica não informada'
                        ? item.supplierNames
                        : '',
                      item.sku ? `SKU: ${item.sku}` : '',
                      `Estoque: ${item.stock ?? 0} ${item.unit || 'UN'}`,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  closeBtn: { padding: 4 },
  searchBar: { padding: 16, borderBottomWidth: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  listContent: { padding: 16, gap: 10 },
  centered: { flex: 1, padding: 48, alignItems: 'center', justifyContent: 'center' },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  productName: { fontSize: 15, fontWeight: '700' },
  productStock: { fontSize: 12, marginTop: 2 },
});
