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
  OFFLINE_INVENTORY_CATALOG_FORMAT_VERSION,
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
  isEligibleInventoryResponsible,
} from '../../../../../../shared-utils/inventoryResponsible';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { isTestProduct } from '../../../../../../shared-utils/isTestProduct';

export type { OfflineInventoryCatalog, OfflineInventoryMatch };
export { resolveOfflineInventoryMatch };

let syncInFlight: Promise<{ success: boolean; syncedAt: string | null }> | null = null;
let cachedCatalog: OfflineInventoryCatalog | null = null;
let lastSyncAttemptAt = 0;
const CATALOG_QUERY_TIMEOUT_MS = 10_000;
type InventoryCatalogSyncResult = { success: boolean; syncedAt: string | null };

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
    'id, person_type, full_name, social_name, nickname, email, position, address, deleted, updated_at';
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

export const normalizeInventoryResponsibleRow = (employee: CatalogRow): CatalogRow => {
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
    : undefined;
  const role =
    typeof profile.role === 'string' && profile.role.trim() ? profile.role : undefined;

  // `people.address` is TEXT in the operational schema. Parse only the access fields we need;
  // never copy the full address/contact payload into the offline inventory snapshot.
  const { address: _address, ...safeEmployee } = employee;
  return {
    ...safeEmployee,
    ...(role === undefined ? {} : { role }),
    ...(roles === undefined ? {} : { roles }),
  };
};

const resolveCurrentEmployeeIdFromRows = (rows: CatalogRow[], email?: string | null) => {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || /[%_\\]/.test(normalizedEmail) || /[^\x00-\x7F]/.test(normalizedEmail))
    return { available: false, employeeId: null };

  const matchingRows = rows.filter(
    (row) =>
      row.person_type === 'employees' &&
      row.deleted !== true &&
      typeof row.email === 'string' &&
      row.email.toLowerCase() === normalizedEmail
  );
  // Keep the original email query for duplicates: its server ordering and limit decide the winner.
  if (matchingRows.length > 1) return { available: false, employeeId: null };
  if (matchingRows.length === 0) return { available: true, employeeId: null };

  const currentEmployee = filterInventoryResponsibleCandidates(
    matchingRows.map(normalizeInventoryResponsibleRow)
  )[0];
  return {
    available: true,
    employeeId: currentEmployee?.id ? String(currentEmployee.id) : null,
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

const syncOfflineInventoryCatalogInternal = async (
  onResponsibleRowsLoaded?: (rows: CatalogRow[]) => void,
  onResponsibleRowsUnavailable?: () => void
): Promise<{ result: InventoryCatalogSyncResult; started: boolean }> => {
  if (syncInFlight) return { result: await syncInFlight, started: false };
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
      // Version 5 stores the composition marker so old offline catalogs can exclude composed products.
      const fullRefresh =
        deletions === null ||
        previous.formatVersion !== OFFLINE_INVENTORY_CATALOG_FORMAT_VERSION;
      const [products, variations, labels, suppliers, employeesResult] = await Promise.all([
        awaitCatalogQuery(
          fetchChangedRows(
            'products',
            'id, name, code, unit, active, deleted, deleted_at, is_draft, item_type, is_combo, product_kind, supplier_id, main_supplier_id, supplier_ids, technical_specs_is_test:technical_specs->>is_test, technical_specs_is_test_camel:technical_specs->>isTest, test_artifact_is_test:technical_specs->testArtifact->>is_test, test_artifact_is_test_camel:technical_specs->testArtifact->>isTest, updated_at',
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
            'id, person_type, full_name, social_name, nickname, stock_origins, active, deleted, updated_at',
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
      if (employeesResult) {
        try {
          onResponsibleRowsLoaded?.(employeesResult);
        } catch {
          // Resolving the current employee is an optimization; it must not fail catalog refresh.
        }
      } else {
        try {
          onResponsibleRowsUnavailable?.();
        } catch {
          // Resolving the current employee is an optimization; it must not fail catalog refresh.
        }
      }
      const fetchedEmployees = (employeesResult || []).map(normalizeInventoryResponsibleRow);
      const uniqueEligibleIds = new Set(
        filterInventoryResponsibleCandidates(fetchedEmployees).map((employee) =>
          String(employee.id)
        )
      );
      const employees = fetchedEmployees.filter(
        (employee) =>
          !isEligibleInventoryResponsible(employee) || uniqueEligibleIds.has(String(employee.id))
      );
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
        const isTestCatalogProduct = isTestProduct({
          ...row,
          is_test: row.technical_specs_is_test,
          isTest: row.technical_specs_is_test_camel,
          technical_specs: {
            testArtifact: {
              is_test: row.test_artifact_is_test,
              isTest: row.test_artifact_is_test_camel,
            },
          },
        });
        if (isTestCatalogProduct) {
          delete next.products[key];
          continue;
        }
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
      try {
        onResponsibleRowsUnavailable?.();
      } catch {
        // Keep fallback resolution from changing the catalog sync result.
      }
      console.warn(
        '[Inventory catalog] Sincronização offline indisponível; usando o índice salvo:',
        error
      );
      return { success: false, syncedAt: cachedCatalog?.syncedAt || null };
    } finally {
      syncInFlight = null;
    }
  })();
  return { result: await syncInFlight, started: true };
};

export const syncOfflineInventoryCatalog = async (): Promise<InventoryCatalogSyncResult> => {
  const { result } = await syncOfflineInventoryCatalogInternal();
  return result;
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

export const ensureOfflineInventoryCatalogSyncedForCurrentEmployee = async (
  email?: string | null,
  resolveFallback?: () => Promise<string | null>
): Promise<
  InventoryCatalogSyncResult & {
    currentEmployeeId: string | null;
    responsibleRowsLoaded: boolean;
  }
> => {
  const catalog = await getOfflineInventoryCatalog();
  const normalizedEmail = email?.trim().toLowerCase();
  let fallbackPromise: Promise<string | null> | null = null;
  const startFallback = () => {
    if (!fallbackPromise) {
      fallbackPromise = resolveFallback
        ? Promise.resolve().then(resolveFallback).catch(() => null)
        : Promise.resolve(null);
    }
    return fallbackPromise;
  };
  const canStartFreshSync =
    !(catalog.syncedAt && Date.now() - lastSyncAttemptAt < 5 * 60 * 1000) &&
    connectivityService.connected &&
    !(typeof navigator !== 'undefined' && (navigator as any).onLine === false);

  if (!canStartFreshSync || !normalizedEmail) {
    const [result, currentEmployeeId] = await Promise.all([
      ensureOfflineInventoryCatalogSynced(),
      startFallback(),
    ]);
    return { ...result, currentEmployeeId, responsibleRowsLoaded: false };
  }

  if (syncInFlight) {
    const [result, currentEmployeeId] = await Promise.all([syncInFlight, startFallback()]);
    return { ...result, currentEmployeeId, responsibleRowsLoaded: false };
  }

  let currentEmployeeId: string | null = null;
  let responsibleRowsLoaded = false;
  const { result, started } = await syncOfflineInventoryCatalogInternal((rows) => {
    const resolution = resolveCurrentEmployeeIdFromRows(rows, normalizedEmail);
    if (!resolution.available) {
      void startFallback();
      return;
    }
    responsibleRowsLoaded = true;
    currentEmployeeId = resolution.employeeId;
  }, () => void startFallback());

  if (!result.success || !started || !responsibleRowsLoaded) {
    return {
      ...result,
      currentEmployeeId: await startFallback(),
      responsibleRowsLoaded: false,
    };
  }

  return {
    ...result,
    currentEmployeeId,
    responsibleRowsLoaded: true,
  };
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
