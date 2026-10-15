// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from './index';
import Signup from '../Signup';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(), signUp: vi.fn(), google: vi.fn(), warning: vi.fn(), error: vi.fn(), navigate: vi.fn(),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { auth: { signUp: mocks.signUp } } }));
vi.mock('@/services/authPasswordSetup', () => ({
  signInWithEmailPassword: mocks.signIn, signInWithGoogle: mocks.google,
}));
vi.mock('react-toastify', () => ({ toast: { warning: mocks.warning, success: vi.fn(), info: vi.fn(), error: mocks.error } }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(), useNavigate: () => mocks.navigate,
}));

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({ error: null });
  mocks.signUp.mockResolvedValue({ error: null });
  mocks.google.mockResolvedValue({ error: null });
});

function fill(view: ReturnType<typeof render>, placeholder: string, value: string) {
  fireEvent.change(view.getByPlaceholderText(placeholder), { target: { value } });
}
function submit(view: ReturnType<typeof render>) {
  fireEvent.submit(view.container.querySelector('form')!);
}

describe('auth form resolver submission', () => {
  it('blocks invalid login even when submitted without native browser validation', async () => {
    const view = render(<MemoryRouter><Login /></MemoryRouter>);
    fill(view, 'exemplo@email.com', 'invalid');
    fill(view, '••••••••', 'secret');
    submit(view);
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith('Informe um e-mail válido.'));
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('passes parsed email and preserves legacy short login passwords', async () => {
    const view = render(<MemoryRouter><Login /></MemoryRouter>);
    fill(view, 'exemplo@email.com', ' person@example.com ');
    fill(view, '••••••••', 'x');
    submit(view);
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith(expect.anything(), 'person@example.com', 'x'));
  });

  it('blocks mismatched signup passwords before signup', async () => {
    const view = render(<MemoryRouter><Signup /></MemoryRouter>);
    fill(view, 'Seu nome', 'Person');
    fill(view, 'exemplo@email.com', 'person@example.com');
    fill(view, 'Min 6', 'secret');
    fill(view, 'Confirme', 'different');
    submit(view);
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith('As senhas não coincidem!'));
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('sends parsed signup values and keeps pending account role', async () => {
    const view = render(<MemoryRouter><Signup /></MemoryRouter>);
    fill(view, 'Seu nome', ' Person ');
    fill(view, 'exemplo@email.com', ' person@example.com ');
    fill(view, 'Min 6', 'secret');
    fill(view, 'Confirme', 'secret');
    submit(view);
    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.com', password: 'secret',
      options: expect.objectContaining({ data: { full_name: 'Person', role: 'pending' } }),
    })));
  });

  it('valida a navegação de recuperação pelo resolver do e-mail, sem exigir senha', async () => {
    const view = render(<MemoryRouter><Login /></MemoryRouter>);
    fill(view, 'exemplo@email.com', 'inválido'); fireEvent.click(view.getByText('Esqueci minha senha'));
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith('Informe um e-mail válido.')); expect(mocks.navigate).not.toHaveBeenCalled();
    fill(view, 'exemplo@email.com', ' user@example.test '); fireEvent.click(view.getByText('Esqueci minha senha'));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/reset-password', { state: { email: 'user@example.test' } })); expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('mantém login pendente protegido contra Google, recuperação e repetição', async () => {
    let finish!: (value: unknown) => void; mocks.signIn.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<MemoryRouter><Login /></MemoryRouter>); fill(view, 'exemplo@email.com', 'user@example.test'); fill(view, '••••••••', ' x ');
    act(() => { submit(view); submit(view); }); await waitFor(() => expect(mocks.signIn).toHaveBeenCalledTimes(1));
    fireEvent.click(view.getByText('Entrar com Google')); fireEvent.click(view.getByText('Esqueci minha senha'));
    await act(async () => {}); expect(mocks.google).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
    await act(async () => { finish({ error: { message: 'Falha simulada' } }); }); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha simulada'));
    submit(view); await waitFor(() => expect(mocks.signIn).toHaveBeenCalledTimes(2));
  });

  it.each(['login', 'signup'] as const)('protege %s contra repetição de OAuth e submissão concorrente', async (kind) => {
    let finish!: (value: unknown) => void; mocks.google.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<MemoryRouter>{kind === 'login' ? <Login /> : <Signup />}</MemoryRouter>);
    fill(view, 'exemplo@email.com', 'user@example.test');
    if (kind === 'signup') { fill(view, 'Seu nome', ' Nome '); fill(view, 'Min 6', ' senha '); fill(view, 'Confirme', ' senha '); }
    else fill(view, '••••••••', ' x ');
    const google = view.getByText(kind === 'login' ? 'Entrar com Google' : 'Cadastrar com Google');
    act(() => { fireEvent.click(google); fireEvent.click(google); submit(view); });
    await waitFor(() => expect(mocks.google).toHaveBeenCalledTimes(1)); expect(mocks.signIn).not.toHaveBeenCalled(); expect(mocks.signUp).not.toHaveBeenCalled();
    await act(async () => { finish({ error: { message: 'OAuth não iniciado' } }); });
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('OAuth não iniciado')); submit(view);
    await waitFor(() => expect(kind === 'login' ? mocks.signIn : mocks.signUp).toHaveBeenCalledTimes(1));
  });

  it.each(['login', 'signup'] as const)('encerra espera de %s sem aplicar navegação de resposta tardia', async (kind) => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; const operation = kind === 'login' ? mocks.signIn : mocks.signUp;
    operation.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const view = render(<MemoryRouter>{kind === 'login' ? <Login /> : <Signup />}</MemoryRouter>); fill(view, 'exemplo@email.com', 'user@example.test');
    if (kind === 'signup') { fill(view, 'Seu nome', 'Nome'); fill(view, 'Min 6', 'senha123'); fill(view, 'Confirme', 'senha123'); }
    else fill(view, '••••••••', 'senha');
    await act(async () => { submit(view); await vi.advanceTimersByTimeAsync(20_001); });
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Confira o estado da sua conta'));
    await act(async () => { finish({ error: null }); }); expect(mocks.navigate).not.toHaveBeenCalled(); expect(operation).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('button[type="submit"]')).toHaveProperty('disabled', false);
  });
});
