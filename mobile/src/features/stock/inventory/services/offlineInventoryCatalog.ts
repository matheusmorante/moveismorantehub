import { supabase } from '../../../../services/supabaseClient';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { getLocalInventoryCatalogSnapshot, saveLocalInventoryCatalogSnapshot } from '../../../../services/sqlite/inventoryCatalog';
import { extractLabelIdentity, extractScannedCodes } from '../../../../utils/barcodeScannerUtils';

type CatalogRow = Record<string, any>;
export interface OfflineInventoryCatalog {
  formatVersion?: 2;
  products: Record<string, CatalogRow>;
  variations: Record<string, CatalogRow>;
  labels: Record<string, CatalogRow>;
  suppliers: Record<string, CatalogRow>;
  cursors: Record<string, string>;
  syncedAt: string | null;
  deletionCursor?: number;
}

export interface OfflineInventoryMatch {
  productId: string;
  variationId: string;
  name: string;
  sku: string;
  code: string;
  barcode: string;
  systemStock: number;
  unit: string;
  supplierIds: string[];
  supplierNames: string[];
  assignedSupplier: string;
  isActive: boolean;
  labelStatus?: string;
}

const emptyCatalog = (): OfflineInventoryCatalog => ({ products: {}, variations: {}, labels: {}, suppliers: {}, cursors: {}, syncedAt: null, deletionCursor: 0 });
const compactRows = (rows: Record<string, CatalogRow>, keys: readonly string[]): Record<string, CatalogRow> =>
  Object.fromEntries(Object.entries(rows).map(([id, row]) => [id,
    Object.fromEntries(keys.filter(key => row[key] !== undefined).map(key => [key, row[key]]))]));
let syncInFlight: Promise<{ success: boolean; syncedAt: string | null }> | null = null;
let cachedCatalog: OfflineInventoryCatalog | null = null;
let lastSyncAttemptAt = 0;

const maxTimestamp = (rows: CatalogRow[], previous?: string) => rows.reduce((max, row) => {
  const value = String(row.updated_at || '');
  return value > max ? value : max;
}, previous || '');

const fetchChangedRows = async (table: string, columns: string, cursor?: string, bootstrapFilter?: [string, string]): Promise<CatalogRow[]> => {
  const rows: CatalogRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = (supabase.from(table as any) as any).select(columns).order('updated_at', { ascending: true }).order('id', { ascending: true });
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
    const { data, error } = await supabase.from('inventory_catalog_deletions')
      .select('sequence_id, entity_type, entity_id, deleted_at').gt('sequence_id', cursor)
      .order('sequence_id', { ascending: true }).range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  return rows;
};

export const getOfflineInventoryCatalog = async (): Promise<OfflineInventoryCatalog> => {
  if (cachedCatalog) return cachedCatalog;
  cachedCatalog = (await getLocalInventoryCatalogSnapshot<OfflineInventoryCatalog>()) || emptyCatalog();
  return cachedCatalog;
};

export const syncOfflineInventoryCatalog = async (): Promise<{ success: boolean; syncedAt: string | null }> => {
  if (syncInFlight) return syncInFlight;
  lastSyncAttemptAt = Date.now();
  syncInFlight = (async () => {
    try {
      const previous = await getOfflineInventoryCatalog();
      let deletions: CatalogRow[] | null;
      try {
        deletions = await fetchDeletions(previous.deletionCursor || 0);
      } catch (error: any) {
        if (error?.code !== '42501') throw error;
        if (previous.syncedAt) throw error;
        // Primeiro uso sem sessão: permite o bootstrap, mas não declara incrementos futuros seguros.
        deletions = null;
      }
      const fullRefresh = deletions === null;
      const [products, variations, labels, suppliers] = await Promise.all([
        fetchChangedRows('products', 'id, name, code, unit, active, deleted, deleted_at, is_draft, item_type, supplier_id, main_supplier_id, supplier_ids, updated_at', fullRefresh ? undefined : previous.cursors.products, ['item_type', 'product']),
        fetchChangedRows('product_variations', 'id, product_id, name, sku, stock, active, status, merged_to_variation_id, updated_at', fullRefresh ? undefined : previous.cursors.variations),
        fetchChangedRows('inventory_labels', 'id, product_id, variation_id, sku, barcode, status, updated_at', fullRefresh ? undefined : previous.cursors.labels),
        fetchChangedRows('people', 'id, person_type, full_name, social_name, nickname, active, deleted, updated_at', fullRefresh ? undefined : previous.cursors.suppliers, ['person_type', 'suppliers']),
      ]);
      const next: OfflineInventoryCatalog = {
        products: fullRefresh ? {} : { ...previous.products }, variations: fullRefresh ? {} : { ...previous.variations },
        labels: fullRefresh ? {} : { ...previous.labels }, suppliers: fullRefresh ? {} : { ...previous.suppliers },
        cursors: { ...previous.cursors }, syncedAt: new Date().toISOString(),
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
        else if (next.suppliers[key]) next.suppliers[key] = { ...next.suppliers[key], deleted: true };
      }
      for (const row of deletions || []) {
        const key = String(row.entity_id);
        if (row.entity_type === 'product' && next.products[key]) next.products[key] = { ...next.products[key], deleted: true, deleted_at: row.deleted_at };
        if (row.entity_type === 'variation' && next.variations[key]) next.variations[key] = { ...next.variations[key], deleted: true };
        if (row.entity_type === 'label') delete next.labels[key];
        if (row.entity_type === 'supplier' && next.suppliers[key]) next.suppliers[key] = { ...next.suppliers[key], deleted: true };
      }
      next.cursors.products = maxTimestamp(products, next.cursors.products);
      next.cursors.variations = maxTimestamp(variations, next.cursors.variations);
      next.cursors.labels = maxTimestamp(labels, next.cursors.labels);
      next.cursors.suppliers = maxTimestamp(suppliers, next.cursors.suppliers);
      next.deletionCursor = (deletions || []).reduce((max, row) => Math.max(max, Number(row.sequence_id) || 0), previous.deletionCursor || 0);
      const compact: OfflineInventoryCatalog = {
        ...next, formatVersion: 2,
        products: compactRows(next.products, ['id', 'name', 'code', 'unit', 'active', 'deleted', 'deleted_at', 'is_draft', 'item_type', 'supplier_id', 'main_supplier_id', 'supplier_ids', 'updated_at']),
        variations: compactRows(next.variations, ['id', 'product_id', 'name', 'sku', 'stock', 'active', 'status', 'merged_to_variation_id', 'deleted', 'updated_at']),
        labels: compactRows(next.labels, ['id', 'product_id', 'variation_id', 'sku', 'barcode', 'status', 'updated_at']),
        suppliers: compactRows(next.suppliers, ['id', 'person_type', 'full_name', 'social_name', 'nickname', 'active', 'deleted', 'updated_at']),
      };
      await saveLocalInventoryCatalogSnapshot(compact);
      cachedCatalog = compact;
      return { success: true, syncedAt: compact.syncedAt };
    } catch (error) {
      console.warn('[Inventory catalog] Sincronização offline indisponível; usando o índice salvo:', error);
      return { success: false, syncedAt: cachedCatalog?.syncedAt || null };
    } finally {
      syncInFlight = null;
    }
  })();
  return syncInFlight;
};

export const ensureOfflineInventoryCatalogSynced = async () => {
  const catalog = await getOfflineInventoryCatalog();
  if (catalog.syncedAt && Date.now() - lastSyncAttemptAt < 5 * 60 * 1000) return { success: false, syncedAt: catalog.syncedAt };
  if (!connectivityService.connected || (typeof navigator !== 'undefined' && (navigator as any).onLine === false)) return { success: false, syncedAt: catalog.syncedAt };
  return syncOfflineInventoryCatalog();
};

export const getOfflineInventoryScopeProducts = async (): Promise<Array<Record<string, any>>> => {
  const catalog = await getOfflineInventoryCatalog();
  const rows: Array<Record<string, any>> = [];
  const labelsByVariation = new Map<string, CatalogRow[]>();
  for (const label of Object.values(catalog.labels)) {
    if (!label.variation_id) continue;
    const key = String(label.variation_id);
    labelsByVariation.set(key, [...(labelsByVariation.get(key) || []), label]);
  }
  for (const variation of Object.values(catalog.variations)) {
    if (variation.merged_to_variation_id || variation.deleted) continue;
    const product = catalog.products[String(variation.product_id)];
    if (!product || product.item_type !== 'product' || product.deleted || product.deleted_at || product.is_draft) continue;
    const supplierIds = [...new Set([product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].filter(Boolean).map(String))];
    const labels = labelsByVariation.get(String(variation.id)) || [];
    rows.push({
      id: String(product.id), variation_id: String(variation.id), name: variation.name || product.name || product.description || 'Produto',
      description: product.description, stock: Number(variation.stock ?? product.stock ?? 0), unit: product.unit || 'UN',
      sku: variation.sku || product.code || '', code: product.code || '', barcode: labels.find(label => label.barcode)?.barcode || '',
      main_supplier_id: product.main_supplier_id, supplier_id: product.supplier_id, supplier_ids: supplierIds,
      active: product.active !== false && variation.active !== false && !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase()),
    });
  }
  return rows.sort((left, right) => String(left.name).localeCompare(String(right.name)));
};

const supplierNames = (catalog: OfflineInventoryCatalog, ids: string[]) => ids.map(id => {
  const supplier = catalog.suppliers[id];
  return supplier?.social_name || supplier?.full_name || supplier?.nickname || '';
}).filter(Boolean);

const canonicalVariation = (catalog: OfflineInventoryCatalog, initialId: string) => {
  let current = catalog.variations[initialId];
  const seen = new Set<string>();
  while (current?.merged_to_variation_id) {
    if (seen.has(String(current.id))) return null;
    seen.add(String(current.id));
    current = catalog.variations[String(current.merged_to_variation_id)];
  }
  return current && !current.deleted ? current : null;
};

export const resolveOfflineInventoryMatch = (catalog: OfflineInventoryCatalog, rawCode: string): OfflineInventoryMatch | null => {
  const { labelId } = extractLabelIdentity(rawCode);
  const label = labelId ? catalog.labels[labelId] : undefined;
  const candidates = new Set<string>();
  const labelsByVariation = new Map<string, CatalogRow[]>();
  for (const entry of Object.values(catalog.labels)) {
    if (!entry.variation_id) continue;
    const key = String(entry.variation_id);
    labelsByVariation.set(key, [...(labelsByVariation.get(key) || []), entry]);
  }
  const addVariation = (variationId?: unknown) => {
    if (variationId) {
      const variation = canonicalVariation(catalog, String(variationId));
      if (variation) candidates.add(String(variation.id));
    }
  };
  if (label) addVariation(label.variation_id);
  const codes = new Set(extractScannedCodes(rawCode).map(value => value.trim().toLowerCase()).filter(Boolean));
  if (label?.sku) codes.add(String(label.sku).trim().toLowerCase());
  if (label?.barcode) codes.add(String(label.barcode).trim().toLowerCase());
  if (label?.product_id && !label.variation_id) {
    const productVariationIds = new Set(Object.values(catalog.variations)
      .filter(row => String(row.product_id) === String(label.product_id) && !row.deleted)
      .map(row => canonicalVariation(catalog, String(row.id)))
      .filter(Boolean)
      .map(row => String(row!.id)));
    if (productVariationIds.size === 1) candidates.add([...productVariationIds][0]);
  }
  for (const variation of Object.values(catalog.variations)) {
    const product = catalog.products[String(variation.product_id)];
    if (!product || ((product.item_type !== 'product' || product.deleted || product.deleted_at || product.is_draft) && !variation.merged_to_variation_id)
      || (variation.deleted && !variation.merged_to_variation_id)) continue;
    const canonical = canonicalVariation(catalog, String(variation.id));
    if (!canonical) continue;
    const identifiers = [variation.id, variation.sku, product.code, product.id, ...(labelsByVariation.get(String(variation.id)) || []).flatMap(entry => [entry.id, entry.sku, entry.barcode])]
      .filter(Boolean).map(value => String(value).trim().toLowerCase());
    if ([...codes].some(code => identifiers.includes(code))) candidates.add(String(canonical.id));
  }
  if (candidates.size !== 1) return null;
  const variationId = [...candidates][0];
  const variation = catalog.variations[variationId];
  const product = variation && catalog.products[String(variation.product_id)];
  if (!variation || !product || product.item_type !== 'product' || product.deleted || product.deleted_at || product.is_draft || variation.deleted) return null;
  const ids = [...new Set([product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].filter(Boolean).map(String))];
  const names = supplierNames(catalog, ids);
  const matchedLabel = label || (labelsByVariation.get(variationId) || []).find(entry => [...codes].some(code => [entry.sku, entry.barcode].filter(Boolean).some(value => String(value).trim().toLowerCase() === code)));
  return {
    productId: String(product.id), variationId, name: variation.name || product.name || product.description || 'Produto',
    sku: variation.sku || product.code || matchedLabel?.sku || '', code: product.code || '', barcode: matchedLabel?.barcode || '',
    systemStock: Number(variation.stock ?? product.stock ?? 0), unit: product.unit || 'UN', supplierIds: ids, supplierNames: names,
    assignedSupplier: names[0] || 'Sem fornecedor',
    isActive: product.active !== false && variation.active !== false && !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase()),
    labelStatus: matchedLabel?.status,
  };
};

export const findOfflineInventoryMatch = async (rawCode: string): Promise<OfflineInventoryMatch | null> =>
  resolveOfflineInventoryMatch(await getOfflineInventoryCatalog(), rawCode);

export const clearOfflineInventoryCatalogCache = () => { cachedCatalog = null; lastSyncAttemptAt = 0; };
