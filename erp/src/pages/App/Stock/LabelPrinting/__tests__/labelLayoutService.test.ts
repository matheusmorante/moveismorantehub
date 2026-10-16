import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapModelToDb } from '../services/labelLayoutMapper';
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
  afterEach(() => vi.useRealTimers());

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
      ...mapModelToDb(model),
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
    const error = { code: '42501', message: 'Permission denied' };
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
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'layout-1' }], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(deleteRemoteLabelLayout('layout-1')).resolves.toEqual({ error: null });
    expect(query.eq).toHaveBeenCalledWith('id', 'layout-1');
  });

  it('bloqueia entradas inválidas antes de qualquer operação remota', async () => {
    for (const invalid of [{ ...model, name: ' ' }, { ...model, columns: 0 }, { ...model, category: 'invalid' }]) {
      expect((await insertRemoteLabelLayout(invalid as GridModelDraft)).error).toBeTruthy();
    }
    expect((await updateRemoteLabelLayout('', model)).error).toBeTruthy();
    expect((await deleteRemoteLabelLayout('')).error).toBeTruthy();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('não transforma resposta de consulta malformada em lista vazia', async () => {
    const query = { select: vi.fn() }; vi.mocked(supabase.from).mockReturnValue(query as never);
    for (const data of [null, {}, [{ id: 'x', columns: 0 }]]) {
      query.select.mockResolvedValueOnce({ data, error: null });
      expect((await fetchRemoteLabelLayouts()).error).toBeTruthy();
    }
    query.select.mockResolvedValueOnce({ data: [], error: null });
    await expect(fetchRemoteLabelLayouts()).resolves.toEqual({ data: [], error: null });
  });

  it.each([null, {}, { name: 'Outro' }, { columns: 9 }, { category: 'logos' }, { id: '' }, { id: undefined }, { id: null }, { id: {} }])('trata registro ausente/divergente no INSERT como incerto %#', async (patch) => {
    const data = patch && { ...mapModelToDb(model), id: 'layout-1', ...patch };
    const query = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data, error: null }) };
    if (patch && Object.keys(patch).length === 0) query.single.mockResolvedValueOnce({ data: {}, error: null });
    vi.mocked(supabase.from).mockReturnValue(query as never);
    expect((await insertRemoteLabelLayout(model)).error).toMatchObject({ uncertain: true });
  });

  it('não confirma UPDATE de outro ID nem exclusão sem a linha exata', async () => {
    const query = { update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn() };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    query.single.mockResolvedValueOnce({ data: { ...mapModelToDb(model), id: 'other' }, error: null });
    expect((await updateRemoteLabelLayout('layout-1', model)).error).toMatchObject({ uncertain: true });
    for (const data of [null, [{}], [{ id: 'other' }], [{ id: 'layout-1' }, { id: 'other' }]]) {
      query.select.mockResolvedValueOnce({ data, error: null });
      expect((await deleteRemoteLabelLayout('layout-1')).error).toMatchObject({ uncertain: true });
    }
    query.select.mockResolvedValueOnce({ data: [], error: null });
    expect((await deleteRemoteLabelLayout('layout-1')).error).toBeInstanceOf(Error);
  });

  it('aceita ordem de chaves JSONB, números TEXT históricos, zeros e metadata confirmados', async () => {
    const input = { ...model, name: '  Modelo  ', nameFontSize: 0, imageScale: 0, namePosX: 1.25, nameBold: false,
      priceFontSizeTens: 0, priceFontSizeTenThousands: 2.5, artConfig: { globalSnapshot: { title: 'OFERTA', metadata: { zero: 0, enabled: false, nullable: null, '\u00e9': 1, 'e\u0301': 2 } } } };
    const row = { ...mapModelToDb({ ...input, name: 'Modelo' }), id: 'layout-1', price_font_size_tens: '0', price_font_size_ten_thousands: '2.5',
      art_config: { globalSnapshot: { metadata: { 'e\u0301': 2, '\u00e9': 1, nullable: null, enabled: false, zero: 0 }, title: 'OFERTA' } } };
    const query = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: row, error: null }) };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    const result = await insertRemoteLabelLayout(input);
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ name: 'Modelo', nameFontSize: 0, imageScale: 0, namePosX: 1.25, nameBold: false, priceFontSizeTens: 0, priceFontSizeTenThousands: 2.5, artConfig: input.artConfig });
    expect(query.insert).toHaveBeenCalledWith([expect.objectContaining({ name: 'Modelo', name_font_size: 0, name_pos_x: 1.25, name_bold: false, safety_margin: 0 })]);
  });

  it.each(['insert', 'update', 'delete'] as const)('preserva rejeição SQL e classifica conexão/cardinalidade/timeout como incertos: %s', async (operation) => {
    const finish = vi.fn(), query = { insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      select: vi.fn(() => operation === 'delete' ? finish() : query), single: finish };
    vi.mocked(supabase.from).mockReturnValue(query as never);
    const run = () => operation === 'insert' ? insertRemoteLabelLayout(model) : operation === 'update' ? updateRemoteLabelLayout('layout-1', model) : deleteRemoteLabelLayout('layout-1');
    const known = { code: '42501', message: 'Denied' };
    finish.mockResolvedValueOnce({ data: null, error: known, status: 403 }); expect((await run()).error).toBe(known);
    const quota = { message: 'Quota exceeded' };
    finish.mockResolvedValueOnce({ data: null, error: quota, status: 402 }); expect((await run()).error).toBe(quota);
    for (const error of [{ message: 'Failed to fetch' }, { code: '40003' }, { code: '08006' }, { code: 'PGRST116' }]) {
      finish.mockResolvedValueOnce({ data: null, error }); expect((await run()).error).toMatchObject({ uncertain: true });
    }
    finish.mockRejectedValueOnce(new TypeError('network')); expect((await run()).error).toMatchObject({ uncertain: true });
    vi.useFakeTimers(); finish.mockImplementationOnce(() => new Promise(() => undefined));
    const pending = run(); await vi.advanceTimersByTimeAsync(20_000);
    expect((await pending).error).toMatchObject({ uncertain: true });
  });

  it('persiste arte e posição do grupo pelas operações remotas correspondentes', async () => {
    const artConfig = { globalSnapshot: { title: 'OFERTA' } };
    const artConfigQuery = { upsert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { layout_id: 'layout-1', category: 'precos', art_config: artConfig }, error: null }) };
    const layoutQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'layout-1', de_price_por_group_pos_x: 20, de_price_por_group_pos_y: 45 }, error: null }),
    };
    vi.mocked(supabase.from)
      .mockReturnValueOnce(artConfigQuery as never)
      .mockReturnValueOnce(layoutQuery as never);

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
