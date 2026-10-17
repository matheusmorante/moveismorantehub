// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), invoke: vi.fn(), navigate: vi.fn(), setParams: vi.fn(), search: null as any, id: undefined as string | undefined, path: '/sales-order/reports', user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate, useParams: () => ({ id: mocks.id }), useLocation: () => ({ pathname: mocks.path, search: '' }),
  useSearchParams: () => [mocks.search, mocks.setParams], Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));
vi.mock('./services/salesReportApiService', () => ({ fetchFromERP: vi.fn(async () => [{ date: new Date('2026-01-02T12:00:00Z'), product: 'Mesa', supplier: 'Bling API', quantity: 2, cost: 3, salesValue: 20, profit: 14 }]) }));
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
vi.mock('./components/SupplierPerformanceView', () => ({ default: () => <p>Análise de fornecedores</p> }));
import SalesOrderReports from './Index';
import ReportView from './components/ReportView';
import { fetchFromERP } from './services/salesReportApiService';
import ProductReferenceModal from './modals/ProductReferenceModal';
const id = '12345678-1234-4123-8123-123456789abc';
const row = { product: 'Mesa', supplier: 'Bling API', totalQuantity: 2, totalRevenue: 20, totalProfit: 14, avgCost: 3, accumulatedPercentage: 100, classification: 'C', monthlyProfit: 14, monthlyTurnover: 2 };
const report = (payload: any = {}) => ({ id, name: 'Análise salva', type: 'abc_curve', source: 'erp', config: {}, report_data: { results: [row], allProducts: [], totalProfit: 14, monthCount: 1, avgProfitPerItem: 14, avgTurnoverPerItem: 2, reportStartDate: null, reportEndDate: null }, created_at: '2026-10-16T12:00:00Z', ...payload });
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>(yes => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => {
  vi.resetAllMocks(); mocks.id = undefined; mocks.path = '/sales-order/reports'; mocks.user = { id: 'operator' }; mocks.search = new URLSearchParams();
  mocks.query.mockImplementation(async ({ operation, payload, table, filters }) => ({ data: operation === 'create' || operation === 'update' ? report(payload) : operation === 'delete' ? [{ id }] : table === 'product_references' ? [] : filters.id ? report() : [], error: null }));
  mocks.invoke.mockResolvedValue({ data: { data: [{ data: '2026-01-02', situacao: { id: 6 }, itens: [{ descricao: 'Mesa', quantidade: '2', valor: '10', custo: '3' }] }] }, error: null });
  vi.mocked(fetchFromERP).mockResolvedValue([{ date: new Date('2026-01-02T12:00:00Z'), product: 'Mesa', supplier: 'Bling API', quantity: 2, cost: 3, salesValue: 20, profit: 14 }]);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const openCreate = async () => {
  render(<SalesOrderReports />); await waitFor(() => expect(mocks.query).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /Criar Nova Análise/ }));
  fireEvent.change(screen.getByPlaceholderText('Ex: Análise de Inverno 2024'), { target: { value: '  Análise nova  ' } });
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Salvar e Atualizar/ }));
const loadView = async (publicMode = false) => {
  mocks.id = id; if (publicMode) mocks.path = `/public/report/${id}`;
  const view = render(<ReportView />); await screen.findByText(/Análise salva/); return view;
};
const search = () => { if (!screen.queryByPlaceholderText('Filtrar produtos...')) fireEvent.click(screen.getByRole('button', { name: 'Filtros' })); return screen.getByPlaceholderText('Filtrar produtos...'); };
describe('ERP report composition', () => {
  it('creates a complete analysis through both real resolvers before navigating', async () => {
    await openCreate(); submit(); await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce());
    const call = mocks.query.mock.calls.find(([call]) => call.operation === 'create')![0];
    expect(call.payload).toMatchObject({ name: 'Análise nova', type: 'abc_curve', source: 'erp', report_data: { results: [expect.objectContaining({ product: 'Mesa', totalProfit: 14 })] } });
  });
  it('keeps the modal and its draft until the acknowledged mutation completes', async () => {
    const pending = deferred(); mocks.query.mockImplementation(({ operation }) => operation === 'create' ? pending.promise : Promise.resolve({ data: [], error: null }));
    await openCreate(); submit(); await waitFor(() => expect(mocks.query.mock.calls.some(([call]) => call.operation === 'create')).toBe(true));
    expect(screen.getByRole('button', { name: /Salvar e Atualizar/ })).toHaveProperty('disabled', true); expect(mocks.navigate).not.toHaveBeenCalled();
    const payload = mocks.query.mock.calls.find(([call]) => call.operation === 'create')![0].payload;
    await act(async () => { pending.resolve({ data: report(payload), error: null }); }); await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce());
  });
  it('keeps failure visible in the configuration modal without navigating', async () => {
    vi.mocked(fetchFromERP).mockRejectedValueOnce(new Error('Consulta falhou')); await openCreate(); submit();
    await screen.findByText(/O relatório não foi confirmado/); expect(mocks.navigate).not.toHaveBeenCalled(); expect(screen.getByPlaceholderText('Ex: Análise de Inverno 2024')).toHaveProperty('value', '  Análise nova  ');
    expect(mocks.query.mock.calls.some(([call]) => call.operation === 'create')).toBe(false);
  });
  it('does not write default filters merely by loading a saved report', async () => {
    await loadView(); await act(async () => { await new Promise(resolve => setTimeout(resolve, 1100)); }); expect(mocks.query.mock.calls.every(([call]) => call.operation === 'read')).toBe(true);
  });
  it('confirms autosave with parsed filters without overwriting the saved analysis', async () => {
    await loadView(); fireEvent.change(search(), { target: { value: 'Mesa' } });
    await waitFor(() => expect(mocks.query.mock.calls.some(([call]) => call.operation === 'update')).toBe(true), { timeout: 2500 });
    const call = mocks.query.mock.calls.find(([call]) => call.operation === 'update')![0];
    expect(call.payload).toMatchObject({ config: { filters: { suppliers: ['Bling API'], minProfit: 0, maxProfit: 0, search: 'Mesa' } } }); expect(call.payload).not.toHaveProperty('report_data'); expect(call.filters).toEqual({ id, type: 'abc_curve' });
  });
  it('does not autosave a public shared view even when authenticated and its filters change', async () => {
    await loadView(true); fireEvent.change(search(), { target: { value: 'Mesa' } }); await act(async () => { await new Promise(resolve => setTimeout(resolve, 1100)); });
    expect(mocks.query.mock.calls.every(([call]) => call.operation === 'read')).toBe(true);
  });
  it('keeps typed filters visible after a rejected autosave and retries only that intent', async () => {
    await loadView(); mocks.query.mockResolvedValueOnce({ data: null, error: { code: '23514', message: 'Configuração recusada' } }); fireEvent.change(search(), { target: { value: 'Mesa' } });
    await screen.findByRole('button', { name: 'Tentar salvar filtros' }, { timeout: 2500 }); expect(search()).toHaveProperty('value', 'Mesa');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar filtros' })); await waitFor(() => expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'update')).toHaveLength(2), { timeout: 2500 });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
  it('keeps a failed read in place and recovers by querying without navigating', async () => {
    mocks.query.mockImplementationOnce(async () => ({ data: [], error: null })).mockResolvedValueOnce({ data: null, error: { message: 'Leitura falhou' } }); mocks.id = id; render(<ReportView />);
    await screen.findByRole('button', { name: 'Carregar relatório' }); expect(mocks.navigate).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Carregar relatório' })); await screen.findByText(/Análise salva/);
  });
  it('waits for configuration updates and preserves the modal on a known write refusal', async () => {
    await loadView(); fireEvent.click(screen.getByRole('button', { name: /Configurar/ }));
    mocks.query.mockImplementation(async ({ table, operation, filters }) => ({ data: table === 'product_references' ? [] : operation === 'update' ? null : filters.id ? report() : [], error: operation === 'update' ? { code: '23514', message: 'Recusado' } : null }));
    submit(); await screen.findByText(/O relatório não foi confirmado/); expect(screen.getByRole('button', { name: /Salvar e Atualizar/ })).toHaveProperty('disabled', false);
  });
  it('keeps the latest filter edit while an earlier autosave is still awaiting its receipt', async () => {
    await loadView(); vi.useFakeTimers(); const pending = deferred(); let writes = 0;
    mocks.query.mockImplementation(async ({ operation, payload }) => {
      if (operation === 'update' && ++writes === 1) return pending.promise;
      return { data: report(payload), error: null };
    });
    await act(async () => { fireEvent.change(search(), { target: { value: 'one' } }); }); await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
    await act(async () => { fireEvent.change(search(), { target: { value: 'two' } }); await vi.advanceTimersByTimeAsync(1001); }); expect(writes).toBe(1);
    await act(async () => { pending.resolve({ data: report({ config: { filters: { suppliers: ['Bling API'], minProfit: 0, maxProfit: 0, search: 'one' } } }), error: null }); });
    expect(search()).toHaveProperty('value', 'two'); expect(writes).toBe(2); expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'update')[1][0].payload.config.filters.search).toBe('two');
  });
  it('recalculates a CSV report from its complete source aggregate without converting revenue to zero', async () => {
    const config = { date: 'Data', product: 'Produto', supplier: 'Fornecedor', quantity: 'Qtd', cost: 'Custo', salesValue: 'Venda', profit: 'Lucro', abcBasis: 'profit' };
    mocks.query.mockImplementation(async ({ table, operation, payload, filters }) => ({ data: table === 'product_references' ? [] : operation === 'update' ? report(payload) : filters.id ? report({ source: 'csv', config, report_data: { ...report().report_data, allProducts: [{ product: 'Mesa', supplier: 'Bling API', qty: 2, rev: 20, profit: 14, cost: 3, quadrant: 1 }] } }) : [], error: null }));
    await loadView(); fireEvent.click(screen.getByRole('button', { name: 'Configurar' })); submit();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Salvar e Atualizar' })).toBeNull());
    const payload = mocks.query.mock.calls.find(([call]) => call.operation === 'update')![0].payload; expect(payload.report_data.results[0]).toMatchObject({ totalRevenue: 20, totalQuantity: 2, totalProfit: 14 });
  });
});

describe('report references owner', () => {
  const reference = { id, master_name: 'Mesa', reference_name: 'Mesa antiga' };
  const open = async () => { render(<ProductReferenceModal isOpen onClose={vi.fn()} availableProducts={[]} />); await waitFor(() => expect(mocks.query).toHaveBeenCalled()); };
  const add = () => { fireEvent.change(screen.getByPlaceholderText('Ex: Guarda-Roupa Sidney'), { target: { value: 'Mesa' } }); fireEvent.change(screen.getByPlaceholderText('Ex: G.Roupa Sidney Branco 3p'), { target: { value: 'Mesa antiga' } }); fireEvent.click(screen.getByRole('button', { name: 'Vincular' })); };
  it('validates before linking a reference and awaits its complete receipt', async () => {
    mocks.query.mockImplementation(async ({ operation, payload }) => ({ data: operation === 'create' ? payload : [], error: null })); await open();
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' })); await screen.findByRole('alert'); expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'create')).toHaveLength(0);
    add(); await waitFor(() => expect(screen.getByPlaceholderText('Ex: G.Roupa Sidney Branco 3p')).toHaveProperty('value', ''));
    expect(mocks.query.mock.calls.find(([call]) => call.operation === 'create')![0].payload).toMatchObject({ master_name: 'Mesa', reference_name: 'Mesa antiga', id: expect.any(String) });
  });
  it('retains an uncertain link and blocks replay without clearing the entered reference', async () => {
    mocks.query.mockImplementation(async ({ operation }) => ({ data: operation === 'create' ? null : [], error: null })); await open(); add(); await screen.findByRole('alert');
    expect(screen.getByPlaceholderText('Ex: G.Roupa Sidney Branco 3p')).toHaveProperty('value', 'Mesa antiga'); add(); expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'create')).toHaveLength(1);
  });
  it('confirms exact ids before deleting and keeps a missing acknowledgement visible', async () => {
    mocks.query.mockResolvedValue({ data: [reference], error: null }); vi.spyOn(window, 'confirm').mockReturnValue(true); await open(); await screen.findByRole('button', { name: 'Excluir referência Mesa antiga' });
    mocks.query.mockResolvedValueOnce({ data: [], error: null }); fireEvent.click(screen.getByRole('button', { name: 'Excluir referência Mesa antiga' })); await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Excluir referência Mesa antiga' })).toBeTruthy();
  });
  it('does not repeat an acknowledged link if only refreshing the list fails', async () => {
    let linked = false;
    mocks.query.mockImplementation(async ({ operation, payload }) => {
      if (operation === 'create') { linked = true; return { data: payload, error: null }; }
      return linked ? { data: null, error: { message: 'Refresh failed' } } : { data: [], error: null };
    }); await open(); add(); await screen.findByRole('alert'); expect(screen.getByPlaceholderText('Ex: G.Roupa Sidney Branco 3p')).toHaveProperty('value', ''); expect(mocks.query.mock.calls.filter(([call]) => call.operation === 'create')).toHaveLength(1);
  });
  it('keeps a public references modal read-only', async () => {
    render(<ProductReferenceModal isOpen readOnly onClose={vi.fn()} availableProducts={[]} />); await waitFor(() => expect(mocks.query).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Vincular' })).toHaveProperty('disabled', true);
  });
});

