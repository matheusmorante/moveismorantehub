// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerSupport from '../Index';

const mocks = vi.hoisted(() => ({ removeFolder: vi.fn(), error: vi.fn(), success: vi.fn(),
  userId: '00000000-0000-4000-8000-000000000002', folder: {
    id: '00000000-0000-4000-8000-000000000001', name: 'Pasta própria',
    createdBy: '00000000-0000-4000-8000-000000000002', criteria: {},
  } }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.userId }, profile: { role: 'administrator' } }) }));
vi.mock('@/pages/utils/permissionService', () => ({ canPerform: () => true }));
vi.mock('@/pages/utils/accessRoles', () => ({ getProfileRoles: () => ['administrator'] }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/customerSupport/customerSupportService', () => ({ fetchTeamProfiles: async () => [] }));
vi.mock('../hooks', () => ({
  useCustomerSupportFolders: () => ({ folders: [mocks.folder], selectedFolder: null, removeFolder: mocks.removeFolder }),
  useCustomerSupportConversations: () => ({ conversations: [], selectedConversation: null, filter: 'all', search: '', isLoadingConversations: false }),
  useCustomerSupportMessages: () => ({ messages: [] }),
  useCustomerSupportActions: () => ({}),
}));
vi.mock('../components', () => ({
  NavigationRail: () => null, ConversationSidebar: () => null, ChatArea: () => null, CustomerInfoPanel: () => null,
  ActivityTimelineDrawer: () => null, EmptyChatState: () => null, UsageConsumptionModal: () => null,
  InboxSidebar: (props: { onDeleteFolder: (folder: unknown) => void }) => <button onClick={() => props.onDeleteFolder(mocks.folder)}>Excluir pasta de teste</button>,
}));
beforeEach(() => {
  mocks.userId = '00000000-0000-4000-8000-000000000002';
  mocks.folder.id = '00000000-0000-4000-8000-000000000001';
  mocks.folder.createdBy = mocks.userId;
  mocks.removeFolder.mockResolvedValue(null);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

describe('Exclusão de pasta compartilhada pelo resolver do atendente', () => {
  it('permite excluir pasta de outro autor sem alterar a autoria', async () => {
    mocks.folder.createdBy = '00000000-0000-4000-8000-000000000003';
    render(<CustomerSupport />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir pasta de teste' }));
    await waitFor(() => expect(mocks.removeFolder).toHaveBeenCalledWith(mocks.folder.id));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.folder.createdBy).toBe('00000000-0000-4000-8000-000000000003');
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it.each(['folder', 'session'])('bloqueia contexto %s inválido antes da confirmação e serviço', async (invalid) => {
    if (invalid === 'folder') mocks.folder.id = '';
    else mocks.userId = '';
    render(<CustomerSupport />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir pasta de teste' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(window.confirm).not.toHaveBeenCalled();
    expect(mocks.removeFolder).not.toHaveBeenCalled();
  });

  it('executa a exclusão com o ID parseado após confirmar', async () => {
    render(<CustomerSupport />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir pasta de teste' }));
    await waitFor(() => expect(mocks.removeFolder).toHaveBeenCalledWith(mocks.folder.id));
    expect(mocks.success).toHaveBeenCalledWith('Pasta "Pasta própria" excluída.');
  });

  it('respeita cancelamento e falha de persistência', async () => {
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    render(<CustomerSupport />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir pasta de teste' }));
    await waitFor(() => expect(window.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.removeFolder).not.toHaveBeenCalled();
    mocks.removeFolder.mockResolvedValueOnce('Não foi possível excluir.');
    fireEvent.click(screen.getByRole('button', { name: 'Excluir pasta de teste' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Não foi possível excluir.'));
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
