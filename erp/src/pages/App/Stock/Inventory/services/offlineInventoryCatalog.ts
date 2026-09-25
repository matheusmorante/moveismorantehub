import { supabase } from '@/pages/utils/supabaseConfig';
import { extractLabelIdentity, extractScannedCodes } from '@/pages/utils/barcodeScannerUtils';

type CatalogRow = Record<string, any>;
export interface OfflineInventoryCatalog {
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

const DATABASE_NAME = 'morante-inventory';
const STORE_NAME = 'catalog';
const CATALOG_KEY = 'inventory-identification-index';
const emptyCatalog = (): OfflineInventoryCatalog => ({ products: {}, variations: {}, labels: {}, suppliers: {}, cursors: {}, syncedAt: null, deletionCursor: 0 });
let syncInFlight: Promise<{ success: boolean; syncedAt: string | null }> | null = null;
let cachedCatalog: OfflineInventoryCatalog | null = null;
let lastSyncAttemptAt = 0;

const openCatalogDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const readSnapshot = async (): Promise<OfflineInventoryCatalog | null> => {
    const db = await openCatalogDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(CATALOG_KEY);
        request.onsuccess = () => resolve(request.result?.snapshot || null);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => { db.close(); reject(transaction.error); };
    });
};

const writeSnapshot = async (snapshot: OfflineInventoryCatalog): Promise<void> => {
    const db = await openCatalogDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put({ id: CATALOG_KEY, snapshot, updatedAt: new Date().toISOString() });
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
    });
};

const maxTimestamp = (rows: CatalogRow[], previous?: string) => rows.reduce((max, row) => {
    const value = String(row.updated_at || '');
    return value > max ? value : max;
}, previous || '');

const fetchChangedRows = async (table: string, columns: string, cursor?: string): Promise<CatalogRow[]> => {
    const rows: CatalogRow[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
        let query = (supabase.from(table as any) as any).select(columns).order('updated_at', { ascending: true }).order('id', { ascending: true });
        if (cursor) query = query.gte('updated_at', cursor);
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
    cachedCatalog = (await readSnapshot()) || emptyCatalog();
    return cachedCatalog;
};

export const syncOfflineInventoryCatalog = async (): Promise<{ success: boolean; syncedAt: string | null }> => {
    if (syncInFlight) return syncInFlight;
    lastSyncAttemptAt = Date.now();
    syncInFlight = (async () => {
        const previous = await getOfflineInventoryCatalog();
        try {
            const [products, variations, labels, suppliers, deletions] = await Promise.all([
                fetchChangedRows('products', 'id, name, description, code, unit, stock, active, deleted, deleted_at, is_draft, item_type, supplier_id, main_supplier_id, supplier_ids, updated_at', previous.cursors.products),
                fetchChangedRows('product_variations', 'id, product_id, name, sku, stock, active, status, merged_to_variation_id, updated_at', previous.cursors.variations),
                fetchChangedRows('inventory_labels', 'id, product_id, variation_id, sku, barcode, status, created_at, printed_at, updated_at', previous.cursors.labels),
                fetchChangedRows('people', 'id, person_type, full_name, social_name, nickname, active, deleted, updated_at', previous.cursors.suppliers),
                fetchDeletions(previous.deletionCursor || 0),
            ]);
            const next: OfflineInventoryCatalog = {
                products: { ...previous.products }, variations: { ...previous.variations }, labels: { ...previous.labels },
                suppliers: { ...previous.suppliers }, cursors: { ...previous.cursors }, syncedAt: new Date().toISOString(),
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
            for (const row of deletions) {
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
            next.deletionCursor = deletions.reduce((max, row) => Math.max(max, Number(row.sequence_id) || 0), previous.deletionCursor || 0);
            await writeSnapshot(next);
            cachedCatalog = next;
            return { success: true, syncedAt: next.syncedAt };
        } catch (error) {
            console.warn('[Inventory catalog] Sincronização offline indisponível; usando o índice salvo:', error);
            return { success: false, syncedAt: previous.syncedAt };
        } finally {
            syncInFlight = null;
        }
    })();
    return syncInFlight;
};

export const ensureOfflineInventoryCatalogSynced = async () => {
    const catalog = await getOfflineInventoryCatalog();
    if (catalog.syncedAt && Date.now() - lastSyncAttemptAt < 5 * 60 * 1000) return { success: false, syncedAt: catalog.syncedAt };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { success: false, syncedAt: catalog.syncedAt };
    return syncOfflineInventoryCatalog();
};

const canonicalVariation = (catalog: OfflineInventoryCatalog, initialId: string) => {
    let current = catalog.variations[initialId];
    const seen = new Set<string>();
    while (current?.merged_to_variation_id && !seen.has(String(current.id))) {
        seen.add(String(current.id));
        current = catalog.variations[String(current.merged_to_variation_id)];
    }
    return current;
};

export const resolveOfflineInventoryMatch = (catalog: OfflineInventoryCatalog, rawCode: string): OfflineInventoryMatch | null => {
    const { labelId } = extractLabelIdentity(rawCode);
    const label = labelId ? catalog.labels[labelId] : undefined;
    const candidateIds = new Set<string>();
    const addVariation = (variationId?: unknown) => {
        if (!variationId) return;
        const canonical = canonicalVariation(catalog, String(variationId));
        if (canonical) candidateIds.add(String(canonical.id));
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
        if (productVariationIds.size === 1) candidateIds.add([...productVariationIds][0]);
    }
    const labelsByVariation = new Map<string, CatalogRow[]>();
    for (const entry of Object.values(catalog.labels)) {
        if (!entry.variation_id) continue;
        const list = labelsByVariation.get(String(entry.variation_id)) || [];
        list.push(entry);
        labelsByVariation.set(String(entry.variation_id), list);
    }
    for (const variation of Object.values(catalog.variations)) {
        const product = catalog.products[String(variation.product_id)];
        if (!product || ((product.item_type !== 'product' || product.deleted || product.deleted_at || product.is_draft) && !variation.merged_to_variation_id)
            || (variation.deleted && !variation.merged_to_variation_id)) continue;
        const canonical = canonicalVariation(catalog, String(variation.id));
        if (!canonical) continue;
        const identifiers = [variation.id, variation.sku, product.code, product.id, ...(labelsByVariation.get(String(variation.id)) || []).flatMap(entry => [entry.id, entry.sku, entry.barcode])]
            .filter(Boolean).map(value => String(value).trim().toLowerCase());
        if ([...codes].some(code => identifiers.includes(code))) candidateIds.add(String(canonical.id));
    }
    if (candidateIds.size !== 1) return null;
    const variationId = [...candidateIds][0];
    const variation = catalog.variations[variationId];
    const product = variation && catalog.products[String(variation.product_id)];
    if (!variation || !product || product.item_type !== 'product' || product.deleted || product.deleted_at || product.is_draft || variation.deleted) return null;
    const ids = [...new Set([product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].filter(Boolean).map(String))];
    const names = ids.map(id => {
        const supplier = catalog.suppliers[id];
        return supplier?.social_name || supplier?.full_name || supplier?.nickname || '';
    }).filter(Boolean);
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

export const getOfflineInventoryCatalogProducts = async (): Promise<any[]> => {
    const catalog = await getOfflineInventoryCatalog();
    const labelsByVariation = new Map<string, CatalogRow[]>();
    for (const entry of Object.values(catalog.labels)) {
        if (!entry.variation_id) continue;
        const key = String(entry.variation_id);
        labelsByVariation.set(key, [...(labelsByVariation.get(key) || []), entry]);
    }
    return Object.values(catalog.variations).flatMap(variation => {
        if (variation.merged_to_variation_id || variation.deleted) return [];
        const product = catalog.products[String(variation.product_id)];
        if (!product || product.item_type !== 'product' || product.deleted || product.deleted_at || product.is_draft) return [];
        const supplierIds = [...new Set([product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].filter(Boolean).map(String))];
        const labels = labelsByVariation.get(String(variation.id)) || [];
        return [{
            id: product.id, code: product.code || '', sku: variation.sku || product.code || '', name: product.name || variation.name,
            title: product.name || variation.name, description: product.description || variation.name, unit: product.unit || 'UN',
            stock: Number(variation.stock ?? product.stock ?? 0), active: product.active !== false && variation.active !== false
                && !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase()),
            deleted: false, itemType: 'product', mainSupplierId: product.main_supplier_id, supplierId: product.supplier_id,
            supplierIds, variations: [{ id: String(variation.id), name: variation.name || product.name, sku: variation.sku || '',
                stock: Number(variation.stock ?? 0), active: variation.active !== false, status: variation.status || undefined,
                mergedToVariationId: variation.merged_to_variation_id || undefined,
                barcode: labels.find(entry => entry.barcode)?.barcode || '' }],
        }];
    });
};

export const getOfflineInventorySuppliers = async (): Promise<any[]> => {
    const catalog = await getOfflineInventoryCatalog();
    return Object.values(catalog.suppliers).map(supplier => ({ id: supplier.id, fullName: supplier.full_name, tradeName: supplier.social_name, nickname: supplier.nickname }));
};
