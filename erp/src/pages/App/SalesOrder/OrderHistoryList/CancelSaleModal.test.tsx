// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CancelSaleModal from './CancelSaleModal';

describe('modal de cancelamento da venda', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('explica o efeito fiscal e bloqueia confirmação repetida', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    render(
      <CancelSaleModal
        order={{ status: 'scheduled', stockProcessed: true } as any}
        preview={{ action: 'cancel', hasAuthorizedInvoice: true, model: '55' }}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog').textContent).toContain('Movimentações de saída vinculadas serão revertidas uma vez');
    expect(screen.getByRole('dialog').textContent).toContain('A NF-e modelo 55 autorizada será cancelada junto à SEFAZ');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    const confirm = screen.getByRole('button', { name: 'Cancelar venda', exact: true });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('explica o estorno quando a política fiscal determina essa saída', () => {
    render(
      <CancelSaleModal
        order={{ status: 'scheduled', stockProcessed: false } as any}
        preview={{ action: 'estorno', hasAuthorizedInvoice: true, model: '55' }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const dialog = screen.getAllByRole('dialog').at(-1)!;
    expect(dialog.textContent).toContain('A NF-e original permanecerá no histórico');
    expect(dialog.textContent).toContain('Não há saída de estoque registrada para reverter');
  });
});
