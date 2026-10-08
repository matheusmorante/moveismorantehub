// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FormFooter from '../FormFooter';
import type Order from '@/pages/types/order.type';

const baseProps = {
  currentOrder: { orderType: 'sale' } as Order,
  totalOrderValue: 0,
  isSaving: false,
  draftAutoSaveStatus: 'idle' as const,
  showDraftAutoSave: false,
  onCompleteOrder: vi.fn(),
  currentStep: 5,
};

describe('FormFooter modo teste', () => {
  afterEach(() => cleanup());

  it('apresenta estado discreto desligado e chama a alteração ao ligar', () => {
    const onTestModeChange = vi.fn();
    const { getByRole, queryByText } = render(
      <FormFooter {...baseProps} showTestMode onTestModeChange={onTestModeChange} />
    );

    const toggle = getByRole('switch', { name: 'Modo teste' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(toggle.textContent).toBe('OFF');
    expect(queryByText('Este pedido será criado como pedido de teste.')).toBeNull();

    fireEvent.click(toggle);
    expect(onTestModeChange).toHaveBeenCalledWith(true);
  });

  it('destaca o estado ligado e informa que o pedido será de teste', () => {
    const { getByRole, getByText } = render(
      <FormFooter
        {...baseProps}
        showTestMode
        isTestMode
        onTestModeChange={vi.fn()}
      />
    );

    expect(getByRole('switch', { name: 'Modo teste' }).getAttribute('aria-checked')).toBe('true');
    expect(getByText('Este pedido será criado como pedido de teste.')).toBeTruthy();
  });

  it('não mostra o controle em pedidos que não são venda', () => {
    const { queryByRole } = render(
      <FormFooter
        {...baseProps}
        currentOrder={{ orderType: 'budget' } as Order}
        showTestMode
        onTestModeChange={vi.fn()}
      />
    );

    expect(queryByRole('switch', { name: 'Modo teste' })).toBeNull();
  });
});
