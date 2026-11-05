import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), get: vi.fn(), save: vi.fn(), overlay: vi.fn(), cached: vi.fn(), connectivity: { connected: true } }));
vi.mock('./supabaseClient', () => ({ supabase: { from: mocks.from } }));
vi.mock('../repositories/OrderRepository', () => ({ OrderRepository: { getById: mocks.get, saveLocal: mocks.save, overlayPendingLocalOrders: mocks.overlay } }));
vi.mock('./offline/connectivityService', () => ({ connectivityService: mocks.connectivity }));
vi.mock('./offline/offlineStorageService', () => ({ offlineStorageService: { getWorkingSet: mocks.cached } }));
import { loadMobileOrderDetails } from './orderDetailsReadService';

beforeEach(() => {
  vi.resetAllMocks(); mocks.connectivity.connected = true;
  mocks.overlay.mockImplementation(async (rows) => rows); mocks.get.mockResolvedValue(null); mocks.cached.mockResolvedValue(null);
});
describe('detalhes de pedidos e cache offline', () => {
  it('carrega dados completos atuais antes da ação e salva sem sobrescrever mudanças pendentes', async () => {
    const full = { id: 'order', status: 'scheduled', order_type: 'sale', version: 9, updated_at: 'current', order_data: { items: [{ fiscal: { ncm: '9403' } }] } };
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn().mockResolvedValue({ data: full, error: null }) };
    mocks.from.mockReturnValue(query);
    expect(await loadMobileOrderDetails({ id: 'order', order_data: { __orderSummary: true, items: [{ description: 'Mesa' }] } }))
      .toMatchObject({ ...full, __orderSummary: false });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ orderData: full.order_data, version: 9 }), { preservePending: true });
  });
  it('usa somente o snapshot completo já salvo quando não há conexão', async () => {
    mocks.connectivity.connected = false;
    mocks.get.mockResolvedValue({ id: 'order', status: 'scheduled', orderData: { items: [{ description: 'Mesa', fiscal: {} }] } });
    expect(await loadMobileOrderDetails({ id: 'order', __orderSummary: true })).toMatchObject({ order_data: { items: [{ description: 'Mesa', fiscal: {} }] } });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('recusa um resumo offline como detalhe completo e preserva erro de permissão online', async () => {
    mocks.connectivity.connected = false;
    mocks.get.mockResolvedValue({ id: 'order', orderData: { __orderSummary: true } });
    await expect(loadMobileOrderDetails({ id: 'order', __orderSummary: true })).rejects.toThrow('salvos no aparelho');
    mocks.connectivity.connected = true;
    const query: any = { select: () => query, eq: () => query, maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { code: '42501' } }) };
    mocks.from.mockReturnValue(query);
    await expect(loadMobileOrderDetails({ id: 'order', __orderSummary: true })).rejects.toMatchObject({ code: '42501' });
  });
});
