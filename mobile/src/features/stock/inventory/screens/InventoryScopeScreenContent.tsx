import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
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
  InventoryProductScopeStepContent,
  InventoryProductScopeStepFooter,
} from './InventoryProductScopeStep';
import { styles } from './inventoryScopeScreenContent.styles';
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
          <InventoryProductScopeStepContent
            isDarkMode={isDarkMode}
            colors={{ border, muted, surface, textPrimary }}
            isLoadingProductCatalog={isLoadingProductCatalog}
            productCatalogError={productCatalogError}
            productParentsCount={productParents.length}
            selectedProduct={selectedProduct}
            onRetryProductCatalog={() => void beginProductSelection()}
            onOpenSearch={() => setIsProductSearchOpen(true)}
            onClearSelection={() => setSelectedProductId('')}
          />
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
        <InventoryProductScopeStepFooter
          colors={{ border, muted, surface, textPrimary }}
          loadingData={loadingData}
          isLoadingProductCatalog={isLoadingProductCatalog}
          selectedProduct={selectedProduct}
          onBack={() => {
            setIsSelectingProduct(false);
            setSelectedProductId('');
            setIsProductSearchOpen(false);
            setProductCatalogError('');
          }}
          onContinue={continueWithProduct}
        />
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
