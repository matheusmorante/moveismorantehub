import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('../../../services/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
import { applyOptimizedSequence } from './routeOptimizationService';

describe('sequência por operação', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.rpc.mockResolvedValue({ data: true, error: null }); });
  it('envia as duas operações do mesmo pedido sem gravar um resumo como pedido completo', async () => {
    expect(await applyOptimizedSequence([
      { order: { id: 'order', scheduleAppointment: { appointmentId: 'two' }, order_data: { __orderSummary: true } } },
      { order: { id: 'order', scheduleAppointment: { appointmentId: 'one' }, order_data: { __orderSummary: true } } },
    ] as any)).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('set_order_operation_route_sequences', { p_updates: [
      { orderId: 'order', operationId: 'two', sequence: 1 },
      { orderId: 'order', operationId: 'one', sequence: 2 },
    ] });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('recusa uma resposta sem confirmação', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'indisponível' } });
    expect(await applyOptimizedSequence([{ order: { id: 'order' } }] as any)).toBe(false);
  });
});
