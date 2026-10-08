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
    expect(screen.getByRole('dialog').textContent).toContain('Cancelamento fiscal disponível');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const confirm = screen
      .getAllByRole('button')
      .find((button) => button.textContent === 'Cancelar venda')!;
    const productionConfirmation = screen.getByRole('checkbox', {
      name: /Confirmo a solicitação de cancelamento desta nota na SEFAZ de Produção/,
    });
    expect(confirm.disabled).toBe(true);
    fireEvent.click(productionConfirmation);
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({ productionConfirmed: true });
  });

  it('explica o estorno NFE específico sem mensagem genérica de revisão', () => {
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
    expect(dialog.textContent).toContain('rascunho NFE (NF-e modelo 55, finalidade de ajuste 3)');
    expect(dialog.textContent).toContain('Estorno fiscal necessário');
    expect(dialog.textContent).toContain('conferência específica de CFOP e tributação');
    expect(dialog.textContent).not.toContain('exige revisão fiscal antes de qualquer procedimento');
    expect(dialog.textContent).toContain('Não há saída de estoque registrada para reverter');
  });

  it('encaminha pedido entregue para a devolução sem anunciar cancelamento comercial', () => {
    render(
      <CancelSaleModal
        order={{ status: 'fulfilled', stockProcessed: true } as any}
        preview={{
          action: 'return',
          hasAuthorizedInvoice: true,
          model: '55',
          environment: 2,
          reason: 'Este pedido já foi entregue. Inicie a devolução e selecione os itens.',
        }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Devolução necessária');
    expect(dialog.textContent).toContain('A venda e a NF-e original serão preservadas');
    expect(dialog.textContent).toContain('nenhuma devolução integral será criada automaticamente');
    expect(dialog.textContent).not.toContain('Pedido será cancelado');
  });

  it('remove a confirmação quando a circulação está em trânsito sem retorno confirmado', () => {
    render(
      <CancelSaleModal
        order={{ status: 'scheduled', stockProcessed: true } as any}
        preview={{
          action: 'blocked',
          hasAuthorizedInvoice: true,
          reason: 'Confirme recusa ou retorno da mercadoria antes de decidir.',
        }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Nenhuma alteração será aplicada');
    expect(dialog.textContent).toContain('Confirme recusa ou retorno da mercadoria');
    expect(screen.queryByRole('button', { name: /Cancelar venda/ })).toBeNull();
  });
});
