// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
