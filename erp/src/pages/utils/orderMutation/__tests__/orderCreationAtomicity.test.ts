import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  getNextOrderIndex: vi.fn(async () => 123),
  resolveCustomerSnapshot: vi.fn(async (order: any) => order),
  ensureFiscalSnapshots: vi.fn(async (items: any[], _nfeData: any, resolveActual?: Function) =>
    resolveActual ? resolveActual(items, _nfeData) : items
  ),
  recordHistory: vi.fn(),
  syncCustomer: vi.fn(),
  dispatchNotifications: vi.fn(),
  dispatchUpdateNotifications: vi.fn(),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));
vi.mock('../../orderCode', () => ({
  getNextOrderIndex: mocks.getNextOrderIndex,
  getOrderIndex: (order: any) =>
    order?.orderIndex ?? order?.order_index ?? order?.order_data?.orderIndex ?? null,
  resolveOrderIndexForUpdate: () => 123,
}));
vi.mock('../../orderSnapshotResolution', () => ({
  resolveOrderCustomerSnapshot: mocks.resolveCustomerSnapshot,
  buildOrderPersistencePayload: (order: any) => ({
    order_index: Number(order.orderIndex || order.orderNumber || 0) || null,
    order_number: String(order.orderIndex || order.orderNumber || ''),
    order_type: order.orderType,
    status: order.status,
    order_data: order,
  }),
}));
vi.mock('../../orderFiscalSnapshotService', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    ensureOrderItemsHaveFiscalSnapshots: (items: any[], nfeData: any) =>
      mocks.ensureFiscalSnapshots(items, nfeData, actual.ensureOrderItemsHaveFiscalSnapshots),
  };
});
vi.mock('../orderCrmSyncService', () => ({
  ensureCustomerInCrm: async () => undefined,
  syncCustomerToCrmBackground: mocks.syncCustomer,
}));
vi.mock('../orderNotificationDispatcher', () => ({
  dispatchOrderCreationNotifications: mocks.dispatchNotifications,
  dispatchOrderUpdateNotifications: mocks.dispatchUpdateNotifications,
}));
vi.mock('../orderStatusWorkflowService', () => ({ recordOrderStatusHistory: mocks.recordHistory }));

import { executeSaveOrder } from '../orderCreationService';
import { executeUpdateOrder } from '../orderUpdateService';
import { setPersistedOrderDataSnapshot } from '../../orderMapper';
import { bindTestArtifactContext, clearTestArtifactContext } from '../../../../../../shared-utils/testArtifactContext';

const testIdentity = {
  runId: '550e8400-e29b-41d4-a716-446655440000',
  ownerId: '550e8400-e29b-41d4-a716-446655440001',
};

const scheduledSale = {
  orderType: 'sale',
  status: 'scheduled',
  items: [{
    productId: '00000000-0000-0000-0000-000000000001',
    quantity: 1,
    fiscalSnapshotVersion: 1,
    fiscal: { commercialUnit: 'UN', taxableUnit: 'UN' },
  }],
  payments: [],
};

const splitPayments = [
  { method: 'PIX', amount: 500, fee: 0, feeType: 'fixed', status: 'PAGO', installments: 1 },
  {
    method: 'Cartão de Crédito',
    amount: 250,
    fee: 12.5,
    feeType: 'percentage',
    status: 'PENDENTE',
    installments: 2,
  },
];

describe('cadastro de pedido com estoque atômico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCustomerSnapshot.mockImplementation(async (order: any) => order);
    mocks.ensureFiscalSnapshots.mockImplementation(
      async (items: any[], nfeData: any, resolveActual?: Function) =>
        resolveActual ? resolveActual(items, nfeData) : items
    );
    clearTestArtifactContext();
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it('prepara o snapshot do cliente e os snapshots fiscais dos itens em paralelo na criação', async () => {
    let customerStarted = false;
    let fiscalStarted = false;
    let resolveCustomer!: (order: any) => void;
    let resolveFiscal!: (items: any[]) => void;
    mocks.resolveCustomerSnapshot.mockImplementation((order: any) => {
      customerStarted = true;
      return new Promise((resolve) => { resolveCustomer = resolve; });
    });
    mocks.ensureFiscalSnapshots.mockImplementation((items: any[]) => {
      fiscalStarted = true;
      return new Promise((resolve) => { resolveFiscal = resolve; });
    });
    mocks.rpc.mockResolvedValue({
      data: { id: 'saved-order', order_data: scheduledSale, order_index: 123 },
      error: null,
    });

    const pendingSave = executeSaveOrder(
      { ...scheduledSale, status: 'draft', orderIndex: 123, customerData: { id: 'customer' } } as any,
      vi.fn()
    );
    const startedInParallel = customerStarted && fiscalStarted;
    resolveCustomer({ ...scheduledSale, status: 'draft', orderIndex: 123, customerData: { id: 'customer' } });
    resolveFiscal(scheduledSale.items);
    await pendingSave;

    expect(startedInParallel).toBe(true);
  });

  it('prepara o snapshot do cliente e os snapshots fiscais dos itens em paralelo na edição', async () => {
    let customerStarted = false;
    let fiscalStarted = false;
    let resolveCustomer!: (order: any) => void;
    let resolveFiscal!: (items: any[]) => void;
    mocks.resolveCustomerSnapshot.mockImplementation((order: any) => {
      customerStarted = true;
      return new Promise((resolve) => { resolveCustomer = resolve; });
    });
    mocks.ensureFiscalSnapshots.mockImplementation((items: any[]) => {
      fiscalStarted = true;
      return new Promise((resolve) => { resolveFiscal = resolve; });
    });
    mocks.rpc.mockResolvedValue({ data: { order_data: scheduledSale }, error: null });
    const current: any = {
      ...scheduledSale,
      id: 'order-to-edit',
      orderIndex: 123,
      updatedAt: '2026-10-18T12:00:00Z',
      customerData: { id: 'customer' },
    };

    const pendingUpdate = executeUpdateOrder(
      current.id,
      { items: scheduledSale.items } as any,
      current,
      current.updatedAt
    );
    const startedInParallel = customerStarted && fiscalStarted;
    resolveCustomer(current);
    resolveFiscal(scheduledSale.items);
    await pendingUpdate;

    expect(startedInParallel).toBe(true);
  });

  it('preserva snapshot, itens e pagamentos não editados ao salvar metadados fiscais', async () => {
    const raw = { ...scheduledSale, id: 'pedido-1', payments: splitPayments,
      items: [{ ...scheduledSale.items[0], id: 'snapshot-item' }],
      customerData: { id: 'customer', fullName: 'Nome histórico' },
      shipping: { deliveryMethod: 'pickup', deliveryAddress: { street: 'Endereço histórico' } } };
    const current: any = { ...raw, updatedAt: '2026-10-18T12:00:00Z',
      items: [{ ...raw.items[0], id: 'normalized-row-id' }],
      customerData: { id: 'customer', fullName: 'Nome reidratado' },
      shipping: { deliveryMethod: 'pickup' } };
    setPersistedOrderDataSnapshot(current, raw);
    const nfeDraft = { '2': { items: [{ fiscal: { ncm: '123' } }] } };
    mocks.rpc.mockResolvedValue({ data: { order_data: { ...raw, nfeDraft } }, error: null });

    await executeUpdateOrder('pedido-1', { nfeDraft } as any, current, current.updatedAt, { metadataOnly: true });

    const [, args] = mocks.rpc.mock.calls[0];
    expect(args.p_order_payload.order_data).toEqual({ ...raw, nfeDraft });
    expect(args.p_items).toEqual(raw.items);
    expect(args.p_payments).toEqual(raw.payments);
    expect(args.p_expected_updated_at).toBe(current.updatedAt);
    expect(mocks.dispatchUpdateNotifications).not.toHaveBeenCalled();
    expect(mocks.syncCustomer).not.toHaveBeenCalled();
  });

  it.each([
    { previousStatus: 'fulfilled', status: 'scheduled', autoFulfillExempt: true },
    { previousStatus: 'scheduled', status: 'fulfilled' },
    { previousStatus: 'scheduled', status: 'cancelled' },
  ])('preserva linhas e pagamentos originais em mudança apenas de status para $status', async ({ previousStatus, ...changes }) => {
    const raw = { ...scheduledSale, id: 'pedido-status', status: previousStatus,
      items: [{ ...scheduledSale.items[0], id: 'snapshot-item', retainedLineAudit: 'original' }],
      payments: splitPayments };
    const current: any = { ...raw, updatedAt: '2026-10-18T12:00:00Z',
      items: [{ ...raw.items[0], id: 'normalized-row-id' }],
      payments: [{ ...splitPayments[0], id: 'normalized-payment-id' }] };
    setPersistedOrderDataSnapshot(current, raw);
    mocks.rpc.mockResolvedValue({ data: { order_data: { ...raw, ...changes } }, error: null });

    await executeUpdateOrder(raw.id, changes as any, current, current.updatedAt);

    const [, args] = mocks.rpc.mock.calls[0];
    expect(args.p_order_payload.order_data).toEqual({ ...raw, ...changes });
    expect(args.p_items).toEqual(raw.items);
    expect(args.p_order_payload.items).toEqual(raw.items);
    expect(args.p_payments).toEqual(raw.payments);
  });

  it('consulta o snapshot original quando o proprietário de metadados não possui WeakMap', async () => {
    const raw = { ...scheduledSale, payments: splitPayments, customRetainedField: { source: 'audit' } };
    const query: any = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { order_data: raw }, error: null }) };
    mocks.from.mockReturnValue(query);
    mocks.rpc.mockResolvedValue({ data: { order_data: raw }, error: null });
    const current: any = { ...scheduledSale, id: 'pedido-1', updatedAt: '2026-10-18T12:00:00Z' };

    await executeUpdateOrder('pedido-1', { fiscalContext: { finalConsumer: true } }, current, current.updatedAt, { metadataOnly: true });

    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data).toEqual({ ...raw, fiscalContext: { finalConsumer: true } });
  });

  it('preserva alterações explícitas de itens no backfill fiscal de metadados', async () => {
    const raw = { ...scheduledSale, payments: splitPayments, retainedAudit: 'original' };
    const current: any = { ...raw, id: 'pedido-1', updatedAt: '2026-10-18T12:00:00Z' };
    setPersistedOrderDataSnapshot(current, raw);
    const items = raw.items.map(item => ({ ...item, fiscal: { ...item.fiscal, ncm: '94036000' } }));
    mocks.rpc.mockResolvedValue({ data: { order_data: { ...raw, items } }, error: null });

    await executeUpdateOrder('pedido-1', { items }, current, current.updatedAt, { metadataOnly: true });

    expect(mocks.rpc.mock.calls[0][1].p_items).toEqual(items);
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data).toEqual({ ...raw, items });
  });

  it('não grava metadados sem conferir o snapshot original', async () => {
    const query: any = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: null, error: { message: 'offline' } }) };
    mocks.from.mockReturnValue(query);
    await expect(executeUpdateOrder('pedido-1', { nfeDraft: {} }, { ...scheduledSale, id: 'pedido-1' } as any, undefined, { metadataOnly: true }))
      .rejects.toThrow('Não foi possível conferir o snapshot original');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('envia o pedido à RPC que também grava as movimentações', async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: 'pedido-1', order_index: 123, order_data: scheduledSale },
      error: null,
    });

    await expect(executeSaveOrder(scheduledSale as any, vi.fn())).resolves.toBe('pedido-1');
    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_order_with_inventory_transaction',
      expect.objectContaining({ p_order_id: expect.any(String), p_items: scheduledSale.items })
    );
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.dispatchNotifications).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] });
  });

  it('grava orçamento concluído com status quoted pela RPC existente', async () => {
    const budget = { orderType: 'budget', status: 'quoted', items: [], payments: [] };
    mocks.rpc.mockResolvedValue({
      data: { id: 'orcamento-1', order_index: 123, order_data: budget },
      error: null,
    });

    await expect(executeSaveOrder(budget as any, vi.fn())).resolves.toBe('orcamento-1');

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_order_with_inventory_transaction',
      expect.objectContaining({ p_order_payload: expect.objectContaining({ status: 'quoted' }) })
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('bloqueia status quoted para registros que não são orçamentos', async () => {
    await expect(
      executeSaveOrder({ ...scheduledSale, status: 'quoted' } as any, vi.fn())
    ).rejects.toThrow('Somente orçamentos podem ser cadastrados com este status');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.getNextOrderIndex).not.toHaveBeenCalled();
  });

  it('invalida a lista de pedidos depois que a atualização persiste com sucesso', async () => {
    mocks.rpc.mockResolvedValue({ data: { order_data: scheduledSale }, error: null });

    await executeUpdateOrder(
      'pedido-1',
      { observation: 'alteração confirmada' } as any,
      { ...scheduledSale, id: 'pedido-1', orderIndex: 123 } as any
    );

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] });
  });

  it('bloqueia a mudança para quoted em venda antes de chamar a RPC', async () => {
    await expect(
      executeUpdateOrder(
        'pedido-1',
        { status: 'quoted' } as any,
        { ...scheduledSale, id: 'pedido-1', orderIndex: 123 } as any
      )
    ).rejects.toThrow('Somente orçamentos podem ser cadastrados com este status');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('preserva o snapshot fiscal ao cancelar pedido quando currentOrder tem updatedAt e ausência no WeakMap', async () => {
    const originalOrderData = {
      ...scheduledSale,
      items: [{ productId: 'prod-fiscal', quantity: 2, fiscal: { cst: '102' } }],
    };
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { order_data: originalOrderData },
            error: null,
          }),
        }),
      }),
    });
    mocks.rpc.mockResolvedValue({
      data: { order_data: { ...originalOrderData, status: 'cancelled' } },
      error: null,
    });

    await expect(
      executeUpdateOrder(
        'pedido-fiscal-1',
        { status: 'cancelled' } as any,
        {
          ...scheduledSale,
          id: 'pedido-fiscal-1',
          updatedAt: '2026-10-14T01:30:00.000Z',
        } as any
      )
    ).resolves.toBeUndefined();

    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_order_with_inventory_transaction',
      expect.objectContaining({
        p_order_id: 'pedido-fiscal-1',
        p_order_payload: expect.objectContaining({
          status: 'cancelled',
          order_data: expect.objectContaining({
            status: 'cancelled',
            items: originalOrderData.items,
          }),
        }),
      })
    );
  });

  it('usa fallback seguro para merged ao cancelar pedido se banco retornar order_data vazio sem lançar erro', async () => {
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });
    mocks.rpc.mockResolvedValue({
      data: { order_data: { ...scheduledSale, status: 'cancelled' } },
      error: null,
    });

    await expect(
      executeUpdateOrder(
        'pedido-fallback-1',
        { status: 'cancelled' } as any,
        {
          ...scheduledSale,
          id: 'pedido-fallback-1',
          updatedAt: '2026-10-14T01:30:00.000Z',
        } as any
      )
    ).resolves.toBeUndefined();

    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_order_with_inventory_transaction',
      expect.objectContaining({
        p_order_id: 'pedido-fallback-1',
        p_order_payload: expect.objectContaining({
          status: 'cancelled',
        }),
      })
    );
  });

  it('usa uma chave estável de idempotência quando a fixture a fornece', async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: '550e8400-e29b-41d4-a716-446655440010', order_index: 123, order_data: scheduledSale },
      error: null,
    });

    await executeSaveOrder(scheduledSale as any, vi.fn(), {
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440010',
    });

    expect(mocks.rpc.mock.calls[0][1].p_order_id).toBe('550e8400-e29b-41d4-a716-446655440010');
  });

  it('não marca um pedido comum quando o contexto de teste existe e o modo está OFF', async () => {
    bindTestArtifactContext(testIdentity);
    mocks.rpc.mockResolvedValue({
      data: { id: 'pedido-normal', order_index: 123, order_data: scheduledSale },
      error: null,
    });

    await executeSaveOrder(scheduledSale as any, vi.fn());

    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data).not.toHaveProperty('is_test');
    expect(mocks.dispatchNotifications).toHaveBeenCalledTimes(1);
  });

  it('persiste artefato sem número comercial e não notifica nem atualiza contato operacional', async () => {
    bindTestArtifactContext(testIdentity);
    const orderId = '550e8400-e29b-41d4-a716-446655440011';
    const syntheticOrder = {
      ...scheduledSale,
      orderIndex: 123,
      orderNumber: 123,
      customerData: { id: '550e8400-e29b-41d4-a716-446655440012' },
      is_test: true,
    };
    mocks.rpc.mockResolvedValue({
      data: {
        id: orderId,
        order_number: `T-${orderId}`,
        order_index: null,
        order_data: { ...syntheticOrder, orderIndex: undefined, orderNumber: undefined },
      },
      error: null,
    });

    await executeSaveOrder(syntheticOrder as any, vi.fn(), {
      idempotencyKey: orderId,
    });

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data.is_test).toBe(true);
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_index).toBeNull();
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_number).toBe('');
    expect(mocks.getNextOrderIndex).not.toHaveBeenCalled();
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data.testArtifact).toEqual({
      is_test: true,
      ...testIdentity,
    });
    expect(mocks.syncCustomer).not.toHaveBeenCalled();
    expect(mocks.dispatchNotifications).not.toHaveBeenCalled();
  });

  it('bloqueia artefato com chave de idempotência que não seja UUID antes da RPC', async () => {
    bindTestArtifactContext(testIdentity);
    const syntheticOrder = {
      ...scheduledSale,
      customerData: { id: '550e8400-e29b-41d4-a716-446655440012' },
      is_test: true,
    };

    await expect(
      executeSaveOrder(syntheticOrder as any, vi.fn(), { idempotencyKey: 'pedido-de-teste' })
    ).rejects.toThrow('O pedido de teste exige um UUID válido');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.getNextOrderIndex).not.toHaveBeenCalled();
  });

  it('envia somente itens normais vinculados à RPC ao criar ou atender a venda', async () => {
    const items = [
      {
        productId: 'normal', condition: 'novo', quantity: 1,
        fiscalSnapshotVersion: 1, fiscal: { commercialUnit: 'UN', taxableUnit: 'UN' },
      },
      { productId: 'salvado', variationId: 'var-s', condition: 'salvado', quantity: 1 },
      { productId: 'usado', variationId: 'var-u', condition: 'usado', quantity: 1 },
    ];
    const order = { ...scheduledSale, items };
    mocks.rpc.mockResolvedValue({
      data: { id: 'pedido-1', order_index: 123, order_data: order },
      error: null,
    });

    await executeSaveOrder(order as any, vi.fn());
    const createdItems = mocks.rpc.mock.calls[0][1].p_items;
    expect(createdItems.map((item: any) => item.productId)).toEqual([
      'normal',
      undefined,
      undefined,
    ]);
    expect(createdItems.slice(1)).toEqual([
      expect.objectContaining({
        condition: 'salvado', isTemporaryProduct: true, fiscalSnapshotVersion: 1,
        fiscal: { commercialUnit: 'UN', taxableUnit: 'UN' },
      }),
      expect.objectContaining({
        condition: 'usado', isTemporaryProduct: true, fiscalSnapshotVersion: 1,
        fiscal: { commercialUnit: 'UN', taxableUnit: 'UN' },
      }),
    ]);

    mocks.rpc.mockClear();
    await executeUpdateOrder(
      'pedido-1',
      { status: 'fulfilled' } as any,
      {
        ...order,
        id: 'pedido-1',
        orderIndex: 123,
        items: createdItems,
      } as any
    );
    expect(mocks.rpc.mock.calls[0][1].p_items).toEqual(createdItems);
  });

  it('envia todas as formas de pagamento uma única vez ao criar a venda', async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: 'pedido-1', order_index: 123, order_data: scheduledSale },
      error: null,
    });

    await executeSaveOrder({ ...scheduledSale, payments: splitPayments } as any, vi.fn());

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][1].p_payments).toEqual(splitPayments);
  });

  it('mantém todas as formas de pagamento atualizadas ao editar a venda', async () => {
    mocks.rpc.mockResolvedValue({
      data: { order_data: { ...scheduledSale, payments: splitPayments } },
      error: null,
    });
    const current = {
      ...scheduledSale,
      id: 'pedido-1',
      orderIndex: 123,
      payments: [{ method: 'DINHEIRO', amount: 750 }],
    };

    await executeUpdateOrder('pedido-1', { payments: splitPayments } as any, current as any);

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_order_with_inventory_transaction',
      expect.objectContaining({ p_is_update: true, p_payments: splitPayments })
    );
  });

  it('não envia notificação ao editar um pedido de teste', async () => {
    const testOrder = {
      ...scheduledSale,
      id: 'pedido-teste',
      is_test: true,
      orderIndex: 123,
      customerData: { id: 'cliente-teste' },
    };
    mocks.rpc.mockResolvedValue({ data: { order_data: testOrder }, error: null });

    await executeUpdateOrder('pedido-teste', { observation: 'ajuste de teste' } as any, testOrder as any);

    expect(mocks.dispatchUpdateNotifications).not.toHaveBeenCalled();
  });

  it('guarda a versão conferida do pedido dentro da transação comercial e de estoque', async () => {
    mocks.rpc.mockResolvedValue({ data: { order_data: scheduledSale }, error: null });

    await executeUpdateOrder(
      'pedido-1',
      { observation: 'alteração confirmada' } as any,
      { ...scheduledSale, id: 'pedido-1' } as any,
      '2026-10-09T10:00:00.000Z'
    );

    expect(mocks.rpc).toHaveBeenCalledWith(
      'update_order_with_inventory_transaction_if_version',
      expect.objectContaining({
        p_order_id: 'pedido-1',
        p_expected_updated_at: '2026-10-09T10:00:00.000Z',
        p_items: scheduledSale.items,
        p_payments: scheduledSale.payments,
      })
    );
  });

  it('não perde os pagamentos quando salvar um pedido existente pelo fluxo de salvar', async () => {
    const updateOrder = vi.fn().mockResolvedValue(undefined);
    const existingSale = { id: 'pedido-1', payments: splitPayments };

    await expect(executeSaveOrder(existingSale as any, updateOrder)).resolves.toBe('pedido-1');

    expect(updateOrder).toHaveBeenCalledTimes(1);
    expect(updateOrder).toHaveBeenCalledWith('pedido-1', existingSale);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('não grava pedido por fallback quando a RPC ou a movimentação falha', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('falha na movimentação') });

    await expect(executeSaveOrder(scheduledSale as any, vi.fn())).rejects.toThrow(
      'falha na movimentação'
    );
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.recordHistory).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it('bloqueia no serviço/backend agendamento com período de data ou horário inválido antes da RPC', async () => {
    const invalidDateRangeSale = {
      ...scheduledSale,
      shipping: {
        deliveryMethod: 'delivery',
        scheduling: {
          dateType: 'range',
          date: '2026-10-22',
          endDate: '2026-10-20',
          type: 'range',
          startTime: '09:00',
          endTime: '12:00',
        },
      },
    };

    await expect(executeSaveOrder(invalidDateRangeSale as any, vi.fn())).rejects.toThrow(
      'A data final não pode ser anterior à data inicial.'
    );
    expect(mocks.rpc).not.toHaveBeenCalled();

    const invalidTimeRangeSale = {
      ...scheduledSale,
      shipping: {
        deliveryMethod: 'delivery',
        scheduling: {
          dateType: 'fixed',
          date: '2026-10-22',
          endDate: '',
          type: 'range',
          startTime: '14:00',
          endTime: '13:00',
        },
      },
    };

    await expect(
      executeUpdateOrder('pedido-1', invalidTimeRangeSale as any, async () => scheduledSale as any)
    ).rejects.toThrow('O horário final deve ser posterior ao horário inicial.');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
