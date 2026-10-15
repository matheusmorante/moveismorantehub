// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/AuthContext', () => ({ useAuth: vi.fn() }));

import { useAuth } from '@/context/AuthContext';
import { PasswordSetupPrompt } from './PasswordSetupPrompt';

afterEach(() => { cleanup(); vi.useRealTimers(); });

const mockPasswordCredentialStatus = (
  status: 'idle' | 'checking' | 'required' | 'configured' | 'error'
) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'test-user', email: 'test@example.invalid' },
    passwordCredentialStatus: status,
    createPasswordCredential: vi.fn(),
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
};

describe('PasswordSetupPrompt', () => {
  it.each(['idle', 'checking', 'error', 'configured'] as const)(
    'does not show the dialog while credential status is %s',
    (status) => {
      mockPasswordCredentialStatus(status);

      render(
        <MemoryRouter initialEntries={['/app']}>
          <PasswordSetupPrompt />
        </MemoryRouter>
      );

      expect(screen.queryByRole('dialog')).toBeNull();
    }
  );

  it('shows the create-password dialog only after Supabase confirms no password exists', () => {
    mockPasswordCredentialStatus('required');

    render(
      <MemoryRouter initialEntries={['/app']}>
        <PasswordSetupPrompt />
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByLabelText('Nova senha')).not.toBeNull();
    expect(screen.getByLabelText('Confirmar senha')).not.toBeNull();
  });

  it('blocks invalid password submissions before creating the credential', async () => {
    mockPasswordCredentialStatus('required');
    const createPasswordCredential = vi.mocked(useAuth)().createPasswordCredential;
    const view = render(<MemoryRouter><PasswordSetupPrompt /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'short' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).not.toBeNull());
    expect(createPasswordCredential).not.toHaveBeenCalled();
  });

  it('uses validated credentials when the external submit button submits the form', async () => {
    mockPasswordCredentialStatus('required');
    const createPasswordCredential = vi.mocked(useAuth)().createPasswordCredential;
    render(<MemoryRouter><PasswordSetupPrompt /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar senha' }));
    await waitFor(() => expect(createPasswordCredential).toHaveBeenCalledWith('password123', 'password123'));
  });

  it('mantém a criação protegida contra saída da conta e repetição até terminar', async () => {
    mockPasswordCredentialStatus('required'); const auth = vi.mocked(useAuth)();
    let finish!: () => void; vi.mocked(auth.createPasswordCredential).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = render(<MemoryRouter><PasswordSetupPrompt /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: ' senha123 ' } }); fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: ' senha123 ' } });
    act(() => { fireEvent.submit(view.container.querySelector('form')!); fireEvent.submit(view.container.querySelector('form')!); fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' })); });
    await waitFor(() => expect(auth.createPasswordCredential).toHaveBeenCalledTimes(1)); expect(auth.logout).not.toHaveBeenCalled();
    expect(auth.createPasswordCredential).toHaveBeenCalledWith(' senha123 ', ' senha123 ');
    await act(async () => { finish(); }); await waitFor(() => expect(screen.getByLabelText('Nova senha')).toHaveProperty('value', ''));
  });

  it('exibe erro de saída e permite tentar novamente sem criar senha', async () => {
    mockPasswordCredentialStatus('required'); const auth = vi.mocked(useAuth)();
    vi.mocked(auth.logout).mockRejectedValueOnce(new Error('Não saiu'));
    render(<MemoryRouter><PasswordSetupPrompt /></MemoryRouter>); fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await screen.findByText('Não saiu'); expect(auth.createPasswordCredential).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' })); await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(2));
  });

  it('não apaga o preenchimento quando a criação responde depois do prazo', async () => {
    mockPasswordCredentialStatus('required'); const auth = vi.mocked(useAuth)();
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: () => void; vi.mocked(auth.createPasswordCredential).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = render(<MemoryRouter><PasswordSetupPrompt /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'senha1234' } }); fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha1234' } });
    await act(async () => { fireEvent.submit(view.container.querySelector('form')!); await vi.advanceTimersByTimeAsync(20_001); });
    expect(screen.getByText(/Confira o estado da sua conta/)).toBeTruthy();
    await act(async () => { finish(); }); expect(screen.getByLabelText('Nova senha')).toHaveProperty('value', 'senha1234'); expect(auth.createPasswordCredential).toHaveBeenCalledTimes(1);
  });
});
