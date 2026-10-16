// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ManageInboundInvoiceMappingsModal } from './ManageInboundInvoiceMappingsModal';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
const mocks = vi.hoisted(() => ({ save: vi.fn(), suppliers: vi.fn(), mappings: vi.fn(), result: undefined as unknown }));
vi.mock('@/pages/utils/inboundNfe/inboundInvoicesService', () => ({ saveInboundInvoice: mocks.save }));
vi.mock('@/pages/utils/personService', () => ({ fetchPersons: mocks.suppliers }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({ findProductSupplierCodes: mocks.mappings }));
vi.mock('@/pages/utils/inboundNfe/inboundXmlParser', () => ({ parseInboundNfeXml: vi.fn() }));
vi.mock('@/pages/App/Registrations/shared/modals/PersonFormModal', () => ({ default: () => null }));
vi.mock('@/components/SupplierAutocomplete', () => ({ default: ({ onSelect, disabled }: any) => <button disabled={disabled} onClick={() => onSelect(' supplier-2 ')}>Trocar fornecedor</button> }));
vi.mock('../components/InboundInvoiceItemsReview', () => ({ InboundInvoiceItemsReview: ({ items, onChange }: any) => <>
  <pre data-testid="items">{JSON.stringify(items)}</pre>
  <button onClick={async () => { mocks.result = await onChange(1, { ncm: '9403.60.00', sellingPrice: 0 }); }}>Alterar NCM</button>
  <button onClick={async () => { mocks.result = await onChange(1, { sellingPrice: -1 }); }}>Preço inválido</button>
</> }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
const invoice: InboundInvoice = { id: 'invoice-1', nfeNumber: '1', supplierId: 'supplier-1', rawXml: '<original/>', rawExtraction: { keep: true },
  nfeKey: '', series: '1', issuedAt: '2026-10-16', emitterCnpj: '', emitterName: 'Fornecedor', recipientCnpj: '', recipientName: '',
  totalProducts: 10, totalFreight: 0, totalIpi: 0, totalInvoice: 10, itemsCount: 1, status: 'pending',
  items: [{ itemNumber: 1, productCode: 'F-1', productDescription: 'Mesa', quantity: 1, unitCost: 10, totalCost: 10, ncm: '94036000', cfop: '1102', unit: 'UN' }] };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => { vi.clearAllMocks(); mocks.result = undefined; mocks.save.mockReset().mockImplementation(async (value) => value); mocks.suppliers.mockReset().mockResolvedValue([]); mocks.mappings.mockReset().mockResolvedValue(new Map()); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('resolver aguarda confirmação e refresh, conserva snapshot e entrega NCM parseado/zero', async () => {
  const save = deferred<InboundInvoice>(), refresh = deferred<void>(); mocks.save.mockReturnValueOnce(save.promise); const success = vi.fn(() => refresh.promise), close = vi.fn();
  render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={close} onSaveSuccess={success} />);
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull()); fireEvent.click(screen.getByText('Alterar NCM'));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
  const payload = mocks.save.mock.calls[0][0]; expect(payload).toMatchObject({ rawXml: '<original/>', rawExtraction: { keep: true }, items: [{ ncm: '94036000', sellingPrice: 0, unitCost: 10 }] });
  expect(mocks.save.mock.calls[0][1]).toMatchObject({ requireConfirmation: true, assertCurrent: expect.any(Function) });
  expect(JSON.parse(screen.getByTestId('items').textContent!)[0].sellingPrice).toBeUndefined();
  fireEvent.click(screen.getByText('Alterar NCM')); fireEvent.click(screen.getByLabelText('Fechar janela')); expect(close).not.toHaveBeenCalled(); expect(mocks.save).toHaveBeenCalledOnce();
  await act(async () => { save.resolve(payload); }); await waitFor(() => expect(success).toHaveBeenCalledOnce()); expect(mocks.result).not.toBe(true);
  await act(async () => { refresh.resolve(); }); await waitFor(() => expect(mocks.result).toBe(true)); expect(JSON.parse(screen.getByTestId('items').textContent!)[0].sellingPrice).toBe(0);
});
it('preço inválido não chega ao serviço nem muda snapshot', async () => {
  render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={vi.fn()} onSaveSuccess={vi.fn()} />);
  fireEvent.click(screen.getByText('Preço inválido')); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('preço válido'));
  expect(mocks.save).not.toHaveBeenCalled(); expect(JSON.parse(screen.getByTestId('items').textContent!)[0].sellingPrice).toBeUndefined();
});
it('fornecedor parseado só é publicado após o serviço confirmar', async () => {
  render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={vi.fn()} onSaveSuccess={vi.fn()} />);
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull()); fireEvent.click(screen.getByText('Trocar fornecedor'));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce()); expect(mocks.save.mock.calls[0][0].supplierId).toBe('supplier-2');
});
it('erro remoto preserva snapshot e bloqueia replay na nota', async () => {
  mocks.save.mockRejectedValueOnce(new Error('Gravação sem confirmação')); const success = vi.fn();
  render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={vi.fn()} onSaveSuccess={success} />); fireEvent.click(screen.getByText('Alterar NCM'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Confira a nota')); expect(success).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Alterar NCM')); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('sem confirmação')); expect(mocks.save).toHaveBeenCalledOnce();
});
it('falha no refresh conserva gravação confirmada e não a repete', async () => {
  const success = vi.fn().mockRejectedValueOnce(new Error('Refresh'));
  render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={vi.fn()} onSaveSuccess={success} />); fireEvent.click(screen.getByText('Alterar NCM'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Vínculos salvos')); expect(mocks.result).toBe(true); expect(mocks.save).toHaveBeenCalledOnce();
});
it('troca de nota descarta confirmação antiga e não chama refresh', async () => {
  const save = deferred<InboundInvoice>(); mocks.save.mockReturnValueOnce(save.promise); const success = vi.fn(), close = vi.fn();
  const view = render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={close} onSaveSuccess={success} />); fireEvent.click(screen.getByText('Alterar NCM')); await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
  view.rerender(<ManageInboundInvoiceMappingsModal isOpen invoice={{ ...invoice, id: 'invoice-2', nfeNumber: '2' }} onClose={close} onSaveSuccess={success} />);
  await act(async () => { save.resolve(mocks.save.mock.calls[0][0]); }); await waitFor(() => expect(mocks.result).toBe(false)); expect(success).not.toHaveBeenCalled();
});
it.each(['suppliers', 'mappings', 'save'] as const)('timeout de %s libera espera e descarta resposta tardia', async (stage) => {
  vi.useFakeTimers(); const pending = deferred<any>(); mocks[stage].mockReturnValueOnce(pending.promise); const success = vi.fn();
  render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={vi.fn()} onSaveSuccess={success} />);
  if (stage === 'save') fireEvent.click(screen.getByText('Alterar NCM'));
  await act(async () => { await vi.advanceTimersByTimeAsync(stage === 'save' ? 30001 : 15001); });
  expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.queryByRole('status')).toBeNull();
  await act(async () => { pending.resolve(stage === 'save' ? invoice : stage === 'suppliers' ? [] : new Map()); }); expect(success).not.toHaveBeenCalled();
});
