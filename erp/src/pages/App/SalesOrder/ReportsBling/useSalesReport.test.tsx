// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), invoke: vi.fn(), user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  functions: { invoke: mocks.invoke },
  from: (table: string) => {
    let operation = 'read'; let payload: any; const filters: Record<string, unknown> = {};
    const run = () => mocks.query({ table, operation, payload, filters });
    const chain: any = {
      insert: (value: any) => { operation = 'create'; payload = value[0]; return chain; },
      update: (value: any) => { operation = 'update'; payload = value; return chain; },
      delete: () => { operation = 'delete'; return chain; }, select: () => chain,
      eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
      single: run, order: run, then: (yes: any, no: any) => Promise.resolve(run()).then(yes, no),
    }; return chain;
  },
} }));
import { useSalesReport } from './useSalesReport';
const id = '12345678-1234-4123-8123-123456789abc';
const reportData = { results: [], allProducts: [], totalProfit: -12, monthCount: 1, avgProfitPerItem: -12, avgTurnoverPerItem: 0, reportStartDate: null, reportEndDate: null };
const report = (payload: any = {}) => ({ id, name: 'Análise', type: 'abc_curve_bling', source: 'bling', report_data: reportData, config: {}, created_at: '2026-10-16T12:00:00Z', ...payload });
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => {
  vi.resetAllMocks(); mocks.user = { id: 'operator' };
  mocks.query.mockImplementation(async ({ operation, payload }: any) => ({ data: operation === 'read' ? [] : operation === 'delete' ? [{ id }] : report(payload), error: null }));
  mocks.invoke.mockResolvedValue({ data: { data: [] }, error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('Bling report owner', () => {
  it('blocks a blank report name before persistence', async () => {
    const { result } = renderHook(() => useSalesReport()); await act(async () => { await result.current.saveReport('   ', 'bling', {}, reportData); });
    expect(mocks.query).not.toHaveBeenCalled(); expect((result.current as any).error).toMatch(/nome/i);
  });
  it('blocks invalid calculated amounts before persistence', async () => {
    const { result } = renderHook(() => useSalesReport()); await act(async () => { await result.current.saveReport('Análise', 'bling', {}, { ...reportData, totalProfit: NaN }); });
    expect(mocks.query).not.toHaveBeenCalled(); expect((result.current as any).error).toBeTruthy();
  });
  it('does not accept an empty update acknowledgement', async () => {
    mocks.query.mockResolvedValue({ data: [], error: null }); const { result } = renderHook(() => useSalesReport()); let saved: any;
    await act(async () => { saved = await result.current.updateReport(id, 'Análise', 'bling', {}, reportData); });
    expect(saved).toBe(false); expect((result.current as any).error).toBeTruthy();
  });
  it('validates the complete payload, trims names and serializes dates while retaining losses', async () => {
    const { result } = renderHook(() => useSalesReport()); let saved: any;
    await act(async () => { saved = await result.current.saveReport('  Análise  ', 'bling', { profitThreshold: -12, dateRange: { start: '2026-01-01', end: '2026-01-31' } }, { ...reportData, reportStartDate: new Date('2026-01-01T12:00:00Z') }); });
    expect(saved.name).toBe('Análise'); const request = mocks.query.mock.calls.find(([call]) => call.operation === 'create')![0];
    expect(request.payload).toMatchObject({ name: 'Análise', source: 'bling', type: 'abc_curve_bling', config: { profitThreshold: -12 }, report_data: { totalProfit: -12, reportStartDate: '2026-01-01T12:00:00.000Z' } });
    expect(request.payload.id).toMatch(/^[a-f\d-]{36}$/);
  });
  it('blocks unsupported sources and malformed ids before any query', async () => {
    const { result } = renderHook(() => useSalesReport());
    await act(async () => { await result.current.saveReport('Análise', 'csv', {}, reportData); await result.current.updateReport('bad-id', 'Análise', 'bling', {}, reportData); await result.current.deleteReport('bad-id'); await result.current.getReport('bad-id'); });
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('keeps a synchronous write guard until the acknowledgement and list refresh finish', async () => {
    const pending = deferred(); mocks.query.mockImplementation(({ operation }) => operation === 'create' ? pending.promise : Promise.resolve({ data: [], error: null }));
    const { result } = renderHook(() => useSalesReport()); let request!: Promise<any>;
    act(() => { request = result.current.saveReport('Análise', 'bling', {}, reportData); void result.current.saveReport('Análise', 'bling', {}, reportData); void result.current.deleteReport(id); });
    await waitFor(() => expect(mocks.query).toHaveBeenCalledOnce()); expect(result.current.loading).toBe(true);
    const payload = mocks.query.mock.calls[0][0].payload; await act(async () => { pending.resolve({ data: report(payload), error: null }); await request; }); expect(result.current.loading).toBe(false);
  });
  it('retains the create identity when a known backend refusal permits retry', async () => {
    mocks.query.mockResolvedValueOnce({ data: null, error: { code: '23514', message: 'Recusado' } }); const { result } = renderHook(() => useSalesReport());
    await act(async () => { await result.current.saveReport('Análise', 'bling', {}, reportData); }); expect(result.current.error).toBe('Recusado');
    await act(async () => { await result.current.saveReport('Análise', 'bling', {}, reportData); });
    const writes = mocks.query.mock.calls.filter(([call]) => call.operation === 'create'); expect(writes).toHaveLength(2); expect(writes[0][0].payload.id).toBe(writes[1][0].payload.id);
  });
  it('accepts JSONB key reordering but rejects a contradictory receipt', async () => {
    mocks.query.mockImplementationOnce(async ({ payload }) => ({ data: report({ ...payload, config: { profitThreshold: -12, abcBasis: 'profit' } }), error: null }));
    const { result } = renderHook(() => useSalesReport()); let saved: any;
    await act(async () => { saved = await result.current.saveReport('Análise', 'bling', { abcBasis: 'profit', profitThreshold: -12 }, reportData); }); expect(saved).not.toBe(false);
    mocks.query.mockImplementationOnce(async ({ payload }) => ({ data: report({ ...payload, name: 'Outro relatório' }), error: null }));
    await act(async () => { saved = await result.current.saveReport('Análise', 'bling', {}, reportData); }); expect(saved).toBe(false); expect(result.current.error).toMatch(/recibo/);
  });
  it('freezes an uncertain write and permits read-only reconciliation', async () => {
    mocks.query.mockRejectedValueOnce(new Error('Lost response')); const { result } = renderHook(() => useSalesReport());
    await act(async () => { await result.current.saveReport('Análise', 'bling', {}, reportData); });
    await act(async () => { await result.current.saveReport('Outro', 'bling', {}, reportData); await result.current.deleteReport(id); }); expect(mocks.query).toHaveBeenCalledOnce();
    await act(async () => { await result.current.listSavedReports(); }); expect(mocks.query).toHaveBeenCalledTimes(2); expect(mocks.query.mock.calls[1][0].operation).toBe('read');
  });
  it('returns the confirmed report after a list-refresh failure without repeating its mutation', async () => {
    mocks.query.mockImplementation(async ({ operation, payload }) => operation === 'create' ? { data: report(payload), error: null } : { data: null, error: { message: 'Read failed' } });
    const { result } = renderHook(() => useSalesReport()); let saved: any;
    await act(async () => { saved = await result.current.saveReport('Análise', 'bling', {}, reportData); }); expect(saved).toHaveProperty('id'); expect(result.current.error).toMatch(/Relatório salvo/);
    expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'create')).toHaveLength(1);
  });
  it('confirms deletion by the exact returned id and rejects missing acknowledgements', async () => {
    const { result } = renderHook(() => useSalesReport()); let deleted: any;
    await act(async () => { deleted = await result.current.deleteReport(id); }); expect(deleted).toBe(true);
    mocks.query.mockResolvedValueOnce({ data: [], error: null }); await act(async () => { deleted = await result.current.deleteReport(id); }); expect(deleted).toBe(false); expect(result.current.error).toMatch(/exclusão/);
  });
  it('loads stored legacy monthly results without rewriting the report', async () => {
    const oldResult = { product: 'Mesa', supplier: 'Bling API', totalQuantity: 2, totalRevenue: 10, totalProfit: -12, avgCost: 11, accumulatedPercentage: 100, classification: 'C' };
    mocks.query.mockResolvedValue({ data: report({ report_data: { ...reportData, monthCount: 2, results: [oldResult] }, created_at: '2026-10-16T12:00:00+00:00' }), error: null });
    const { result } = renderHook(() => useSalesReport()); let loaded: any; await act(async () => { loaded = await result.current.getReport(id); });
    expect(loaded.report_data.results[0]).toMatchObject({ monthlyProfit: -6, monthlyTurnover: 1 }); expect(mocks.query.mock.calls[0][0].filters).toEqual({ type: 'abc_curve_bling', id });
  });
  it('validates mapping rows and does not silently treat a failed mapping query as an empty mapping', async () => {
    mocks.query.mockResolvedValueOnce({ data: [{ master_name: 'Mesa', reference_name: 'Mesa antiga' }], error: null }).mockResolvedValueOnce({ data: null, error: { message: 'Mappings failed' } });
    const { result } = renderHook(() => useSalesReport()); let loaded: any;
    await act(async () => { loaded = await result.current.getProductMappings(); }); expect(loaded).toEqual({ 'Mesa antiga': 'Mesa' });
    await act(async () => { loaded = await result.current.getProductMappings(); }); expect(loaded).toBe(false); expect(result.current.error).toBe('Mappings failed');
  });
  it('checks authorization before writes while allowing the public read query', async () => {
    const { result } = renderHook(() => useSalesReport(id, true));
    await act(async () => { await result.current.deleteReport(id); }); expect(mocks.query).not.toHaveBeenCalled();
    mocks.query.mockResolvedValue({ data: report(), error: null }); await act(async () => { await result.current.getReport(id); }); expect(mocks.query).toHaveBeenCalledOnce();
  });
  it('does not publish a late query after changing the report or operator', async () => {
    const pending = deferred(); mocks.query.mockReturnValue(pending.promise); const { result, rerender } = renderHook(({ key }) => useSalesReport(key), { initialProps: { key: id } }); let query!: Promise<any>;
    act(() => { query = result.current.listSavedReports(); }); await waitFor(() => expect(mocks.query).toHaveBeenCalledOnce());
    mocks.user = { id: 'another' }; rerender({ key: 'other-report' }); await act(async () => { pending.resolve({ data: [report()], error: null }); expect(await query).toBe(false); }); expect(result.current.savedReports).toEqual([]);
  });
  it('bounds a pending read and releases its loading indicator', async () => {
    vi.useFakeTimers(); mocks.query.mockReturnValue(new Promise(() => {})); const { result } = renderHook(() => useSalesReport()); let query!: Promise<any>;
    await act(async () => { query = result.current.getReport(id); }); await act(async () => { await vi.advanceTimersByTimeAsync(15_001); expect(await query).toBe(false); });
    expect(result.current.loading).toBe(false); expect(result.current.error).toMatch(/prazo/);
  });
  it('bounds a pending mutation and blocks another write after the outcome becomes uncertain', async () => {
    vi.useFakeTimers(); mocks.query.mockReturnValue(new Promise(() => {})); const { result } = renderHook(() => useSalesReport()); let write!: Promise<any>;
    await act(async () => { write = result.current.saveReport('Análise', 'bling', {}, reportData); }); await act(async () => { await vi.advanceTimersByTimeAsync(20_001); expect(await write).toBe(false); });
    expect(result.current.loading).toBe(false); await act(async () => { await result.current.saveReport('Outra', 'bling', {}, reportData); }); expect(mocks.query).toHaveBeenCalledOnce();
  });
  it('does not modify the displayed analysis while preparing an update', () => {
    const { result } = renderHook(() => useSalesReport()); act(() => { result.current.setTotalProfit(77); }); let data: any;
    act(() => { data = result.current.calculateABC([{ date: new Date('2026-01-01'), product: 'Mesa', supplier: 'Bling API', quantity: 2, cost: 3, salesValue: 10, profit: 4 }], 'revenue', true); });
    expect(data.totalProfit).toBe(4); expect(result.current.totalProfit).toBe(77); expect(result.current.rawResults).toEqual([]);
  });
  it('requires the requested report identity in read responses', async () => {
    mocks.query.mockResolvedValue({ data: report({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }), error: null }); const { result } = renderHook(() => useSalesReport());
    await act(async () => { expect(await result.current.getReport(id)).toBe(false); }); expect(result.current.error).toMatch(/não corresponde/);
  });
  it('awaits a complete update receipt and binds the update to its id and module', async () => {
    const { result } = renderHook(() => useSalesReport(id)); let saved: any;
    await act(async () => { saved = await result.current.updateReport(id, '  Atualizado  ', 'bling', { excludedItems: ['Mesa'] }, reportData); });
    expect(saved).toMatchObject({ id, name: 'Atualizado', config: { excludedItems: ['Mesa'] } });
    expect(mocks.query.mock.calls[0][0]).toMatchObject({ operation: 'update', filters: { id, type: 'abc_curve_bling' }, payload: { id, name: 'Atualizado', report_data: reportData } });
  });
  it('does not start a write if its owner unmounts during resolver validation', async () => {
    const { result, unmount } = renderHook(() => useSalesReport()); let write!: Promise<any>;
    act(() => { write = result.current.saveReport('Análise', 'bling', {}, reportData); unmount(); }); await act(async () => { expect(await write).toBe(false); }); expect(mocks.query).not.toHaveBeenCalled();
  });
  it('does not refresh the new scope after the old scope confirms a pending mutation', async () => {
    const pending = deferred(); mocks.query.mockReturnValue(pending.promise); const { result, rerender } = renderHook(({ key }) => useSalesReport(key), { initialProps: { key: id } }); let write!: Promise<any>;
    act(() => { write = result.current.updateReport(id, 'Análise', 'bling', {}, reportData); }); await waitFor(() => expect(mocks.query).toHaveBeenCalledOnce()); rerender({ key: 'another-report' });
    await act(async () => { pending.resolve({ data: report(mocks.query.mock.calls[0][0].payload), error: null }); expect(await write).toBe(false); });
    expect(mocks.query).toHaveBeenCalledOnce(); expect(result.current.savedReports).toEqual([]);
  });
  it('preserves the last confirmed list when a later list response is malformed', async () => {
    mocks.query.mockResolvedValueOnce({ data: [report()], error: null }).mockResolvedValueOnce({ data: null, error: null }); const { result } = renderHook(() => useSalesReport());
    await act(async () => { await result.current.listSavedReports(); }); await act(async () => { expect(await result.current.listSavedReports()).toBe(false); }); expect(result.current.savedReports).toHaveLength(1);
  });
});

describe('Bling import owner', () => {
  const order = { data: '2026-01-02', situacao: { id: 6 }, itens: [{ descricao: 'Mesa', quantidade: '2', valor: '10', custo: '3' }] };
  it('runs the range resolver before invoking the proxy', async () => {
    const { result } = renderHook(() => useSalesReport()); await act(async () => { await expect(result.current.fetchFromBling('2026-02-01', '2026-01-01')).rejects.toThrow(); }); expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('converts the explicit provider fields and preserves the situation filter and financial calculation', async () => {
    mocks.invoke.mockResolvedValue({ data: { data: [order, { ...order, situacao: { id: 1 } }] }, error: null }); const { result } = renderHook(() => useSalesReport()); let items: any;
    await act(async () => { items = await result.current.fetchFromBling('2026-01-01', '2026-01-31'); }); expect(items).toHaveLength(1); expect(items[0]).toMatchObject({ product: 'Mesa', quantity: 2, cost: 3, salesValue: 20, profit: 14 });
    expect(mocks.invoke.mock.calls[0][1].body.params).toMatchObject({ pagina: 1, limite: 100, dataInicial: '2026-01-01', dataFinal: '2026-01-31' });
  });
  it('does not return partial results after a later page fails', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { data: Array(100).fill(order) }, error: null }).mockResolvedValueOnce({ data: null, error: { message: 'Page failed' } });
    const { result } = renderHook(() => useSalesReport()); await act(async () => { await expect(result.current.fetchFromBling()).rejects.toThrow('Page failed'); }); expect(mocks.invoke).toHaveBeenCalledTimes(2); expect(mocks.query).not.toHaveBeenCalled();
  });
  it('rejects a malformed page instead of converting bad amounts to zero', async () => {
    mocks.invoke.mockResolvedValue({ data: { data: [{ ...order, itens: [{ ...order.itens[0], custo: 'not-a-number' }] }] }, error: null });
    const { result } = renderHook(() => useSalesReport()); await act(async () => { await expect(result.current.fetchFromBling()).rejects.toThrow(/página inválida/); });
  });
  it('reports the pagination ceiling instead of silently saving the first 5000 orders', async () => {
    mocks.invoke.mockResolvedValue({ data: { data: Array(100).fill(order) }, error: null }); const { result } = renderHook(() => useSalesReport());
    await act(async () => { await expect(result.current.fetchFromBling()).rejects.toThrow(/limite de páginas/); }); expect(mocks.invoke).toHaveBeenCalledTimes(50);
  });
  it('bounds a stalled provider page', async () => {
    vi.useFakeTimers(); mocks.invoke.mockReturnValue(new Promise(() => {})); const { result } = renderHook(() => useSalesReport()); let caught: any; let query!: Promise<any>;
    await act(async () => { query = result.current.fetchFromBling().catch(failure => { caught = failure; }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(15_001); await query; }); expect(caught.message).toMatch(/prazo/); expect(result.current.loading).toBe(false);
  });
  it('ignores a late provider page after context changes and does not fetch the next one', async () => {
    const pending = deferred(); mocks.invoke.mockReturnValue(pending.promise); const { result, rerender } = renderHook(({ key }) => useSalesReport(key), { initialProps: { key: 'one' } }); let query!: Promise<any>;
    act(() => { query = result.current.fetchFromBling().catch(() => false); }); await waitFor(() => expect(mocks.invoke).toHaveBeenCalledOnce()); rerender({ key: 'two' });
    await act(async () => { pending.resolve({ data: { data: Array(100).fill(order) }, error: null }); expect(await query).toBe(false); }); expect(mocks.invoke).toHaveBeenCalledOnce();
  });
  it('enforces the total import deadline even if individual pages are returned before their own timeout', async () => {
    vi.useFakeTimers(); mocks.invoke.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { data: Array(100).fill(order) }, error: null }), 10_000)));
    const { result } = renderHook(() => useSalesReport()); let caught: any; let query!: Promise<any>;
    await act(async () => { query = result.current.fetchFromBling().catch(error => { caught = error; }); }); await act(async () => { await vi.advanceTimersByTimeAsync(90_001); await query; });
    expect(caught.message).toMatch(/prazo/); expect(mocks.invoke).toHaveBeenCalledTimes(9); expect(result.current.loading).toBe(false);
  });
});
