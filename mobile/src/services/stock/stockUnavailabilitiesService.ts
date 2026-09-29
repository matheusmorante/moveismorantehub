import { supabase } from '../supabaseClient';

export const STOCK_UNAVAILABILITIES_PAGE_SIZE = 30;

export type UnavailabilityStatusFilter = 'all' | 'active' | 'cancelled';
export type UnavailabilityProductKindFilter = 'all' | 'normal' | 'salvado' | 'usado';

export interface StockUnavailabilityFilters {
  page: number;
  status: UnavailabilityStatusFilter;
  productKind: UnavailabilityProductKindFilter;
  id?: string;
}

export interface StockUnavailability {
  id: string;
  product_id: string;
  variation_id: string;
  supplier_id: string | null;
  quantity: number;
  reason: string;
  treatment: string | null;
  physical_location: string | null;
  status: 'active' | 'cancelled';
  observation: string | null;
  photos: string[] | null;
  created_at: string;
  products: {
    id: string;
    name: string;
    sku: string;
    product_kind: 'normal' | 'salvado' | 'usado' | null;
  } | null;
  product_variations: { name: string; sku: string } | null;
  suppliers: { fantasy_name: string } | null;
}

export interface CreateStockUnavailabilityInput {
  productId: string;
  variationId: string;
  quantity: number;
  reason: string;
  treatment: string;
  physicalLocation: string;
  observation?: string;
  supplierId?: string | null;
  photos?: string[];
}

const UNAVAILABILITY_COLUMNS = [
  'id',
  'product_id',
  'variation_id',
  'supplier_id',
  'quantity',
  'reason',
  'treatment',
  'physical_location',
  'status',
  'observation',
  'photos',
  'created_at',
  'products!inner(id,name,sku,product_kind)',
  'product_variations(name,sku)',
  'suppliers(fantasy_name)',
].join(',');

export async function fetchStockUnavailabilities(filters: StockUnavailabilityFilters) {
  const from = (filters.page - 1) * STOCK_UNAVAILABILITIES_PAGE_SIZE;
  let query = (supabase.from('stock_unavailabilities' as any) as any)
    .select(UNAVAILABILITY_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (filters.id) query = query.eq('id', filters.id);
  if (filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.productKind !== 'all') query = query.eq('products.product_kind', filters.productKind);

  const { data, count, error } = await query.range(
    from,
    from + STOCK_UNAVAILABILITIES_PAGE_SIZE - 1
  );
  if (error) throw error;

  return {
    data: (data || []) as StockUnavailability[],
    totalCount: count || 0,
  };
}

export async function createStockUnavailability(input: CreateStockUnavailabilityInput) {
  const { data, error } = await supabase.rpc('create_stock_unavailability', {
    p_product_id: input.productId,
    p_variation_id: input.variationId,
    p_quantity: input.quantity,
    p_reason: input.reason,
    p_treatment: input.treatment,
    p_physical_location: input.physicalLocation,
    p_observation: input.observation || null,
    p_supplier_id: input.supplierId || null,
    p_photos: input.photos && input.photos.length > 0 ? input.photos : null,
  });

  if (error) throw error;
  return data;
}

export async function undoStockUnavailability(unavailabilityId: string) {
  const { data, error } = await supabase.rpc('undo_stock_unavailability', {
    p_unavailability_id: unavailabilityId,
  });

  if (error) throw error;
  return data;
}
