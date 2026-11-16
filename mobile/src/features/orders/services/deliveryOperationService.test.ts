import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  get: vi.fn(), queue: vi.fn(), release: vi.fn(), process: vi.fn(), cache: vi.fn(),
  queueItem: vi.fn(), connectivity: { connected: false },
}));
vi.mock('../../../repositories/OrderRepository', () => ({ OrderRepository: { getById: mocks.get } }));
vi.mock('../../../repositories/SyncQueueRepository', () => ({ SyncQueueRepository: { getById: mocks.queueItem } }));
vi.mock('../../../services/offline/connectivityService', () => ({ connectivityService: mocks.connectivity }));
vi.mock('../../../services/offline/offlineSyncManager', () => ({ offlineSyncManager: {
  recordEvent: mocks.queue, releaseDeferredEvent: mocks.release, processQueue: mocks.process,
} }));
vi.mock('./deliveryOrderCacheSync', () => ({ syncLocalOrderCaches: mocks.cache }));
import { saveDeliveryOperation } from './deliveryOperationService';

describe('fila de entregas independentes', () => {
  beforeEach(() => {
    vi.resetAllMocks(); mocks.connectivity.connected = false;
    mocks.get.mockResolvedValue(null); mocks.queue.mockResolvedValue({ eventId: 'event-1' });
  });
  it('registra a alteração antes do cache e preserva a outra operação offline', async () => {
    const current = { payments: [{ amount: 20, status: 'Pago' }], deliveryOperations: {
      first: { revision: 3, deliveryStatus: 'completed' }, second: { revision: 1 },
    } };
    const result = await saveDeliveryOperation({ orderId: 'order', operationId: 'second', currentData: current,
      type: 'DELIVERY_START_ROUTE', patch: { deliveryStatus: 'in_progress' } });
    expect(mocks.queue).toHaveBeenCalledWith('DELIVERY_START_ROUTE', 'order', 'order',
      expect.objectContaining({ operationId: 'second', expectedOperationRevision: 1 }),
      { deferProcessing: true, requireActor: true });
    expect(mocks.queue.mock.invocationCallOrder[0]).toBeLessThan(mocks.cache.mock.invocationCallOrder[0]);
    expect(mocks.release).toHaveBeenCalledWith('event-1');
    expect(result.updatedData.deliveryOperations.first).toEqual(current.deliveryOperations.first);
    expect(result.updatedData.deliveryOperations.second).toEqual({ revision: 2, deliveryStatus: 'in_progress' });
    expect(result.updatedData.payments).toEqual(current.payments);
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it('não altera o cache quando a fila não consegue guardar o evento', async () => {
    mocks.queue.mockRejectedValue(new Error('sem armazenamento'));
    await expect(saveDeliveryOperation({ orderId: 'order', operationId: 'second', currentData: {},
      type: 'DELIVERY_START_ROUTE', patch: {} })).rejects.toThrow('sem armazenamento');
    expect(mocks.cache).not.toHaveBeenCalled();
  });
  it('comunica conflito da operação ou de pagamentos compartilhados ao usuário', async () => {
    mocks.connectivity.connected = true;
    mocks.queueItem.mockResolvedValue({ status: 'conflict' });
    await expect(saveDeliveryOperation({ orderId: 'order', operationId: 'second', currentData: {},
      type: 'DELIVERY_FINISH', patch: {}, payments: [{ amount: 20, status: 'Pago' }], expectedPayments: [] }))
      .rejects.toThrow('outro aparelho');
  });
  it('impede atribuir um andamento legado do pedido inteiro a uma operação arbitrária', async () => {
    await expect(saveDeliveryOperation({ orderId: 'order', operationId: 'second',
      currentData: { deliveryStatus: 'in_progress', deliveryStartedAt: 'legacy' },
      type: 'DELIVERY_START_ROUTE', patch: {} })).rejects.toThrow('andamento anterior');
    expect(mocks.queue).not.toHaveBeenCalled();
  });
});
