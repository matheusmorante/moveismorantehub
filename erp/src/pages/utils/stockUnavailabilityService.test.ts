import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStockUnavailability } from './stockUnavailabilityService';
import type { Product, Variation } from '@/pages/types/product.type';

const { upload, remove, rpc, getSession } = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    auth: { getSession },
    rpc,
    storage: { from: vi.fn(() => ({ upload, remove })) },
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

describe('createStockUnavailability photo cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
  });

  it('removes successfully uploaded private files when the RPC fails', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('RPC failed') });

    await expect(createStockUnavailability(baseInput)).rejects.toThrow('RPC failed');

    expect(upload).toHaveBeenCalledWith(
      'user-1/00000000-0000-4000-8000-000000000001.jpg',
      baseInput.photos[0],
      expect.objectContaining({ upsert: false })
    );
    expect(rpc).toHaveBeenCalledWith(
      'create_stock_unavailability',
      expect.objectContaining({
        p_variation_id: 'variation-1',
        p_photos: ['user-1/00000000-0000-4000-8000-000000000001.jpg'],
      })
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
