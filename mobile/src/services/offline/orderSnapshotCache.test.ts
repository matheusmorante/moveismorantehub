import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), from: vi.fn(), connectivity: { connected: true } }));
vi.mock('../supabaseClient', () => ({ supabase: { from: mocks.from } }));
vi.mock('../../repositories/OrderRepository', () => ({ OrderRepository: { list: mocks.list, saveLocal: mocks.save } }));
vi.mock('./connectivityService', () => ({ connectivityService: mocks.connectivity }));
import { refreshOfflineOrderSnapshots } from './orderSnapshotCache';

beforeEach(() => { vi.resetAllMocks(); mocks.connectivity.connected = true; });
describe('atualização incremental dos snapshots offline', () => {
  it('baixa somente os pedidos ausentes ou alterados e preserva edições locais pendentes', async () => {
    mocks.list.mockResolvedValue([
      { id: 'current', updatedAt: 'same', version: 1, orderData: {} },
      { id: 'changed', updatedAt: 'old', version: 1, orderData: {} },
      { id: 'pending', updatedAt: 'old', orderData: {}, isPendingLocal: true },
    ]);
    const query: any = { select: vi.fn(() => query), in: vi.fn().mockResolvedValue({ data: [{ id: 'changed', status: 'scheduled', updated_at: 'new', version: 2, order_data: { items: [{ fiscal: { ncm: '9403' } }] } }], error: null }) };
    mocks.from.mockReturnValue(query);
    await refreshOfflineOrderSnapshots([
      { id: 'current', updated_at: 'same', version: 1 }, { id: 'changed', updated_at: 'new', version: 2 },
      { id: 'missing', updated_at: 'new', version: 1 }, { id: 'pending', updated_at: 'new', version: 2 },
    ]);
    expect(query.in).toHaveBeenCalledWith('id', ['changed', 'missing']);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'changed', orderData: { items: [{ fiscal: { ncm: '9403' } }] } }), { preservePending: true });
  });
  it('consulta somente metadados locais se tudo já estiver atualizado; offline não usa a rede', async () => {
    mocks.list.mockResolvedValue([{ id: 'current', updatedAt: 'same', version: 1, orderData: {} }]);
    await refreshOfflineOrderSnapshots([{ id: 'current', updated_at: 'same', version: 1 }]);
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.connectivity.connected = false;
    await refreshOfflineOrderSnapshots([{ id: 'new', updated_at: 'new' }]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
