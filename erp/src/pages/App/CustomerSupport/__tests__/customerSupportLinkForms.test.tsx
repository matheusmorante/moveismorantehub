// @vitest-environment happy-dom
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualLinkModal } from '../components/ManualLinkModal';
import { CustomerInfoPanel } from '../components/CustomerInfoPanel';
import type { WhatsAppConversation } from '../types';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), link: vi.fn(), unlink: vi.fn(), orders: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator' }, profile: { role: 'administrator' } }) }));
vi.mock('@/pages/utils/permissionService', () => ({ canPerform: () => true }));
vi.mock('@/pages/utils/accessRoles', () => ({ getProfileRoles: () => ['administrator'] }));
vi.mock('@/pages/utils/customerSupport/customerMatchingService', async (original) => ({
  ...await original<typeof import('@/pages/utils/customerSupport/customerMatchingService')>(),
  manuallyLinkCustomer: mocks.link, unlinkCustomer: mocks.unlink,
}));
vi.mock('@/pages/utils/customerSupport/supportOrdersService', async (original) => ({
  ...await original<typeof import('@/pages/utils/customerSupport/supportOrdersService')>(), getCustomerOrders: mocks.orders,
}));
const id = '00000000-0000-4000-8000-000000000001';
const row = { id: 'legacy-person-id', full_name: 'Cliente sintético' };
beforeEach(() => {
  mocks.rpc.mockResolvedValue({ data: [row], error: null });
  mocks.link.mockResolvedValue({ success: true });
  mocks.unlink.mockResolvedValue({ success: true });
  mocks.orders.mockResolvedValue([]);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); });
const search = async () => {
  fireEvent.change(screen.getByPlaceholderText('Buscar por nome, CPF/CNPJ ou telefone...'), { target: { value: 'Cliente' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await screen.findByText('Cliente sintético');
};

describe('Resolver e contexto do vínculo', () => {
  it('valida a busca após trim, sem consultar texto vazio', async () => {
    render(<ManualLinkModal isOpen onClose={vi.fn()} onLinked={vi.fn()} conversationId={id} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por nome, CPF/CNPJ ou telefone...'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await screen.findByText('Informe pelo menos 2 caracteres para pesquisar cliente por nome, CPF ou telefone.');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('valida a submissão final antes de vincular', async () => {
    render(<ManualLinkModal isOpen onClose={vi.fn()} onLinked={vi.fn()} conversationId="inválida" />);
    await search();
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));
    await screen.findByRole('alert');
    expect(mocks.link).not.toHaveBeenCalled();
  });

  it('preserva identificadores textuais de cliente e usa o contexto parseado', async () => {
    const linked = vi.fn();
    const close = vi.fn();
    render(<ManualLinkModal isOpen onClose={close} onLinked={linked} conversationId={id} />);
    await search();
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(mocks.link).toHaveBeenCalledWith(expect.any(Object), id, 'legacy-person-id'));
    expect(linked).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('não fecha nem atualiza a reabertura após resposta de um vínculo antigo', async () => {
    let resolve!: (value: { success: boolean }) => void;
    mocks.link.mockReturnValueOnce(new Promise((callback) => { resolve = callback; }));
    const linked = vi.fn();
    const close = vi.fn();
    const { rerender } = render(<ManualLinkModal isOpen onClose={close} onLinked={linked} conversationId={id} />);
    await search();
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(mocks.link).toHaveBeenCalledTimes(1));
    rerender(<ManualLinkModal isOpen={false} onClose={close} onLinked={linked} conversationId={id} />);
    rerender(<ManualLinkModal isOpen onClose={close} onLinked={linked} conversationId={id} />);
    await act(async () => resolve({ success: true }));
    expect(close).not.toHaveBeenCalled();
    expect(linked).not.toHaveBeenCalled();
    expect(screen.queryByText('Cliente sintético')).toBeNull();
  });

  it('descarta resultados de busca de outra conversa', async () => {
    let resolve!: (value: unknown) => void;
    mocks.rpc.mockReturnValueOnce(new Promise((callback) => { resolve = callback; }));
    const props = { isOpen: true, onClose: vi.fn(), onLinked: vi.fn() };
    const { rerender } = render(<ManualLinkModal {...props} conversationId={id} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por nome, CPF/CNPJ ou telefone...'), { target: { value: 'Cliente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    rerender(<ManualLinkModal {...props} conversationId="00000000-0000-4000-8000-000000000002" />);
    await act(async () => resolve({ data: [row], error: null }));
    expect(screen.queryByText('Cliente sintético')).toBeNull();
  });
});

describe('Desvínculo no formulário proprietário', () => {
  const conversation = (conversationId: string) => ({ id: conversationId, customerId: 'legacy-person-id',
    customer: { id: 'legacy-person-id', fullName: 'Cliente sintético' }, contactPhone: '+12025550100',
    customerLinkStatus: 'manually_linked', tags: [], internalNotes: '', lastCustomerMessageAt: null } as unknown as WhatsAppConversation);
  it('rejeita contexto inválido antes da confirmação e do serviço', async () => {
    render(<MemoryRouter><CustomerInfoPanel conversation={conversation('inválida')} messages={[]} isOpen onClose={vi.fn()} onConversationUpdated={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Desvincular' }));
    await screen.findByText('Conversa ou cliente inválido para desvincular.');
    expect(window.confirm).not.toHaveBeenCalled();
    expect(mocks.unlink).not.toHaveBeenCalled();
  });
  it('aplica o resultado confirmado e informa falha sem fingir desvínculo', async () => {
    mocks.unlink.mockResolvedValueOnce({ success: false, error: 'Falha controlada no vínculo.' });
    const updated = vi.fn();
    render(<MemoryRouter><CustomerInfoPanel conversation={conversation(id)} messages={[]} isOpen onClose={vi.fn()} onConversationUpdated={updated} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Desvincular' }));
    await screen.findByText('Falha controlada no vínculo.');
    expect(updated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(updated).toHaveBeenCalledWith(expect.objectContaining({ customerId: null, customerLinkStatus: 'unlinked' })));
  });
});
