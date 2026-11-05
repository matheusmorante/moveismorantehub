import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), select: vi.fn(), in: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
import { fetchAssemblyOrderRows } from './assemblyOrderListService';

describe('montagens filtradas no servidor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ in: mocks.in });
  });
  it('carrega todos os resultados do escopo em lotes sem recortar a agenda', async () => {
    const ids = Array.from({ length: 100 }, (_, index) => `matched-${index}`);
    mocks.rpc.mockResolvedValueOnce({ data: { ids, total: 101 }, error: null })
      .mockResolvedValueOnce({ data: [...ids].reverse().map((id) => ({ id, __orderSummary: true, order_data: { __orderSummary: true }, items: [{ description: 'Mesa', quantity: 1 }] })), error: null })
      .mockResolvedValueOnce({ data: { ids: ['older'], total: 101 }, error: null })
      .mockResolvedValueOnce({ data: [{ id: 'older', __orderSummary: true }], error: null });
    mocks.in.mockResolvedValueOnce({ data: [...ids].reverse().map((id) => ({ id })), error: null })
      .mockResolvedValueOnce({ data: [{ id: 'older' }], error: null });
    const filters = { search: 'ana florenca', location: 'internal', startDate: '2026-11-04' };
    const rows = await fetchAssemblyOrderRows(filters);
    expect(rows.map((row) => row.id)).toEqual([...ids, 'older']);
    expect(mocks.rpc).toHaveBeenCalledWith('list_order_schedule_ids', {
      p_scope: 'assembly_web', p_filters: filters, p_page: 1, p_page_size: 100,
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith('read_order_summaries', { p_ids: ['older'] });
    expect(rows[0].order_data.items[0].description).toBe('Mesa');
  });
  it('não baixa candidatos quando o servidor retorna vazio', async () => {
    mocks.rpc.mockResolvedValue({ data: { ids: [], total: 0 }, error: null });
    expect(await fetchAssemblyOrderRows()).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('propaga falhas e recusa resultados repetidos durante uma carga', async () => {
    const error = new Error('indisponível');
    mocks.rpc.mockResolvedValueOnce({ data: null, error });
    await expect(fetchAssemblyOrderRows()).rejects.toBe(error);
    const ids = Array.from({ length: 100 }, (_, index) => `matched-${index}`);
    mocks.rpc.mockResolvedValueOnce({ data: { ids, total: 101 }, error: null })
      .mockResolvedValueOnce({ data: ids.map((id) => ({ id, __orderSummary: true })), error: null })
      .mockResolvedValueOnce({ data: { ids: [ids[0]], total: 101 }, error: null });
    mocks.in.mockResolvedValueOnce({ data: ids.map((id) => ({ id })), error: null });
    await expect(fetchAssemblyOrderRows()).rejects.toThrow('A agenda mudou');
  });
});
