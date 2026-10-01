import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  createLabelImage,
  deleteLabelImage,
  fetchLabelImages,
} from '../services/labelImageService';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: vi.fn() },
}));

describe('labelImageService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca imagens em ordem decrescente de criação', async () => {
    const images = [{ id: 1, name: 'Logo', image: 'data:image/png;base64,AA', category: 'logos' }];
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: images, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(fetchLabelImages()).resolves.toEqual(images);
    expect(supabase.from).toHaveBeenCalledWith('label_images');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('cria uma imagem e devolve o registro inserido', async () => {
    const image = { id: 2, name: 'MDF', image: 'data:image/png;base64,BB', category: 'logos' };
    const query = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: image, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    const input = { name: 'MDF', image: image.image, category: 'logos' };

    await expect(createLabelImage(input)).resolves.toEqual(image);
    expect(query.insert).toHaveBeenCalledWith([input]);
  });

  it('propaga falhas de gravação para a interface', async () => {
    const error = new Error('Permission denied');
    const query = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(createLabelImage({ name: 'MDF', image: 'data:', category: 'logos' })).rejects.toBe(
      error
    );
  });

  it('exclui pelo identificador e propaga falhas', async () => {
    const query = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(deleteLabelImage(7)).resolves.toBeUndefined();
    expect(query.eq).toHaveBeenCalledWith('id', 7);
  });
});
