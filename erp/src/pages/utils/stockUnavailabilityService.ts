import type { Product, Variation } from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { stockUnavailabilityWriteFormSchema, stockUnavailabilityAckSchema, StockUnavailabilityUnconfirmedError } from '../../../../shared-utils/stockUnavailabilityFormSchemas';
import { withTimeout } from '../../../../shared-utils/withTimeout';

export const STOCK_UNAVAILABILITIES_PAGE_SIZE = 30;

export type UnavailabilityStatusFilter = 'all' | 'active' | 'cancelled';
export type UnavailabilityProductKindFilter = 'all' | 'normal' | 'salvado' | 'usado';

export interface StockUnavailabilityFilters {
  page: number;
  pageSize?: number;
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
  };
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
  'products!inner(id,name,product_kind)',
  'product_variations(name,sku)',
  'people:supplier_id(id,full_name,nickname,social_name)',
].join(',');

export async function fetchStockUnavailabilities(filters: StockUnavailabilityFilters) {
  const pageSize = filters.pageSize ?? STOCK_UNAVAILABILITIES_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error('Quantidade por página inválida.');
  }
  const from = (filters.page - 1) * pageSize;
  let query = (supabase.from('stock_unavailabilities' as any) as any)
    .select(UNAVAILABILITY_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (filters.id) query = query.eq('id', filters.id);
  if (filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.productKind !== 'all') query = query.eq('products.product_kind', filters.productKind);

  const { data, count, error } = await query.range(
    from,
    from + pageSize - 1
  );
  if (error) throw error;

  const mappedData: StockUnavailability[] = ((data || []) as any[]).map((row) => ({
    ...row,
    products: {
      ...row.products,
      sku: row.products?.sku || row.product_variations?.sku || '',
    },
    suppliers:
      row.suppliers ||
      (row.people
        ? {
            fantasy_name:
              row.people.nickname?.trim() ||
              row.people.full_name?.trim() ||
              row.people.social_name?.trim() ||
              '-',
          }
        : null),
  }));

  return {
    data: mappedData,
    totalCount: count || 0,
  };
}

async function uploadPrivatePhoto(file: File, userId: string, uploadedPaths: string[]) {
  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  uploadedPaths.push(path);
  const result = await withTimeout(supabase.storage
    .from('unavailabilities')
    .upload(path, file, { upsert: false, contentType: file.type || undefined }), 15000, null, 'indisponibilidade:foto');
  if (!result) throw new Error('O envio da foto excedeu o prazo. Tente novamente.');
  if (result.error) throw result.error;
}

export async function createStockUnavailability(input: CreateStockUnavailabilityInput, stillCurrent: () => boolean = () => true): Promise<{ id: string }> {
  if (!input.variation?.id) throw new Error('Selecione uma variação válida.');
  const values = stockUnavailabilityWriteFormSchema.parse({ ...input, productId: input.product?.id,
    variationId: input.variation.id, variationIsVirtual: Boolean(input.variation.isVirtual), availableStock: input.variation.stock ?? 0, supplierId: input.supplierId ?? '' });
  const check = () => { if (!stillCurrent()) throw new Error('O formulário mudou. Confira o registro antes de continuar.'); };
  check();
  const auth = await withTimeout(supabase.auth.getSession(), 10000, null, 'indisponibilidade:sessao');
  if (!auth) throw new Error('Não foi possível confirmar a sessão no prazo. Tente novamente.');
  const {
    data: { session },
    error: sessionError,
  } = auth;
  if (sessionError) throw sessionError;
  if (!session?.user.id) throw new Error('Usuário não autenticado.');

  const uploadedPaths: string[] = [];
  let rpcDispatched = false;
  try {
    for (const photo of values.photos) {
      check();
      await uploadPrivatePhoto(photo, session.user.id, uploadedPaths);
    }
    check();
    rpcDispatched = true;
    const response = await withTimeout(supabase.rpc('create_stock_unavailability' as any, {
      p_product_id: values.productId,
      p_variation_id: values.variationId,
      p_quantity: values.quantity,
      p_reason: values.reason,
      p_treatment: values.treatment,
      p_physical_location: values.physicalLocation,
      p_observation: values.observation,
      p_supplier_id: values.supplierId || null,
      p_photos: uploadedPaths.length ? uploadedPaths : null,
    }), 20000, null, 'indisponibilidade:registrar');
    if (!response) throw new StockUnavailabilityUnconfirmedError();
    const { data, error, status } = response;
    if (error) {
      if (status === 0 || status >= 500 || !error.code || error.code === '40003' || error.code.startsWith('08')) throw new StockUnavailabilityUnconfirmedError();
      rpcDispatched = false; // Confirmed SQL/PostgREST rejection; uploaded evidence has no record.
      throw error;
    }
    const ack = stockUnavailabilityAckSchema.safeParse(data);
    if (!ack.success) throw new StockUnavailabilityUnconfirmedError();
    check();
    const confirmed = await withTimeout(supabase.from('stock_unavailabilities')
      .select('id, product_id, variation_id, quantity, reason, treatment, physical_location, observation, supplier_id, photos, status')
      .eq('id', ack.data.id).single(), 10000, null, 'indisponibilidade:confirmar');
    const row = confirmed?.data;
    if (confirmed?.error || !row || row.id !== ack.data.id || row.product_id !== values.productId
      || row.variation_id !== values.variationId || Number(row.quantity) !== values.quantity || row.status !== 'active'
      || row.reason !== values.reason || row.treatment !== values.treatment || row.physical_location !== values.physicalLocation
      || (row.observation ?? '') !== values.observation || (row.supplier_id ?? '') !== values.supplierId
      || JSON.stringify(row.photos ?? []) !== JSON.stringify(uploadedPaths)) throw new StockUnavailabilityUnconfirmedError();
    check();
    return ack.data;
  } catch (error) {
    if (rpcDispatched) throw error instanceof StockUnavailabilityUnconfirmedError ? error : new StockUnavailabilityUnconfirmedError();
    if (uploadedPaths.length) {
      try {
        const cleanup = await withTimeout(supabase.storage
          .from('unavailabilities')
          .remove(uploadedPaths), 5000, null, 'indisponibilidade:limpar-fotos');
        if (!cleanup || cleanup.error) console.warn('Não foi possível confirmar a limpeza das fotos sem vínculo.');
      } catch { console.warn('Não foi possível confirmar a limpeza das fotos sem vínculo.'); }
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

export async function getUnavailabilityPhotoUrls(photos?: string[] | null): Promise<string[]> {
  if (!photos || photos.length === 0) return [];

  const storagePaths: string[] = [];
  const directUrls: string[] = [];

  for (const photo of photos) {
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
      directUrls.push(photo);
    } else {
      storagePaths.push(photo);
    }
  }

  if (storagePaths.length === 0) {
    return directUrls;
  }

  const { data, error } = await supabase.storage
    .from('unavailabilities')
    .createSignedUrls(storagePaths, 3600);

  if (error) {
    console.error('Erro ao gerar URLs assinadas para fotos de indisponibilidade:', error);
    return directUrls;
  }

  const signedUrls = (data || [])
    .map((item) => item.signedUrl)
    .filter((url): url is string => Boolean(url));

  return [...directUrls, ...signedUrls];
}
