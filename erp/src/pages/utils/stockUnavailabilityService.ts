import { supabase } from '@/pages/utils/supabaseConfig';
import type { Product, Variation } from '@/pages/types/product.type';

export const STOCK_UNAVAILABILITIES_PAGE_SIZE = 30;

export type UnavailabilityStatusFilter = 'all' | 'active' | 'cancelled';
export type UnavailabilityProductKindFilter = 'all' | 'normal' | 'salvado';

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
  products: { id: string; name: string; sku: string; product_kind: 'normal' | 'salvado' | null };
  product_variations: { name: string; sku: string };
  suppliers: { fantasy_name: string } | null;
}

export interface CreateStockUnavailabilityInput {
  product: Product;
  variation: Variation;
  quantity: number;
  reason: string;
  treatment: string;
  physicalLocation: string;
  observation: string;
  supplierId: string | null;
  photos: File[];
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

async function uploadPrivatePhoto(file: File, userId: string) {
  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('unavailabilities')
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return path;
}

export async function createStockUnavailability(input: CreateStockUnavailabilityInput) {
  if (!input.variation?.id) throw new Error('Selecione uma variação válida.');
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.user.id) throw new Error('Usuário não autenticado.');

  const uploadedPaths: string[] = [];
  try {
    for (const photo of input.photos) {
      uploadedPaths.push(await uploadPrivatePhoto(photo, session.user.id));
    }

    const { data, error } = await supabase.rpc('create_stock_unavailability' as any, {
      p_product_id: input.product.id,
      p_variation_id: input.variation.id,
      p_quantity: input.quantity,
      p_reason: input.reason,
      p_treatment: input.treatment,
      p_physical_location: input.physicalLocation,
      p_observation: input.observation,
      p_supplier_id: input.supplierId,
      p_photos: uploadedPaths.length ? uploadedPaths : null,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage
        .from('unavailabilities')
        .remove(uploadedPaths);
      if (cleanupError) {
        console.error(
          'Não foi possível limpar anexos sem vínculo da indisponibilidade.',
          cleanupError
        );
      }
    }
    throw error;
  }
}

export async function undoStockUnavailability(id: string) {
  const { data, error } = await supabase.rpc('undo_stock_unavailability' as any, {
    p_unavailability_id: id,
  });
  if (error) throw error;
  return data;
}
