import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import { persistPriceLabelArtwork, updateRemoteLabelLayoutArtwork, upsertRemoteLabelArtConfig } from '../services/labelLayoutService';
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn() } }));
const id = '00000000-0000-4000-8000-000000000001';
const art = { globalSnapshot: { title: 'ARTE', scaleTens: 0, metadata: { enabled: false, empty: null } } };
const updated = { artConfig: art, dePricePorGroupPos: { x: 0, y: -1.5 }, dePricePorGroupRotation: 0, dePricePorGroupGap: 0 };
type Response = { data: unknown; error: unknown; status?: number };
const finish = vi.fn<(payload: Record<string, unknown>, target: string, table: string) => Promise<Response>>();
beforeEach(() => {
  vi.clearAllMocks(); finish.mockReset().mockImplementation(async (payload, target, table) => ({ data: { ...payload, ...(table === 'label_layouts' ? { id: target } : {}) }, error: null }));
  vi.mocked(supabase.from).mockImplementation((table) => {
    let payload: Record<string, unknown> = {}, target = '';
    const query = { upsert: (values: Record<string, unknown>) => { payload = values; return query; }, update: (values: Record<string, unknown>) => { payload = values; return query; }, eq: (_field: string, value: string) => { target = value; return query; }, select: () => query, single: () => finish(payload, target, table) };
    return query as never;
  });
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('gravações de arte com confirmação de conteúdo', () => {
  it('valida ambos comandos antes da rede e não confirma operações vazias', async () => {
    expect((await upsertRemoteLabelArtConfig({ layoutId: '', category: 'precos', artConfig: art })).error).toBeTruthy();
    expect((await upsertRemoteLabelArtConfig({ layoutId: id, category: 'inválida', artConfig: art })).error).toBeTruthy();
    expect((await updateRemoteLabelLayoutArtwork(id, {})).error).toBeTruthy();
    expect((await updateRemoteLabelLayoutArtwork(id, { de_price_por_group_gap: NaN })).error).toBeTruthy();
    await expect(persistPriceLabelArtwork({ layoutId: id, updated: {} })).rejects.toThrow();
    await expect(persistPriceLabelArtwork({ layoutId: 'default', updated: { dePricePorGroupPos: { x: 0, y: 0 } } })).rejects.toThrow('arte completa');
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it('confirma ID/categoria/JSON reordenado, zeros e frações nos dois passos', async () => {
    finish.mockImplementationOnce(async (payload) => ({ data: { ...payload, art_config: { globalSnapshot: { metadata: { empty: null, enabled: false }, scaleTens: 0, title: 'ARTE' } } }, error: null }));
    expect(await persistPriceLabelArtwork({ layoutId: ` ${id} `, category: 'precos', updated })).toBe(true);
    expect(finish).toHaveBeenCalledTimes(2);
    expect(finish.mock.calls[0][0]).toMatchObject({ layout_id: id, category: 'precos', art_config: art });
    expect(finish.mock.calls[1]).toEqual([expect.objectContaining({ art_config: art, de_price_por_group_pos_x: 0, de_price_por_group_pos_y: -1.5, de_price_por_group_rotation: 0, de_price_por_group_gap: 0 }), id, 'label_layouts']);
  });
  it.each(['id', 'category', 'art', 'missing'])('não aceita ACK de arte divergente: %s', async (kind) => {
    finish.mockImplementationOnce(async (payload) => ({ data: kind === 'missing' ? null : { ...payload, ...(kind === 'id' ? { layout_id: 'other' } : kind === 'category' ? { category: 'posts' } : { art_config: {} }) }, error: null }));
    expect((await upsertRemoteLabelArtConfig({ layoutId: id, category: 'precos', artConfig: art })).error).toMatchObject({ uncertain: true });
  });
  it.each(['id', 'position', 'missing'])('não aceita ACK de modelo divergente: %s', async (kind) => {
    finish.mockImplementationOnce(async (payload, target) => ({ data: kind === 'missing' ? null : { ...payload, id: kind === 'id' ? 'other' : target, ...(kind === 'position' ? { de_price_por_group_pos_x: 1 } : {}) }, error: null }));
    expect((await updateRemoteLabelLayoutArtwork(id, { de_price_por_group_pos_x: 0 })).error).toMatchObject({ uncertain: true });
  });
  it('mantém rejeição SQL conhecida e bloqueia segundo passo após resposta incerta', async () => {
    const error = { code: '42501', message: 'Denied' }; finish.mockResolvedValueOnce({ data: null, error });
    expect((await upsertRemoteLabelArtConfig({ layoutId: id, category: 'precos', artConfig: art })).error).toBe(error);
    finish.mockResolvedValueOnce({ data: null, error: { code: '08006' } });
    await expect(persistPriceLabelArtwork({ layoutId: id, updated })).rejects.toMatchObject({ uncertain: true }); expect(finish).toHaveBeenCalledTimes(2);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
  it.each([false, true])('informa conclusão parcial e conserva a classificação incerta %s do segundo passo', async (uncertain) => {
    finish.mockImplementationOnce(async (payload) => ({ data: payload, error: null }));
    finish.mockResolvedValueOnce({ data: null, error: { code: uncertain ? '08006' : '42501' } });
    await expect(persistPriceLabelArtwork({ layoutId: id, updated })).rejects.toMatchObject({ partial: true, uncertain });
    expect(finish).toHaveBeenCalledTimes(2);
  });
  it('não começa com proprietário antigo nem envia segundo passo após mudar contexto', async () => {
    expect(await persistPriceLabelArtwork({ layoutId: id, updated, isCurrent: () => false })).toBe(false); expect(finish).not.toHaveBeenCalled();
    let current = true; finish.mockImplementationOnce(async (payload) => { current = false; return { data: payload, error: null }; });
    await expect(persistPriceLabelArtwork({ layoutId: id, updated, isCurrent: () => current })).rejects.toMatchObject({ requiresRefresh: true });
    expect(finish).toHaveBeenCalledTimes(1);
  });
  it('limita espera a 20s sem executar o segundo passo nem confirmar sucesso tardio', async () => {
    vi.useFakeTimers(); let resolve!: (value: Response) => void; finish.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const pending = persistPriceLabelArtwork({ layoutId: id, updated }); const check = expect(pending).rejects.toMatchObject({ uncertain: true });
    await vi.advanceTimersByTimeAsync(20_000); await check; resolve({ data: finish.mock.calls[0][0], error: null }); await Promise.resolve();
    expect(finish).toHaveBeenCalledTimes(1);
  });
});
