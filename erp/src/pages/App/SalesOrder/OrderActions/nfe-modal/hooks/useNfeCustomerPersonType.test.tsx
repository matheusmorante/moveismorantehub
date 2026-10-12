// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPersonById } from '@/pages/utils/personService';
import { useNfeCustomerPersonType } from './useNfeCustomerPersonType';

vi.mock('@/pages/utils/personService', () => ({ fetchPersonById: vi.fn() }));
vi.mock('../../../../../../../../src/telemetry/nfeEmissionPerformance', () => ({
  withNfeEmissionStage: (_stage: string, operation: () => unknown) => operation(),
}));

describe('dados fiscais do cliente na emissão', () => {
  afterEach(() => vi.resetAllMocks());

  it('usa a identificação fiscal do pedido sem consultar o cadastro do cliente', () => {
    const order = {
      id: 'order-with-customer-snapshot',
      customerData: {
        id: 'customer-1',
        personType: 'PJ',
        cpfCnpj: '11222333000181',
      },
    } as any;

    const { result } = renderHook(() => useNfeCustomerPersonType(order));

    expect(fetchPersonById).not.toHaveBeenCalled();
    expect(result.current.isLoadingCustomerType).toBe(false);
    expect(result.current.customerPersonType).toBe('PJ');
    expect(result.current.emissionOrder).toBe(order);
  });

  it('consulta cadastro somente quando o pedido não tem identificação fiscal utilizável', async () => {
    vi.mocked(fetchPersonById).mockResolvedValue({
      id: 'customer-2',
      personType: 'PF',
      cpfCnpj: '12345678909',
    } as any);
    const order = {
      id: 'legacy-order-without-customer-snapshot',
      customerData: { id: 'customer-2' },
    } as any;

    const { result } = renderHook(() => useNfeCustomerPersonType(order));

    await waitFor(() => expect(result.current.isLoadingCustomerType).toBe(false));

    expect(fetchPersonById).toHaveBeenCalledWith('customer-2');
    expect(result.current.customerPersonType).toBe('PF');
    expect(result.current.emissionOrder?.customerData?.cpfCnpj).toBe('12345678909');
  });
});
