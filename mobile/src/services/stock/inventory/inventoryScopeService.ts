import { supabase } from '../../supabaseClient';
import { ITEMS_PER_PAGE } from '../stockMovesService';
import {
  clearOfflineInventoryCatalogCache,
  ensureOfflineInventoryCatalogSynced,
  getOfflineInventoryCatalog,
  getOfflineInventoryScopeProducts,
  getOfflineInventoryResponsibleOptions,
} from '../../../features/stock/inventory/services/offlineInventoryCatalog';

export const fetchInventoryScopeSuppliers = async () => {
  await ensureOfflineInventoryCatalogSynced();
  const catalog = await getOfflineInventoryCatalog();
  if (!catalog.syncedAt && Object.keys(catalog.suppliers).length === 0) {
    throw new Error(
      'O catálogo local ainda não foi sincronizado. Conecte-se à internet e tente novamente.'
    );
  }
  return Object.values(catalog.suppliers)
    .filter((supplier) => !supplier.deleted)
    .map((supplier) => ({
      id: supplier.id,
      full_name: supplier.social_name || supplier.full_name || supplier.nickname || '',
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name));
};

export const fetchInventoryScopeEmployees = async () => {
  await ensureOfflineInventoryCatalogSynced();
  const catalog = await getOfflineInventoryCatalog();
  return {
    employees: await getOfflineInventoryResponsibleOptions(),
    syncedAt: catalog.employeesSyncedAt || null,
  };
};

export const fetchInventoryScopeProducts = async (
  _scope: 'full' | 'supplier',
  _supplierId?: string
) => {
  await ensureOfflineInventoryCatalogSynced();
  const products = await getOfflineInventoryScopeProducts();
  if (products.length === 0) {
    throw new Error(
      'Nenhum produto foi encontrado no catálogo local. Conecte-se à internet e tente novamente.'
    );
  }
  return products;
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
    query = query.ilike('name', `%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((p) => ({
    ...p,
    stock_quantity: p.stock || 0,
  }));
};

export const searchProducts = async (query: string) => {
  if (!query || query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, stock, product_variations(id, name, sku, stock)')
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return (data || []).flatMap((product: any) => {
      const variations = Array.isArray(product.product_variations)
        ? product.product_variations
        : [];
      if (variations.length === 0) return [];
      return variations.map((variation: any) => ({
        ...product,
        variation_id: variation.id,
        name: variation.name,
        variationName: variation.name,
        sku: variation.sku || product.sku,
        stock: Number(
          variation.stock !== undefined && variation.stock !== null
            ? variation.stock
            : product.stock || 0
        ),
      }));
    });
  } catch {
    // Fallback offline usando o catálogo local SQLite
    const term = query.trim().toLowerCase();
    const localProducts = await getOfflineInventoryScopeProducts().catch(() => []);
    return localProducts
      .filter((item) =>
        `${item.name || ''} ${item.sku || ''} ${item.code || ''} ${item.barcode || ''}`
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 10)
      .map((item) => ({
        ...item,
        variationName: item.name,
      }));
  }
};
