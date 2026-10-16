// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PriceLabelDataFillModal, type PriceLabelDataFillModalProps } from '../modals/PriceLabelDataFillModal';
import { searchProductsForLabelResult } from '../services/priceLabelCatalogService';
import { toast } from 'react-toastify';
vi.mock('../services/priceLabelCatalogService', () => ({ searchProductsForLabelResult: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const product = { id: ' product-1 ', name: '  mesa de jantar  ', description: 'Mesa', code: 'M1', unit_price: 0, promo_price: 0, images: [] };
const initial = { title: 'COLCHÃO', normalPrice: '499,00', promoPrice: '399', centsText: ',00', currencySymbol: 'R$', installments: '10x sem juros' };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function setup(overrides: Partial<PriceLabelDataFillModalProps> = {}) {
  const props = { ...initial, isOpen: true, ownerKey: 'layout-1', onClose: vi.fn(), onApplyData: vi.fn().mockResolvedValue(true), onApplyProductTitle: vi.fn().mockResolvedValue(true), ...overrides };
  const view = render(<PriceLabelDataFillModal {...props} />);
  return { props, ...view };
}
const manual = () => fireEvent.click(screen.getByText('Preenchimento Manual'));
const submit = () => fireEvent.click(screen.getByText('Aplicar na Etiqueta'));
const search = (value: string) => fireEvent.change(screen.getByPlaceholderText('Digite o nome, código ou SKU do produto...'), { target: { value } });
beforeEach(() => { vi.clearAllMocks(); vi.mocked(searchProductsForLabelResult).mockResolvedValue({ data: [], error: null }); vi.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('dados da etiqueta com resolver real e rascunho por abertura', () => {
  it('não consulta nem aplica quando fechado', () => {
    const s = setup({ isOpen: false }); expect(screen.queryByRole('dialog')).toBeNull(); expect(searchProductsForLabelResult).not.toHaveBeenCalled(); expect(s.props.onApplyData).not.toHaveBeenCalled();
  });

  it('mantém rascunho local e aplica um snapshot parseado completo somente ao confirmar', async () => {
    const s = setup(); manual();
    fireEvent.change(screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...'), { target: { value: 'mesa especial' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: 499,00'), { target: { value: 'R$ 0,00' } });
    expect(s.props.onApplyData).not.toHaveBeenCalled(); expect(s.props.onApplyProductTitle).not.toHaveBeenCalled(); submit();
    await waitFor(() => expect(s.props.onClose).toHaveBeenCalledTimes(1));
    expect(s.props.onApplyData).toHaveBeenCalledWith({ ...initial, title: 'MESA ESPECIAL', normalPrice: 'R$ 0,00' }, expect.any(Function));
    expect(toast.success).toHaveBeenCalledWith('Campos atualizados na etiqueta!');
  });

  it('cancelar descarta rascunho e a próxima abertura parte dos valores do proprietário', () => {
    const s = setup(); manual(); fireEvent.change(screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...'), { target: { value: 'RASCUNHO' } });
    fireEvent.click(screen.getByLabelText('Fechar dados da etiqueta')); expect(s.props.onClose).toHaveBeenCalledOnce(); expect(s.props.onApplyData).not.toHaveBeenCalled();
    s.rerender(<PriceLabelDataFillModal {...s.props} isOpen={false} />); s.rerender(<PriceLabelDataFillModal {...s.props} />); manual();
    expect((screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...') as HTMLInputElement).value).toBe(initial.title);
  });

  it('bloqueia repetição, edição e Escape até confirmar o callback', async () => {
    const request = deferred<boolean>(), callback = vi.fn(() => request.promise), s = setup({ onApplyData: callback }); manual(); submit(); submit();
    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toContain('aplicando'); expect(screen.getByText('Aplicar na Etiqueta').closest('fieldset')!.disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); fireEvent.click(screen.getByLabelText('Fechar dados da etiqueta')); expect(s.props.onClose).not.toHaveBeenCalled();
    await act(async () => { request.resolve(true); }); expect(s.props.onClose).toHaveBeenCalledTimes(1);
  });

  it.each(['false', 'throw'])('mostra erro de callback %s e mantém dados sem anunciar sucesso', async (kind) => {
    const callback = vi.fn(async () => { if (kind === 'throw') throw new Error('Falha de aplicação'); return false; });
    const s = setup({ onApplyData: callback }); manual(); submit();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(s.props.onClose).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
    expect((screen.getByText('Aplicar na Etiqueta') as HTMLButtonElement).disabled).toBe(false); expect(screen.getByText('Aplicar na Etiqueta').closest('fieldset')!.disabled).toBe(false);
  });

  it('rejeita estrutura manual inválida antes de chamar o proprietário', async () => {
    const s = setup({ normalPrice: 999 as unknown as string }); manual(); submit();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(s.props.onApplyData).not.toHaveBeenCalled(); expect(s.props.onClose).not.toHaveBeenCalled();
  });

  it('consulta com termo parseado e aplica somente o nome do produto pelo resolver', async () => {
    vi.mocked(searchProductsForLabelResult).mockResolvedValue({ data: [product], error: null }); const s = setup(); search('  mesa  ');
    const button = await screen.findByRole('button', { name: 'Aplicar nome de mesa de jantar' });
    expect(searchProductsForLabelResult).toHaveBeenCalledWith('mesa'); fireEvent.click(button);
    await waitFor(() => expect(s.props.onClose).toHaveBeenCalledTimes(1));
    expect(s.props.onApplyProductTitle).toHaveBeenCalledWith('MESA DE JANTAR', expect.any(Function)); expect(s.props.onApplyData).not.toHaveBeenCalled();
  });

  it('mostra falha da nuvem junto do cache válido e não publica registros malformados', async () => {
    vi.mocked(searchProductsForLabelResult).mockResolvedValueOnce({ data: [product], error: new Error('Offline') }); setup();
    expect(await screen.findByRole('button', { name: 'Aplicar nome de mesa de jantar' })).toBeTruthy(); expect(screen.getByRole('alert').textContent).toContain('resultados locais');
    vi.mocked(searchProductsForLabelResult).mockResolvedValueOnce({ data: [{ ...product, id: '' }], error: null }); search('outro');
    await waitFor(() => expect(searchProductsForLabelResult).toHaveBeenLastCalledWith('outro'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Aplicar nome de mesa de jantar' })).toBeNull());
  });

  it('permite repetir a consulta pelo mesmo resolver e encerra consulta sem resposta', async () => {
    vi.useFakeTimers(); const request = deferred<Awaited<ReturnType<typeof searchProductsForLabelResult>>>(); vi.mocked(searchProductsForLabelResult).mockReturnValueOnce(request.promise); setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(16_150); });
    expect(screen.getByRole('alert').textContent).toContain('consulta na nuvem'); expect(screen.queryByRole('status')).toBeNull();
    vi.mocked(searchProductsForLabelResult).mockResolvedValueOnce({ data: [product], error: null });
    fireEvent.click(screen.getByText('Tentar consulta novamente'));
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(screen.getByRole('button', { name: 'Aplicar nome de mesa de jantar' })).toBeTruthy(); expect(searchProductsForLabelResult).toHaveBeenCalledTimes(2);
    await act(async () => { request.resolve({ data: [], error: null }); });
    expect(screen.getByRole('button', { name: 'Aplicar nome de mesa de jantar' })).toBeTruthy();
  });

  it('ignora resultado de consulta antigo quando a busca muda', async () => {
    const old = deferred<Awaited<ReturnType<typeof searchProductsForLabelResult>>>(); vi.mocked(searchProductsForLabelResult).mockReturnValueOnce(old.promise); setup();
    await waitFor(() => expect(searchProductsForLabelResult).toHaveBeenCalledTimes(1));
    vi.mocked(searchProductsForLabelResult).mockResolvedValueOnce({ data: [{ ...product, id: 'novo', name: 'ATUAL' }], error: null }); search('atual');
    expect(await screen.findByRole('button', { name: 'Aplicar nome de ATUAL' })).toBeTruthy();
    await act(async () => { old.resolve({ data: [product], error: null }); });
    expect(screen.queryByRole('button', { name: 'Aplicar nome de mesa de jantar' })).toBeNull(); expect(screen.getByRole('button', { name: 'Aplicar nome de ATUAL' })).toBeTruthy();
  });

  it('não fecha nova abertura após callback da abertura antiga', async () => {
    const request = deferred<boolean>(), callback = vi.fn(() => request.promise), s = setup({ onApplyData: callback }); manual(); submit(); await waitFor(() => expect(callback).toHaveBeenCalled());
    s.rerender(<PriceLabelDataFillModal {...s.props} ownerKey="layout-2" />); const dialog = screen.getByRole('dialog');
    await act(async () => { request.resolve(true); });
    expect(screen.getByRole('dialog')).toBe(dialog); expect(s.props.onClose).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
    expect((callback.mock.calls[0] as unknown as [unknown, () => boolean])[1]()).toBe(false);
  });

  it('limita callback a 15s, bloqueia repetição e descarta sucesso tardio', async () => {
    vi.useFakeTimers(); const request = deferred<boolean>(), callback = vi.fn(() => request.promise), s = setup({ onApplyData: callback }); manual(); submit();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); }); expect(callback).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); expect((screen.getByText('Aplicar na Etiqueta') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { request.resolve(true); }); expect(s.props.onClose).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
  });
});
