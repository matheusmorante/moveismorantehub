// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), invoke: vi.fn(), navigate: vi.fn(), setParams: vi.fn(), search: null as any, id: undefined as string | undefined, user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate, useParams: () => ({ id: mocks.id }), useLocation: () => ({ pathname: '/sales-order/reports-bling', search: '' }),
  useSearchParams: () => [mocks.search, mocks.setParams], Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  functions: { invoke: mocks.invoke }, from: (table: string) => {
    let operation = 'read'; let payload: any; const filters: Record<string, unknown> = {};
    const run = () => mocks.query({ table, operation, payload, filters });
    const chain: any = {
      insert: (value: any) => { operation = 'create'; payload = value[0]; return chain; }, update: (value: any) => { operation = 'update'; payload = value; return chain; },
      delete: () => { operation = 'delete'; return chain; }, select: () => chain, eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
      single: run, order: run, then: (yes: any, no: any) => Promise.resolve(run()).then(yes, no),
    }; return chain;
  },
} }));
vi.mock('recharts', () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>; const Empty = () => null;
  return { XAxis: Empty, YAxis: Empty, CartesianGrid: Empty, Tooltip: Empty, ResponsiveContainer: Wrapper, Line: Empty, ComposedChart: Wrapper, Bar: Empty, Cell: Empty, ScatterChart: Wrapper, Scatter: Empty, ReferenceLine: Empty, Area: Empty };
});
vi.mock('../Reports/components/SupplierPerformanceView', () => ({ default: () => <p>Análise de fornecedores</p> }));
import SalesOrderReportsBling from './Index';
import ReportViewBling from './ReportView';
const id = '12345678-1234-4123-8123-123456789abc';
const row = { product: 'Mesa', supplier: 'Bling API', totalQuantity: 2, totalRevenue: 20, totalProfit: 14, avgCost: 3, accumulatedPercentage: 100, classification: 'C', monthlyProfit: 14, monthlyTurnover: 2 };
const report = (payload: any = {}) => ({ id, name: 'Análise salva', type: 'abc_curve_bling', source: 'bling', config: {}, report_data: { results: [row], allProducts: [], totalProfit: 14, monthCount: 1, avgProfitPerItem: 14, avgTurnoverPerItem: 2, reportStartDate: null, reportEndDate: null }, created_at: '2026-10-16T12:00:00Z', ...payload });
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => {
  vi.resetAllMocks(); mocks.id = undefined; mocks.user = { id: 'operator' }; mocks.search = new URLSearchParams();
  mocks.query.mockImplementation(async ({ operation, payload, table, filters }) => ({ data: operation === 'create' || operation === 'update' ? report(payload) : operation === 'delete' ? [{ id }] : table === 'product_references' ? [] : filters.id ? report() : [], error: null }));
  mocks.invoke.mockResolvedValue({ data: { data: [{ data: '2026-01-02', situacao: { id: 6 }, itens: [{ descricao: 'Mesa', quantidade: '2', valor: '10', custo: '3' }] }] }, error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const loaded = () => waitFor(() => expect(screen.getByRole('button', { name: /Sincronizar e Gerar/ })).toHaveProperty('disabled', false));
const create = async () => { await loaded(); fireEvent.click(screen.getByRole('button', { name: /Sincronizar e Gerar/ })); };
describe('Bling report page composition', () => {
  it('runs the real date resolver and does not query or navigate with an inverted range', async () => {
    render(<SalesOrderReportsBling />); await loaded(); fireEvent.change(screen.getByLabelText('Início do período'), { target: { value: '2026-10-16' } });
    await create(); await screen.findByRole('alert'); expect(mocks.invoke).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it('keeps the active submission until a matching save receipt and refresh are confirmed', async () => {
    const pending = deferred(); mocks.query.mockImplementation(({ operation }) => operation === 'create' ? pending.promise : Promise.resolve({ data: [], error: null }));
    render(<SalesOrderReportsBling />); await create(); await waitFor(() => expect(mocks.query.mock.calls.some(([call]) => call.operation === 'create')).toBe(true));
    expect(mocks.navigate).not.toHaveBeenCalled(); expect(screen.getByLabelText('Início do período')).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: /Sincronizar e Gerar/ })); expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'create')).toHaveLength(1);
    const payload = mocks.query.mock.calls.find(([call]) => call.operation === 'create')![0].payload;
    expect(payload.name).toBe('Análise Bling 07/25 - 03/26');
    expect(payload.config).toMatchObject({ dateRange: { start: '2025-07-01', end: '2026-03-31' } }); expect(payload.report_data.results[0]).toMatchObject({ totalProfit: 14, totalRevenue: 20 });
    await act(async () => { pending.resolve({ data: report(payload), error: null }); }); await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(`/sales-order/reports-bling/${payload.id}`));
  });
  it('does not save or navigate when the provider fails after starting generation', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: 'Bling indisponível' } }); render(<SalesOrderReportsBling />); await create();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Bling indisponível/); expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.query.mock.calls.some(([call]) => call.operation === 'create')).toBe(false);
    expect(screen.getByLabelText('Início do período')).toHaveProperty('value', '2025-07-01');
  });
  it('does not navigate on a contradictory receipt or retry the uncertain insert', async () => {
    mocks.query.mockImplementation(async ({ operation, payload }) => ({ data: operation === 'create' ? report({ ...payload, name: 'Outro' }) : [], error: null }));
    render(<SalesOrderReportsBling />); await create(); await screen.findByRole('alert'); expect(mocks.navigate).not.toHaveBeenCalled();
    await create(); await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/sem confirmação/)); expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'create')).toHaveLength(1);
  });
  it('uses a confirmed receipt for navigation even if only the list refresh fails', async () => {
    let created = false;
    mocks.query.mockImplementation(async ({ operation, payload }) => {
      if (operation === 'create') { created = true; return { data: report(payload), error: null }; }
      return created ? { data: null, error: { message: 'Refresh failed' } } : { data: [], error: null };
    });
    render(<SalesOrderReportsBling />); await create(); await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce()); expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'create')).toHaveLength(1);
  });
  it('waits for a confirmed deletion from the real menu and keeps failures visible', async () => {
    mocks.query.mockResolvedValue({ data: [report()], error: null }); vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SalesOrderReportsBling />); await screen.findByRole('button', { name: 'Ações do relatório Análise salva' });
    fireEvent.click(screen.getByRole('button', { name: 'Ações do relatório Análise salva' })); mocks.query.mockResolvedValueOnce({ data: [], error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Lixeira' })); await screen.findByRole('alert'); expect(screen.getByText('Análise salva')).toBeTruthy();
  });
  it('ignores provider results after changing the authenticated operator', async () => {
    const pending = deferred(); mocks.invoke.mockReturnValue(pending.promise); const view = render(<SalesOrderReportsBling />); await create();
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledOnce()); mocks.user = { id: 'other' }; view.rerender(<SalesOrderReportsBling />);
    await act(async () => { pending.resolve({ data: { data: [] }, error: null }); }); expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.query.mock.calls.some(([call]) => call.operation === 'create')).toBe(false);
  });
  it('loads the real report query and resolver-backed URL view without rewriting the stored report', async () => {
    mocks.id = id; render(<ReportViewBling />); await screen.findByText('Análise salva'); await screen.findByText('Mesa');
    expect(mocks.setParams).toHaveBeenCalledWith(expect.objectContaining({ sortD: 'asc' }), { replace: true }); expect(mocks.query.mock.calls.some(([call]) => call.operation !== 'read')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Fornecedores' })); await screen.findByText('Análise de fornecedores');
  });
  it('keeps a failed read visible and retries only the query', async () => {
    mocks.id = id; let failed = false;
    mocks.query.mockImplementation(async ({ table, filters }) => {
      if (table === 'product_references') return { data: [], error: null };
      if (filters.id && !failed) { failed = true; return { data: null, error: { message: 'Leitura falhou' } }; }
      return { data: report(), error: null };
    });
    render(<ReportViewBling />); await screen.findByRole('alert'); expect(mocks.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Carregar novamente' })); await screen.findByText('Análise salva'); expect(screen.queryByRole('alert')).toBeNull(); expect(mocks.query.mock.calls.every(([call]) => call.operation === 'read')).toBe(true);
  });
});
