// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type Order from '@/pages/types/order.type';
import { useNfeEmissionModalState } from './useNfeEmissionModalState';
import type { UseNfeEmissionModalStateProps } from './useNfeEmissionModalState';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {}, isTestEnvironment: false }));

describe('useNfeEmissionModalState recipient CPF prefill', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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
});
