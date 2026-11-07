import type { ReceiptPeriod } from '@/pages/App/Stock/Receipts/types/receiptPeriodFilter.types';
import type InventoryMove from '../../types/inventoryMove.type';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/pages/utils/supabaseConfig';
import { mapInventoryMoveFromDB } from './inventoryMapper';
import { INVENTORY_TABLE_NAME } from './inventoryTypeRules';

export const INVENTORY_MOVES_HISTORY_PAGE_SIZE = 15;

type InventoryMovesHistoryPageResponse = {
  data: unknown;
  error: PostgrestError | null;
  count: number | null;
};

const INVENTORY_MOVES_HISTORY_COLUMNS = [
  'id',
  'product_id',
  'product_name',
  'product_description',
  'variation_id',
  'type',
  'quantity',
  'date',
  'created_at',
  'label',
  'unit_cost',
  'unit_price',
  'reason',
  'observation',
  'status',
  'reversal_reason',
  'reversed_at',
  'order_id',
  'related_entity_id',
  'related_entity_type',
  'source_receipt_id',
  'source_item_index',
].join(',');

export interface InventoryMovesHistoryFilters {
  readonly productId?: string;
  readonly variationId?: string;
  readonly variationIsVirtual?: boolean;
  readonly variationName?: string;
  readonly period: ReceiptPeriod;
  readonly customStartDate: string;
  readonly customEndDate: string;
}

export interface InventoryMovesHistoryDateRange {
  readonly from?: string;
  readonly before?: string;
  readonly invalid?: boolean;
}

interface InventoryVariationName {
  readonly id: string;
  readonly product_id?: string;
  readonly name?: string;
  readonly created_at?: string;
}

const parseLocalDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return parsed.getFullYear() === Number(year) &&
    parsed.getMonth() === Number(month) - 1 &&
    parsed.getDate() === Number(day)
    ? parsed
    : null;
};

const nextLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

export const resolveInventoryMovesHistoryDateRange = (
  period: ReceiptPeriod,
  customStartDate: string,
  customEndDate: string,
  now = new Date(),
): InventoryMovesHistoryDateRange => {
  let start: Date | undefined;
  let endExclusive: Date | undefined;

  if (period === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    endExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (period === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endExclusive = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1);
    endExclusive = new Date(now.getFullYear() + 1, 0, 1);
  } else if (period === 'custom') {
    if (customStartDate) {
      start = parseLocalDate(customStartDate) || undefined;
      if (!start) return { invalid: true };
    }
    if (customEndDate) {
      const end = parseLocalDate(customEndDate);
      if (!end) return { invalid: true };
      endExclusive = nextLocalDay(end);
    }
  }

  if (start && endExclusive && start >= endExclusive) return { invalid: true };
  return {
    from: start?.toISOString(),
    before: endExclusive?.toISOString(),
  };
};

const getFirstVariation = async (
  productId: string,
  signal?: AbortSignal,
): Promise<InventoryVariationName | null> => {
  const { data, error } = await withAbortTimeout(
    supabase
      .from('product_variations')
      .select('id, product_id, name, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle(),
    'estoque:primeira-variacao-legada',
    10_000,
    signal,
  );
  if (error) throw error;
  return data as InventoryVariationName | null;
};

const getMarkerAndVariationFilter = (
  variationId: string | undefined,
  includeLegacyUnassigned: boolean,
): string => {
  const markerAlternatives = [
    'label.is.null',
    'label.not.like."Inventário #*"',
    'quantity.gt.0',
    'quantity.lt.0',
  ];
  const variationAlternatives = variationId
    ? includeLegacyUnassigned
      ? [`variation_id.eq.${variationId}`, 'variation_id.is.null']
      : [`variation_id.eq.${variationId}`]
    : [''];

  const branches = variationAlternatives.flatMap((variationFilter) =>
    markerAlternatives.map((markerFilter) => {
      const parts = [variationFilter, markerFilter].filter(Boolean);
      return parts.length > 1 ? `and(${parts.join(',')})` : parts[0];
    }),
  );
  return branches.length === 1 ? branches[0] : branches.join(',');
};

const applyInventoryMovesHistoryFilters = (
  query: any,
  filters: InventoryMovesHistoryFilters,
  range: InventoryMovesHistoryDateRange,
  includeLegacyUnassigned: boolean,
) => {
  if (filters.productId) query = query.eq('product_id', filters.productId);
  if (filters.variationId) {
    if (includeLegacyUnassigned) {
      query = query.or(
        getMarkerAndVariationFilter(filters.variationId, true),
      );
    } else {
      query = query.eq('variation_id', filters.variationId).or(
        getMarkerAndVariationFilter(undefined, false),
      );
    }
  } else {
    query = query.or(getMarkerAndVariationFilter(undefined, false));
  }
  if (range.from) query = query.gte('date', range.from);
  if (range.before) query = query.lt('date', range.before);
  return query;
};

const mapVariation = (row: InventoryVariationName): InventoryVariationName => ({
  id: String(row.id),
  product_id: row.product_id ? String(row.product_id) : undefined,
  name: row.name,
  created_at: row.created_at,
});

const enrichMoves = async (
  rows: any[],
  filters: InventoryMovesHistoryFilters,
  selectedFirstVariation: InventoryVariationName | null,
  signal?: AbortSignal,
): Promise<InventoryMove[]> => {
  const variationIds = [
    ...new Set(rows.map((row) => String(row.variation_id || '')).filter(Boolean)),
  ].filter((id) => !(id === filters.variationId && filters.variationName));
  const variationById = new Map<string, InventoryVariationName>();
  if (filters.variationId && filters.variationName) {
    variationById.set(filters.variationId, {
      id: filters.variationId,
      product_id: filters.productId,
      name: filters.variationName,
    });
  }

  if (variationIds.length) {
    const { data, error } = await withAbortTimeout(
      supabase
        .from('product_variations')
        .select('id, product_id, name, created_at')
        .in('id', variationIds),
      'estoque:variacoes-da-pagina',
      10_000,
      signal,
    );
    if (error) throw error;
    (data || []).forEach((row: InventoryVariationName) => {
      const variation = mapVariation(row);
      variationById.set(variation.id, variation);
    });
  }

  const unassignedRows = rows.filter((row) => !row.variation_id && row.product_id);
  const firstVariationByProduct = new Map<string, InventoryVariationName>();
  if (selectedFirstVariation && filters.productId) {
    firstVariationByProduct.set(filters.productId, selectedFirstVariation);
  } else if (unassignedRows.length && !filters.variationId) {
    const productIds = [
      ...new Set(unassignedRows.map((row) => String(row.product_id))),
    ];
    const { data, error } = await withAbortTimeout(
      supabase
        .from('products')
        .select(
          'id, product_variations!product_variations_product_id_fkey(id, product_id, name, created_at)',
        )
        .in('id', productIds)
        .order('created_at', {
          ascending: true,
          nullsFirst: false,
          referencedTable: 'product_variations',
        })
        .order('id', {
          ascending: true,
          referencedTable: 'product_variations',
        })
        .limit(1, { referencedTable: 'product_variations' }),
      'estoque:primeira-variacao-da-pagina',
      10_000,
      signal,
    );
    if (error) throw error;
    (data || []).forEach((product: any) => {
      const first = Array.isArray(product.product_variations)
        ? product.product_variations[0]
        : product.product_variations;
      if (!first?.id) return;
      const variation = mapVariation({ ...first, product_id: product.id });
      firstVariationByProduct.set(String(product.id), variation);
      variationById.set(variation.id, variation);
    });
  }

  return rows.map((row) => {
    const variation =
      variationById.get(String(row.variation_id || '')) ||
      (!row.variation_id
        ? firstVariationByProduct.get(String(row.product_id || ''))
        : undefined);
    return mapInventoryMoveFromDB({
      ...row,
      variation_id: variation?.id || row.variation_id,
      product_variations: variation,
    });
  });
};

export const fetchInventoryMovesHistoryPage = async (
  page: number,
  filters: InventoryMovesHistoryFilters,
  options: { signal?: AbortSignal } = {},
): Promise<{ data: InventoryMove[]; total: number }> => {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const range = resolveInventoryMovesHistoryDateRange(
    filters.period,
    filters.customStartDate,
    filters.customEndDate,
  );
  if (range.invalid) return { data: [], total: 0 };

  const selectedFirstVariation =
    filters.productId && filters.variationId && !filters.variationIsVirtual
      ? await getFirstVariation(filters.productId, options.signal)
      : null;
  const includeLegacyUnassigned =
    Boolean(
      selectedFirstVariation &&
        filters.variationId &&
        String(selectedFirstVariation.id) === filters.variationId,
    );
  const applyFilters = (query: any) =>
    applyInventoryMovesHistoryFilters(
      query,
      filters,
      range,
      includeLegacyUnassigned,
    );
  const from = (safePage - 1) * INVENTORY_MOVES_HISTORY_PAGE_SIZE;
  const { data, error, count } = await withAbortTimeout<InventoryMovesHistoryPageResponse>(
    applyFilters(
      supabase
        .from(INVENTORY_TABLE_NAME)
        .select(INVENTORY_MOVES_HISTORY_COLUMNS, { count: 'exact' }),
    )
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(from, from + INVENTORY_MOVES_HISTORY_PAGE_SIZE - 1),
    'estoque:historico-movimentacoes-pagina',
    10_000,
    options.signal,
  );

  if (error?.code === 'PGRST103') {
    const countResult = await withAbortTimeout<InventoryMovesHistoryPageResponse>(
      applyFilters(
        supabase
          .from(INVENTORY_TABLE_NAME)
          .select('id', { count: 'exact', head: true }),
      ),
      'estoque:historico-movimentacoes-contagem',
      10_000,
      options.signal,
    );
    if (countResult.error) throw countResult.error;
    return { data: [], total: countResult.count || 0 };
  }
  if (error) throw error;

  return {
    data: await enrichMoves(
      Array.isArray(data) ? data : [],
      filters,
      includeLegacyUnassigned ? selectedFirstVariation : null,
      options.signal,
    ),
    total: count || 0,
  };
};

export const fetchCurrentInventoryStock = async (
  productId: string,
  variation?: { readonly id: string; readonly isVirtual?: boolean },
  signal?: AbortSignal,
): Promise<number | null> => {
  const query =
    variation && !variation.isVirtual
      ? supabase
          .from('product_variations')
          .select('stock')
          .eq('id', variation.id)
          .eq('product_id', productId)
          .maybeSingle()
      : supabase
          .from('products')
          .select('stock')
          .eq('id', productId)
          .maybeSingle();
  const { data, error } = await withAbortTimeout(
    query,
    'estoque:saldo-atual',
    10_000,
    signal,
  );
  if (error) throw error;
  return data?.stock == null ? null : Number(data.stock);
};
