import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useAuth } from '../../../../contexts/AuthContext';
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
import {
  InventoryProductSearchModal,
  type SearchableProduct,
} from '../modals/InventoryProductSearchModal';
import { InventoryScopeTypeSelector } from '../components/InventoryScopeTypeSelector';
import { InventoryResponsibleSelector } from '../components/InventoryResponsibleSelector';
import {
  resolveInventoryScopeCopy,
  type InventoryScopeCopySource,
} from '../services/inventoryScopeCopy';

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
  const [expandedType, setExpandedType] = useState<InventoryScopeType | null>(null);
  const [copySelectionLocked, setCopySelectionLocked] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [customProducts, setCustomProducts] = useState<SearchableProduct[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const responsibleInitialized = useRef(false);
  const scopeForm = useZodForm(mobileInventoryAuditScopeSchema, {
    type: 'full',
    name: '',
    supplierId: '',
    responsibleId: '',
    responsibleName: '',
    itemsSnapshot: [],
  });

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
          fetchInventoryScopeEmployees(),
        ]);
        if (active) {
          setSuppliers(supplierData as ScopeSupplier[]);
          setEmployees(responsibleData.employees as ScopeEmployee[]);
          setEmployeesSyncedAt(responsibleData.syncedAt);
          if (!responsibleInitialized.current) {
            setResponsibleId(findDefaultInventoryResponsibleId(responsibleData.employees, userProfile?.id));
            responsibleInitialized.current = true;
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
              setExpandedType('custom');
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
  }, [reloadToken, copiedItems, userProfile?.id]);

  const retryCatalogSync = () => {
    clearInventoryScopeCache();
    setReloadToken((current) => current + 1);
  };

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const confirmDirectly = async (type: InventoryScopeType, supplierId?: string) => {
    if (copyError) {
      Alert.alert('Erro', copyError);
      return;
    }
    const dateStr = new Date().toLocaleDateString('pt-BR');
    let name = '';
    if (type === 'full') name = `Inventário Geral - ${dateStr}`;
    else if (type === 'supplier') {
      const supplierName = suppliers.find((supplier) => supplier.id === supplierId)?.full_name;
      name = supplierName ? `Inventário ${supplierName}` : 'Inventário por Fornecedor';
    } else name = 'Inventário Personalizado';

    const selectedEmployee = filterInventoryResponsibleCandidates(employees).find(
      (employee) => employee.id === responsibleId
    );
    const baseConfiguration = {
      type,
      name,
      hasStages: type === 'full',
      responsibleId,
      responsibleName: selectedEmployee
        ? getInventoryResponsibleDisplayName(selectedEmployee)
        : '',
      supplierId: supplierId || '',
      itemsSnapshot: [],
    };

    await scopeForm.validateAndRun(
      baseConfiguration,
      async (validatedConfiguration) => {
        setLoadingData(true);
        try {
          const allProducts: ScopeProduct[] =
            type === 'custom'
              ? (customProducts as ScopeProduct[])
              : ((await fetchInventoryScopeProducts(type, supplierId)) as ScopeProduct[]);

          const selectedProducts = allProducts.filter((product) =>
            type !== 'supplier' ||
            !supplierId ||
            [product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].some(
              (id) => String(id) === String(supplierId)
            )
          );
          const items: ScopeConfiguration['itemsSnapshot'] = selectedProducts.map((product) => {
            const supplierIds = [
              ...new Set(
                [product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])]
                  .filter(Boolean)
                  .map(String)
              ),
            ];
            const supplierNames = supplierIds
              .map((id) => suppliers.find((supplier) => String(supplier.id) === id)?.full_name)
              .filter(Boolean);
            const assignedSupplierId = [
              product.main_supplier_id,
              product.supplier_id,
              ...(product.supplier_ids || []),
            ].find(Boolean);
            const assignedSupplier =
              (assignedSupplierId &&
                suppliers.find((supplier) => String(supplier.id) === String(assignedSupplierId))
                  ?.full_name) || 'Sem fornecedor';

            return {
              productId: String(product.id),
              variationId: product.variation_id ? String(product.variation_id) : undefined,
              name: product.name || product.description || 'Produto',
              supplierNames: supplierNames.join(' / ') || 'Fábrica não informada',
              assignedSupplier,
              systemStock: Number(product.stock ?? 0),
              unit: product.unit || 'UN',
              sku: product.sku || product.code || '',
              code: product.code || '',
              barcode: product.barcode || '',
              isActive: product.active !== false,
            };
          });

          if (items.length === 0) {
            throw new Error(
              type === 'supplier'
                ? 'Nenhum produto deste fornecedor foi encontrado no catálogo local.'
                : 'Nenhum produto foi encontrado no catálogo local. Sincronize e tente novamente.'
            );
          }

          await onConfirm({
            ...validatedConfiguration,
            supplierId: supplierId || undefined,
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
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: surface, borderBottomColor: border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Novo Inventário</Text>
          <Text style={[styles.headerSubtitle, { color: muted }]}>
            O que você deseja inventariar?
          </Text>
          <Text style={[styles.syncStatus, { color: muted }]}>
            {catalogSyncedAt
              ? `Índice offline atualizado em ${new Date(catalogSyncedAt).toLocaleString('pt-BR')}`
              : 'Índice offline ainda não sincronizado neste dispositivo'}
          </Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <X size={24} color={muted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
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
                setResponsibleId(employee?.id || '');
                setResponsibleError(false);
              }}
            />
            <InventoryScopeTypeSelector
              isDarkMode={isDarkMode}
              suppliers={suppliers}
              expandedType={expandedType}
              onToggleExpand={(type) => setExpandedType(expandedType === type ? null : type)}
              selectedSupplierId={selectedSupplierId}
              onSelectSupplier={(id) => setSelectedSupplierId(id)}
              customProducts={customProducts}
              lockedCustomSelection={copySelectionLocked}
              onOpenSearch={() => setSearchOpen(true)}
              onRemoveCustomProduct={(prod) =>
                setCustomProducts((current) =>
                  current.filter(
                    (item) => item.id !== prod.id || item.variation_id !== prod.variation_id
                  )
                )
              }
              onConfirmType={(type, supId) => void confirmDirectly(type, supId)}
            />
          </>
        )}
      </ScrollView>

      <InventoryProductSearchModal
        isDarkMode={isDarkMode}
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(product) =>
          setCustomProducts((current) =>
            current.some(
              (item) => item.id === product.id && item.variation_id === product.variation_id
            )
              ? current
              : [...current, product]
          )
        }
      />
    </View>
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
  headerSubtitle: { fontSize: 13, marginTop: 2 },
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
});
