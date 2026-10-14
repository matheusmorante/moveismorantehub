// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Profile from './Index';

const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), updateUser: vi.fn(), reauthenticate: vi.fn(), error: vi.fn() }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({
  user: { id: 'user-1', email: 'person@example.com' },
  profile: { full_name: 'Person', position: 'Custom position' }, logout: vi.fn(),
}) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  from: () => ({ update: mocks.update }), auth: { updateUser: mocks.updateUser, reauthenticate: mocks.reauthenticate },
} }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn(), info: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.reauthenticate.mockResolvedValue({ error: null });
});
function setPassword(value: string, confirmation = value) {
  const fields = screen.getAllByPlaceholderText('••••••••');
  fireEvent.change(fields[0], { target: { value } });
  fireEvent.change(fields[1], { target: { value: confirmation } });
}
function submitPassword(view: ReturnType<typeof render>) {
  fireEvent.submit(view.container.querySelectorAll('form')[1]);
}

describe('profile form resolver', () => {
  it('blocks a blank name and saves parsed values with custom positions', async () => {
    const view = render(<Profile />);
    fireEvent.change(screen.getByPlaceholderText('Seu nome'), { target: { value: '  ' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe seu nome completo.'));
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Seu nome'), { target: { value: ' Person Updated ' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Person Updated', position: 'Custom position' })));
  });

  it('blocks short and mismatched passwords before updating Auth', async () => {
    const view = render(<Profile />);
    setPassword('short');
    submitPassword(view);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('A senha deve ter pelo menos 8 caracteres.'));
    expect(mocks.updateUser).not.toHaveBeenCalled();
    setPassword('password123', 'different');
    submitPassword(view);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('As senhas não coincidem.'));
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('requires a nonce after Auth requests reauthentication', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { code: 'reauthentication_needed' } });
    const view = render(<Profile />);
    setPassword('password123');
    submitPassword(view);
    await screen.findByPlaceholderText('Código enviado por e-mail');
    submitPassword(view);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe o código enviado para confirmar sua identidade.'));
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByPlaceholderText('Código enviado por e-mail'), { target: { value: ' 123456 ' } });
    submitPassword(view);
    await waitFor(() => expect(mocks.updateUser).toHaveBeenLastCalledWith({ password: 'password123', nonce: '123456' }));
  });

  it('requires the current password only when Auth requests it', async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { code: 'current_password_required' } });
    const view = render(<Profile />);
    setPassword('password123');
    submitPassword(view);
    await screen.findByText('Senha atual');
    submitPassword(view);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe sua senha atual para continuar.'));
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    fireEvent.change(view.container.querySelector('input[autocomplete="current-password"]')!, { target: { value: 'oldPassword' } });
    submitPassword(view);
    await waitFor(() => expect(mocks.updateUser).toHaveBeenLastCalledWith({ password: 'password123', current_password: 'oldPassword' }));
  });
});
