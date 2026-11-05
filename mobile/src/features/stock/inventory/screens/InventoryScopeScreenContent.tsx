import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import { useAuth } from '../../../../contexts/AuthContext';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { mobileInventoryAuditScopeSchema } from '../../../../../../shared-utils/inventoryAuditFormSchemas';
import {
  filterInventoryResponsibleCandidates,
  findDefaultInventoryResponsibleId,
  getInventoryResponsibleDisplayName,
} from '../../../../../../shared-utils/inventoryResponsible';
import type {
  ScopeConfiguration,
  ScopeProduct,
  ScopeSupplier,
  ScopeEmployee,
  InventoryScopeType,
} from '../hooks/useInventoryScopeBuilder';
import {
  fetchInventoryScopeProducts,
  fetchInventoryScopeSuppliers,
  fetchInventoryScopeEmployees,
  clearInventoryScopeCache,
} from '../../../../services/stockService';
import type { SearchableProduct } from '../modals/InventoryProductSearchModal';
import { InventoryProductSearchModal } from '../modals/InventoryProductSearchModal';
import { InventoryScopeTypeSelector } from '../components/InventoryScopeTypeSelector';
import { InventoryResponsibleSelector } from '../components/InventoryResponsibleSelector';
import {
  resolveInventoryScopeCopy,
  type InventoryScopeCopySource,
} from '../services/inventoryScopeCopy';
import { createInventoryScopeItemSnapshot } from '../services/inventoryScopeItemSnapshot';
import {
  buildInventoryScopeProductParents,
  searchInventoryScopeProductParents,
} from '../services/inventoryScopeProductSearch';

interface Props {
  isDarkMode: boolean;
  onCancel: () => void;
  onConfirm: (config: ScopeConfiguration) => void;
  copiedItems?: readonly InventoryScopeCopySource[] | null;
}

export const InventoryScopeScreenContent: React.FC<Props> = ({
  isDarkMode,
  onCancel,
  onConfirm,
  copiedItems,
}) => {
  const { userProfile } = useAuth();
  const [isOnline, setIsOnline] = useState(connectivityService.connected);
  const [suppliers, setSuppliers] = useState<ScopeSupplier[]>([]);
  const [employees, setEmployees] = useState<ScopeEmployee[]>([]);
  const [responsibleId, setResponsibleId] = useState('');
  const [responsibleError, setResponsibleError] = useState(false);
  const [employeesSyncedAt, setEmployeesSyncedAt] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [catalogSyncedAt, setCatalogSyncedAt] = useState<string | null>(null);
  const [copySelectionLocked, setCopySelectionLocked] = useState(false);
  const [customProducts, setCustomProducts] = useState<SearchableProduct[]>([]);
  const [isSelectingProduct, setIsSelectingProduct] = useState(false);
  const [isLoadingProductCatalog, setIsLoadingProductCatalog] = useState(false);
  const [productCatalogError, setProductCatalogError] = useState('');
  const [productScopeProducts, setProductScopeProducts] = useState<ScopeProduct[]>([]);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const responsibleInitialized = useRef(false);
  const scopeForm = useZodForm(mobileInventoryAuditScopeSchema, {
    type: 'full',
    name: '',
    supplierId: '',
    responsibleId: '',
    responsibleName: '',
    productId: '',
    itemsSnapshot: [],
  });

  const productParents = useMemo(
    () => buildInventoryScopeProductParents(productScopeProducts),
    [productScopeProducts]
  );
  const selectedProduct = productParents.find((product) => product.id === selectedProductId);
  const searchProductParents = useCallback(
    (query: string) => searchInventoryScopeProductParents(productParents, query),
    [productParents]
  );

  useEffect(() => connectivityService.subscribe(setIsOnline), []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoadingData(true);
      setLoadError(null);
      setCopyError(null);
      setCopySelectionLocked(false);
      try {
        const [supplierData, responsibleData] = await Promise.all([
          fetchInventoryScopeSuppliers(),
          fetchInventoryScopeEmployees(userProfile?.email),
        ]);
        if (active) {
          setSuppliers(supplierData as ScopeSupplier[]);
          setEmployees(responsibleData.employees as ScopeEmployee[]);
          setEmployeesSyncedAt(responsibleData.syncedAt);
          if (!responsibleInitialized.current) {
            const defaultResponsibleId = findDefaultInventoryResponsibleId(
              responsibleData.employees,
              responsibleData.currentEmployeeId || userProfile?.id
            );
            if (defaultResponsibleId) {
              setResponsibleId(defaultResponsibleId);
              responsibleInitialized.current = true;
            }
          }
          setCatalogSyncedAt(responsibleData.syncedAt);
        }

        if (active && copiedItems != null) {
          try {
            const currentProducts = (await fetchInventoryScopeProducts('full')) as SearchableProduct[];
            const resolution = resolveInventoryScopeCopy(copiedItems, currentProducts);
            if (resolution.valid === false) {
              setCopyError(resolution.message);
              setCustomProducts([]);
            } else {
              setCustomProducts(resolution.products);
              setCopySelectionLocked(true);
            }
          } catch {
            const resolution = resolveInventoryScopeCopy(copiedItems, []);
            setCopyError(resolution.valid === false ? resolution.message : null);
            setCustomProducts([]);
            setCopySelectionLocked(false);
          }
        }
      } catch (error) {
        if (active)
          setLoadError(
            error instanceof Error ? error.message : 'Não foi possível carregar os fornecedores.'
          );
      } finally {
        if (active) setLoadingData(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadToken, copiedItems, userProfile?.email, userProfile?.id]);

  const retryCatalogSync = () => {
    clearInventoryScopeCache();
    setReloadToken((current) => current + 1);
  };

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const confirmDirectly = async (
    type: InventoryScopeType,
    supplierId?: string,
    productId?: string,
    preloadedProducts?: ScopeProduct[]
  ) => {
    if (copyError) {
      Alert.alert('Erro', copyError);
      return;
    }
    const dateStr = new Date().toLocaleDateString('pt-BR');
    let name = '';
    if (type === 'full') name = `Inventário Livre: Etapas por Fornecedor - ${dateStr}`;
    else if (type === 'general') name = `Inventário Geral - ${dateStr}`;
    else if (type === 'product') {
      name = productParents.find((product) => product.id === productId)?.name || '';
    }
    else if (type === 'supplier') {
      const supplierName = suppliers.find((supplier) => supplier.id === supplierId)?.full_name;
      name = supplierName ? `Inventário ${supplierName}` : `Fornecedor específico - ${dateStr}`;
    } else name = 'Inventário Personalizado';

    const selectedEmployee = filterInventoryResponsibleCandidates(employees).find(
      (employee) => employee.id === responsibleId
    );
    const baseConfiguration = {
      type,
      name,
      hasStages: type === 'full' || type === 'supplier',
      responsibleId,
      responsibleName: selectedEmployee
        ? getInventoryResponsibleDisplayName(selectedEmployee)
        : '',
      supplierId: supplierId || '',
      productId: productId || '',
      itemsSnapshot: [],
    };

    await scopeForm.validateAndRun(
      baseConfiguration,
      async (validatedConfiguration) => {
        setLoadingData(true);
        try {
          const allProducts: ScopeProduct[] = preloadedProducts ??
            (type === 'custom'
              ? (customProducts as ScopeProduct[])
              : ((await fetchInventoryScopeProducts(type === 'supplier' ? 'supplier' : 'full', supplierId)) as ScopeProduct[]));

          const selectedProducts = allProducts.filter((product) =>
            type === 'product'
              ? String(product.id) === String(productId) && Boolean(product.variation_id) && product.active === true
              : type !== 'supplier' ||
                !supplierId ||
                [product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].some(
                  (id) => String(id) === String(supplierId)
                )
          );
          const items: ScopeConfiguration['itemsSnapshot'] = selectedProducts.map((product) =>
            createInventoryScopeItemSnapshot(product, suppliers)
          );

          if (items.length === 0) {
            throw new Error(
              type === 'product'
                ? 'Este produto não possui variações ativas disponíveis para contar.'
                : type === 'supplier'
                ? 'Nenhum produto deste fornecedor foi encontrado no catálogo local.'
                : 'Nenhum produto foi encontrado no catálogo local. Sincronize e tente novamente.'
            );
          }

          await onConfirm({
            ...validatedConfiguration,
            supplierId: supplierId || undefined,
            productId: productId || undefined,
            itemsSnapshot: items,
          });
          return true;
        } catch (error) {
          console.error('Não foi possível preparar o escopo do inventário:', error);
          Alert.alert(
            'Erro',
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os produtos para este inventário. Tente novamente.'
          );
          return false;
        } finally {
          setLoadingData(false);
        }
      },
      (errors) => {
        if (errors.responsibleId || errors.responsibleName) setResponsibleError(true);
        Alert.alert(
          'Revise o escopo',
          Object.values(flattenFormErrors(errors))[0] || 'Confira o escopo do inventário.'
        );
      }
    );
  };

  const beginProductSelection = async () => {
    setIsSelectingProduct(true);
    setProductCatalogError('');
    setIsProductSearchOpen(false);
    setSelectedProductId('');
    if (productScopeProducts.length > 0) return;
    setIsLoadingProductCatalog(true);
    try {
      setProductScopeProducts(
        (await fetchInventoryScopeProducts('full')) as ScopeProduct[]
      );
    } catch (error) {
      setProductCatalogError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os produtos ativos do catálogo offline.'
      );
    } finally {
      setIsLoadingProductCatalog(false);
    }
  };

  const continueWithProduct = () => {
    if (!selectedProduct) return;
    void confirmDirectly('product', undefined, selectedProduct.id, productScopeProducts);
  };

  if (loadingData) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: surface, borderBottomColor: border },
        ]}
      >
        <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {isSelectingProduct ? 'Produto específico e suas variações' : 'Novo Inventário'}
            </Text>
          {!isOnline && (
            <Text style={[styles.syncStatus, { color: muted }]}>
              {catalogSyncedAt
                ? `Índice offline atualizado em ${new Date(catalogSyncedAt).toLocaleString('pt-BR')}`
                : 'Índice offline ainda não sincronizado neste dispositivo'}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <X size={24} color={muted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {loadError ? (
          <View style={[styles.errorBox, { backgroundColor: surface, borderColor: border }]}>
            <Text style={{ color: textPrimary, textAlign: 'center' }}>{loadError}</Text>
            <TouchableOpacity
              onPress={retryCatalogSync}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : isSelectingProduct ? (
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800' }}>
                Etapa 1 · Escolha o produto pai
              </Text>
              <Text style={{ color: muted, fontSize: 13, lineHeight: 19, marginTop: 5 }}>
                Pesquise nos produtos ativos do ERP. A próxima etapa mostrará as variações para contar.
              </Text>
            </View>
            {!selectedProduct && (
              <TouchableOpacity
                testID="scope-product-parent-search"
                accessibilityRole="button"
                accessibilityLabel="Buscar produto pai ativo"
                onPress={() => setIsProductSearchOpen(true)}
                style={[styles.productSearchBox, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: border }]}
              >
                <Search size={19} color={muted} />
                <Text style={[styles.productSearchInput, { color: muted }]}>Nome ou código do produto...</Text>
              </TouchableOpacity>
            )}
            {selectedProduct && (
              <View style={[styles.selectedProductCard, { backgroundColor: isDarkMode ? '#2e1065' : '#f5f3ff', borderColor: isDarkMode ? '#6d28d9' : '#c4b5fd' }]}>
                <View style={styles.selectedProductIcon}><Check size={18} color="#ffffff" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }} numberOfLines={2}>
                    {selectedProduct.name}
                  </Text>
                  <Text style={{ color: muted, fontSize: 12, marginTop: 3 }}>
                    {selectedProduct.variationCount} variações ativas
                  </Text>
                </View>
                <TouchableOpacity
                  testID="scope-product-parent-clear"
                  accessibilityRole="button"
                  accessibilityLabel={`Desselecionar ${selectedProduct.name}`}
                  onPress={() => {
                    setSelectedProductId('');
                  }}
                  style={styles.clearSelectedProductButton}
                >
                  <X size={20} color={isDarkMode ? '#ddd6fe' : '#6d28d9'} />
                </TouchableOpacity>
              </View>
            )}
            {!selectedProduct && (isLoadingProductCatalog ? (
              <View style={styles.productCatalogLoading}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={{ color: muted, marginTop: 10 }}>Carregando produtos ativos...</Text>
              </View>
            ) : productCatalogError ? (
              <View style={[styles.errorBox, { backgroundColor: surface, borderColor: border }]}>
                <Text style={{ color: textPrimary, textAlign: 'center' }}>{productCatalogError}</Text>
                <TouchableOpacity onPress={() => void beginProductSelection()} style={styles.retryButton}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : null)}
            {!isLoadingProductCatalog && !productCatalogError && productParents.length === 0 && (
              <Text style={{ color: '#b45309', fontSize: 13, fontWeight: '700', textAlign: 'center', padding: 16 }}>
                Não há produtos ativos com variações disponíveis para contar.
              </Text>
            )}
          </View>
        ) : (
          <>
            {copyError && (
              <View style={[styles.errorBox, { backgroundColor: surface, borderColor: border }]}>
                <Text style={{ color: textPrimary, textAlign: 'center' }}>{copyError}</Text>
                <TouchableOpacity onPress={retryCatalogSync} style={styles.retryButton}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            )}
            <InventoryResponsibleSelector
              isDarkMode={isDarkMode}
              employees={employees}
              selectedId={responsibleId}
              isSynced={Boolean(employeesSyncedAt)}
              hasError={responsibleError}
              onRetrySync={retryCatalogSync}
              onSelect={(employee) => {
                responsibleInitialized.current = true;
                setResponsibleId(employee?.id || '');
                setResponsibleError(false);
              }}
            />
            <InventoryScopeTypeSelector
              isDarkMode={isDarkMode}
              customProducts={customProducts}
              lockedCustomSelection={copySelectionLocked}
              onConfirmType={(type, supId) => {
                if (type === 'product') void beginProductSelection();
                else void confirmDirectly(type, supId);
              }}
            />
          </>
        )}
      </ScrollView>

      {isSelectingProduct && (
        <View style={[styles.productStepFooter, { backgroundColor: surface, borderTopColor: border }]}>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={isLoadingProductCatalog || loadingData}
            onPress={() => {
              setIsSelectingProduct(false);
              setSelectedProductId('');
              setIsProductSearchOpen(false);
              setProductCatalogError('');
            }}
            style={[styles.productBackButton, { borderColor: border }]}
          >
            <Text style={{ color: textPrimary, fontWeight: '700' }}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="scope-product-next-btn"
            accessibilityRole="button"
            disabled={!selectedProduct || isLoadingProductCatalog || loadingData}
            onPress={continueWithProduct}
            style={[styles.productNextButton, (!selectedProduct || isLoadingProductCatalog || loadingData) && { opacity: 0.5 }]}
          >
            <Text style={styles.productNextButtonText}>Próxima etapa</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSelectingProduct && !isLoadingProductCatalog && !productCatalogError && (
        <InventoryProductSearchModal
          isDarkMode={isDarkMode}
          visible={isProductSearchOpen}
          activeOnly
          subtitle="Selecione um produto pai com variações ativas"
          searchProvider={searchProductParents}
          onClose={() => setIsProductSearchOpen(false)}
          onSelect={(product) => setSelectedProductId(product.id)}
        />
      )}

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  syncStatus: { fontSize: 11, marginTop: 5 },
  closeBtn: { padding: 4 },
  errorBox: { borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center', gap: 12 },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  productSearchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0, borderBottomWidth: 1, borderRadius: 0, paddingHorizontal: 14, minHeight: 50 },
  productSearchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  productCatalogLoading: { paddingVertical: 40, alignItems: 'center' },
  selectedProductCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  selectedProductIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  clearSelectedProductButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  productStepFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  productBackButton: { minHeight: 48, flex: 1, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productNextButton: { minHeight: 48, flex: 1.4, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed' },
  productNextButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
