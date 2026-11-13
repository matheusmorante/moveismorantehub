// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type Order from '@/pages/types/order.type';
import { useNfeEmissionModalState } from './useNfeEmissionModalState';
import type { UseNfeEmissionModalStateProps } from './useNfeEmissionModalState';

const { supabaseMock, fetchFiscalStatusesMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
  },
  fetchFiscalStatusesMock: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: supabaseMock,
  isTestEnvironment: false,
}));
vi.mock('@/pages/utils/nfe/orderFiscalBadgeService', () => ({
  fetchOrderFiscalBadgeStatuses: fetchFiscalStatusesMock,
}));

describe('useNfeEmissionModalState recipient CPF prefill', () => {
  beforeEach(() => {
    fetchFiscalStatusesMock.mockReset();
    fetchFiscalStatusesMock.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('skips the auxiliary status lookup when an environment is already supplied', () => {
    const order = { id: 'order-explicit-environment' } as Order;
    const setEnvironment = vi.fn();
    const props: UseNfeEmissionModalStateProps = {
      isOpen: true,
      order,
      emissionOrder: order,
      isLoadingCustomerType: false,
      initialEnvironment: 2,
      environment: 1,
      setEnvironment,
      setRecipientTaxId: vi.fn(),
      fiscalFieldError: null,
      recipientTaxIdError: null,
      emissionResult: null,
    };

    renderHook(() => useNfeEmissionModalState(props));

    expect(fetchFiscalStatusesMock).not.toHaveBeenCalled();
    expect(setEnvironment).toHaveBeenCalledWith(2);
  });

  it('keeps the status lookup when no environment was supplied', async () => {
    const order = { id: 'order-inferred-environment' } as Order;
    const props: UseNfeEmissionModalStateProps = {
      isOpen: true,
      order,
      emissionOrder: order,
      isLoadingCustomerType: false,
      environment: 1,
      setEnvironment: vi.fn(),
      setRecipientTaxId: vi.fn(),
      fiscalFieldError: null,
      recipientTaxIdError: null,
      emissionResult: null,
    };

    renderHook(() => useNfeEmissionModalState(props));

    await waitFor(() => {
      expect(fetchFiscalStatusesMock).toHaveBeenCalledWith(['order-inferred-environment']);
    });
  });

  it('prefills the customer document once and preserves a manual edit for that order', async () => {
    const order = {
      id: 'order-1',
      customerData: { cpfCnpj: '12345678909' },
    } as Order;
    const props: UseNfeEmissionModalStateProps = {
      isOpen: true,
      order: null,
      emissionOrder: order,
      isLoadingCustomerType: false,
      environment: 2,
      setEnvironment: vi.fn(),
      setRecipientTaxId: vi.fn(),
      fiscalFieldError: null,
      recipientTaxIdError: null,
      emissionResult: null,
    };
    const { result, rerender } = renderHook(
      (currentProps) => {
        const [recipientTaxId, setRecipientTaxId] = useState('');
        useNfeEmissionModalState({ ...currentProps, setRecipientTaxId });
        return { recipientTaxId, setRecipientTaxId };
      },
      { initialProps: props }
    );

    await waitFor(() => expect(result.current.recipientTaxId).toBe('123.456.789-09'));

    act(() => result.current.setRecipientTaxId('987.654.321-00'));

    const changedCustomerData = {
      ...order,
      customerData: { cpfCnpj: '11122233344' },
    } as Order;
    rerender({
      ...props,
      emissionOrder: changedCustomerData,
    });
    expect(result.current.recipientTaxId).toBe('987.654.321-00');

    rerender({
      ...props,
      isOpen: false,
      emissionOrder: changedCustomerData,
    });
    rerender({
      ...props,
      emissionOrder: changedCustomerData,
    });

    expect(result.current.recipientTaxId).toBe('987.654.321-00');
  });

  it('waits for the registered customer document before prefilling the field', async () => {
    const order = {
      id: 'order-2',
      customerData: { id: 'customer-2', cpfCnpj: '99999999999' },
    } as Order;
    const registeredOrder = {
      ...order,
      customerData: { id: 'customer-2', personType: 'PJ', cpfCnpj: '12345678000190' },
    } as Order;
    const props: UseNfeEmissionModalStateProps = {
      isOpen: true,
      order: null,
      emissionOrder: order,
      isLoadingCustomerType: true,
      environment: 2,
      setEnvironment: vi.fn(),
      setRecipientTaxId: vi.fn(),
      fiscalFieldError: null,
      recipientTaxIdError: null,
      emissionResult: null,
    };
    const { result, rerender } = renderHook(
      (currentProps) => {
        const [recipientTaxId, setRecipientTaxId] = useState('');
        useNfeEmissionModalState({ ...currentProps, setRecipientTaxId });
        return { recipientTaxId };
      },
      { initialProps: props }
    );

    expect(result.current.recipientTaxId).toBe('');
    rerender({ ...props, emissionOrder: registeredOrder, isLoadingCustomerType: false });
    await waitFor(() => expect(result.current.recipientTaxId).toBe('12.345.678/0001-90'));
  });

  it('preenche o CPF do destinatário a partir do draft fiscal quando o pedido não tem CPF cadastrado', async () => {
    const orderWithDraft = {
      id: 'order-draft-cpf',
      customerData: { id: 'cust-draft', fullName: 'Cliente Sem CPF' },
      nfeDraft: {
        '2': {
          recipientTaxId: '04692941243',
          items: [],
        },
      },
    } as unknown as Order;

    const props: UseNfeEmissionModalStateProps = {
      isOpen: true,
      order: null,
      emissionOrder: orderWithDraft,
      isLoadingCustomerType: false,
      environment: 2,
      setEnvironment: vi.fn(),
      setRecipientTaxId: vi.fn(),
      fiscalFieldError: null,
      recipientTaxIdError: null,
      emissionResult: null,
    };

    const { result } = renderHook(
      (currentProps) => {
        const [recipientTaxId, setRecipientTaxId] = useState('');
        useNfeEmissionModalState({ ...currentProps, setRecipientTaxId });
        return { recipientTaxId };
      },
      { initialProps: props }
    );

    await waitFor(() => expect(result.current.recipientTaxId).toBe('046.929.412-43'));
  });

  it('recupera o CPF da 1ª nota autorizada no banco quando o pedido e o draft estão sem documento', async () => {
    const orderWithPriorDoc = {
      id: 'order-prior-doc',
      customerData: { id: 'cust-prior', fullName: 'Daiane Soares' },
    } as unknown as Order;

    supabaseMock.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  destinatario_documento: null,
                  xml_nfe: '<NFe><infNFe><dest><CPF>04692941243</CPF></dest></infNFe></NFe>',
                  status: 'homologada',
                  document_type: 'outbound',
                },
              ],
            }),
          }),
        }),
      }),
    });

    const props: UseNfeEmissionModalStateProps = {
      isOpen: true,
      order: null,
      emissionOrder: orderWithPriorDoc,
      isLoadingCustomerType: false,
      environment: 2,
      setEnvironment: vi.fn(),
      setRecipientTaxId: vi.fn(),
      fiscalFieldError: null,
      recipientTaxIdError: null,
      emissionResult: null,
    };

    const { result } = renderHook(
      (currentProps) => {
        const [recipientTaxId, setRecipientTaxId] = useState('');
        useNfeEmissionModalState({ ...currentProps, setRecipientTaxId });
        return { recipientTaxId };
      },
      { initialProps: props }
    );

    await waitFor(() => expect(result.current.recipientTaxId).toBe('046.929.412-43'));
  });
});
