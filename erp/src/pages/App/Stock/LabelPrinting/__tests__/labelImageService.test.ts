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

  it('aplica a ordenação parseada e preserva categorias históricas e metadata', async () => {
    const images = [{ id: 3, name: '  Antiga  ', image: '/legacy.svg', category: 'legacy-category', metadata: { sequence: 0, active: false } }];
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: images, error: null }) };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    await expect(fetchLabelImages({ sort: 'oldest' })).resolves.toEqual([{ ...images[0], name: 'Antiga' }]);
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('rejeita consulta inválida antes do I/O e não transforma retorno malformado em biblioteca vazia', async () => {
    await expect(fetchLabelImages({ sort: 'invalid' } as never)).rejects.toThrow(); expect(supabase.from).not.toHaveBeenCalled();
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn() };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    for (const data of [null, {}, [{ id: 0, name: 'Logo', image: '/logo.svg', category: 'logos' }]]) {
      query.order.mockResolvedValueOnce({ data, error: null }); await expect(fetchLabelImages()).rejects.toThrow();
    }
    query.order.mockResolvedValueOnce({ data: [], error: null }); await expect(fetchLabelImages()).resolves.toEqual([]);
  });

  it('cria uma imagem e devolve o registro inserido', async () => {
    const image = { id: 2, name: 'MDF', image: 'data:image/png;base64,BB', category: 'logos', metadata: { sequence: 0, active: false } };
    const query = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: image, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    const input = { name: '  MDF  ', image: image.image, category: 'logos' };

    await expect(createLabelImage(input)).resolves.toEqual(image);
    expect(query.insert).toHaveBeenCalledWith([{ ...input, name: 'MDF' }]);
  });

  it('rejeita campos inválidos antes de inserir ou excluir', async () => {
    const valid = { name: 'MDF', image: '/logo.svg', category: 'logos' };
    for (const patch of [{ name: ' ' }, { image: '' }, { category: 'legacy-category' }]) {
      await expect(createLabelImage({ ...valid, ...patch })).rejects.toThrow();
    }
    for (const id of [0, -1, 1.5, Infinity, Number.NaN]) await expect(deleteLabelImage(id)).rejects.toThrow();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it.each([null, { id: 0 }, { id: 2, name: 'Outro' }, { id: 2, name: 'MDF ' }, { id: 2, image: '/other.svg' }, { id: 2, category: 'precos' }])('não confirma INSERT sem registro válido ou com payload divergente %#', async (patch) => {
    const row = { id: 2, name: 'MDF', image: '/logo.svg', category: 'logos' };
    const query = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: patch && { ...row, ...patch }, error: null }) };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    await expect(createLabelImage({ name: 'MDF', image: row.image, category: 'logos' })).rejects.toMatchObject({ uncertain: true });
  });

  it('propaga falhas de gravação para a interface', async () => {
    const error = { code: '42501', message: 'Permission denied' };
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
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 7 }], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(deleteLabelImage(7)).resolves.toBeUndefined();
    expect(query.eq).toHaveBeenCalledWith('id', 7);
    expect(query.select).toHaveBeenCalledWith('id');
  });

  it('distingue exclusão sem linha afetada de acknowledgment ausente ou incorreto', async () => {
    const query = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn() };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    query.select.mockResolvedValueOnce({ data: [], error: null });
    await expect(deleteLabelImage(7)).rejects.toThrow('Recarregue a biblioteca');
    for (const data of [null, {}, [{ id: 8 }], [{ id: '7' }], [{ id: 7 }, { id: 8 }]]) {
      query.select.mockResolvedValueOnce({ data, error: null });
      await expect(deleteLabelImage(7)).rejects.toMatchObject({ uncertain: true });
    }
  });

  it.each(['create', 'delete'])('preserva rejeição SQL conhecida e classifica falhas de conexão/cardinalidade como incertas: %s', async (operation) => {
    const finish = vi.fn();
    const query = { insert: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      select: vi.fn(() => operation === 'create' ? query : finish()), single: finish };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    const run = () => operation === 'create' ? createLabelImage({ name: 'MDF', image: '/logo.svg', category: 'logos' }) : deleteLabelImage(7);
    const known = { code: '23505', message: 'Conflict' };
    finish.mockResolvedValueOnce({ data: null, error: known, status: 409 }); await expect(run()).rejects.toBe(known);
    for (const error of [{ message: 'Failed to fetch' }, { code: '40003' }, { code: '08006' }, { code: 'PGRST116' }]) {
      finish.mockResolvedValueOnce({ data: null, error, status: 400 }); await expect(run()).rejects.toMatchObject({ uncertain: true });
    }
    finish.mockResolvedValueOnce({ data: null, error: { code: '42501' }, status: 0 }); await expect(run()).rejects.toMatchObject({ uncertain: true });
    for (const response of [undefined, null, { data: operation === 'create' ? { id: 2, name: 'MDF', image: '/logo.svg', category: 'logos' } : [{ id: 7 }], error: null, status: 0 }]) {
      finish.mockResolvedValueOnce(response); await expect(run()).rejects.toMatchObject({ uncertain: true });
    }
    finish.mockRejectedValueOnce(new TypeError('Failed to fetch')); await expect(run()).rejects.toMatchObject({ uncertain: true });
  });
});
