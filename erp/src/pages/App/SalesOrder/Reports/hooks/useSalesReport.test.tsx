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
vi.mock('../services/salesReportApiService', () => ({ fetchFromERP: vi.fn() }));
import { fetchFromERP } from '../services/salesReportApiService';
import { useSalesReport } from './useSalesReport';
const id = '12345678-1234-4123-8123-123456789abc';
const reportData = { results: [], allProducts: [], totalProfit: -12, monthCount: 1, avgProfitPerItem: -12, avgTurnoverPerItem: 0, reportStartDate: null, reportEndDate: null };
const report = (payload: any = {}) => ({ id, name: 'Análise', type: 'abc_curve', source: 'erp', report_data: reportData, config: {}, created_at: '2026-10-16T12:00:00Z', ...payload });
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => {
  vi.resetAllMocks(); mocks.user = { id: 'operator' };
  mocks.query.mockImplementation(async ({ operation, payload }: any) => ({ data: operation === 'read' ? [] : operation === 'delete' ? [{ id }] : report(payload), error: null }));
  mocks.invoke.mockResolvedValue({ data: { data: [] }, error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('ERP report owner', () => {
  it('blocks a blank report name before persistence', async () => {
    const { result } = renderHook(() => useSalesReport()); await act(async () => { await result.current.saveReport('   ', 'erp', {}, reportData); });
    expect(mocks.query).not.toHaveBeenCalled(); expect((result.current as any).error).toMatch(/nome/i);
  });
  it('blocks invalid calculated amounts before persistence', async () => {
    const { result } = renderHook(() => useSalesReport()); await act(async () => { await result.current.saveReport('Análise', 'erp', {}, { ...reportData, totalProfit: NaN }); });
    expect(mocks.query).not.toHaveBeenCalled(); expect((result.current as any).error).toBeTruthy();
  });
  it('does not accept an empty update acknowledgement', async () => {
    mocks.query.mockResolvedValue({ data: [], error: null }); const { result } = renderHook(() => useSalesReport()); let saved: any;
    await act(async () => { saved = await result.current.updateReport(id, 'Análise', 'erp', {}, reportData); });
    expect(saved).toBe(false); expect((result.current as any).error).toBeTruthy();
  });
  it('validates the complete payload, trims names and serializes dates while retaining losses', async () => {
    const { result } = renderHook(() => useSalesReport()); let saved: any;
    await act(async () => { saved = await result.current.saveReport('  Análise  ', 'erp', { profitThreshold: -12, dateRange: { start: '2026-01-01', end: '2026-01-31' } }, { ...reportData, reportStartDate: new Date('2026-01-01T12:00:00Z') }); });
    expect(saved.name).toBe('Análise'); const request = mocks.query.mock.calls.find(([call]) => call.operation === 'create')![0];
    expect(request.payload).toMatchObject({ name: 'Análise', source: 'erp', type: 'abc_curve', config: { profitThreshold: -12 }, report_data: { totalProfit: -12, reportStartDate: '2026-01-01T12:00:00.000Z' } });
    expect(request.payload.id).toMatch(/^[a-f\d-]{36}$/);
  });
  it('blocks unsupported sources and malformed ids before any query', async () => {
    const { result } = renderHook(() => useSalesReport());
    await act(async () => { await result.current.saveReport('Análise', 'unsupported', {}, reportData); await result.current.updateReport('bad-id', 'Análise', 'erp', {}, reportData); await result.current.deleteReport('bad-id'); await result.current.getReport('bad-id'); });
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('keeps a synchronous write guard until the acknowledgement and list refresh finish', async () => {
    const pending = deferred(); mocks.query.mockImplementation(({ operation }) => operation === 'create' ? pending.promise : Promise.resolve({ data: [], error: null }));
    const { result } = renderHook(() => useSalesReport()); let request!: Promise<any>;
    act(() => { request = result.current.saveReport('Análise', 'erp', {}, reportData); void result.current.saveReport('Análise', 'erp', {}, reportData); void result.current.deleteReport(id); });
    await waitFor(() => expect(mocks.query).toHaveBeenCalledOnce()); expect(result.current.loading).toBe(true);
    const payload = mocks.query.mock.calls[0][0].payload; await act(async () => { pending.resolve({ data: report(payload), error: null }); await request; }); expect(result.current.loading).toBe(false);
  });
  it('retains the create identity when a known backend refusal permits retry', async () => {
    mocks.query.mockResolvedValueOnce({ data: null, error: { code: '23514', message: 'Recusado' } }); const { result } = renderHook(() => useSalesReport());
    await act(async () => { await result.current.saveReport('Análise', 'erp', {}, reportData); }); expect(result.current.error).toBe('Recusado');
    await act(async () => { await result.current.saveReport('Análise', 'erp', {}, reportData); });
    const writes = mocks.query.mock.calls.filter(([call]) => call.operation === 'create'); expect(writes).toHaveLength(2); expect(writes[0][0].payload.id).toBe(writes[1][0].payload.id);
  });
  it('accepts JSONB key reordering but rejects a contradictory receipt', async () => {
    mocks.query.mockImplementationOnce(async ({ payload }) => ({ data: report({ ...payload, config: { profitThreshold: -12, abcBasis: 'profit' } }), error: null }));
    const { result } = renderHook(() => useSalesReport()); let saved: any;
    await act(async () => { saved = await result.current.saveReport('Análise', 'erp', { abcBasis: 'profit', profitThreshold: -12 }, reportData); }); expect(saved).not.toBe(false);
    mocks.query.mockImplementationOnce(async ({ payload }) => ({ data: report({ ...payload, name: 'Outro relatório' }), error: null }));
    await act(async () => { saved = await result.current.saveReport('Análise', 'erp', {}, reportData); }); expect(saved).toBe(false); expect(result.current.error).toMatch(/recibo/);
  });
  it('freezes an uncertain write and permits read-only reconciliation', async () => {
    mocks.query.mockRejectedValueOnce(new Error('Lost response')); const { result } = renderHook(() => useSalesReport());
    await act(async () => { await result.current.saveReport('Análise', 'erp', {}, reportData); });
    await act(async () => { await result.current.saveReport('Outro', 'erp', {}, reportData); await result.current.deleteReport(id); }); expect(mocks.query).toHaveBeenCalledOnce();
    await act(async () => { await result.current.listSavedReports(); }); expect(mocks.query).toHaveBeenCalledTimes(2); expect(mocks.query.mock.calls[1][0].operation).toBe('read');
  });
  it('returns the confirmed report after a list-refresh failure without repeating its mutation', async () => {
    mocks.query.mockImplementation(async ({ operation, payload }) => operation === 'create' ? { data: report(payload), error: null } : { data: null, error: { message: 'Read failed' } });
    const { result } = renderHook(() => useSalesReport()); let saved: any;
    await act(async () => { saved = await result.current.saveReport('Análise', 'erp', {}, reportData); }); expect(saved).toHaveProperty('id'); expect(result.current.error).toMatch(/Relatório salvo/);
    expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'create')).toHaveLength(1);
  });
  it('confirms deletion by the exact returned id and rejects missing acknowledgements', async () => {
    const { result } = renderHook(() => useSalesReport()); let deleted: any;
    await act(async () => { deleted = await result.current.deleteReport(id); }); expect(deleted).toBe(true);
    mocks.query.mockResolvedValueOnce({ data: [], error: null }); await act(async () => { deleted = await result.current.deleteReport(id); }); expect(deleted).toBe(false); expect(result.current.error).toMatch(/exclusão/);
  });
  it('loads stored legacy monthly results without rewriting the report', async () => {
    const oldResult = { product: 'Mesa', supplier: 'Fornecedor API', totalQuantity: 2, totalRevenue: 10, totalProfit: -12, avgCost: 11, accumulatedPercentage: 100, classification: 'C' };
    mocks.query.mockResolvedValue({ data: report({ report_data: { ...reportData, monthCount: 2, results: [oldResult] }, created_at: '2026-10-16T12:00:00+00:00' }), error: null });
    const { result } = renderHook(() => useSalesReport()); let loaded: any; await act(async () => { loaded = await result.current.getReport(id); });
    expect(loaded.report_data.results[0]).toMatchObject({ monthlyProfit: -6, monthlyTurnover: 1 }); expect(mocks.query.mock.calls[0][0].filters).toEqual({ type: 'abc_curve', id });
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
    await act(async () => { write = result.current.saveReport('Análise', 'erp', {}, reportData); }); await act(async () => { await vi.advanceTimersByTimeAsync(20_001); expect(await write).toBe(false); });
    expect(result.current.loading).toBe(false); await act(async () => { await result.current.saveReport('Outra', 'erp', {}, reportData); }); expect(mocks.query).toHaveBeenCalledOnce();
  });
  it('does not modify the displayed analysis while preparing an update', () => {
    const { result } = renderHook(() => useSalesReport()); act(() => { result.current.setTotalProfit(77); }); let data: any;
    act(() => { data = result.current.calculateABC([{ date: new Date('2026-01-01'), product: 'Mesa', supplier: 'Fornecedor API', quantity: 2, cost: 3, salesValue: 10, profit: 4 }], 'revenue', true); });
    expect(data.totalProfit).toBe(4); expect(result.current.totalProfit).toBe(77); expect(result.current.rawResults).toEqual([]);
  });
  it('requires the requested report identity in read responses', async () => {
    mocks.query.mockResolvedValue({ data: report({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }), error: null }); const { result } = renderHook(() => useSalesReport());
    await act(async () => { expect(await result.current.getReport(id)).toBe(false); }); expect(result.current.error).toMatch(/não corresponde/);
  });
  it('awaits a complete update receipt and binds the update to its id and module', async () => {
    const { result } = renderHook(() => useSalesReport(id)); let saved: any;
    await act(async () => { saved = await result.current.updateReport(id, '  Atualizado  ', 'erp', { excludedItems: ['Mesa'] }, reportData); });
    expect(saved).toMatchObject({ id, name: 'Atualizado', config: { excludedItems: ['Mesa'] } });
    expect(mocks.query.mock.calls[0][0]).toMatchObject({ operation: 'update', filters: { id, type: 'abc_curve' }, payload: { id, name: 'Atualizado', report_data: reportData } });
  });
  it('does not start a write if its owner unmounts during resolver validation', async () => {
    const { result, unmount } = renderHook(() => useSalesReport()); let write!: Promise<any>;
    act(() => { write = result.current.saveReport('Análise', 'erp', {}, reportData); unmount(); }); await act(async () => { expect(await write).toBe(false); }); expect(mocks.query).not.toHaveBeenCalled();
  });
  it('does not refresh the new scope after the old scope confirms a pending mutation', async () => {
    const pending = deferred(); mocks.query.mockReturnValue(pending.promise); const { result, rerender } = renderHook(({ key }) => useSalesReport(key), { initialProps: { key: id } }); let write!: Promise<any>;
    act(() => { write = result.current.updateReport(id, 'Análise', 'erp', {}, reportData); }); await waitFor(() => expect(mocks.query).toHaveBeenCalledOnce()); rerender({ key: 'another-report' });
    await act(async () => { pending.resolve({ data: report(mocks.query.mock.calls[0][0].payload), error: null }); expect(await write).toBe(false); });
    expect(mocks.query).toHaveBeenCalledOnce(); expect(result.current.savedReports).toEqual([]);
  });
  it('preserves the last confirmed list when a later list response is malformed', async () => {
    mocks.query.mockResolvedValueOnce({ data: [report()], error: null }).mockResolvedValueOnce({ data: null, error: null }); const { result } = renderHook(() => useSalesReport());
    await act(async () => { await result.current.listSavedReports(); }); await act(async () => { expect(await result.current.listSavedReports()).toBe(false); }); expect(result.current.savedReports).toHaveLength(1);
  });
  it('validates config autosave without requiring or overwriting legacy analysis data', async () => {
    const config = { filters: { suppliers: ['Fornecedor'], minProfit: -4, maxProfit: 0, search: 'Mesa' }, excludedItems: ['Antigo'] };
    mocks.query.mockImplementation(async ({ payload }) => ({ data: report({ config: payload.config, report_data: { ...reportData, allProducts: ['Mesa'] } }), error: null }));
    const { result } = renderHook(() => useSalesReport(id)); let saved: any;
    await act(async () => { saved = await result.current.saveReportConfig(id, config); });
    expect(saved.config).toEqual(config); expect(mocks.query.mock.calls[0][0].payload).not.toHaveProperty('report_data'); expect(mocks.query).toHaveBeenCalledOnce();
  });
  it('blocks malformed config before autosave', async () => {
    const { result } = renderHook(() => useSalesReport(id));
    await act(async () => { expect(await result.current.saveReportConfig(id, { filters: { minProfit: NaN } })).toBe(false); }); expect(mocks.query).not.toHaveBeenCalled();
  });
  it('serializes autosave snapshots and does not start one whose context expired in the queue', async () => {
    const pending = deferred(); let current = true;
    mocks.query.mockImplementation(({ payload }) => payload.config.filters.search === 'one' ? pending.promise : Promise.resolve({ data: report(payload), error: null }));
    const { result } = renderHook(() => useSalesReport(id)); let first!: Promise<any>; let second!: Promise<any>;
    act(() => { first = result.current.saveReportConfig(id, { filters: { search: 'one' } }); second = result.current.saveReportConfig(id, { filters: { search: 'two' } }, () => current); });
    await waitFor(() => expect(mocks.query).toHaveBeenCalledOnce()); current = false;
    await act(async () => { pending.resolve({ data: report({ config: { filters: { search: 'one' } } }), error: null }); await first; expect(await second).toBe(false); }); expect(mocks.query).toHaveBeenCalledOnce();
  });
  it('freezes the queued next autosave after an unconfirmed receipt', async () => {
    mocks.query.mockResolvedValue({ data: null, error: null }); const { result } = renderHook(() => useSalesReport(id));
    await act(async () => { await Promise.all([result.current.saveReportConfig(id, { filters: { search: 'one' } }), result.current.saveReportConfig(id, { filters: { search: 'two' } })]); });
    expect(mocks.query).toHaveBeenCalledOnce(); expect(result.current.error).toMatch(/sem confirmação/);
  });
  it('validates ERP item loading and does not apply a stale response', async () => {
    const items = [{ date: new Date('2026-01-02'), product: 'Mesa', supplier: 'Fornecedor', quantity: 2, cost: 3, salesValue: 20, profit: 14 }];
    vi.mocked(fetchFromERP).mockResolvedValueOnce(items); const { result, rerender } = renderHook(({ key }) => useSalesReport(key), { initialProps: { key: id } });
    await act(async () => { expect(await result.current.fetchReportItems()).toEqual(items); }); expect(result.current.rawResults).toEqual([]);
    const pending = deferred(); vi.mocked(fetchFromERP).mockReturnValue(pending.promise); let load!: Promise<any>;
    act(() => { load = result.current.loadFromERP({}, {}); }); await waitFor(() => expect(fetchFromERP).toHaveBeenCalledTimes(2)); rerender({ key: 'other' });
    await act(async () => { pending.resolve(items); expect(await load).toBe(false); }); expect(result.current.rawResults).toEqual([]);
  });
  it('blocks invalid config before ERP loading and malformed returned items before applying them', async () => {
    const { result } = renderHook(() => useSalesReport(id));
    await act(async () => { expect(await result.current.fetchReportItems({ profitThreshold: Infinity })).toBe(false); }); expect(fetchFromERP).not.toHaveBeenCalled();
    vi.mocked(fetchFromERP).mockResolvedValue([{ date: new Date('bad'), product: 'Mesa', supplier: 'Fornecedor', quantity: 1, salesValue: NaN }] as any);
    await act(async () => { expect(await result.current.loadFromERP({}, {})).toBe(false); }); expect(result.current.rawResults).toEqual([]);
  });
});

