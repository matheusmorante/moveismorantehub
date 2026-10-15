// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ isAdministrator: true }) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => ({
  select: () => ({ order: async () => ({ data: [{ id: 'user-1', email: 'pessoa@example.test', full_name: 'Pessoa', role: 'seller', roles: ['seller'] }], error: null }) }), update: mocks.update,
}) } }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/pages/utils/accessRoles', () => ({
  SYSTEM_ROLES: [['seller', 'Vendedor'], ['accountant', 'Contador']], roleLabel: (role: string) => role,
  getProfileRoles: (profile: any) => profile.roles, getPrimaryRole: (roles: string[]) => roles[0] || 'pending',
}));
import UsersManagement from './Index';
afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.clearAllMocks(); mocks.update.mockReturnValue({ eq: mocks.eq }); mocks.eq.mockResolvedValue({ error: null }); });
const open = async () => { render(<UsersManagement />); fireEvent.click(await screen.findByRole('button', { name: /Pessoa pessoa@example.test/ })); };

describe('persistência dos cargos pelo formulário proprietário', () => {
  it('mostra falha uma vez e conserva seleção para salvar com o ID e payload corretos', async () => {
    mocks.eq.mockResolvedValueOnce({ error: { message: 'Falha do provedor' } }); await open();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1)); expect(mocks.success).not.toHaveBeenCalled(); expect(screen.getByText('Detalhes do usuário')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remover seller' })); fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Cargos atualizados.'));
    expect(mocks.update).toHaveBeenLastCalledWith({ role: 'pending', roles: [] }); expect(mocks.eq).toHaveBeenLastCalledWith('id', 'user-1');
    expect(screen.queryByText('Detalhes do usuário')).toBeNull();
  });

  it('informa resultado incerto sem fechar ou aplicar sucesso de resposta tardia', async () => {
    await open(); vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; mocks.eq.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' })); await vi.advanceTimersByTimeAsync(20_001); });
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Confira os cargos da conta'));
    await act(async () => { finish({ error: null }); }); expect(mocks.success).not.toHaveBeenCalled(); expect(screen.getByText('Detalhes do usuário')).toBeTruthy(); expect(mocks.eq).toHaveBeenCalledTimes(1);
  });
});
