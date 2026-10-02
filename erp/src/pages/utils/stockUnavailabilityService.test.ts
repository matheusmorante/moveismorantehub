import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product, Variation } from '@/pages/types/product.type';
import {
  createStockUnavailability,
  fetchStockUnavailabilities,
  getUnavailabilityPhotoUrls,
  undoStockUnavailability,
} from './stockUnavailabilityService';

const { upload, remove, createSignedUrls, rpc, getSession, from } = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrls: vi.fn(),
  rpc: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    auth: { getSession },
    rpc,
    storage: { from: vi.fn(() => ({ upload, remove, createSignedUrls })) },
    from,
  },
}));

const product = { id: 'product-1' } as Product;
const variation = { id: 'variation-1' } as Variation;
const baseInput = {
  product,
  variation,
  quantity: 1,
  reason: 'Avaria',
  treatment: 'Descarte/perda',
  physicalLocation: 'Depósito',
  observation: '',
  supplierId: null,
  photos: [{ name: 'avaria.jpg', type: 'image/jpeg' } as File],
};

describe('stockUnavailabilityService - fetchStockUnavailabilities', () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'unavail-1',
            product_id: 'prod-1',
            variation_id: 'var-1',
            supplier_id: 'sup-1',
            quantity: 2,
            reason: 'Defeito',
            treatment: 'Devolução ao fornecedor',
            physical_location: 'Depósito',
            status: 'active',
            observation: null,
            photos: null,
            created_at: '2026-10-01T12:00:00Z',
            products: { id: 'prod-1', name: 'Mesa', product_kind: 'normal' },
            product_variations: { name: 'Mesa Branca', sku: 'MS-BR-1' },
            people: {
              id: 'sup-1',
              nickname: 'Fornecedor A',
              full_name: 'Empresa A',
              social_name: 'Soc A',
            },
          },
          {
            id: 'unavail-2',
            product_id: 'prod-2',
            variation_id: 'var-2',
            supplier_id: 'sup-2',
            quantity: 1,
            reason: 'Quebra',
            treatment: 'Descarte/perda',
            physical_location: 'Depósito',
            status: 'cancelled',
            observation: 'Quebrou no transporte',
            photos: ['photo.jpg'],
            created_at: '2026-10-01T11:00:00Z',
            products: { id: 'prod-2', name: 'Cadeira', product_kind: 'salvado' },
            product_variations: { name: 'Cadeira Azul', sku: 'CD-AZ-1' },
            people: { id: 'sup-2', nickname: null, full_name: 'Indústria B', social_name: 'Soc B' },
          },
          {
            id: 'unavail-3',
            product_id: 'prod-3',
            variation_id: 'var-3',
            supplier_id: null,
            quantity: 5,
            reason: 'Avaria',
            treatment: 'Descarte/perda',
            physical_location: 'Depósito',
            status: 'active',
            observation: null,
            photos: null,
            created_at: '2026-10-01T10:00:00Z',
            products: { id: 'prod-3', name: 'Armário', product_kind: null },
            product_variations: { name: 'Armário Carvalho', sku: 'AR-CV-1' },
            people: null,
          },
        ],
        count: 3,
        error: null,
      }),
    };
    from.mockReturnValue(mockQuery);
  });

  it('fetches unavailabilities with pagination and maps supplier and product sku', async () => {
    const result = await fetchStockUnavailabilities({
      page: 1,
      status: 'all',
      productKind: 'all',
    });

    expect(from).toHaveBeenCalledWith('stock_unavailabilities');
    expect(mockQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('products!inner(id,name,product_kind)'),
      { count: 'exact' }
    );
    expect(mockQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('people:supplier_id(id,full_name,nickname,social_name)'),
      { count: 'exact' }
    );
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockQuery.order).toHaveBeenCalledWith('id', { ascending: false });
    expect(mockQuery.range).toHaveBeenCalledWith(0, 29);

    expect(result.totalCount).toBe(3);
    expect(result.data).toHaveLength(3);

    // Verificação do mapeamento do fornecedor e SKU
    expect(result.data[0].suppliers).toEqual({ fantasy_name: 'Fornecedor A' });
    expect(result.data[0].products.sku).toBe('MS-BR-1');

    // Fallback de nickname para full_name
    expect(result.data[1].suppliers).toEqual({ fantasy_name: 'Indústria B' });
    expect(result.data[1].products.sku).toBe('CD-AZ-1');

    // Fornecedor nulo
    expect(result.data[2].suppliers).toBeNull();
    expect(result.data[2].products.sku).toBe('AR-CV-1');
  });

  it('applies filters for status, productKind, and id', async () => {
    await fetchStockUnavailabilities({
      page: 2,
      status: 'active',
      productKind: 'salvado',
      id: 'target-id-123',
    });

    expect(mockQuery.range).toHaveBeenCalledWith(30, 59);
    expect(mockQuery.eq).toHaveBeenCalledWith('id', 'target-id-123');
    expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
    expect(mockQuery.eq).toHaveBeenCalledWith('products.product_kind', 'salvado');
  });

  it('throws error when query fails', async () => {
    mockQuery.range.mockResolvedValueOnce({
      data: null,
      count: null,
      error: new Error('PostgREST connection failed'),
    });

    await expect(
      fetchStockUnavailabilities({
        page: 1,
        status: 'all',
        productKind: 'all',
      })
    ).rejects.toThrow('PostgREST connection failed');
  });
});

describe('stockUnavailabilityService - undoStockUnavailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls undo_stock_unavailability RPC with id and returns result', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'cancelled' }, error: null });

    const result = await undoStockUnavailability('unavail-1');

    expect(rpc).toHaveBeenCalledWith('undo_stock_unavailability', {
      p_unavailability_id: 'unavail-1',
    });
    expect(result).toEqual({ status: 'cancelled' });
  });

  it('throws error when undo RPC returns error', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Indisponibilidade já foi cancelada'),
    });

    await expect(undoStockUnavailability('unavail-1')).rejects.toThrow(
      'Indisponibilidade já foi cancelada'
    );
  });
});

describe('stockUnavailabilityService - createStockUnavailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
  });

  it('throws if variation is missing', async () => {
    await expect(
      createStockUnavailability({ ...baseInput, variation: undefined as any })
    ).rejects.toThrow('Selecione uma variação válida.');
  });

  it('throws if session is missing', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

    await expect(createStockUnavailability(baseInput)).rejects.toThrow('Usuário não autenticado.');
  });

  it('successfully creates stock unavailability with uploaded photo and calls RPC', async () => {
    rpc.mockResolvedValueOnce({ data: { id: 'unavail-new', status: 'created' }, error: null });

    const result = await createStockUnavailability(baseInput);

    expect(upload).toHaveBeenCalledWith(
      'user-1/00000000-0000-4000-8000-000000000001.jpg',
      baseInput.photos[0],
      expect.objectContaining({ upsert: false })
    );
    expect(rpc).toHaveBeenCalledWith('create_stock_unavailability', {
      p_product_id: 'product-1',
      p_variation_id: 'variation-1',
      p_quantity: 1,
      p_reason: 'Avaria',
      p_treatment: 'Descarte/perda',
      p_physical_location: 'Depósito',
      p_observation: '',
      p_supplier_id: null,
      p_photos: ['user-1/00000000-0000-4000-8000-000000000001.jpg'],
    });
    expect(result).toEqual({ id: 'unavail-new', status: 'created' });
  });

  it('removes successfully uploaded private files when the RPC fails', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('RPC failed') });

    await expect(createStockUnavailability(baseInput)).rejects.toThrow('RPC failed');

    expect(upload).toHaveBeenCalledWith(
      'user-1/00000000-0000-4000-8000-000000000001.jpg',
      baseInput.photos[0],
      expect.objectContaining({ upsert: false })
    );
    expect(remove).toHaveBeenCalledWith(['user-1/00000000-0000-4000-8000-000000000001.jpg']);
  });

  it('cleans earlier uploads if a later file upload fails', async () => {
    upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error('upload failed') });
    const input = {
      ...baseInput,
      photos: [baseInput.photos[0], { name: 'outra.png', type: 'image/png' } as File],
    };

    await expect(createStockUnavailability(input)).rejects.toThrow('upload failed');

    expect(rpc).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(['user-1/00000000-0000-4000-8000-000000000001.jpg']);
  });
});

describe('stockUnavailabilityService - getUnavailabilityPhotoUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array when photos is null, undefined, or empty', async () => {
    expect(await getUnavailabilityPhotoUrls(null)).toEqual([]);
    expect(await getUnavailabilityPhotoUrls(undefined)).toEqual([]);
    expect(await getUnavailabilityPhotoUrls([])).toEqual([]);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('preserves direct http/https URLs without calling createSignedUrls', async () => {
    const direct = ['https://example.com/photo1.jpg', 'http://example.com/photo2.png'];
    const result = await getUnavailabilityPhotoUrls(direct);
    expect(result).toEqual(direct);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('fetches signed URLs for private storage paths', async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        { path: 'user-1/photo1.jpg', signedUrl: 'https://supabase.co/signed/photo1.jpg?token=123' },
        { path: 'user-1/photo2.jpg', signedUrl: 'https://supabase.co/signed/photo2.jpg?token=456' },
      ],
      error: null,
    });

    const result = await getUnavailabilityPhotoUrls(['user-1/photo1.jpg', 'user-1/photo2.jpg']);

    expect(createSignedUrls).toHaveBeenCalledWith(['user-1/photo1.jpg', 'user-1/photo2.jpg'], 3600);
    expect(result).toEqual([
      'https://supabase.co/signed/photo1.jpg?token=123',
      'https://supabase.co/signed/photo2.jpg?token=456',
    ]);
  });

  it('handles mixed direct URLs and storage paths gracefully', async () => {
    createSignedUrls.mockResolvedValue({
      data: [{ path: 'user-1/private.jpg', signedUrl: 'https://supabase.co/signed/private.jpg' }],
      error: null,
    });

    const result = await getUnavailabilityPhotoUrls([
      'https://cdn.example.com/public.jpg',
      'user-1/private.jpg',
    ]);

    expect(createSignedUrls).toHaveBeenCalledWith(['user-1/private.jpg'], 3600);
    expect(result).toEqual([
      'https://cdn.example.com/public.jpg',
      'https://supabase.co/signed/private.jpg',
    ]);
  });

  it('returns fallback direct URLs if storage createSignedUrls errors', async () => {
    createSignedUrls.mockResolvedValue({
      data: null,
      error: new Error('Storage timeout'),
    });

    const result = await getUnavailabilityPhotoUrls([
      'https://cdn.example.com/public.jpg',
      'user-1/private.jpg',
    ]);

    expect(result).toEqual(['https://cdn.example.com/public.jpg']);
  });
});
