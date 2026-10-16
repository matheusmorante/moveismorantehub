// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendWhatsAppModal } from '@/components/shared/SendWhatsAppModal';
const mocks = vi.hoisted(() => ({ send: vi.fn(), warning: vi.fn() }));
vi.mock('@/pages/utils/whatsappGraphService', () => ({ whatsappGraphService: { sendTextMessage: mocks.send } }));
vi.mock('react-toastify', () => ({ toast: { warning: mocks.warning, error: vi.fn(), success: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); vi.restoreAllMocks(); });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
describe('message form boundary', () => {
  it('blocks an invalid recipient before invoking the service', async () => {
    render(<SendWhatsAppModal isOpen onClose={vi.fn()} initialPhone="123" initialMessage="Pedido pronto" />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Agora' }));
    await waitFor(() => expect(mocks.warning).toHaveBeenCalled());
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('passes normalized phone and original message to the service', async () => {
    mocks.send.mockResolvedValue(undefined);
    render(<SendWhatsAppModal isOpen onClose={vi.fn()} initialPhone="(41) 99999-9999" initialMessage="  Pedido pronto  " />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Agora' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith('41999999999', '  Pedido pronto  '));
  });
  it('awaits send and callbacks under a shared lock', async () => {
    const send = deferred<void>(), success = deferred<void>(); const onClose = vi.fn(), onSuccess = vi.fn(() => success.promise);
    mocks.send.mockReturnValueOnce(send.promise); const open = vi.spyOn(window, 'open');
    render(<SendWhatsAppModal isOpen onClose={onClose} onSuccess={onSuccess} initialPhone="41999999999" initialMessage="Pedido" />);
    fireEvent.click(screen.getByText('Enviar Agora')); fireEvent.click(screen.getByText('Link Manual')); fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce()); expect(onClose).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled();
    await act(async () => { send.resolve(); }); await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce()); expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeTruthy(); await act(async () => { success.resolve(); }); await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
  it('shows known failure and preserves input for explicit retry', async () => {
    mocks.send.mockRejectedValueOnce(new Error('Rejeitado')).mockResolvedValueOnce(undefined);
    const close = vi.fn(); render(<SendWhatsAppModal isOpen onClose={close} initialPhone="41999999999" initialMessage="Pedido" />);
    fireEvent.click(screen.getByText('Enviar Agora')); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Rejeitado')); expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Enviar Agora')); await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
  it('manual action preserves empty sharing contract and encoded message', async () => {
    const popup = { opener: window }; const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window); const close = vi.fn();
    render(<SendWhatsAppModal isOpen onClose={close} initialMessage="Produto & preço" />); fireEvent.click(screen.getByText('Link Manual'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://api.whatsapp.com/send?text=Produto%20%26%20pre%C3%A7o', '_blank'));
    expect(popup.opener).toBeNull(); expect(mocks.send).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
  });
  it('blocked popup is visible and does not close', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null); const close = vi.fn();
    render(<SendWhatsAppModal isOpen onClose={close} />); fireEvent.click(screen.getByText('Link Manual'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('bloqueou')); expect(close).not.toHaveBeenCalled();
  });
  it('old opening cannot close a new recipient or publish callbacks', async () => {
    const send = deferred<void>(); mocks.send.mockReturnValueOnce(send.promise); const close = vi.fn(), success = vi.fn();
    const view = render(<SendWhatsAppModal isOpen onClose={close} onSuccess={success} initialPhone="41999999999" initialMessage="Pedido" />);
    fireEvent.click(screen.getByText('Enviar Agora')); await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    view.rerender(<SendWhatsAppModal isOpen onClose={close} onSuccess={success} initialPhone="41988888888" initialMessage="Outro" />);
    await act(async () => { send.resolve(); }); expect(close).not.toHaveBeenCalled(); expect(success).not.toHaveBeenCalled();
  });
  it('timeout releases UI and blocks replay even after reopening', async () => {
    vi.useFakeTimers(); const send = deferred<void>(); mocks.send.mockReturnValueOnce(send.promise); const close = vi.fn(), success = vi.fn();
    const props = { isOpen: true, onClose: close, onSuccess: success, initialPhone: '41999999999', initialMessage: 'Pedido' };
    const view = render(<SendWhatsAppModal {...props} />); fireEvent.click(screen.getByText('Enviar Agora'));
    await act(async () => { await vi.advanceTimersByTimeAsync(30001); }); expect(screen.getByRole('alert').textContent).toContain('Confira o WhatsApp');
    view.rerender(<SendWhatsAppModal {...props} isOpen={false} />); view.rerender(<SendWhatsAppModal {...props} />);
    fireEvent.click(screen.getByText('Enviar Agora')); await act(async () => { await vi.advanceTimersByTimeAsync(0); }); expect(mocks.send).toHaveBeenCalledOnce();
    await act(async () => { send.resolve(); }); expect(close).not.toHaveBeenCalled(); expect(success).not.toHaveBeenCalled();
  });
});

