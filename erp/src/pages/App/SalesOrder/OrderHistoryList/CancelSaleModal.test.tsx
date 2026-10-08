// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CancelSaleModal from './CancelSaleModal';

describe('modal de cancelamento da venda', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('explica o efeito fiscal e bloqueia confirmação repetida', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    render(
      <CancelSaleModal
        order={{ status: 'scheduled', stockProcessed: true } as any}
        preview={{ action: 'cancel', hasAuthorizedInvoice: true, model: '55', environment: 1 }}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog').textContent).toContain(
      'Movimentações de saída vinculadas serão revertidas uma vez'
    );
    expect(screen.getByRole('dialog').textContent).toContain(
      'A NF-e modelo 55 autorizada em Produção será cancelada junto à SEFAZ'
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const confirm = screen
      .getAllByRole('button')
      .find((button) => button.textContent === 'Cancelar venda')!;
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('explica o estorno quando a política fiscal determina essa saída', () => {
    render(
      <CancelSaleModal
        order={{ status: 'scheduled', stockProcessed: false } as any}
        preview={{ action: 'estorno', hasAuthorizedInvoice: true, model: '55', environment: 2 }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const dialog = screen.getAllByRole('dialog').at(-1)!;
    expect(dialog.textContent).toContain('A NF-e original de Homologação permanecerá autorizada no histórico');
    expect(dialog.textContent).toContain('rascunho de NF-e modelo 55 de estorno para revisão fiscal');
    expect(dialog.textContent).toContain('a transmissão à SEFAZ acontece somente depois dessa revisão');
    expect(dialog.textContent).toContain('Não há saída de estoque registrada para reverter');
  });
});
