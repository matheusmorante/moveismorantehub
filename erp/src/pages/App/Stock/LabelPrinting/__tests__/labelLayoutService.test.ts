import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  deleteRemoteLabelLayout,
  fetchRemoteLabelLayouts,
  insertRemoteLabelLayout,
  updateRemoteLabelLayoutArtwork,
  updateRemoteLabelLayout,
  upsertRemoteLabelArtConfig,
} from '../services/labelLayoutService';
import type { GridModelDraft } from '../types/LabelGridModelTypes';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: vi.fn() },
}));

const model: GridModelDraft = {
  name: 'Modelo A4',
  columns: 2,
  rows: 5,
  marginT: 10,
  marginB: 10,
  marginL: 10,
  marginR: 10,
  gapH: 2,
  gapV: 2,
  paperSize: 'A4',
  icon: 'bi-grid',
  category: 'identificacao',
};

describe('labelLayoutService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca layouts remotos e converte os registros para o modelo da tela', async () => {
    const row = {
      id: 'layout-1',
      name: model.name,
      columns: model.columns,
      rows: model.rows,
      margin_t: model.marginT,
      margin_b: model.marginB,
      margin_l: model.marginL,
      margin_r: model.marginR,
      gap_h: model.gapH,
      gap_v: model.gapV,
      paper_size: model.paperSize,
      icon: model.icon,
      category: model.category,
    };
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [row], error: null }),
    } as never);

    const result = await fetchRemoteLabelLayouts();

    expect(result.error).toBeNull();
    expect(result.data?.[0]).toMatchObject({ id: 'layout-1', name: model.name, columns: 2 });
  });

  it('insere e atualiza layouts retornando o registro persistido', async () => {
    const row = {
      id: 'layout-1',
      name: model.name,
      columns: model.columns,
      rows: model.rows,
      margin_t: model.marginT,
      margin_b: model.marginB,
      margin_l: model.marginL,
      margin_r: model.marginR,
      gap_h: model.gapH,
      gap_v: model.gapV,
      paper_size: model.paperSize,
      icon: model.icon,
      category: model.category,
    };
    const query = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    const inserted = await insertRemoteLabelLayout(model);
    const updated = await updateRemoteLabelLayout('layout-1', model);

    expect(inserted.data?.id).toBe('layout-1');
    expect(updated.data?.id).toBe('layout-1');
    expect(query.insert).toHaveBeenCalledTimes(1);
    expect(query.update).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith('id', 'layout-1');
  });

  it('preserva erros retornados pelo Supabase para o fluxo chamador decidir o fallback', async () => {
    const error = { message: 'Permission denied' };
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error }),
    } as never);

    await expect(insertRemoteLabelLayout(model)).resolves.toMatchObject({ data: null, error });
  });

  it('remove um layout pelo identificador e retorna qualquer erro do Supabase', async () => {
    const query = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(deleteRemoteLabelLayout('layout-1')).resolves.toEqual({ error: null });
    expect(query.eq).toHaveBeenCalledWith('id', 'layout-1');
  });

  it('persiste arte e posição do grupo pelas operações remotas correspondentes', async () => {
    const artConfigQuery = { upsert: vi.fn().mockResolvedValue({ error: null }) };
    const layoutQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from)
      .mockReturnValueOnce(artConfigQuery as never)
      .mockReturnValueOnce(layoutQuery as never);

    const artConfig = { globalSnapshot: { title: 'OFERTA' } };
    await expect(
      upsertRemoteLabelArtConfig({ layoutId: 'layout-1', category: 'precos', artConfig })
    ).resolves.toEqual({ error: null });
    await expect(
      updateRemoteLabelLayoutArtwork('layout-1', {
        de_price_por_group_pos_x: 20,
        de_price_por_group_pos_y: 45,
      })
    ).resolves.toEqual({ error: null });

    expect(artConfigQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ layout_id: 'layout-1', category: 'precos', art_config: artConfig }),
      { onConflict: 'layout_id' }
    );
    expect(layoutQuery.update).toHaveBeenCalledWith({
      de_price_por_group_pos_x: 20,
      de_price_por_group_pos_y: 45,
    });
    expect(layoutQuery.eq).toHaveBeenCalledWith('id', 'layout-1');
  });
});
