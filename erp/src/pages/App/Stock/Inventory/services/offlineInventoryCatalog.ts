import { supabase } from '@/pages/utils/supabaseConfig';
import { resolveOfflineInventoryMatch } from '../domain/offlineInventoryCatalogMatching';
import {
  selectOfflineInventoryCatalogProducts,
  selectOfflineInventoryCatalogSuppliers,
} from '../domain/offlineInventoryCatalogSelectors';
import {
  compactOfflineInventoryCatalogRows,
  createEmptyOfflineInventoryCatalog,
  readOfflineInventoryCatalogSnapshot,
  writeOfflineInventoryCatalogSnapshot,
} from '../storage/offlineInventoryCatalogStorage';
import type {
  OfflineInventoryCatalog,
  OfflineInventoryCatalogRow,
  OfflineInventoryMatch,
} from '../types/offlineInventoryCatalog.types';

type CatalogRow = OfflineInventoryCatalogRow;

export type {
  OfflineInventoryCatalog,
  OfflineInventoryMatch,
} from '../types/offlineInventoryCatalog.types';

let syncInFlight: Promise<{ success: boolean; syncedAt: string | null }> | null = null;
let cachedCatalog: OfflineInventoryCatalog | null = null;
let lastSyncAttemptAt = 0;

const maxTimestamp = (rows: CatalogRow[], previous?: string) =>
  rows.reduce((max, row) => {
    const value = String(row.updated_at || '');
    return value > max ? value : max;
  }, previous || '');

const fetchChangedRows = async (
  table: string,
  columns: string,
  cursor?: string,
  bootstrapFilter?: [string, string]
): Promise<CatalogRow[]> => {
  const rows: CatalogRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = (supabase.from(table as any) as any)
      .select(columns)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true });
    if (cursor) query = query.gte('updated_at', cursor);
    else if (bootstrapFilter) query = query.eq(bootstrapFilter[0], bootstrapFilter[1]);
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
};

const fetchDeletions = async (cursor = 0): Promise<CatalogRow[]> => {
  const rows: CatalogRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('inventory_catalog_deletions')
      .select('sequence_id, entity_type, entity_id, deleted_at')
      .gt('sequence_id', cursor)
      .order('sequence_id', { ascending: true })
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  return rows;
};

export const getOfflineInventoryCatalog = async (): Promise<OfflineInventoryCatalog> => {
  if (cachedCatalog) return cachedCatalog;
  cachedCatalog = (await readOfflineInventoryCatalogSnapshot()) ||
    createEmptyOfflineInventoryCatalog();
  return cachedCatalog;
};

export const syncOfflineInventoryCatalog = async (): Promise<{
  success: boolean;
  syncedAt: string | null;
}> => {
  if (syncInFlight) return syncInFlight;
  lastSyncAttemptAt = Date.now();
  syncInFlight = (async () => {
    try {
      const previous = await getOfflineInventoryCatalog();
      const [products, variations, labels, suppliers, deletions] = await Promise.all([
        fetchChangedRows(
          'products',
          'id, name, code, unit, active, deleted, deleted_at, is_draft, item_type, product_kind, supplier_id, main_supplier_id, supplier_ids, updated_at',
          previous.cursors.products,
          ['item_type', 'product']
        ),
        fetchChangedRows(
          'product_variations',
          'id, product_id, name, sku, stock, active, status, merged_to_variation_id, updated_at',
          previous.cursors.variations
        ),
        fetchChangedRows(
          'inventory_labels',
          'id, product_id, variation_id, sku, barcode, status, updated_at',
          previous.cursors.labels
        ),
        fetchChangedRows(
          'people',
          'id, person_type, full_name, social_name, nickname, active, deleted, updated_at',
          previous.cursors.suppliers,
          ['person_type', 'suppliers']
        ),
        fetchDeletions(previous.deletionCursor || 0),
      ]);
      const next: OfflineInventoryCatalog = {
        products: { ...previous.products },
        variations: { ...previous.variations },
        labels: { ...previous.labels },
        suppliers: { ...previous.suppliers },
        cursors: { ...previous.cursors },
        syncedAt: new Date().toISOString(),
      };
      for (const row of products) {
        const key = String(row.id);
        if (row.item_type === 'product') next.products[key] = row;
        else if (next.products[key]) next.products[key] = { ...next.products[key], deleted: true };
      }
      for (const row of variations) next.variations[String(row.id)] = row;
      for (const row of labels) next.labels[String(row.id)] = row;
      for (const row of suppliers) {
        const key = String(row.id);
        if (row.person_type === 'suppliers') next.suppliers[key] = row;
        else if (next.suppliers[key])
          next.suppliers[key] = { ...next.suppliers[key], deleted: true };
      }
      for (const row of deletions) {
        const key = String(row.entity_id);
        if (row.entity_type === 'product' && next.products[key])
          next.products[key] = { ...next.products[key], deleted: true, deleted_at: row.deleted_at };
        if (row.entity_type === 'variation' && next.variations[key])
          next.variations[key] = { ...next.variations[key], deleted: true };
        if (row.entity_type === 'label') delete next.labels[key];
        if (row.entity_type === 'supplier' && next.suppliers[key])
          next.suppliers[key] = { ...next.suppliers[key], deleted: true };
      }
      next.cursors.products = maxTimestamp(products, next.cursors.products);
      next.cursors.variations = maxTimestamp(variations, next.cursors.variations);
      next.cursors.labels = maxTimestamp(labels, next.cursors.labels);
      next.cursors.suppliers = maxTimestamp(suppliers, next.cursors.suppliers);
      next.deletionCursor = deletions.reduce(
        (max, row) => Math.max(max, Number(row.sequence_id) || 0),
        previous.deletionCursor || 0
      );
      const compact: OfflineInventoryCatalog = {
        ...next,
        formatVersion: 2,
        products: compactOfflineInventoryCatalogRows(next.products, [
          'id',
          'name',
          'code',
          'unit',
          'active',
          'deleted',
          'deleted_at',
          'is_draft',
          'item_type',
          'product_kind',
          'supplier_id',
          'main_supplier_id',
          'supplier_ids',
          'updated_at',
        ]),
        variations: compactOfflineInventoryCatalogRows(next.variations, [
          'id',
          'product_id',
          'name',
          'sku',
          'stock',
          'active',
          'status',
          'merged_to_variation_id',
          'deleted',
          'updated_at',
        ]),
        labels: compactOfflineInventoryCatalogRows(next.labels, [
          'id',
          'product_id',
          'variation_id',
          'sku',
          'barcode',
          'status',
          'updated_at',
        ]),
        suppliers: compactOfflineInventoryCatalogRows(next.suppliers, [
          'id',
          'person_type',
          'full_name',
          'social_name',
          'nickname',
          'active',
          'deleted',
          'updated_at',
        ]),
      };
      await writeOfflineInventoryCatalogSnapshot(compact);
      const verified = await readOfflineInventoryCatalogSnapshot();
      if (verified?.formatVersion !== 2 || verified.syncedAt !== compact.syncedAt) {
        throw new Error('Não foi possível confirmar a gravação do novo índice no navegador.');
      }
      cachedCatalog = compact;
      return { success: true, syncedAt: compact.syncedAt };
    } catch (error) {
      console.warn(
        '[Inventory catalog] Sincronização offline indisponível; usando o índice salvo:',
        error
      );
      return { success: false, syncedAt: cachedCatalog?.syncedAt || null };
    } finally {
      syncInFlight = null;
    }
  })();
  return syncInFlight;
};

export const ensureOfflineInventoryCatalogSynced = async () => {
  const catalog = await getOfflineInventoryCatalog();
  if (catalog.syncedAt && Date.now() - lastSyncAttemptAt < 5 * 60 * 1000)
    return { success: false, syncedAt: catalog.syncedAt };
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return { success: false, syncedAt: catalog.syncedAt };
  return syncOfflineInventoryCatalog();
};

export { resolveOfflineInventoryMatch };

export const findOfflineInventoryMatch = async (
  rawCode: string
): Promise<OfflineInventoryMatch | null> =>
  resolveOfflineInventoryMatch(await getOfflineInventoryCatalog(), rawCode);

export const getOfflineInventoryCatalogProducts = async (): Promise<any[]> =>
  selectOfflineInventoryCatalogProducts(await getOfflineInventoryCatalog());

export const getOfflineInventorySuppliers = async (): Promise<any[]> =>
  selectOfflineInventoryCatalogSuppliers(await getOfflineInventoryCatalog());

export const clearOfflineInventoryCatalogCache = () => {
  cachedCatalog = null;
  lastSyncAttemptAt = 0;
};
