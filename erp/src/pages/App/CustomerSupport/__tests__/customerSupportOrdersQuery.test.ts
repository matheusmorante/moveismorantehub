import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCustomerOrders, mapOrderToSupportSummary } from '@/pages/utils/customerSupport/supportOrdersService';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const client = (response: unknown) => ({ rpc: vi.fn().mockReturnValue(response) }) as any;

describe('Consulta de pedidos — falha não é lista vazia', () => {
  it.each(['canceled', 'cancelled', 'cancelado'])('marca o status %s como cancelado no painel', (status) => {
    const order = mapOrderToSupportSummary({ id: 'test-order', order_number: 'T-TEST', status, items: [], total_amount: 0 });
    expect(order.isCanceled).toBe(true);
    expect(order.isActive).toBe(false);
  });

  it.each(['canceled', 'cancelled'])('marca entrega %s como cancelada', (deliveryStatus) => {
    const order = mapOrderToSupportSummary({ id: 'test-order', order_number: 'T-TEST', status: 'pending',
      delivery_status: deliveryStatus, items: [], total_amount: 0 });
    expect(order.isCanceled).toBe(true);
    expect(order.isActive).toBe(false);
  });

  it('mantém o vazio legítimo e o contrato da consulta restrita', async () => {
    const supabase = client(Promise.resolve({ data: [], error: null }));
    expect(await getCustomerOrders(supabase, 'legacy-person-id')).toEqual([]);
    expect(supabase.rpc).toHaveBeenCalledWith('customer_support_list_customer_orders', { p_customer_id: 'legacy-person-id' });
  });

  it('não consulta sem contexto de cliente', async () => {
    const supabase = client(Promise.resolve({ data: [], error: null }));
    expect(await getCustomerOrders(supabase, '')).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('informa recusa comercial sem apresentar ausência de pedidos', async () => {
    const supabase = client(Promise.resolve({ data: null, error: { code: '42501', message: 'CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED' } }));
    await expect(getCustomerOrders(supabase, 'legacy-person-id')).rejects.toThrow('Você não tem permissão para consultar os pedidos deste cliente.');
  });

  it('trata erro retornado e resposta inválida sem expor detalhe técnico', async () => {
    await expect(getCustomerOrders(client(Promise.resolve({ data: null, error: { code: '500', message: 'detalhe interno' } })), 'customer'))
      .rejects.toThrow('Não foi possível carregar os pedidos deste cliente. Tente novamente.');
    await expect(getCustomerOrders(client(Promise.resolve({ data: {}, error: null })), 'customer'))
      .rejects.toThrow('Não foi possível carregar os pedidos deste cliente. Tente novamente.');
  });

  it('sanitiza falha de transporte', async () => {
    const response = Promise.resolve().then(() => { throw new Error('detalhe interno da conexão'); });
    await expect(getCustomerOrders(client(response), 'customer'))
      .rejects.toThrow('Não foi possível carregar os pedidos deste cliente. Tente novamente.');
  });

  it('encerra consulta pendente em 15s como falha, sem confirmar vazio', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const pending = getCustomerOrders(client(new Promise(() => undefined)), 'customer');
    const assertion = expect(pending).rejects.toThrow('Não foi possível carregar os pedidos deste cliente. Tente novamente.');
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
