// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendWhatsAppModal } from '@/components/shared/SendWhatsAppModal';
const mocks = vi.hoisted(() => ({ send: vi.fn(), warning: vi.fn() }));
vi.mock('@/pages/utils/whatsappGraphService', () => ({ whatsappGraphService: { sendTextMessage: mocks.send } }));
vi.mock('react-toastify', () => ({ toast: { warning: mocks.warning, error: vi.fn(), success: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
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
});

