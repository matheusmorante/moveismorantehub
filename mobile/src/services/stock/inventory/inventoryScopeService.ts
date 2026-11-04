import { supabase } from '../../supabaseClient';
import { fetchMobileProductsPage } from '../../../features/products/services/mobileProductFetchService';
import { ITEMS_PER_PAGE } from '../stockMovesService';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import {
  clearOfflineInventoryCatalogCache,
  ensureOfflineInventoryCatalogSynced,
  getOfflineInventoryCatalog,
  getOfflineInventoryScopeProducts,
  getOfflineInventoryResponsibleOptions,
  normalizeInventoryResponsibleRow,
} from '../../../features/stock/inventory/services/offlineInventoryCatalog';
import { filterInventoryResponsibleCandidates } from '../../../../../shared-utils/inventoryResponsible';
import { isStockInventorySupplierEligible } from '../../../../../shared-utils/inventorySupplierEligibility';
import { isProductComposition } from '../../../../../shared-utils/productCompositionRequirements';
import { isTestProduct } from '../../../../../shared-utils/isTestProduct';
import { OFFLINE_INVENTORY_CATALOG_FORMAT_VERSION } from '../../../features/stock/inventory/services/catalog/offlineInventoryCatalogTypes';
import {
  buildAccentInsensitiveWordsRegex,
  matchesSearchText,
} from '../../../../../shared-utils/searchText';

const assertInventoryCatalogCurrent = (formatVersion?: number) => {
  if (formatVersion !== OFFLINE_INVENTORY_CATALOG_FORMAT_VERSION) {
    throw new Error(
      'O catálogo local precisa ser atualizado antes de iniciar o inventário. Conecte-se à internet e tente novamente.'
    );
  }
};

export const fetchInventoryScopeSuppliers = async () => {
  await ensureOfflineInventoryCatalogSynced();
  const catalog = await getOfflineInventoryCatalog();
  assertInventoryCatalogCurrent(catalog.formatVersion);
  if (!catalog.syncedAt && Object.keys(catalog.suppliers).length === 0) {
    throw new Error(
      'O catálogo local ainda não foi sincronizado. Conecte-se à internet e tente novamente.'
    );
  }
  return Object.values(catalog.suppliers)
    .filter((supplier) => !supplier.deleted && isStockInventorySupplierEligible(supplier))
    .map((supplier) => ({
      id: supplier.id,
      full_name: supplier.social_name || supplier.full_name || supplier.nickname || '',
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name));
};

const resolveCurrentInventoryEmployeeId = async (email?: string | null): Promise<string | null> => {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return null;

  try {
    const result = await withTimeout(
      Promise.resolve(
        supabase
          .from('people')
          .select('id, person_type, email, position, address, deleted, updated_at')
          .eq('person_type', 'employees')
          .ilike('email', normalizedEmail)
          .or('deleted.eq.false,deleted.is.null')
          .order('updated_at', { ascending: false })
          .order('id', { ascending: true })
          .limit(500)
      ),
      3000,
      null,
      'inventory:current-responsible'
    );
    if (result?.error || !result?.data) return null;
    const currentEmployee = filterInventoryResponsibleCandidates(
      result.data.map(normalizeInventoryResponsibleRow)
    )[0];
    return currentEmployee?.id ? String(currentEmployee.id) : null;
  } catch {
    return null;
  }
};

export const fetchInventoryScopeEmployees = async (currentUserEmail?: string | null) => {
  const currentEmployeeIdPromise = resolveCurrentInventoryEmployeeId(currentUserEmail);
  await ensureOfflineInventoryCatalogSynced();
  const catalog = await getOfflineInventoryCatalog();
  const [employees, currentEmployeeId] = await Promise.all([
    getOfflineInventoryResponsibleOptions(),
    currentEmployeeIdPromise,
  ]);
  return {
    employees,
    syncedAt: catalog.employeesSyncedAt || null,
    currentEmployeeId,
  };
};

export const fetchInventoryScopeProducts = async (
  _scope: 'full' | 'supplier',
  _supplierId?: string
) => {
  await ensureOfflineInventoryCatalogSynced();
  const catalog = await getOfflineInventoryCatalog();
  assertInventoryCatalogCurrent(catalog.formatVersion);
  const products = await getOfflineInventoryScopeProducts();
  if (products.length === 0) {
    throw new Error(
      'Nenhum produto foi encontrado no catálogo local. Conecte-se à internet e tente novamente.'
    );
  }
  return products;
};

export const searchInventoryScopeProducts = async (query: string, supplierId?: string) => {
  const searchTerm = query.trim();
  if (searchTerm.length < 3) return [];

  // Consulta sob demanda e limitada para a abertura da busca não carregar o
  // catálogo offline inteiro e travar o Expo Web em catálogos grandes.
  const { data } = await fetchMobileProductsPage(1, 20, {
    search: searchTerm,
    supplierId,
    statusFilter: 'all',
    itemType: 'standard',
    generalType: 'product',
    throwOnError: true,
  });
  const words = searchTerm.split(/\s+/).filter(Boolean);

  return data
    .flatMap((product: any) => {
      if (
        !product?.id ||
        product.deleted ||
        product.deleted_at ||
        product.isDraft ||
        product.is_draft ||
        String(product.status || '').toLowerCase() === 'draft' ||
        (product.itemType || product.item_type || 'product') !== 'product' ||
        ['salvado', 'usado'].includes(String(product.product_kind || '').toLowerCase()) ||
        isTestProduct(product) ||
        isProductComposition(product)
      ) {
        return [];
      }

      const supplierIds = [
        product.supplierId,
        product.mainSupplierId,
        product.supplier_id,
        product.main_supplier_id,
        ...(Array.isArray(product.supplierIds) ? product.supplierIds : []),
        ...(Array.isArray(product.supplier_ids) ? product.supplier_ids : []),
      ]
        .filter(Boolean)
        .map(String);
      if (supplierId && !supplierIds.includes(String(supplierId))) return [];

      const parentCode = `${product.code || ''} ${product.sku || ''}`;
      const variations = Array.isArray(product.variations) ? product.variations : [];
      return variations
        .filter((variation: any) =>
          variation?.id &&
          !String(variation.id).startsWith('virtual-') &&
          !variation.deleted &&
          !isTestProduct(variation) &&
          !variation.merged_to_variation_id &&
          !variation.mergedToVariationId
        )
        .filter((variation: any) => {
          const variationName = variation.name || product.name || '';
          const variationSku = variation.sku || '';
          return words.every(
            (word) =>
              matchesSearchText(variationName, word) ||
              matchesSearchText(variationSku, word) ||
              matchesSearchText(parentCode, word),
          );
        })
        .map((variation: any) => ({
          id: String(product.id),
          variation_id: String(variation.id),
          name: String(variation.name || product.name || 'Produto'),
          sku: String(variation.sku || product.code || ''),
          code: String(product.code || ''),
          stock: Number(variation.stock ?? product.stock ?? 0),
          unit: String(product.unit || 'UN'),
          supplier_id: product.supplier_id ? String(product.supplier_id) : undefined,
          main_supplier_id: product.main_supplier_id ? String(product.main_supplier_id) : undefined,
          supplier_ids: supplierIds,
          active: product.active !== false && variation.active !== false,
        }));
    })
    .slice(0, 5);
};

export const clearInventoryScopeCache = () => clearOfflineInventoryCatalogCache();

export const fetchInventoryItems = async (
  _sessionId: string,
  page: number,
  searchQuery: string = ''
) => {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  let query = supabase
    .from('products')
    .select('id, name, stock')
    .order('name', { ascending: true })
    .range(from, to);

  if (searchQuery) {
    query = query.filter('name', 'imatch', buildAccentInsensitiveWordsRegex(searchQuery));
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((p) => ({
    ...p,
    stock_quantity: p.stock || 0,
  }));
};

export const searchProducts = async (query: string) => {
  const searchTerm = query.trim();
  if (searchTerm.length < 3) return [];

  const { data } = await fetchMobileProductsPage(1, 5, {
    search: searchTerm,
    statusFilter: 'active',
    throwOnError: true,
  });
  const searchWords = searchTerm.split(/\s+/).filter(Boolean);

  return data
    .flatMap((product: any) => {
      const variations = Array.isArray(product.variations) ? product.variations : [];
      return variations
        .filter(
          (variation: any) =>
            variation.id &&
            !String(variation.id).startsWith('virtual-') &&
            variation.active !== false &&
            !variation.mergedToVariationId
        )
        .filter((variation: any) => {
          const variationName = variation.name || product.name || '';
          const variationSku = variation.sku || '';
          const parentCode = `${product.code || ''} ${product.sku || ''}`;
          return searchWords.every(
            (word) =>
              matchesSearchText(variationName, word) ||
              matchesSearchText(variationSku, word) ||
              matchesSearchText(parentCode, word)
          );
        })
        .map((variation: any) => ({
          id: String(product.id),
          name: String(variation.name || product.name || 'Produto'),
          variationName: String(variation.name || product.name || 'Produto'),
          sku: String(variation.sku || product.code || ''),
          stock: Number(variation.stock ?? product.stock ?? 0),
          variation_id: String(variation.id),
        }));
    })
    .slice(0, 5);
};
