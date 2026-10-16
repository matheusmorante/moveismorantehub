// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '../../../types/order.type';
import { useOrderHistory } from './useOrderHistory';
import ReturnFulfillmentConfirmModal from './ReturnFulfillmentConfirmModal';
import { confirmReturnOrderFulfillment, executeUpdateOrder } from '../../../utils/orderMutation/orderUpdateService';
import { getReturnFulfillmentFormValues, returnFulfillmentFormSchema, type ReturnFulfillmentValues } from '../../../../../../shared-utils/returnFormSchemas';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), read: vi.fn(), snapshot: vi.fn(), query: vi.fn(), notify: vi.fn(), fiscal: vi.fn(),
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() }, nextIndex: vi.fn(), cacheSnapshot: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc, from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: () => mocks.read() }; return query;
} } }));
vi.mock('../../../utils/orderHistoryService', () => ({ fetchOrdersPage: mocks.query, fetchOrdersForClientFiltering: mocks.query,
  subscribeToOrderChanges: () => () => undefined, updateOrder: vi.fn(), undoReturn: vi.fn() }));
vi.mock('../../../utils/orderCode', () => ({ getNextOrderIndex: mocks.nextIndex, getOrderIndex: () => 100, resolveOrderIndexForUpdate: () => 100 }));
vi.mock('../../../utils/orderSnapshotResolution', () => ({ resolveOrderCustomerSnapshot: (order: unknown) => order,
  buildOrderPersistencePayload: (order: Order) => ({ order_data: order, order_type: order.orderType, status: order.status, order_index: 100 }) }));
vi.mock('../../../utils/orderMutation/orderCrmSyncService', () => ({ ensureCustomerInCrm: vi.fn(), syncCustomerToCrmBackground: vi.fn() }));
vi.mock('../../../utils/orderMutation/orderNotificationDispatcher', () => ({ dispatchOrderUpdateNotifications: mocks.notify }));
vi.mock('../../../utils/orderFiscalSnapshotService', () => ({ ensureOrderItemsHaveFiscalSnapshots: (items: unknown) => items }));
vi.mock('../../../utils/orderMapper', () => ({ getPersistedOrderDataSnapshot: mocks.snapshot, setPersistedOrderDataSnapshot: mocks.cacheSnapshot }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { invalidateQueries: vi.fn(async () => undefined) } }));
vi.mock('@/pages/utils/nfe/orderFiscalBadgeService', () => ({ fetchOrderFiscalBadgeStatuses: async () => ({}) }));
vi.mock('../../FiscalDocuments/services/automaticReturnFiscalEmissionService', () => ({ automaticallyTransmitReturnFiscalDocuments: mocks.fiscal,
  getAutomaticReturnFiscalEmissionNotice: () => null }));
vi.mock('../../../../hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: 1366 }) }));
vi.mock('../OrderActions/orderActionsConfig', () => ({ actionsMap: {}, buttons: [] }));
vi.mock('./useOrderHistoryOperations', () => ({ createOrderHistoryOperations: () => ({ commitStatusUpdate: vi.fn() }) }));
vi.mock('react-toastify', () => ({ toast: mocks.toast }));

type Response = { data: unknown; error: unknown; status?: number };
let order: Order, other: Order, controller: ReturnType<typeof useOrderHistory>;
const makeOrder = (id = 'return-1'): Order => ({ id, orderIndex: 100, orderNumber: 100, orderType: 'return', status: 'scheduled',
  returnMethod: 'store_collection', updatedAt: '2026-10-16T12:00:00.000Z', linkedOrderId: 'sale-1',
  items: [{ description: 'Mesa', productId: 'product-1', variationId: 'variation-1', quantity: 1, unitPrice: 10, originalOrderItemIndex: 0 }],
  customerData: { id: 'customer-1', fullName: 'Cliente' }, returnStockProcessed: false, returnStockReversed: false,
  auditNote: { zero: 0, enabled: false },
} as unknown as Order);
const command = (source = order) => returnFulfillmentFormSchema.parse(getReturnFulfillmentFormValues(source, true));
const receipt = (source = order) => ({ id: source.id, status: 'fulfilled', order_type: 'return', updated_at: '2026-10-16T12:01:00.000Z', order_data: { ...source, status: 'fulfilled', returnStockProcessed: true, returnStockReversed: false } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
async function advance(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function Page() {
  const history = useOrderHistory();
  React.useEffect(() => { controller = history; }, [history]);
  return <>
    <button onClick={() => void history.handleStatusUpdate(order.id!, 'fulfilled')}>Abrir devolução</button>
    <button onClick={() => void history.handleStatusUpdate(other.id!, 'fulfilled')}>Outro pedido</button>
    <output aria-label="Pedidos">{JSON.stringify(history.orders)}</output>
    {history.pendingReturnFulfillment && <ReturnFulfillmentConfirmModal order={history.pendingReturnFulfillment}
      isBusy={history.returnFulfillmentBusy} onCancel={history.cancelReturnFulfillment} onConfirm={history.confirmReturnFulfillment} />}
  </>;
}
async function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);
  await advance(20); fireEvent.click(screen.getByText('Abrir devolução')); await advance();
  return view;
}
async function countdown() { for (let i = 0; i < 5; i += 1) await advance(1000); }
const confirm = () => fireEvent.click(screen.getByRole('button', { name: /^Confirmar (coleta|recebimento)$|^Confirmando\.\.\.$/ }));
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); order = makeOrder(); other = makeOrder('return-2');
  mocks.query.mockReset().mockImplementation(async () => ({ orders: [order, other], total: 2 }));
  mocks.snapshot.mockReset().mockImplementation((source: Order) => { const { id: _id, ...snapshot } = source; return snapshot; });
  mocks.read.mockReset().mockResolvedValue({ data: { order_data: order }, error: null });
  mocks.rpc.mockReset().mockImplementation(async (_name, args) => ({ data: receipt(args.p_order_id === other.id ? other : order), error: null, status: 200 }));
  mocks.fiscal.mockReset().mockResolvedValue({ status: 'pending' });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('confirmação física com modal, hook, RHF, domínio e serviço reais', () => {
  it.each(['store_collection', 'store_delivery'] as const)('aguarda cinco segundos e ACK antes de fechar/publicar/enviar fiscal: %s', async (method) => {
    order.returnMethod = method; const request = deferred<Response>(); mocks.rpc.mockReturnValueOnce(request.promise);
    await open(); expect((screen.getByRole('button', { name: 'Aguarde 5s' }) as HTMLButtonElement).disabled).toBe(true);
    await countdown(); confirm(); confirm(); await advance();
    expect(mocks.rpc).toHaveBeenCalledOnce(); expect(screen.getByRole('dialog')).toBeTruthy(); expect(within(screen.getByRole('dialog')).getByRole('status')).toBeTruthy();
    expect(mocks.notify).not.toHaveBeenCalled(); expect(mocks.fiscal).not.toHaveBeenCalled();
    expect(JSON.parse(screen.getByLabelText('Pedidos').textContent || '[]')[0].status).toBe('scheduled');
    fireEvent.keyDown(window, { key: 'Escape' }); expect(screen.getByRole('dialog')).toBeTruthy();
    expect(mocks.rpc.mock.calls[0]).toEqual(['update_order_with_inventory_transaction_if_version', expect.objectContaining({
      p_order_id: order.id, p_expected_updated_at: order.updatedAt, p_order_payload: expect.objectContaining({ order_data: expect.objectContaining({ status: 'fulfilled', auditNote: { zero: 0, enabled: false } }) }),
    })]);
    await act(async () => { request.resolve({ data: receipt(), error: null }); }); await advance();
    expect(screen.queryByRole('dialog')).toBeNull(); expect(mocks.notify).toHaveBeenCalledOnce(); expect(mocks.fiscal).toHaveBeenCalledWith(order.id);
    expect(mocks.toast.success).toHaveBeenCalledOnce();
    expect(JSON.parse(screen.getByLabelText('Pedidos').textContent || '[]').find((item: Order) => item.id === order.id).updatedAt).toBe('2026-10-16T12:01:00.000Z');
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data).not.toHaveProperty('physicalConfirmed');
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data).not.toHaveProperty('expectedUpdatedAt');
    await act(async () => { await controller.handleStatusUpdate(order.id!, 'fulfilled'); });
    expect(mocks.rpc).toHaveBeenCalledOnce(); expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('resolver do proprietário rejeita confirmação física falsa mesmo fora do modal', async () => {
    await open(); await act(async () => { await expect(controller.confirmReturnFulfillment({ ...command(), physicalConfirmed: false } as unknown as ReturnFulfillmentValues)).rejects.toThrow('físico'); });
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.fiscal).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it.each(['missing', 'id', 'status', 'type', 'method', 'flag', 'snapshotId', 'missingFlag', 'topStatus', 'topType', 'version'])('ACK inválido %s mantém confirmação, bloqueia repetição e não publica efeitos', async (kind) => {
    const data = receipt();
    const invalid = kind === 'missing' ? null : kind === 'id' ? { ...data, id: other.id }
      : kind === 'topStatus' ? { ...data, status: 'scheduled' } : kind === 'topType' ? { ...data, order_type: 'sale' } : kind === 'version' ? { ...data, updated_at: undefined }
      : { ...data, order_data: { ...data.order_data, ...(kind === 'status' ? { status: 'scheduled' } : kind === 'type' ? { orderType: 'sale' }
        : kind === 'method' ? { returnMethod: 'store_delivery' } : kind === 'snapshotId' ? { id: other.id } : kind === 'missingFlag' ? { returnStockProcessed: undefined } : { returnStockProcessed: 'sim' }) } };
    mocks.rpc.mockResolvedValueOnce({ data: invalid, error: null }); await open(); await countdown(); confirm(); await advance();
    expect(screen.getByRole('alert').textContent).toContain('Consulte o pedido'); expect(screen.getByRole('dialog')).toBeTruthy();
    expect(mocks.notify).not.toHaveBeenCalled(); expect(mocks.fiscal).not.toHaveBeenCalled();
    await advance(1000); expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it('erro SQL conhecido mantém a abertura e só repete por comando explícito', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'Denied' }, status: 403 });
    await open(); await countdown(); confirm(); await advance(); expect(screen.getByRole('alert').textContent).toContain('permissão');
    await advance(1000); expect(mocks.rpc).toHaveBeenCalledOnce(); expect(mocks.fiscal).not.toHaveBeenCalled();
    confirm(); await advance(); expect(mocks.rpc).toHaveBeenCalledTimes(2); expect(screen.queryByRole('dialog')).toBeNull(); expect(mocks.fiscal).toHaveBeenCalledOnce();
  });
  it('timeout de RPC bloqueia também outra abertura do mesmo pedido e ignora ACK tardio', async () => {
    const request = deferred<Response>(); mocks.rpc.mockReturnValueOnce(request.promise); await open(); await countdown(); confirm(); await advance();
    await advance(30000); expect(screen.getByRole('alert').textContent).toContain('Consulte o pedido');
    fireEvent.click(screen.getByText('Voltar')); await advance(); expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('Abrir devolução')); await advance(); await countdown(); confirm(); await advance();
    expect(mocks.rpc).toHaveBeenCalledOnce(); expect(screen.getByRole('alert').textContent).toContain('Consulte o pedido');
    await act(async () => { request.resolve({ data: receipt(), error: null }); }); await advance();
    expect(mocks.notify).not.toHaveBeenCalled(); expect(mocks.fiscal).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it('leitura tardia após prazo do proprietário não inicia a transação', async () => {
    const request = deferred<Response>(); mocks.snapshot.mockReturnValue(undefined); mocks.read.mockReturnValueOnce(request.promise);
    await open(); await countdown(); confirm(); await advance(); expect(mocks.read).toHaveBeenCalledOnce();
    await advance(35000); expect(screen.getByRole('alert').textContent).toContain('Consulte o pedido');
    await act(async () => { request.resolve({ data: { order_data: order }, error: null }); }); await advance();
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.notify).not.toHaveBeenCalled(); expect(mocks.fiscal).not.toHaveBeenCalled();
    expect(mocks.cacheSnapshot).not.toHaveBeenCalled();
  });
  it('leitura atual conserva o snapshot remoto no cache e no comando sem injetar campos da confirmação', async () => {
    const snapshot = { ...order, auditNote: { zero: 0, enabled: false, source: 'persisted' } };
    mocks.snapshot.mockReturnValue(undefined); mocks.read.mockResolvedValueOnce({ data: { order_data: snapshot }, error: null });
    await open(); await countdown(); confirm(); await advance();
    expect(mocks.cacheSnapshot).toHaveBeenCalledWith(expect.objectContaining({ id: order.id }), snapshot);
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data).toMatchObject({ auditNote: snapshot.auditNote, status: 'fulfilled' });
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data).not.toHaveProperty('physicalConfirmed');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('contexto novo aguarda a trava comum e não é fechado pela resposta do anterior', async () => {
    const request = deferred<Response>(); mocks.rpc.mockReturnValueOnce(request.promise); await open(); await countdown(); confirm(); await advance();
    fireEvent.click(screen.getByText('Outro pedido')); await advance(); await countdown();
    expect((screen.getByRole('button', { name: 'Confirmar coleta' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { request.resolve({ data: receipt(), error: null }); }); await advance();
    expect(screen.getByRole('dialog')).toBeTruthy(); expect(controller.pendingReturnFulfillment?.id).toBe(other.id);
    expect(mocks.fiscal).not.toHaveBeenCalled(); expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.toast.warning).toHaveBeenCalledWith(expect.stringContaining('outra devolução comercial foi confirmado'));
    confirm(); await advance(); expect(screen.queryByRole('dialog')).toBeNull();
    expect(mocks.fiscal).toHaveBeenCalledWith(other.id); expect(mocks.fiscal).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledOnce();
  });
  it('desmontagem durante resolver não inicia efeito', async () => {
    const view = await open(); await countdown(); confirm(); view.unmount(); await advance();
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.notify).not.toHaveBeenCalled(); expect(mocks.fiscal).not.toHaveBeenCalled();
  });
  it('etapa fiscal pendente não impede fechar um recebimento comercial já confirmado', async () => {
    mocks.fiscal.mockReturnValueOnce(new Promise(() => undefined)); await open(); await countdown(); confirm(); await advance();
    expect(screen.queryByRole('dialog')).toBeNull(); expect(mocks.rpc).toHaveBeenCalledOnce(); expect(mocks.fiscal).toHaveBeenCalledOnce();
  });
  it('valida identidade/contexto no serviço antes de acessar RPC', async () => {
    await expect(confirmReturnOrderFulfillment({ ...command(), orderId: other.id! }, order, () => true)).rejects.toThrow('mudou');
    await expect(confirmReturnOrderFulfillment(command(), order, () => false)).rejects.toThrow('contexto');
    await expect(confirmReturnOrderFulfillment({ ...command(), expectedUpdatedAt: undefined }, order, () => true)).rejects.toThrow('mudou');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('preserva retorno void da atualização legada com confirmação válida', async () => {
    await expect(executeUpdateOrder(order.id!, { status: 'fulfilled' }, order)).resolves.toBeUndefined();
  });
  it.each([false, undefined])('callback sem confirmação %s não fecha nem permite repetir', async (value) => {
    const callback = vi.fn(async () => value as boolean), cancel = vi.fn();
    render(<ReturnFulfillmentConfirmModal order={order} onCancel={cancel} onConfirm={callback} />);
    await countdown(); confirm(); await advance(); expect(screen.getByRole('alert').textContent).toContain('Consulte o pedido');
    confirm(); await advance(); expect(callback).toHaveBeenCalledOnce(); expect(cancel).not.toHaveBeenCalled();
  });
  it('prazo próprio do modal invalida callback tardio e mantém erro visível', async () => {
    const request = deferred<boolean>(), cancel = vi.fn();
    const callback = vi.fn((_values: ReturnFulfillmentValues, _guard?: () => boolean) => request.promise);
    render(<ReturnFulfillmentConfirmModal order={order} onCancel={cancel} onConfirm={callback} />); await countdown(); confirm(); await advance();
    const guard = callback.mock.calls[0][1]!; expect(guard()).toBe(true);
    await advance(40000); expect(guard()).toBe(false); expect(screen.getByRole('alert').textContent).toContain('Consulte o pedido');
    await act(async () => { request.resolve(true); }); await advance(); expect(cancel).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy();
  });
  it.each([{ id: '' }, { orderType: 'sale' }, { status: 'fulfilled' }, { returnMethod: 'inválido' }])('modal rejeita contexto inválido %j pelo resolver', async (change) => {
    const callback = vi.fn(async () => true);
    render(<ReturnFulfillmentConfirmModal order={{ ...order, ...change } as Order} onCancel={vi.fn()} onConfirm={callback} />);
    await countdown(); confirm(); await advance(); expect(screen.getByRole('alert')).toBeTruthy(); expect(callback).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(['08006', undefined, '40003', 'PGRST116'])('falha de RPC %s permanece incerta e não inicia fiscal', async (code) => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code, message: 'Transport failure' } });
    await open(); await countdown(); confirm(); await advance(); expect(screen.getByRole('alert').textContent).toContain('Consulte o pedido');
    expect(mocks.fiscal).not.toHaveBeenCalled(); expect(mocks.notify).not.toHaveBeenCalled();
  });
  it('conflito de versão informa a devolução comercial sem repetir ou iniciar fiscal', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '40001', message: 'ORDER_VERSION_CONFLICT' } });
    await open(); await countdown(); confirm(); await advance();
    expect(screen.getByRole('alert').textContent).toContain('devolução comercial mudou'); expect(screen.getByRole('alert').textContent).not.toContain('fiscal');
    await advance(1000); expect(mocks.rpc).toHaveBeenCalledOnce(); expect(mocks.fiscal).not.toHaveBeenCalled();
  });
  it('falha fiscal posterior preserva o recebimento comercial e não alega entrada para itens sem cadastro', async () => {
    order.items = [{ description: 'Sem cadastro', quantity: 1, unitPrice: 10, isTemporaryProduct: true }] as Order['items'];
    mocks.rpc.mockResolvedValueOnce({ data: { ...receipt(), order_data: { ...receipt().order_data, returnStockProcessed: false } }, error: null });
    mocks.fiscal.mockRejectedValueOnce(new Error('Fiscal pendente')); vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await open(); await countdown(); confirm(); await advance();
    expect(screen.queryByRole('dialog')).toBeNull(); expect(mocks.rpc).toHaveBeenCalledOnce();
    const saved = JSON.parse(screen.getByLabelText('Pedidos').textContent || '[]').find((item: Order) => item.id === order.id);
    expect(saved).toMatchObject({ status: 'fulfilled', returnStockProcessed: false });
    expect(mocks.toast.warning).toHaveBeenCalledWith(expect.stringContaining('devolução comercial'));
    expect(mocks.toast.warning.mock.calls[0][0]).not.toContain('estoque foi registrado');
  });
});
