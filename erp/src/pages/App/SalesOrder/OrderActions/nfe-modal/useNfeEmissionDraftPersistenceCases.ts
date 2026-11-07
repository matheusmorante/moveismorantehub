import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';

type NfeEmissionDraftPersistenceCaseDependencies = {
  mocks: any;
  order: any;
  useNfeEmission: (order: any) => any;
};

export function registerNfeEmissionDraftPersistenceCases({
  mocks,
  order,
  useNfeEmission,
}: NfeEmissionDraftPersistenceCaseDependencies): void {
  it('preserva em fila o último rascunho quando outro salvamento ainda está pendente', async () => {
    let finishFirst!: () => void;
    mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    const { result } = renderHook(() => useNfeEmission({ ...order, id: 'queued-outbound-draft' }));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.handleUpdateItemFiscal(0, { ncm: '94035000' }));
    let first!: Promise<void>;
    act(() => { first = result.current.handleSaveDraft(); });
    await waitFor(() => expect(mocks.updateOrder).toHaveBeenCalledTimes(1));
    act(() => result.current.handleUpdateItemFiscal(0, { ncm: '94036000' }));
    let second!: Promise<void>;
    act(() => { second = result.current.handleSaveDraft(); });
    expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    await act(async () => { finishFirst(); await Promise.all([first, second]); });
    expect(mocks.updateOrder).toHaveBeenCalledTimes(2);
    const [firstChanges, lastChanges] = mocks.updateOrder.mock.calls.map((call) => call[1]);
    const environment = String(result.current.environment);
    expect(firstChanges.nfeDraft[environment].items[0].fiscal.ncm).toBe('94035000');
    expect(lastChanges.nfeDraft[environment].items[0].fiscal.ncm).toBe('94036000');
    expect(mocks.updateOrder.mock.calls.every((call) => call[4]?.metadataOnly === true)).toBe(true);
  });

  it('valida cada rascunho da fila e mantém a edição válida depois de um CPF inválido', async () => {
    let finishFirst!: () => void;
    mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    const { result } = renderHook(() => useNfeEmission({ ...order, id: 'validated-outbound-queue', customerData: { personType: 'PF', cpfCnpj: '52998224725' } }));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.setEnvironment(1));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    let first!: Promise<void>;
    act(() => { first = result.current.handleSaveDraft(); });
    await waitFor(() => expect(mocks.updateOrder).toHaveBeenCalledTimes(1));
    act(() => result.current.setRecipientTaxId('11111111111'));
    let invalid!: Promise<void>;
    act(() => { invalid = result.current.handleSaveDraft(); });
    act(() => result.current.setRecipientTaxId('11144477735'));
    let last!: Promise<void>;
    act(() => { last = result.current.handleSaveDraft(); });
    await act(async () => { finishFirst(); await Promise.all([first, invalid, last]); });
    expect(mocks.updateOrder).toHaveBeenCalledTimes(2);
    const changes = mocks.updateOrder.mock.calls[1][1];
    expect(changes.nfeDraft[String(result.current.environment)].recipientTaxId).toBe('11144477735');
    expect(changes).not.toHaveProperty('customerData');
    expect(mocks.toast).toHaveBeenCalled();
  });

  it('descarta os dados preenchidos no modal e restaura o rascunho fiscal anterior', async () => {
    const id = 'discard-outbound-draft';
    const originalDraft = {
      recipientTaxId: '12345678909',
      acquisitionPurpose: 'use_consumption',
      items: [],
    };
    const sourceOrder = { ...order, id, nfeDraft: { '1': originalDraft } };
    mocks.persistedOrders.set(id, { ...sourceOrder, updatedAt: '2026-10-27T12:00:00.000Z' });
    const { result } = renderHook(() => useNfeEmission(sourceOrder));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.setEnvironment(1));
    await waitFor(() => expect(result.current.environment).toBe(1));
    act(() => result.current.setRecipientTaxId('11144477735'));

    await act(async () => { await result.current.handleSaveDraft(); });
    expect(mocks.persistedOrders.get(id).nfeDraft['1'].recipientTaxId).toBe('11144477735');
    expect(mocks.persistedOrders.get(id).customerData).toEqual(sourceOrder.customerData);

    await act(async () => { expect(await result.current.discardNfeDraft()).toBe(true); });
    expect(mocks.persistedOrders.get(id).nfeDraft['1']).toEqual(originalDraft);
    expect(mocks.updateOrder).toHaveBeenCalledTimes(2);
  });
}
