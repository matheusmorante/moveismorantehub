// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '@/pages/types/order.type';
import type { FiscalOrderEditReplacement } from '@/pages/utils/nfe/orderEditFiscalService';

const service = vi.hoisted(() => ({ cancelFiscalDocumentForOrderEdit: vi.fn(), consultOrderEditOriginal: vi.fn(), finalizeFiscalOrderEdit: vi.fn(), resumeFiscalOrderEdit: vi.fn() }));
vi.mock('@/pages/utils/nfe/orderEditFiscalService', () => service);
vi.mock('../../FiscalDocuments/modals/NfeOperationDraftModal', () => ({ default: ({ sourceDocument, initialDraftId, onAuthorized }: any) => <button onClick={onAuthorized}>Revisão {sourceDocument.id} {initialDraftId}</button> }));
vi.mock('../OrderActions/NfeEmissionModal', () => ({ default: ({ order, initialEnvironment, onSuccess }: any) => <button onClick={onSuccess}>Emissão {order.items[0].description} {initialEnvironment}</button> }));
import OrderEditFiscalContinuation from './OrderEditFiscalContinuation';

const original = { id: 'TEST_AUT_order', status: 'scheduled', items: [{ description: 'Sofá e mesa' }] } as Order;
const edited = { ...original, items: [{ description: 'Só sofá' }] } as Order;
const replacement: FiscalOrderEditReplacement = {
  id: 'replacement', status: 'awaiting_reversal', action: 'cancel', environment: 2,
  reversalConfirmed: false, draftId: null, replacementDocumentId: null,
  sourceDocument: { id: 'original', order_id: original.id!, modelo: '55', ambiente: 2, numero_nfe: 10, serie: '1', chave_acesso: 'TEST_AUT_key' },
};
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  service.resumeFiscalOrderEdit.mockResolvedValue({ order: original, replacements: [replacement] });
});

describe('continuação da substituição fiscal', () => {
  it('não transmite ao abrir, exige reversão e retoma o pedido atualizado antes da emissão', async () => {
    render(<OrderEditFiscalContinuation order={original} replacements={[replacement]} onClose={vi.fn()} />);
    expect(service.cancelFiscalDocumentForOrderEdit).not.toHaveBeenCalled();
    expect(screen.queryByText('Aplicar alterações ao pedido')).toBeNull();
    expect(screen.queryByText('Conferir e emitir nova nota')).toBeNull();
    service.resumeFiscalOrderEdit.mockResolvedValueOnce({ order: original, replacements: [{ ...replacement, reversalConfirmed: true }] });
    fireEvent.click(screen.getByText('Cancelar original em Homologação'));
    await waitFor(() => expect(screen.getByText('Aplicar alterações ao pedido')).toBeTruthy());
    expect(service.cancelFiscalDocumentForOrderEdit).toHaveBeenCalledWith(expect.objectContaining({ replacementId: 'replacement', environment: 2 }));
    service.resumeFiscalOrderEdit.mockResolvedValueOnce({ order: edited, replacements: [{ ...replacement, reversalConfirmed: true, status: 'ready_to_reissue' }] });
    fireEvent.click(screen.getByText('Aplicar alterações ao pedido'));
    await waitFor(() => expect(screen.getByText('Conferir e emitir nova nota')).toBeTruthy());
    fireEvent.click(screen.getByText('Conferir e emitir nova nota'));
    expect(screen.getByText('Emissão Só sofá 2')).toBeTruthy();
  });

  it('abre o rascunho integral de estorno e mantém a proposta sem aplicar antes da autorização', () => {
    render(<OrderEditFiscalContinuation order={original} replacements={[{ ...replacement, action: 'estorno', draftId: 'draft' }]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Revisar estorno integral'));
    expect(screen.getByText('Revisão original draft')).toBeTruthy();
    expect(service.finalizeFiscalOrderEdit).not.toHaveBeenCalled();
    expect(service.cancelFiscalDocumentForOrderEdit).not.toHaveBeenCalled();
  });

  it('mantém a pendência após timeout e consulta sem reenviar automaticamente', async () => {
    service.cancelFiscalDocumentForOrderEdit.mockRejectedValue(new Error('Consulte antes de repetir.'));
    render(<OrderEditFiscalContinuation order={original} replacements={[replacement]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Cancelar original em Homologação'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Consulte antes de repetir.'));
    expect(screen.queryByText('Aplicar alterações ao pedido')).toBeNull();
    fireEvent.click(screen.getByText('Consultar cancelamento na SEFAZ'));
    await waitFor(() => expect(service.consultOrderEditOriginal).toHaveBeenCalledWith('original'));
    expect(service.cancelFiscalDocumentForOrderEdit).toHaveBeenCalledTimes(1);
  });

  it('aguarda reversão em todos os ambientes e bloqueia cliques repetidos', async () => {
    service.cancelFiscalDocumentForOrderEdit.mockReturnValue(new Promise(() => {}));
    render(<OrderEditFiscalContinuation order={original} replacements={[{ ...replacement, reversalConfirmed: true }, { ...replacement, id: 'production', environment: 1 }]} onClose={vi.fn()} />);
    expect(screen.queryByText('Aplicar alterações ao pedido')).toBeNull();
    const button = screen.getByText('Cancelar original em Produção');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(service.cancelFiscalDocumentForOrderEdit).toHaveBeenCalledTimes(1);
  });
});
