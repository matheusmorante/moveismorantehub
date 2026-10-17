// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), from: vi.fn(), read: vi.fn(), map: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { auth: { getSession: mocks.session }, from: mocks.from } }));
vi.mock('@/pages/utils/orderMapper', () => ({ mapOrderFromDatabase: mocks.map }));
import CancelScheduledSaleButton from './CancelScheduledSaleButton';

const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const baseOrder = { id: 'sale-1', status: 'scheduled', orderType: 'sale', stockProcessed: true } as any;
const response = (data: unknown) => ({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => data });
const preview = { action: 'none', hasAuthorizedInvoice: false };
let fetchMock: ReturnType<typeof vi.fn>;
const props = () => ({ order: baseOrder, onStatusUpdate: vi.fn().mockResolvedValue(true), onAction: vi.fn(), onEdit: vi.fn(), onCloseMenu: vi.fn() });
const open = async () => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancelar venda' })); }); };
const confirm = async () => { await act(async () => { vi.advanceTimersByTime(3000); }); await act(async () => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Cancelar venda|Iniciar devolução|Abrir devolução/ })); }); };
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks();
  mocks.session.mockResolvedValue({ data: { session: { access_token: 'mock-session' } }, error: null });
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }) });
  mocks.map.mockImplementation(data => ({ ...data.order_data, id: data.id }));
  fetchMock = vi.fn().mockResolvedValue(response(preview)); vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('consulta e confirmação de cancelamento na página', () => {
  it('consulta com ID parseado e espera a confirmação do status antes de fechar', async () => {
    const pending = deferred<boolean>(); const options = props(); options.order = { ...baseOrder, id: ' sale-1 ' }; options.onStatusUpdate.mockReturnValue(pending.promise);
    render(<CancelScheduledSaleButton {...options} />); await open();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ orderId: 'sale-1', preview: true });
    await confirm();
    expect(options.onStatusUpdate).toHaveBeenCalledWith('sale-1', 'cancelled', { productionConfirmed: false, isCurrent: expect.any(Function) });
    expect(options.onCloseMenu).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { pending.resolve(true); });
    expect(options.onCloseMenu).toHaveBeenCalledTimes(1); expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('bloqueia ID vazio no resolver antes da sessão e consulta', async () => {
    render(<CancelScheduledSaleButton {...props()} order={{ ...baseOrder, id: '   ' }} />); await open();
    expect(mocks.session).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('Identifique a venda');
  });

  it('recusa resposta fiscal incompleta antes de abrir a confirmação', async () => {
    fetchMock.mockResolvedValue(response({ action: 'none' })); render(<CancelScheduledSaleButton {...props()} />); await open();
    expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.getByRole('alert').textContent).toContain('incompletas');
  });

  it('não duplica consulta e descarta a resposta de outra venda', async () => {
    const pending = deferred<unknown>(); fetchMock.mockReturnValue(pending.promise); const options = props(); const view = render(<CancelScheduledSaleButton {...options} />);
    await open(); fireEvent.click(screen.getByRole('button', { name: 'Consultando...' })); expect(fetchMock).toHaveBeenCalledTimes(1);
    view.rerender(<CancelScheduledSaleButton {...options} order={{ ...baseOrder, id: 'sale-2' }} />);
    await act(async () => { pending.resolve(response(preview)); }); expect(screen.queryByRole('dialog')).toBeNull();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('libera a consulta após prazo da sessão sem iniciar fetch tardio', async () => {
    const pending = deferred<any>(); mocks.session.mockReturnValue(pending.promise); render(<CancelScheduledSaleButton {...props()} />); await open();
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(screen.getByRole('alert').textContent).toContain('Sessão indisponível');
    await act(async () => { pending.resolve({ data: { session: { access_token: 'late' } }, error: null }); }); expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancelar venda' })).toHaveProperty('disabled', false);
  });

  it('aborta consulta sem resposta e ignora resultado tardio', async () => {
    const pending = deferred<unknown>(); fetchMock.mockReturnValue(pending.promise); render(<CancelScheduledSaleButton {...props()} />); await open();
    await act(async () => { vi.advanceTimersByTime(15000); }); expect(screen.getByRole('alert').textContent).toContain('excedeu o prazo');
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => { pending.resolve(response(preview)); }); expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('aguarda a devolução vinculada e a abertura do editor antes de fechar', async () => {
    fetchMock.mockResolvedValue(response({ ...preview, action: 'return', returnOrderId: 'return-1' }));
    const pending = deferred<any>(); mocks.read.mockReturnValue(pending.promise); const options = props(); render(<CancelScheduledSaleButton {...options} />); await open(); await confirm();
    expect(options.onCloseMenu).not.toHaveBeenCalled(); expect(options.onEdit).not.toHaveBeenCalled();
    await act(async () => { pending.resolve({ data: { id: 'return-1', order_data: { status: 'scheduled' } }, error: null }); });
    expect(options.onEdit).toHaveBeenCalledWith({ id: 'return-1', status: 'scheduled' }); expect(options.onCloseMenu).toHaveBeenCalledTimes(1); expect(options.onStatusUpdate).not.toHaveBeenCalled();
  });

  it('preserva a confirmação após falha de leitura da devolução, sem cancelar a venda', async () => {
    fetchMock.mockResolvedValue(response({ ...preview, action: 'return', returnOrderId: 'return-1' })); mocks.read.mockResolvedValue({ data: null, error: new Error('not found') });
    const options = props(); render(<CancelScheduledSaleButton {...options} />); await open(); await confirm();
    expect(screen.getByRole('alert').textContent).toContain('não foi encontrada'); expect(options.onCloseMenu).not.toHaveBeenCalled(); expect(options.onStatusUpdate).not.toHaveBeenCalled();
  });

  it('bloqueia repetição quando o proprietário não confirma a alteração comercial', async () => {
    const options = props(); options.onStatusUpdate.mockResolvedValue(false); render(<CancelScheduledSaleButton {...options} />); await open(); await confirm();
    expect(screen.getByRole('alert').textContent).toContain('Consulte o histórico'); expect(options.onCloseMenu).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar venda' })); expect(options.onStatusUpdate).toHaveBeenCalledTimes(1);
  });

  it('mantém lote em conferência, sem habilitar um novo cancelamento comercial', async () => {
    fetchMock.mockResolvedValue(response({ action: 'batch', hasAuthorizedInvoice: true, operations: [{ action: 'estorno', documentId: 'nf-1', environment: 2 }] }));
    const options = props(); render(<CancelScheduledSaleButton {...options} />); await open(); await confirm();
    expect(screen.getByRole('alert').textContent).toContain('exige conferência'); expect(options.onStatusUpdate).not.toHaveBeenCalled(); expect(options.onCloseMenu).not.toHaveBeenCalled();
  });

  it('encaminha somente a confirmação de Produção feita nesta operação', async () => {
    fetchMock.mockResolvedValue(response({ action: 'cancel', hasAuthorizedInvoice: true, environment: 1, model: '55' }));
    const options = props(); render(<CancelScheduledSaleButton {...options} />); await open(); await act(async () => { vi.advanceTimersByTime(3000); });
    const button = within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar venda' });
    expect(button).toHaveProperty('disabled', true); fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => { fireEvent.click(button); });
    expect(options.onStatusUpdate).toHaveBeenCalledWith('sale-1', 'cancelled', { productionConfirmed: true, isCurrent: expect.any(Function) });
  });

  it('inicia apenas o cadastro de devolução comercial quando não há vínculo existente', async () => {
    fetchMock.mockResolvedValue(response({ ...preview, action: 'return' })); const options = props(); render(<CancelScheduledSaleButton {...options} />); await open(); await confirm();
    expect(options.onAction).toHaveBeenCalledWith('generateReturn', baseOrder); expect(options.onStatusUpdate).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
  });

  it('não abre devolução de outro contexto após uma leitura tardia', async () => {
    fetchMock.mockResolvedValue(response({ ...preview, action: 'return', returnOrderId: 'return-1' })); const pending = deferred<any>(); mocks.read.mockReturnValue(pending.promise);
    const options = props(); const view = render(<CancelScheduledSaleButton {...options} />); await open(); await confirm();
    view.rerender(<CancelScheduledSaleButton {...options} order={{ ...baseOrder, id: 'sale-2' }} />);
    await act(async () => { pending.resolve({ data: { id: 'return-1', order_data: { status: 'scheduled' } }, error: null }); });
    expect(options.onEdit).not.toHaveBeenCalled(); expect(options.onAction).not.toHaveBeenCalled(); expect(options.onCloseMenu).not.toHaveBeenCalled();
  });
});
