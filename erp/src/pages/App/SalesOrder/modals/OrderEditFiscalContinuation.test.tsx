// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '@/pages/types/order.type';
import type { FiscalOrderEditReplacement } from '@/pages/utils/nfe/orderEditFiscalService';

const service = vi.hoisted(() => ({
  cancelFiscalDocumentForOrderEdit: vi.fn(),
  consultOrderEditOriginal: vi.fn(),
  finalizeFiscalOrderEdit: vi.fn(),
  resumeFiscalOrderEdit: vi.fn(),
}));
const requestState = vi.hoisted(() => ({
  clearFiscalEmissionRequest: vi.fn(),
}));
vi.mock('@/pages/utils/nfe/orderEditFiscalService', () => service);
vi.mock('@/pages/utils/nfe/nfeEmissionRequestState', () => requestState);
vi.mock('../../FiscalDocuments/modals/NfeOperationDraftModal', () => ({
  default: ({ sourceDocument, initialDraftId, onAuthorized }: any) => (
    <button onClick={onAuthorized}>
      Revisão {sourceDocument.id} {initialDraftId}
    </button>
  ),
}));
vi.mock('../OrderActions/NfeEmissionModal', () => ({
  default: ({ order, initialEnvironment, onSuccess }: any) => (
    <button onClick={onSuccess}>
      Emissão {order.items[0].description} {initialEnvironment}
    </button>
  ),
}));
vi.mock('@/pages/utils/nfeEmissionSnapshotService', () => ({
  prepareOrderFiscalSnapshotForEmission: vi.fn((order) => Promise.resolve(order)),
}));
import OrderEditFiscalContinuation from './OrderEditFiscalContinuation';

const original = {
  id: 'TEST_AUT_order',
  status: 'scheduled',
  items: [{ description: 'Sofá e mesa' }],
} as Order;
const edited = { ...original, items: [{ description: 'Só sofá' }] } as Order;
const replacement: FiscalOrderEditReplacement = {
  id: 'replacement',
  status: 'awaiting_reversal',
  action: 'cancel',
  environment: 2,
  reversalConfirmed: false,
  draftId: null,
  replacementDocumentId: null,
  sourceDocument: {
    id: 'original',
    order_id: original.id!,
    modelo: '55',
    ambiente: 2,
    numero_nfe: 10,
    serie: '1',
    chave_acesso: 'TEST_AUT_key',
  },
};
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  service.resumeFiscalOrderEdit.mockResolvedValue({ order: original, replacements: [replacement] });
});

describe('continuação da substituição fiscal', () => {
  it('não transmite ao abrir, exige reversão e retoma o pedido atualizado antes da emissão', async () => {
    render(
      <OrderEditFiscalContinuation order={original} replacements={[replacement]} onClose={vi.fn()} />
    );
    expect(service.cancelFiscalDocumentForOrderEdit).not.toHaveBeenCalled();
    expect(screen.queryByText('Aplicar alterações ao pedido')).toBeNull();
    expect(screen.queryByText('Conferir e emitir nova nota')).toBeNull();
    service.resumeFiscalOrderEdit.mockResolvedValueOnce({
      order: original,
      replacements: [{ ...replacement, reversalConfirmed: true }],
    });
    fireEvent.click(screen.getByText('Cancelar original em Homologação'));
    await waitFor(() => expect(screen.getByText('Aplicar alterações ao pedido')).toBeTruthy());
    expect(service.cancelFiscalDocumentForOrderEdit).toHaveBeenCalledWith(
      expect.objectContaining({ replacementId: 'replacement', environment: 2 })
    );
    service.resumeFiscalOrderEdit.mockResolvedValue({
      order: edited,
      replacements: [{ ...replacement, reversalConfirmed: true, status: 'ready_to_reissue' }],
    });
    fireEvent.click(screen.getByText('Aplicar alterações ao pedido'));
    await waitFor(() => {
      expect(service.finalizeFiscalOrderEdit).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'TEST_AUT_order' })
      );
      expect(screen.queryByText('Aplicar alterações ao pedido')).toBeNull();
      expect(screen.queryByText('Conferindo a etapa fiscal…')).toBeNull();
    });
    fireEvent.click(screen.getByText('Conferir e emitir nova nota'));
    await waitFor(() => expect(screen.getByText('Emissão Só sofá 2')).toBeTruthy());
    expect(requestState.clearFiscalEmissionRequest).toHaveBeenCalledWith('TEST_AUT_order', 2);
  });

  it('fecha automaticamente a continuação quando a nova emissão conclui a substituição', async () => {
    const onClose = vi.fn();
    const readyReplacement: FiscalOrderEditReplacement = {
      ...replacement,
      reversalConfirmed: true,
      status: 'ready_to_reissue',
    };
    service.resumeFiscalOrderEdit.mockResolvedValue({
      order: edited,
      replacements: [readyReplacement],
    });
    render(
      <OrderEditFiscalContinuation
        order={edited}
        replacements={[readyReplacement]}
        onClose={onClose}
      />
    );
    expect(requestState.clearFiscalEmissionRequest).toHaveBeenCalledWith('TEST_AUT_order', 2);
    fireEvent.click(screen.getByText('Conferir e emitir nova nota'));
    await waitFor(() => expect(screen.getByText('Emissão Só sofá 2')).toBeTruthy());

    // When emission succeeds and trigger completes the replacement:
    service.resumeFiscalOrderEdit.mockResolvedValueOnce({ order: edited, replacements: [] });
    fireEvent.click(screen.getByText('Emissão Só sofá 2'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith(edited);
    });
  });

  it('permite concluir e fechar quando não há mais substituições pendentes', () => {
    const onClose = vi.fn();
    render(<OrderEditFiscalContinuation order={edited} replacements={[]} onClose={onClose} />);
    expect(
      screen.getByText(
        'Substituição concluída. A nova nota está vinculada à original e o histórico fiscal foi preservado.'
      )
    ).toBeTruthy();
    const button = screen.getByText('Concluir');
    fireEvent.click(button);
    expect(onClose).toHaveBeenCalledWith(edited);
  });

  it('abre o rascunho integral de estorno e mantém a proposta sem aplicar antes da autorização', () => {
    render(
      <OrderEditFiscalContinuation
        order={original}
        replacements={[{ ...replacement, action: 'estorno', draftId: 'draft' }]}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Revisar estorno integral'));
    expect(screen.getByText('Revisão original draft')).toBeTruthy();
    expect(service.finalizeFiscalOrderEdit).not.toHaveBeenCalled();
    expect(service.cancelFiscalDocumentForOrderEdit).not.toHaveBeenCalled();
  });

  it('mantém a pendência após timeout e consulta sem reenviar automaticamente', async () => {
    service.cancelFiscalDocumentForOrderEdit.mockRejectedValue(
      new Error('Consulte antes de repetir.')
    );
    render(
      <OrderEditFiscalContinuation order={original} replacements={[replacement]} onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Cancelar original em Homologação'));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Consulte antes de repetir.')
    );
    expect(screen.queryByText('Aplicar alterações ao pedido')).toBeNull();
    fireEvent.click(screen.getByText('Consultar cancelamento na SEFAZ'));
    await waitFor(() => expect(service.consultOrderEditOriginal).toHaveBeenCalledWith('original'));
    expect(service.cancelFiscalDocumentForOrderEdit).toHaveBeenCalledTimes(1);
  });

  it('aguarda reversão em todos os ambientes e bloqueia cliques repetidos', async () => {
    service.cancelFiscalDocumentForOrderEdit.mockReturnValue(new Promise(() => {}));
    render(
      <OrderEditFiscalContinuation
        order={original}
        replacements={[
          { ...replacement, reversalConfirmed: true },
          { ...replacement, id: 'production', environment: 1 },
        ]}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Aplicar alterações ao pedido')).toBeNull();
    const button = screen.getByText('Cancelar original em Produção');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(service.cancelFiscalDocumentForOrderEdit).toHaveBeenCalledTimes(1);
  });
});
