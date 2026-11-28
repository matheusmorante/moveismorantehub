import { supabase } from '../../../../services/supabaseClient';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { getOfflineInventoryCatalog } from '../../../stock/inventory/services/offlineInventoryCatalog';
import { isTestPerson } from '../../../../../../shared-utils/personTestVisibility';
import { supplierProvidesStockOrigin } from '../../../../../../shared-utils/productSupplierStockOrigin';
import {
  buildPostgrestAccentInsensitiveOrFilter,
  matchesSearchText,
} from '../../../../../../shared-utils/core/searchText';
import { withTimeout } from '../../../../../../shared-utils/core/withTimeout';

export interface MobilePurchaseSupplier {
  id: string;
  name: string;
  full_name?: string | null;
  nickname?: string | null;
  social_name?: string | null;
}

export type MobilePurchaseSupplierQueryResult =
  | { ok: true; suppliers: MobilePurchaseSupplier[]; source: 'server' | 'offline' }
  | { ok: false; suppliers: MobilePurchaseSupplier[]; errorMessage: string };

const MOBILE_PURCHASE_SUPPLIER_ERROR = 'Não foi possível carregar os fornecedores. Tente novamente.';
const MOBILE_PURCHASE_SUPPLIER_FIELDS =
  'id, full_name, nickname, social_name';

const mapMobilePurchaseSuppliers = (rows: readonly any[] | null): MobilePurchaseSupplier[] =>
  (rows || []).map((supplier) => ({
    id: String(supplier.id),
    name: supplier.nickname || supplier.full_name || supplier.social_name || 'Fornecedor',
    full_name: supplier.full_name ?? null,
    nickname: supplier.nickname ?? null,
    social_name: supplier.social_name ?? null,
  }));

const readMobilePurchaseSuppliers = async (
  query: any,
  signal?: AbortSignal,
): Promise<MobilePurchaseSupplierQueryResult> => {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const queryPromise = Promise.resolve(query.abortSignal(controller.signal));
    const response = await withTimeout<Awaited<typeof queryPromise> | null>(
      queryPromise,
      10_000,
      null,
      'mobile:compras-fornecedores',
    );
    if (!response) {
      controller.abort();
      return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
    }
    if (response.error) {
      return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
    }
    return { ok: true, suppliers: mapMobilePurchaseSuppliers(response.data), source: 'server' };
  } catch {
    return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
  } finally {
    signal?.removeEventListener('abort', abortFromCaller);
  }
};

/** Loads only the first page needed by the purchase form's supplier picker. */
export const fetchMobilePurchaseSupplierPicker = async (
  search: string,
  options: { signal?: AbortSignal } = {},
): Promise<MobilePurchaseSupplierQueryResult> => {
  if (!connectivityService.connected) {
    try {
      const catalog = await getOfflineInventoryCatalog();
      const suppliers = Object.values(catalog.suppliers || {})
        .filter((supplier) => ['supplier', 'suppliers'].includes(String(supplier.person_type || '').toLowerCase()))
        .filter((supplier) => supplierProvidesStockOrigin(supplier.stock_origins, 'normal'))
        .filter((supplier) => matchesSearchText(
          `${supplier.nickname || ''} ${supplier.full_name || ''} ${supplier.social_name || ''}`,
          search,
        ))
        .map((supplier) => mapMobilePurchaseSuppliers([supplier])[0])
        .sort((left, right) =>
          (left.full_name || '').localeCompare(right.full_name || '') || left.id.localeCompare(right.id)
        )
        .slice(0, 40);
      return { ok: true, suppliers, source: 'offline' };
    } catch {
      return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
    }
  }

  let query = supabase
    .from('people')
    .select(MOBILE_PURCHASE_SUPPLIER_FIELDS)
    .or('person_type.ilike.suppliers,person_type.ilike.supplier')
    .or('stock_origins.is.null,stock_origins.cs.{normal}')
    .order('full_name', { ascending: true })
    .order('id', { ascending: true });

  const searchFilter = buildPostgrestAccentInsensitiveOrFilter(
    ['nickname', 'full_name', 'social_name'],
    search,
  );
  if (searchFilter) query = query.or(searchFilter);
  query = query.limit(40);

  return readMobilePurchaseSuppliers(query, options.signal);
};

/** Resolves a missing supplier label with one bounded lookup for the selected product. */
export const fetchMobilePurchaseSuppliersByIds = async (
  ids: readonly string[],
): Promise<MobilePurchaseSupplierQueryResult> => {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 40);
  if (!uniqueIds.length) return { ok: true, suppliers: [], source: 'server' };

  if (!connectivityService.connected) {
    try {
      const catalog = await getOfflineInventoryCatalog();
      return {
        ok: true,
        suppliers: uniqueIds
          .map((id) => catalog.suppliers?.[id])
          .filter((supplier) => supplier && ['supplier', 'suppliers'].includes(String(supplier.person_type || '').toLowerCase()))
          .map((supplier) => mapMobilePurchaseSuppliers([supplier])[0]),
        source: 'offline',
      };
    } catch {
      return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
    }
  }

  const query = supabase
    .from('people')
    .select(MOBILE_PURCHASE_SUPPLIER_FIELDS)
    .in('id', uniqueIds)
    .or('person_type.ilike.suppliers,person_type.ilike.supplier')
    .order('full_name', { ascending: true })
    .order('id', { ascending: true })
    .limit(uniqueIds.length);

  return readMobilePurchaseSuppliers(query);
};

export interface MobileProductSupplier {
  id: string;
  full_name: string | null;
  nickname: string | null;
  stock_origins: string[] | null;
  default_ipi_percent: number | null;
  default_freight_cost: number | null;
  default_freight_type: 'fixed' | 'percentage' | 'none';
  social_name: string | null;
}

export type MobileProductSuppliersResult =
  | { ok: true; suppliers: MobileProductSupplier[] }
  | { ok: false; suppliers: MobileProductSupplier[]; errorMessage: string };

export type MobileReceiptSupplierPickerResult =
  | {
      ok: true;
      suppliers: MobilePurchaseSupplier[];
      source: 'server' | 'offline';
      hasMore: boolean;
    }
  | { ok: false; suppliers: []; errorMessage: string };

const RECEIPT_SUPPLIER_PAGE_SIZE = 40;
const RECEIPT_SUPPLIER_TEST_NAME_PATTERNS = [
  String.raw`\[?[[:space:]]*HML[[:space:]]*NF[[:space:]]*TEST([^[:alnum:]_]|$)`,
  String.raw`^[[:space:]]*(TEST_AUT_|playwright\.test)`,
] as const;
const RECEIPT_SUPPLIER_TEST_ARTIFACT_OBSERVATION_PATTERN = String.raw`[{,][[:space:]]*"testArtifact"[[:space:]]*:[[:space:]]*\{[^{}]*([{,])[[:space:]]*"(is_test|isTest)"[[:space:]]*:[[:space:]]*(true|"true")([[:space:]]*[,}])`;

const quotePostgrestFilterValue = (value: string) =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const buildReceiptSupplierSearchFilter = (search: string): string => {
  const value = search.trim();
  if (!value) return '';

  const fieldFilter = (column: string) =>
    buildPostgrestAccentInsensitiveOrFilter([column], value);
  const conditions = [
    `and(nickname.not.is.null,nickname.neq.,${fieldFilter('nickname')})`,
    `and(or(nickname.is.null,nickname.eq.),full_name.not.is.null,full_name.neq.,${fieldFilter('full_name')})`,
    `and(or(nickname.is.null,nickname.eq.),or(full_name.is.null,full_name.eq.),social_name.not.is.null,social_name.neq.,${fieldFilter('social_name')})`,
  ];

  if (matchesSearchText('Fornecedor', value)) {
    conditions.push(
      'and(or(nickname.is.null,nickname.eq.),or(full_name.is.null,full_name.eq.),or(social_name.is.null,social_name.eq.),id.not.is.null)',
    );
  }

  return conditions.join(',');
};

/** Searches the receipt supplier picker without downloading the full supplier list. */
export const fetchMobileReceiptSupplierPickerPage = async (
  search: string,
  page: number,
  options: { signal?: AbortSignal } = {},
): Promise<MobileReceiptSupplierPickerResult> => {
  const safePage = Math.max(0, Math.floor(page));
  const start = safePage * RECEIPT_SUPPLIER_PAGE_SIZE;
  const end = start + RECEIPT_SUPPLIER_PAGE_SIZE - 1;

  if (!connectivityService.connected) {
    try {
      if (options.signal?.aborted) {
        return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
      }
      const catalog = await getOfflineInventoryCatalog();
      if (options.signal?.aborted) {
        return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
      }
      const filtered = Object.entries(catalog.suppliers || {})
        .map(([id, supplier]) => ({ ...supplier, id: String(supplier.id || id) }))
        .filter((supplier) =>
          ['supplier', 'suppliers'].includes(String(supplier.person_type || '').toLowerCase()),
        )
        .filter((supplier) => supplier.deleted !== true)
        .filter((supplier) =>
          !isTestPerson({ id: supplier.id, fullName: supplier.full_name || '' }),
        )
        .filter((supplier) => supplierProvidesStockOrigin(supplier.stock_origins, 'normal'))
        .map((supplier) => mapMobilePurchaseSuppliers([supplier])[0])
        .filter((supplier) => matchesSearchText(supplier.name, search))
        .sort((left, right) =>
          (left.full_name || '').localeCompare(right.full_name || '') || left.id.localeCompare(right.id),
        );
      const suppliers = filtered.slice(start, end + 1);
      return {
        ok: true,
        suppliers,
        source: 'offline',
        hasMore: end + 1 < filtered.length,
      };
    } catch {
      return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
    }
  }

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    let query = supabase
      .from('people')
      .select(MOBILE_PURCHASE_SUPPLIER_FIELDS)
      .or('and(or(deleted.eq.false,deleted.is.null),or(person_type.ilike.suppliers,person_type.ilike.supplier))')
      .or('stock_origins.is.null,stock_origins.cs.{normal}')
      .not('id', 'imatch', '^TEST_AUT_')
      .or(`or(full_name.is.null,full_name.not.imatch.${quotePostgrestFilterValue(RECEIPT_SUPPLIER_TEST_NAME_PATTERNS[0])})`)
      .or(`or(full_name.is.null,full_name.not.imatch.${quotePostgrestFilterValue(RECEIPT_SUPPLIER_TEST_NAME_PATTERNS[1])})`)
      .or(`or(observation.is.null,observation.not.match.${quotePostgrestFilterValue(RECEIPT_SUPPLIER_TEST_ARTIFACT_OBSERVATION_PATTERN)})`)
      .order('full_name', { ascending: true })
      .order('id', { ascending: true });

    const searchFilter = buildReceiptSupplierSearchFilter(search);
    if (searchFilter) query = query.or(searchFilter);
    query = query.range(start, end);

    const queryPromise = Promise.resolve(query.abortSignal(controller.signal));
    const response = await withTimeout<Awaited<typeof queryPromise> | null>(
      queryPromise,
      10_000,
      null,
      'mobile:recebimento-fornecedores',
    );
    if (!response) {
      controller.abort();
      return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
    }
    if (response.error) {
      return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
    }
    const suppliers = mapMobilePurchaseSuppliers(response.data);
    return {
      ok: true,
      suppliers,
      source: 'server',
      hasMore: suppliers.length === RECEIPT_SUPPLIER_PAGE_SIZE,
    };
  } catch {
    return { ok: false, suppliers: [], errorMessage: MOBILE_PURCHASE_SUPPLIER_ERROR };
  } finally {
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
};

const SUPPLIER_LOAD_ERROR = 'Não foi possível carregar os fornecedores. Tente novamente.';

export const fetchMobileProductSuppliersWithStatus = async (
  supplierId?: string,
): Promise<MobileProductSuppliersResult> => {
  try {
    let query = supabase
      .from('people')
      .select(
        'id, full_name, social_name, nickname, address, observation, stock_origins'
      )
      .or(
        'and(or(deleted.eq.false,deleted.is.null),or(person_type.ilike.suppliers,person_type.ilike.supplier))'
      )
      .order('full_name', { ascending: true })
      .order('id', { ascending: true });
    if (supplierId?.trim()) {
      query = query.eq('id', supplierId.trim()).limit(1);
    }
    const queryPromise = Promise.resolve(query);
    const response = await withTimeout<Awaited<typeof queryPromise> | null>(
      queryPromise,
      10_000,
      null,
      'mobile:produto-fornecedores'
    );

    if (!response) {
      return { ok: false, suppliers: [], errorMessage: SUPPLIER_LOAD_ERROR };
    }
    if (response.error) {
      console.warn('[mobileSupplierService] Erro ao buscar fornecedores de produtos:', response.error);
      return { ok: false, suppliers: [], errorMessage: SUPPLIER_LOAD_ERROR };
    }

    const suppliers = (response.data || [])
      .filter((supplier) => !isTestPerson({ ...supplier, fullName: supplier.full_name || '' }))
      .map((supplier) => ({
        ...supplier,
        // Keep the legacy consumer shape without selecting columns absent from `people`.
        default_ipi_percent: supplier.default_ipi_percent ?? null,
        default_freight_cost: supplier.default_freight_cost ?? null,
        default_freight_type: supplier.default_freight_type || 'none',
      })) as MobileProductSupplier[];

    return { ok: true, suppliers };
  } catch (error) {
    console.warn('[mobileSupplierService] Falha ao carregar fornecedores de produtos:', error);
    return { ok: false, suppliers: [], errorMessage: SUPPLIER_LOAD_ERROR };
  }
};

export const fetchMobileProductSuppliers = async (): Promise<MobileProductSupplier[]> => {
  const result = await fetchMobileProductSuppliersWithStatus();
  return result.suppliers;
};

export const fetchMobileSuppliers = async (
  options: { includeStockOrigins?: boolean } = {}
): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('people')
      .select(
        options.includeStockOrigins
          ? 'id, full_name, nickname, social_name, person_type, stock_origins'
          : 'id, full_name, nickname, social_name, person_type'
      )
      .or('person_type.ilike.suppliers,person_type.ilike.supplier')
      .order('full_name');
    if (error) {
      console.warn('[mobileSupplierService] Erro ao buscar fornecedores:', error);
      return [];
    }
    return (data || []).map((s) => ({
      ...s,
      name: s.nickname || s.full_name || s.social_name || 'Fornecedor',
    }));
  } catch (err) {
    console.error('[mobileSupplierService] Exceção:', err);
    return [];
  }
};
