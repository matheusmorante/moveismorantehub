// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UserRolesModal from './UserRolesModal';
import type { AccessProfile } from './UserRolesModal';
const mocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error } }));
vi.mock('@/pages/utils/accessRoles', () => ({
  SYSTEM_ROLES: [['seller', 'Vendedor'], ['accountant', 'Contador']],
  roleLabel: (role: string) => role,
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const profile: AccessProfile = { id: 'user-1', email: 'person@example.com', full_name: 'Person', roles: ['seller'] };
describe('user role resolver', () => {
  it('blocks roles outside the supplied system options before saving', async () => {
    const save = vi.fn();
    render(<UserRolesModal profile={{ ...profile, roles: ['unknown' as AccessProfile['roles'][number]] }} onClose={vi.fn()} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Selecione apenas cargos disponíveis no sistema.'));
    expect(save).not.toHaveBeenCalled();
  });
  it('saves valid system roles and preserves empty roles as intentional access removal', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    const view = render(<UserRolesModal profile={profile} onClose={close} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(['seller']));
    fireEvent.click(screen.getByRole('button', { name: 'Remover seller' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith([]));
    expect(close).toHaveBeenCalledTimes(2);
    expect(view.container.querySelectorAll('option')).toHaveLength(3);
  });

  it('mantém o modal e sua seleção após falha, permitindo retomar sem rejeição solta', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Não salvou')).mockResolvedValue(undefined); const close = vi.fn();
    render(<UserRolesModal profile={profile} onClose={close} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Não salvou')); expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remover seller' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' })); await waitFor(() => expect(close).toHaveBeenCalledTimes(1)); expect(save).toHaveBeenCalledTimes(2);
  });

  it('impede repetição, fechar e alteração da seleção durante a gravação', async () => {
    let finish!: () => void; const save = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; })); const close = vi.fn();
    const view = render(<UserRolesModal profile={profile} onClose={close} onSave={save} />);
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' })); fireEvent.click(screen.getByRole('button', { name: 'Salvar cargos' })); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1)); expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remover seller' })).toHaveProperty('disabled', true);
    fireEvent.click(view.container.firstElementChild!); expect(close).not.toHaveBeenCalled();
    await act(async () => { finish(); }); await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });
});
