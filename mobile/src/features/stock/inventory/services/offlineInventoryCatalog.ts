import { supabase } from '../../../../services/supabaseClient';
import { connectivityService } from '../../../../services/offline/connectivityService';
import {
  getLocalInventoryCatalogSnapshot,
  saveLocalInventoryCatalogSnapshot,
} from '../../../../services/sqlite/inventoryCatalog';
import {
  type CatalogRow,
  type OfflineInventoryCatalog,
  type OfflineInventoryMatch,
  compactCatalogSnapshot,
  emptyCatalog,
  maxTimestamp,
} from './catalog/offlineInventoryCatalogTypes';
import {
  buildScopeProductsFromCatalog,
  resolveOfflineInventoryMatch,
} from './catalog/offlineInventoryCatalogMatcher';
import {
  filterInventoryResponsibleCandidates,
  getInventoryResponsibleDisplayName,
} from '../../../../../../shared-utils/inventoryResponsible';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

export type { OfflineInventoryCatalog, OfflineInventoryMatch };
export { resolveOfflineInventoryMatch };

let syncInFlight: Promise<{ success: boolean; syncedAt: string | null }> | null = null;
let cachedCatalog: OfflineInventoryCatalog | null = null;
let lastSyncAttemptAt = 0;
const CATALOG_QUERY_TIMEOUT_MS = 10_000;

async function awaitCatalogQuery<T>(promise: Promise<T>, label: string): Promise<T> {
  const result = await withTimeout(
    promise.then((value) => ({ value })),
    CATALOG_QUERY_TIMEOUT_MS,
    null as { value: T } | null,
    label
  );
  if (!result)
    throw new Error(`Consulta do catálogo offline excedeu ${CATALOG_QUERY_TIMEOUT_MS}ms.`);
  return result.value;
}

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

const fetchInventoryResponsibleRows = async (): Promise<CatalogRow[]> => {
  const rows: CatalogRow[] = [];
  const pageSize = 500;
  const columns =
    'id, person_type, full_name, social_name, nickname, position, address, active, deleted, updated_at';
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('people')
      .select(columns)
      .or('deleted.eq.false,deleted.is.null')
      .or('person_type.ilike.employees,and(position.not.is.null,position.neq.""))')
      .order('full_name', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
};

const normalizeInventoryResponsibleRow = (employee: CatalogRow): CatalogRow => {
  let accessProfile = employee.address;
  if (typeof accessProfile === 'string') {
    try {
      accessProfile = JSON.parse(accessProfile);
    } catch {
      accessProfile = null;
    }
  }

  const profile =
    typeof accessProfile === 'object' && accessProfile !== null && !Array.isArray(accessProfile)
      ? accessProfile
      : {};
  const roles = Array.isArray(profile.roles)
    ? profile.roles.filter((role: unknown): role is string => typeof role === 'string')
    : Array.isArray(employee.roles)
      ? employee.roles.filter((role: unknown): role is string => typeof role === 'string')
      : undefined;
  const role = typeof profile.role === 'string' ? profile.role : employee.role;

  // `people.address` is TEXT in the operational schema. Parse only the access fields we need;
  // never copy the full address/contact payload into the offline inventory snapshot.
  const { address: _address, ...safeEmployee } = employee;
  return {
    ...safeEmployee,
    ...(role === undefined ? {} : { role }),
    ...(roles === undefined ? {} : { roles }),
  };
};

export const getOfflineInventoryCatalog = async (): Promise<OfflineInventoryCatalog> => {
  if (cachedCatalog) return cachedCatalog;
  const stored = await getLocalInventoryCatalogSnapshot<OfflineInventoryCatalog>();
  cachedCatalog = stored
    ? {
        ...emptyCatalog(),
        ...stored,
        employees: stored.employees || {},
        employeesSyncedAt: stored.employeesSyncedAt || null,
      }
    : emptyCatalog();
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
      let deletions: CatalogRow[] | null;
      try {
        deletions = await awaitCatalogQuery(
          fetchDeletions(previous.deletionCursor || 0),
          'inventory:catalog:deletions'
        );
      } catch (error: any) {
        if (error?.code !== '42501') throw error;
        if (previous.syncedAt) throw error;
        deletions = null;
      }
      const fullRefresh = deletions === null;
      const [products, variations, labels, suppliers, employeesResult] = await Promise.all([
        awaitCatalogQuery(
          fetchChangedRows(
            'products',
            'id, name, code, unit, active, deleted, deleted_at, is_draft, item_type, product_kind, supplier_id, main_supplier_id, supplier_ids, updated_at',
            fullRefresh ? undefined : previous.cursors.products,
            ['item_type', 'product']
          ),
          'inventory:catalog:products'
        ),
        awaitCatalogQuery(
          fetchChangedRows(
            'product_variations',
            'id, product_id, name, sku, stock, active, status, merged_to_variation_id, updated_at',
            fullRefresh ? undefined : previous.cursors.variations
          ),
          'inventory:catalog:variations'
        ),
        awaitCatalogQuery(
          fetchChangedRows(
            'inventory_labels',
            'id, product_id, variation_id, sku, barcode, status, updated_at',
            fullRefresh ? undefined : previous.cursors.labels
          ),
          'inventory:catalog:labels'
        ),
        awaitCatalogQuery(
          fetchChangedRows(
            'people',
            'id, person_type, full_name, social_name, nickname, active, deleted, updated_at',
            fullRefresh ? undefined : previous.cursors.suppliers,
            ['person_type', 'suppliers']
          ),
          'inventory:catalog:suppliers'
        ),
        withTimeout(
          fetchInventoryResponsibleRows(),
          CATALOG_QUERY_TIMEOUT_MS,
          null,
          'inventory:responsibles'
        ),
      ]);
      const employees = (employeesResult || []).map(normalizeInventoryResponsibleRow);
      const next: OfflineInventoryCatalog = {
        products: fullRefresh ? {} : { ...previous.products },
        variations: fullRefresh ? {} : { ...previous.variations },
        labels: fullRefresh ? {} : { ...previous.labels },
        suppliers: fullRefresh ? {} : { ...previous.suppliers },
        employees: employeesResult
          ? Object.fromEntries(employees.map((employee) => [String(employee.id), employee]))
          : { ...(previous.employees || {}) },
        employeesSyncedAt: employeesResult ? new Date().toISOString() : previous.employeesSyncedAt || null,
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
      for (const row of deletions || []) {
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
      next.deletionCursor = (deletions || []).reduce(
        (max, row) => Math.max(max, Number(row.sequence_id) || 0),
        previous.deletionCursor || 0
      );
      const compact = compactCatalogSnapshot(next);
      await saveLocalInventoryCatalogSnapshot(compact);
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
  if (
    !connectivityService.connected ||
    (typeof navigator !== 'undefined' && (navigator as any).onLine === false)
  )
    return { success: false, syncedAt: catalog.syncedAt };
  return syncOfflineInventoryCatalog();
};

export const getOfflineInventoryScopeProducts = async (): Promise<Array<Record<string, any>>> =>
  buildScopeProductsFromCatalog(await getOfflineInventoryCatalog());

export const getOfflineInventoryResponsibleOptions = async () => {
  const catalog = await getOfflineInventoryCatalog();
  const employees = Object.values(catalog.employees || {}).map((employee) => ({
    id: String(employee.id || ''),
    type: String(employee.person_type || ''),
    person_type: String(employee.person_type || ''),
    full_name: String(employee.full_name || ''),
    social_name: String(employee.social_name || ''),
    nickname: String(employee.nickname || ''),
    position: String(employee.position || ''),
    role: String(employee.role || ''),
    roles: Array.isArray(employee.roles) ? employee.roles.map(String) : [],
    deleted: employee.deleted === true,
  }));
  return filterInventoryResponsibleCandidates(employees)
    .map((employee) => ({
      id: String(employee.id),
      type: employee.type,
      full_name: employee.full_name || '',
      social_name: employee.social_name || '',
      nickname: employee.nickname || '',
      position: employee.position || '',
      role: employee.role || employee.roles?.[0] || '',
    }))
    .sort((left, right) =>
      getInventoryResponsibleDisplayName(left).localeCompare(
        getInventoryResponsibleDisplayName(right),
        'pt-BR'
      )
    );
};

export const findOfflineInventoryMatch = async (
  rawCode: string
): Promise<OfflineInventoryMatch | null> =>
  resolveOfflineInventoryMatch(await getOfflineInventoryCatalog(), rawCode);

export const clearOfflineInventoryCatalogCache = () => {
  cachedCatalog = null;
  lastSyncAttemptAt = 0;
};
