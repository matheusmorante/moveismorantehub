// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPassword from './index';

const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(), verifyOtp: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), navigate: vi.fn(),
}));
vi.mock('../utils/supabaseConfig', () => ({ supabase: { auth } }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn() } }));
vi.mock('react-router-dom', async (original) => ({ ...await original<typeof import('react-router-dom')>(), useNavigate: () => auth.navigate }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => {
  vi.clearAllMocks();
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

function renderRecovery() {
  return render(<MemoryRouter><ResetPassword /></MemoryRouter>);
}
async function sendCode(view: ReturnType<typeof render>) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' person@example.com ' } });
  fireEvent.submit(view.container.querySelector('form')!);
  await screen.findByText('Digite o código');
}

describe('password recovery resolver', () => {
  it('blocks malformed email before recovery request', async () => {
    const view = renderRecovery();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'invalid' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await screen.findByText('Informe um e-mail válido.');
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('validates send, resend and code without relying on browser required fields', async () => {
    const view = renderRecovery();
    await sendCode(view);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));
    await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(2));
    fireEvent.submit(view.container.querySelector('form')!);
    await screen.findByText('Informe o código recebido por e-mail.');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Código de recuperação'), { target: { value: ' 123456 ' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await screen.findByText('Crie sua nova senha');
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'person@example.com', token: '123456', type: 'recovery' });
  });

  it('blocks short or mismatched passwords and updates only valid credentials', async () => {
    const view = renderRecovery();
    await sendCode(view);
    fireEvent.change(screen.getByLabelText('Código de recuperação'), { target: { value: '123456' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await screen.findByText('Crie sua nova senha');
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'short' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await screen.findByText('A senha deve ter pelo menos 8 caracteres.');
    expect(auth.updateUser).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'password123' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await screen.findByText('As senhas não coincidem.');
    expect(auth.updateUser).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'password123' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: 'password123' }));
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('protege confirmação de código contra reenvio e navegação no mesmo evento', async () => {
    const view = renderRecovery(); await sendCode(view);
    let finish!: (value: unknown) => void; auth.verifyOtp.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    fireEvent.change(screen.getByLabelText('Código de recuperação'), { target: { value: '123456' } });
    act(() => { fireEvent.submit(view.container.querySelector('form')!); fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' })); fireEvent.click(screen.getByRole('button', { name: 'Voltar ao login' })); });
    await waitFor(() => expect(auth.verifyOtp).toHaveBeenCalledTimes(1)); expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(1); expect(auth.navigate).not.toHaveBeenCalled();
    await act(async () => { finish({ error: null }); }); await screen.findByText('Crie sua nova senha');
  });

  it('não navega quando sair da sessão após salvar a senha falha', async () => {
    const view = renderRecovery(); await sendCode(view); fireEvent.change(screen.getByLabelText('Código de recuperação'), { target: { value: '123456' } });
    fireEvent.submit(view.container.querySelector('form')!); await screen.findByText('Crie sua nova senha');
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: ' senha123 ' } }); fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: ' senha123 ' } });
    auth.signOut.mockResolvedValueOnce({ error: { message: 'Não confirmou saída' } }); fireEvent.submit(view.container.querySelector('form')!);
    await screen.findByText('Não confirmou saída'); expect(auth.navigate).not.toHaveBeenCalled(); expect(auth.updateUser).toHaveBeenCalledWith({ password: ' senha123 ' });
  });

  it('libera recuperação após prazo sem avançar por resposta tardia nem reenviar', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; auth.resetPasswordForEmail.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const view = renderRecovery(); fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'user@example.test' } });
    await act(async () => { fireEvent.submit(view.container.querySelector('form')!); await vi.advanceTimersByTimeAsync(20_001); });
    expect(screen.getByRole('status').textContent).toContain('Confira o estado da sua conta');
    await act(async () => { finish({ error: null }); }); expect(screen.queryByLabelText('Código de recuperação')).toBeNull(); expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Enviar código' })).toHaveProperty('disabled', false);
  });
});
