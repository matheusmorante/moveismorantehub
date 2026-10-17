// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CancelSaleModal from './CancelSaleModal';

vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
const order = { id: 'sale-1', status: 'scheduled', stockProcessed: true } as any;
const preview = { action: 'cancel', hasAuthorizedInvoice: true, environment: 1 as const } as const;
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const ready = async () => { await act(async () => { vi.advanceTimersByTime(3000); }); fireEvent.click(screen.getByRole('checkbox')); };
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('proprietário da confirmação de cancelamento', () => {
  it('aguarda o callback com ações e fechamento bloqueados', async () => {
    vi.useFakeTimers(); const pending = deferred<boolean>(); const onConfirm = vi.fn(() => pending.promise); const onCancel = vi.fn();
    render(<CancelSaleModal order={order} preview={preview} onConfirm={onConfirm} onCancel={onCancel} />);
    await ready();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancelar venda' })); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveProperty('disabled', true);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar modal de cancelamento de venda' }));
    expect(onCancel).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(true); });
    expect(screen.getByRole('button', { name: 'Cancelar venda' })).toHaveProperty('disabled', true);
  });

  it('mostra recusa conhecida e permite uma nova confirmação', async () => {
    vi.useFakeTimers(); const onConfirm = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<CancelSaleModal order={order} preview={preview} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await ready();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancelar venda' })); });
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível confirmar');
    expect(screen.getByRole('button', { name: 'Cancelar venda' })).toHaveProperty('disabled', false);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancelar venda' })); });
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('reinicia a revisão e a confirmação de Produção quando muda a venda', async () => {
    vi.useFakeTimers(); const onConfirm = vi.fn(); const props = { order, preview, onConfirm, onCancel: vi.fn() };
    const view = render(<CancelSaleModal {...props} />); await ready();
    view.rerender(<CancelSaleModal {...props} order={{ ...order, id: 'sale-2' }} />);
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
    expect(screen.getByRole('button', { name: /Cancelar venda \(3s\)/ })).toHaveProperty('disabled', true);
  });

  it('bloqueia resultado incerto e ignora sucesso depois do prazo', async () => {
    vi.useFakeTimers(); const pending = deferred<boolean>(); const onConfirm = vi.fn(() => pending.promise);
    render(<CancelSaleModal order={order} preview={preview} onConfirm={onConfirm} onCancel={vi.fn()} />); await ready();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancelar venda' })); });
    await act(async () => { vi.advanceTimersByTime(45000); });
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmado no prazo');
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Cancelar venda' })).toHaveProperty('disabled', true);
    await act(async () => { pending.resolve(true); });
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmado no prazo'); expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('apresenta falha inesperada do callback sem repetir a operação', async () => {
    vi.useFakeTimers(); const onConfirm = vi.fn().mockRejectedValue(new Error('Resposta perdida.'));
    render(<CancelSaleModal order={order} preview={preview} onConfirm={onConfirm} onCancel={vi.fn()} />); await ready();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancelar venda' })); });
    expect(screen.getByRole('alert').textContent).toContain('Resposta perdida');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar venda' })); expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('invalida a continuação de outro pedido e não aplica seu erro ao novo contexto', async () => {
    vi.useFakeTimers(); const pending = deferred<boolean>(); let current!: () => boolean;
    const onConfirm = vi.fn((_options, isCurrent: () => boolean) => { current = isCurrent; return pending.promise; });
    const options = { order, preview, onConfirm, onCancel: vi.fn() }; const view = render(<CancelSaleModal {...options} />); await ready();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancelar venda' })); });
    expect(current()).toBe(true); view.rerender(<CancelSaleModal {...options} order={{ ...order, id: 'sale-2' }} />); expect(current()).toBe(false);
    await act(async () => { pending.resolve(false); }); expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
  });
});
